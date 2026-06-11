import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useRef } from "react";
import { hasAdminAccess, readStoredUser } from "../../../utils/auth";
import {
  ChevronLeft,
  Circle,
  LayoutList,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  ExternalLink,
  FileText,
  GitBranch,
  Settings,
  Search,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import AppLayout from "../../layout/AppLayout";
import {
  createAgreementApi,
  createDocusealSubmissionApi,
  sendAgreementEmailApi,
  deleteAgreementApi,
  getAgreement,
  getAgreementsView,
  updateAgreementApi,
  getDocusealTemplates,
  type Agreement,
  type AgreementBody,
  type DocusealTemplate,
  getAgreementDocusealId,
} from "../../../services/operations/agreements";
import {
  getAgreementVersions,
  getAgreementVersion,
  getAgreementServiceTerms,
  getAgreementServiceTerm,
  createAgreementServiceTermApi,
  createAgreementVersionApi,
  updateAgreementVersionApi,
  updateAgreementServiceTermApi,
  deleteAgreementVersionApi,
  deleteAgreementServiceTermApi,
  type AgreementVersion,
  type AgreementServiceTerm,
  type PricingModel,
  pricingModelOptions,
} from "../../../services/operations/agreements";
import { getAllPractices } from "../../../services/operations/practices";
import { getAllServices } from "../../../services/operations/services";
import { getAllVendorsApi } from "../../../services/operations/vendors";
import type { Practice } from "../../practices/types";
import { DetailCard } from "../../../components/shared/tablePageUtils";
import {
  buildTemplateFieldValues,
  type DocusealField,
  getDocusealFieldInputType,
  getDocusealFieldLabel,
  getDocusealFieldValue,
  getMissingRequiredDocusealFields,
  getTemplateSubmitterGroups,
  isEditableDocusealField,
} from "../../../utils/docuseal";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-indigo-100 text-indigo-700",
  ACTIVE: "bg-green-100 text-green-700",
  PENDING_SIGNATURE: "bg-amber-100 text-amber-700",
  SIGNED: "bg-blue-100 text-blue-700",
  EXPIRED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-zinc-100 text-zinc-600",
};

const agreementStatusOptions = [
  "DRAFT",
  "SENT",
  "ACTIVE",
  "EXPIRED",
  "TERMINATED",
  "SIGNED",
];

const agreementTypeOptions = ["MSA", "SOW", "RENEWAL", "ADDENDUM"];

const AUTO_INCLUDE_TEMPLATE_NAMES = [
  "Master Service Agreement",
  "BAA",
  "Credentialing Exhibit",
  "Exhibit P",
];

function isClientNameField(field: DocusealField) {
  return /client\s*name/i.test(field.name || "");
}

type AgreementFormState = {
  practiceId: string;
  dealId: string;
  type: string;
  status: string;
  value: string;
  effectiveDate: string;
  renewalDate: string;
  terminationDate: string;
  docusealTemplates: string[];
  docusealFieldValues: Record<string, Record<string, string>>;
};

const initialFormState: AgreementFormState = {
  practiceId: "",
  dealId: "",
  type: "MSA",
  status: "DRAFT",
  value: "",
  effectiveDate: "",
  renewalDate: "",
  terminationDate: "",
  docusealTemplates: [],
  docusealFieldValues: {},
};

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function formatPricingModel(model: string) {
  return model
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatDateForInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildCreateFormDocusealPrefillValues(
  template: DocusealTemplate | undefined,
  form: Pick<AgreementFormState, "practiceId" | "effectiveDate">,
  practices: Practice[],
) {
  const values: Record<string, string> = {};
  if (!template) return values;

  const practice = practices.find((item) => item.id === form.practiceId);
  const effectiveDate = form.effectiveDate || "";

  for (const field of template.fields || []) {
    if (!isEditableDocusealField(field)) continue;

    const fieldName = (field.name || "").toLowerCase();
    let value = "";

    if (
      fieldName.includes("client") ||
      fieldName.includes("practice") ||
      fieldName.includes("clinic")
    ) {
      value = practice?.name || "";
    } else if (fieldName.includes("npi")) {
      value = practice?.npi || "";
    } else if (fieldName.includes("effective")) {
      value = effectiveDate;
    } else if (field.type === "date" && fieldName.includes("date")) {
      value = effectiveDate;
    }

    if (value) {
      values[field.uuid] = value;
    }
  }

  return values;
}

function buildFormState(agreement?: Agreement | null): AgreementFormState {
  if (!agreement) return initialFormState;
  const docusealSubmissions = agreement.docusealSubmissions || [];
  const docusealFieldValues = docusealSubmissions.reduce<
    Record<string, Record<string, string>>
  >((acc, submission) => {
    const templateKey = String(submission.templateId);
    acc[templateKey] = submission.fieldValues || {};
    return acc;
  }, {});

  return {
    practiceId: agreement.practiceId,
    dealId: agreement.dealId || "",
    type: agreement.type,
    status: agreement.status,
    value: String(agreement.value || ""),
    effectiveDate: formatDateForInput(agreement.effectiveDate),
    renewalDate: formatDateForInput(agreement.renewalDate),
    terminationDate: formatDateForInput(agreement.terminationDate),
    docusealTemplates: docusealSubmissions
      .map((submission) => submission.templateId)
      .filter((templateId): templateId is number => templateId !== null)
      .map((templateId) => String(templateId)),
    docusealFieldValues,
  };
}

type AgreementRow = {
  id: string;
  values: Record<string, string | number | null>;
};

function AllAgreementsPage() {
  const isAdmin = hasAdminAccess(readStoredUser()?.role as string | undefined);
  const [searchParams] = useSearchParams();

  const [rows, setRows] = useState<AgreementRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  // const [selectedRowVersionId, setSelectedRowVersionId] = useState<
  //   string | null
  // >(null);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(
    null,
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ search: "", status: "", type: "" });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [createForm, setCreateForm] =
    useState<AgreementFormState>(initialFormState);
  const [editForm, setEditForm] =
    useState<AgreementFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [docusealTemplates, setDocusealTemplates] = useState<
    DocusealTemplate[]
  >([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [signers, setSigners] = useState<any[]>([]);
  const [selectedSignerId, setSelectedSignerId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [profileCreateHandled, setProfileCreateHandled] = useState(false);
  const templateDropdownRef = useRef<HTMLDivElement>(null);
  const createFormAutoFilledValuesRef = useRef<
    Record<string, Record<string, string>>
  >({});

  // Tabs for detail panel
  const [activeTab, setActiveTab] = useState<"overview" | "versions" | "terms">(
    "overview",
  );

  // Versions state
  const [versions, setVersions] = useState<AgreementVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [versionForm, setVersionForm] = useState({
    versionNumber: 1,
    isCurrent: true,
    effectiveDate: "",
    endDate: "",
    notes: "",
  });
  const [isSavingVersion, setIsSavingVersion] = useState(false);

  // Service Terms state
  const [serviceTerms, setServiceTerms] = useState<AgreementServiceTerm[]>([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [showTermForm, setShowTermForm] = useState(false);
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [termForm, setTermForm] = useState({
    serviceId: "",
    agreementVersionId: "",
    vendorId: "",
    vendorFlatAmount: "",
    vendorPercentOfClient: "",
    pricingModel: "PER_PATIENT" as PricingModel,
    pricingConfig: "{}",
    currency: "USD",
    priority: 1,
    minimumFee: "",
    effectiveDate: "",
    endDate: "",
    isActive: true,
    externalReference: "",
  });
  const [isSavingTerm, setIsSavingTerm] = useState(false);
  const [services, setServices] = useState<{ id: string; name: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);

  const columns = useMemo<ColumnDef<AgreementRow>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row: AgreementRow) => row.values.name,
        header: () => "Name",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.name || "-"),
      },
      {
        id: "type",
        accessorFn: (row: AgreementRow) => row.values.type,
        header: () => "Type",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.type || "-"),
      },
      {
        id: "status",
        accessorFn: (row: AgreementRow) => row.values.status,
        header: () => "Status",
        cell: ({ row }: { row: { original: AgreementRow } }) => {
          const status = String(row.original.values.status || "");
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
            >
              {formatStatusLabel(status)}
            </span>
          );
        },
      },
      {
        id: "approvalStatus",
        accessorFn: (row: AgreementRow) => row.values.approvalStatus,
        header: () => "Approval Status",
        cell: ({ row }: { row: { original: AgreementRow } }) => {
          const status = String(row.original.values.approvalStatus || "-");
          if (status === "-") return status;
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status]}`}
            >
              {formatStatusLabel(status)}
            </span>
          );
        },
      },
      {
        id: "practiceName",
        accessorFn: (row: AgreementRow) => row.values.practiceName,
        header: () => "Practice",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.practiceName || "-"),
      },
      {
        id: "value",
        accessorFn: (row: AgreementRow) => row.values.value,
        header: () => "Value",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.value || "-"),
      },
      {
        id: "effectiveDate",
        accessorFn: (row: AgreementRow) => row.values.effectiveDate,
        header: () => "Effective Date",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.effectiveDate || "-"),
      },
      {
        id: "creationDate",
        accessorFn: (row: AgreementRow) => row.values.creationDate,
        header: () => "Created",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.creationDate),
      },
      {
        id: "signingStatus",
        accessorFn: (row: AgreementRow) => row.values.signingStatus,
        header: () => "Signing",
        cell: ({ row }: { row: { original: AgreementRow } }) => {
          const status = String(row.original.values.signingStatus || "");
          if (!status) return null;
          const isComplete = status.includes("/") && !status.includes("0/");
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                isComplete
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {status}
            </span>
          );
        },
        size: 100,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      async function loadData() {
        try {
          setIsLoading(true);
          const params: Record<string, unknown> = {
            page: pagination.page,
            limit: pagination.limit,
            search: filters.search || undefined,
            status: filters.status || undefined,
            type: filters.type || undefined,
            practiceId: searchParams.get("practiceId") || undefined,
          };
          if (sorting[0]?.id) {
            params.sortBy = sorting[0].id;
            params.sortOrder = sorting[0]?.desc ? "desc" : "asc";
          }

          const data = await getAgreementsView(params as any);
          setRows(data.rows);

          setPagination(data.pagination);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Failed to load agreements";
          toast.error(message);
        } finally {
          setIsLoading(false);
        }
      }

      if (filters.search.length > 2 || filters.search.length === 0) {
        loadData();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [pagination.page, pagination.limit, sorting, filters, searchParams]);

  useEffect(() => {
    if ((showCreateForm || showDetailPanel) && practices.length === 0) {
      setOptionsLoading(true);
      getAllPractices()
        .then((practiceList) => {
          setPractices(practiceList);
        })
        .catch((err) => console.error("Failed to load practices:", err))
        .finally(() => setOptionsLoading(false));
    }
  }, [showCreateForm, showDetailPanel, practices.length]);

  useEffect(() => {
    const practiceId = searchParams.get("practiceId");
    const action = searchParams.get("action");

    if (profileCreateHandled || action !== "create" || !practiceId) return;

    setProfileCreateHandled(true);
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setCreateForm((prev) => ({
      ...initialFormState,
      type: prev.type || initialFormState.type,
      status: initialFormState.status,
      practiceId,
    }));

    if (practices.length === 0) {
      setOptionsLoading(true);
      getAllPractices()
        .then((practiceList) => {
          setPractices(practiceList);
        })
        .catch((err) => console.error("Failed to load practices:", err))
        .finally(() => setOptionsLoading(false));
    }

    if (docusealTemplates.length === 0) {
      loadDocusealTemplates();
    }
  }, [
    docusealTemplates.length,
    practices.length,
    profileCreateHandled,
    searchParams,
  ]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        templateDropdownRef.current &&
        !templateDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTemplateDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);

    setShowDetailPanel(true);
    setShowCreateForm(false);
    setActiveTab("overview");
    setIsDetailLoading(true);
    setVersions([]);
    setServiceTerms([]);

    try {
      const agreement = await getAgreement(rowId);
      setSelectedAgreement(agreement);

      setEditForm(buildFormState(agreement));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch agreement";
      toast.error(message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function loadVersions(agreementId: string) {
    setVersionsLoading(true);
    try {
      const data = await getAgreementVersion(
        agreementId,
        // page: 1,
        // limit: 50,
      );
      setVersions(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load versions";
      toast.error(message);
    } finally {
      setVersionsLoading(false);
    }
  }

  async function loadServiceTerms(agreementId: string) {
    setTermsLoading(true);
    try {
      // const data = await getAgreementServiceTerms({
      //   agreementId,
      //   page: 1,
      //   limit: 50,
      // });
      const data = await getAgreementServiceTerm(agreementId);
      setServiceTerms(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load service terms";
      toast.error(message);
    } finally {
      setTermsLoading(false);
    }
  }

  function handleTabChange(tab: "overview" | "versions" | "terms") {
    setActiveTab(tab);
    if (tab === "versions" && selectedRowId) {
      loadVersions(selectedRowId);
    } else if (tab === "terms" && selectedRowId) {
      loadServiceTerms(selectedRowId);
      if (services.length === 0) {
        getAllServices().then(setServices).catch(console.error);
      }
      if (vendors.length === 0) {
        getAllVendorsApi().then(setVendors).catch(console.error);
      }
    }
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedAgreement(null);
    setEditForm(initialFormState);
  }

  function openCreateForm() {
    setCreateForm(initialFormState);
    createFormAutoFilledValuesRef.current = {};
    setTemplateSearch("");
    setShowTemplateDropdown(false);
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedAgreement(null);
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setCreateForm(initialFormState);
    createFormAutoFilledValuesRef.current = {};
    setTemplateSearch("");
    setShowTemplateDropdown(false);
  }

  function addTemplateToForm(
    templateId: string,
    setFormState: Dispatch<SetStateAction<AgreementFormState>>,
  ) {
    setFormState((prev) => {
      const template = docusealTemplates.find(
        (t) => String(t.id) === templateId,
      );
      return {
        ...prev,
        docusealTemplates: prev.docusealTemplates.includes(templateId)
          ? prev.docusealTemplates
          : [...prev.docusealTemplates, templateId],
        docusealFieldValues: {
          ...prev.docusealFieldValues,
          [templateId]: {
            ...(prev.docusealFieldValues[templateId] || {}),
            ...buildTemplateFieldValues(template),
            ...buildCreateFormDocusealPrefillValues(template, prev, practices),
          },
        },
      };
    });
  }

  function removeTemplateFromForm(
    templateId: string,
    setFormState: Dispatch<SetStateAction<AgreementFormState>>,
  ) {
    setFormState((prev) => {
      if (!prev.docusealTemplates.includes(templateId)) return prev;
      const nextFieldValues = { ...prev.docusealFieldValues };
      delete nextFieldValues[templateId];
      return {
        ...prev,
        docusealTemplates: prev.docusealTemplates.filter(
          (id: string) => id !== templateId,
        ),
        docusealFieldValues: nextFieldValues,
      };
    });
  }

  function updateTemplateFieldValue(
    templateId: string,
    fieldUuid: string,
    value: string,
    setFormState: Dispatch<SetStateAction<AgreementFormState>>,
  ) {
    setFormState((prev) => ({
      ...prev,
      docusealFieldValues: {
        ...prev.docusealFieldValues,
        [templateId]: {
          ...(prev.docusealFieldValues[templateId] || {}),
          [fieldUuid]: value,
        },
      },
    }));
  }

  function validateTemplateFieldValues(form: AgreementFormState) {
    for (const templateId of form.docusealTemplates) {
      const template = docusealTemplates.find(
        (t) => String(t.id) === templateId,
      );
      if (!template) continue;

      const fieldValues = form.docusealFieldValues[templateId] || {};
      const missingRequiredField = getMissingRequiredDocusealFields(
        template,
        fieldValues,
      )[0];

      if (missingRequiredField) {
        return {
          templateName: template.name,
          fieldName: getDocusealFieldLabel(missingRequiredField, 0),
        };
      }

      const clientNameField = (template.fields || []).find(
        (field) => isEditableDocusealField(field) && isClientNameField(field),
      );

      if (
        clientNameField &&
        !getDocusealFieldValue(fieldValues, clientNameField).trim()
      ) {
        return {
          templateName: template.name,
          fieldName: getDocusealFieldLabel(clientNameField, 0),
        };
      }
    }

    return null;
  }

  function buildPayload(form: AgreementFormState): AgreementBody {
    return {
      practiceId: form.practiceId,
      dealId: form.dealId || null,
      type: form.type,
      status: form.status,
      value: Number.parseFloat(form.value) || undefined,
      ...(form.effectiveDate
        ? { effectiveDate: new Date(form.effectiveDate).toISOString() }
        : {}),
      ...(form.renewalDate
        ? { renewalDate: new Date(form.renewalDate).toISOString() }
        : {}),
      ...(form.terminationDate
        ? { terminationDate: new Date(form.terminationDate).toISOString() }
        : {}),
      ...(form.docusealTemplates?.length > 0
        ? {
            docusealSubmissions: form.docusealTemplates.map((id: string) => {
              const template = docusealTemplates.find(
                (t) => t.id === Number(id),
              );
              return {
                externalId: Number(id),
                status: "PENDING",
                templateId: Number(id),
                url: template?.documents?.[0]?.url || undefined,
                slug: template?.slug,
                fieldValues: form.docusealFieldValues[id] || undefined,
                submitters: template?.submitters?.map((init: any) => ({
                  role: init.name,
                  uuid: init.uuid,
                })),
              };
            }),
          }
        : {}),
    };
  }

  async function handleCreateAgreement(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.practiceId) {
      toast.error("Practice is required");
      return;
    }
    if (createForm.docusealTemplates.length === 0) {
      toast.error("Agreement template is required");
      return;
    }
    if (
      createForm.effectiveDate &&
      createForm.renewalDate &&
      new Date(createForm.renewalDate) <= new Date(createForm.effectiveDate)
    ) {
      toast.error("Renewal date must be greater than effective date");
      return;
    }

    if (createForm.docusealTemplates.length > 0) {
      const missingField = validateTemplateFieldValues(createForm);
      if (missingField) {
        toast.error(
          `${missingField.templateName}: ${missingField.fieldName} is required`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await createAgreementApi(buildPayload(createForm));
      const data = await getAgreementsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      closeCreateForm();
      toast.success("Agreement created successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create agreement";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateAgreement(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.practiceId) {
      toast.error("Practice is required");
      return;
    }
    if (
      editForm.effectiveDate &&
      editForm.renewalDate &&
      new Date(editForm.renewalDate) <= new Date(editForm.effectiveDate)
    ) {
      toast.error("Renewal date must be greater than effective date");
      return;
    }

    setIsSaving(true);
    try {
      const { docusealTemplates, ...updateData } = editForm;
      await updateAgreementApi(
        selectedRowId!,
        buildPayload(updateData as AgreementFormState),
      );
      const data = await getAgreementsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      toast.success("Agreement updated successfully");
    } catch (err) {
      console.log(err);
      const message =
        err instanceof Error ? err.message : "Failed to update agreement";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAgreement() {
    if (!selectedRowId) return;
    if (!window.confirm("Are you sure you want to delete this agreement?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAgreementApi(selectedRowId);
      const data = await getAgreementsView({
        page: pagination.page,
        limit: pagination.limit,
      });
      setRows(data.rows);
      setPagination(data.pagination);
      closeDetailPanel();
      toast.success("Agreement deleted successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete agreement";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSendForSignature() {
    const docusealId = getAgreementDocusealId(selectedAgreement!);
    if (!selectedAgreement || !selectedSignerId || !docusealId) {
      toast.error("Please select a person and ensure agreement has a template");
      return;
    }

    setIsSending(true);
    try {
      const result = await createDocusealSubmissionApi({
        agreementId: selectedAgreement.id,
        personId: selectedSignerId,
        templateId: docusealId,
      });

      if (result.submission?.embedUrl) {
        await sendAgreementEmailApi({
          agreementId: selectedAgreement.id,
          personId: selectedSignerId,
        });
      }

      toast.success("Signature request sent successfully!");
      setSelectedSignerId("");

      const updatedAgreement = await getAgreement(selectedAgreement.id);
      setSelectedAgreement(updatedAgreement);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send signature request";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  }

  function applyAutoSelectTemplates(templates: DocusealTemplate[]) {
    if (createForm.type !== "MSA") return;
    const autoSelectIds = templates
      .filter((t) =>
        AUTO_INCLUDE_TEMPLATE_NAMES.some((name) =>
          t.name.toLowerCase().includes(name.toLowerCase()),
        ),
      )
      .map((t) => String(t.id));
    if (autoSelectIds.length === 0) return;
    setCreateForm((prev) => {
      const nextIds = [
        ...new Set([...prev.docusealTemplates, ...autoSelectIds]),
      ];
      const nextFieldValues = { ...prev.docusealFieldValues };
      for (const templateId of autoSelectIds) {
        const template = templates.find((t) => String(t.id) === templateId);
        nextFieldValues[templateId] = {
          ...(prev.docusealFieldValues[templateId] || {}),
          ...buildTemplateFieldValues(template),
          ...buildCreateFormDocusealPrefillValues(template, prev, practices),
        };
      }
      return {
        ...prev,
        docusealTemplates: nextIds,
        docusealFieldValues: nextFieldValues,
      };
    });
  }

  async function loadDocusealTemplates() {
    if (docusealTemplates.length === 0) {
      setTemplatesLoading(true);
      try {
        const response = await getDocusealTemplates();
        const templates = response.templates.data;
        setDocusealTemplates(templates);
        applyAutoSelectTemplates(templates);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch templates";
        toast.error(message);
      } finally {
        setTemplatesLoading(false);
      }
    } else {
      applyAutoSelectTemplates(docusealTemplates);
    }
  }

  useEffect(() => {
    if (createForm.docusealTemplates.length === 0) {
      createFormAutoFilledValuesRef.current = {};
      return;
    }

    setCreateForm((prev) => {
      let hasChanges = false;
      const nextFieldValues = { ...prev.docusealFieldValues };
      const nextAutoFilledValues: Record<string, Record<string, string>> = {};

      for (const templateId of prev.docusealTemplates) {
        const template = docusealTemplates.find(
          (item) => String(item.id) === templateId,
        );
        if (!template) continue;

        const previousAutoFilled =
          createFormAutoFilledValuesRef.current[templateId] || {};
        const nextAutoFilled = buildCreateFormDocusealPrefillValues(
          template,
          prev,
          practices,
        );
        const currentValues = nextFieldValues[templateId] || {};
        const updatedValues = { ...currentValues };

        for (const [fieldUuid, nextValue] of Object.entries(nextAutoFilled)) {
          const currentValue = currentValues[fieldUuid] || "";
          const previousValue = previousAutoFilled[fieldUuid] || "";

          if (!currentValue || currentValue === previousValue) {
            updatedValues[fieldUuid] = nextValue;
            if (currentValue !== nextValue) {
              hasChanges = true;
            }
          }
        }

        nextFieldValues[templateId] = updatedValues;
        nextAutoFilledValues[templateId] = nextAutoFilled;
      }

      createFormAutoFilledValuesRef.current = nextAutoFilledValues;

      if (!hasChanges) {
        return prev;
      }

      return {
        ...prev,
        docusealFieldValues: nextFieldValues,
      };
    });
  }, [
    createForm.practiceId,
    createForm.effectiveDate,
    createForm.docusealTemplates,
    docusealTemplates,
    practices,
  ]);

  const navbarActions = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: openCreateForm,
    },
  ];

  const detailPanel = (
    <aside className="app-panel relative flex w-[500px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
        <button
          type="button"
          onClick={closeDetailPanel}
          className="text-slate-400 hover:text-slate-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Circle className="h-4 w-4 text-slate-300" />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
          {selectedAgreement?.type || "Agreement"}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#f0ece6] px-4">
        <button
          type="button"
          onClick={() => handleTabChange("overview")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium ${
            activeTab === "overview"
              ? "border-[#4f63ea] text-[#4f63ea]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Overview
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("versions")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium ${
            activeTab === "versions"
              ? "border-[#4f63ea] text-[#4f63ea]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" />
          Versions
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("terms")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium ${
            activeTab === "terms"
              ? "border-[#4f63ea] text-[#4f63ea]"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
          Service Terms
        </button>
      </div>

      {isDetailLoading || !selectedAgreement ? (
        <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
          Loading agreement...
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <form
              onSubmit={handleUpdateAgreement}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-auto p-4">
                {(() => {
                  const aStatusStyles: Record<string, string> = {
                    DRAFT: "bg-slate-100 text-slate-700",
                    ACTIVE: "bg-green-100 text-green-700",
                    PENDING_SIGNATURE: "bg-amber-100 text-amber-700",
                    SIGNED: "bg-blue-100 text-blue-700",
                    EXPIRED: "bg-red-100 text-red-700",
                    ARCHIVED: "bg-zinc-100 text-zinc-600",
                  };
                  const agStatus = selectedAgreement?.status || "";
                  return (
                    <DetailCard
                      title={selectedAgreement?.type || "Agreement"}
                      badge={
                        agStatus
                          ? {
                              label: agStatus,
                              className:
                                aStatusStyles[agStatus] ||
                                "bg-gray-100 text-gray-700",
                            }
                          : null
                      }
                      infoRows={[
                        ...(selectedAgreement?.practice?.name
                          ? [
                              {
                                label: "Practice",
                                value: selectedAgreement.practice.name,
                              },
                            ]
                          : []),
                        ...(selectedAgreement?.deal?.name
                          ? [
                              {
                                label: "Deal",
                                value: selectedAgreement.deal.name,
                              },
                            ]
                          : []),
                        ...(selectedAgreement?.value
                          ? [
                              {
                                label: "Value",
                                value: String(selectedAgreement.value),
                              },
                            ]
                          : []),
                      ]}
                    />
                  );
                })()}

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editForm.type}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          type: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    >
                      {agreementTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    >
                      {agreementStatusOptions.map((status) => (
                        <option key={status} value={status} disabled={true}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Effective Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={editForm.effectiveDate}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          effectiveDate: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Renewal Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={editForm.renewalDate}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          renewalDate: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Agreement Templates
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    {selectedAgreement?.docusealSubmissions?.length ? (
                      selectedAgreement.docusealSubmissions.map(
                        (submission) => {
                          const templateName =
                            docusealTemplates.find(
                              (template) =>
                                template.id === submission.templateId,
                            )?.name ||
                            (submission.templateId
                              ? `${
                                  submission?.name ||
                                  decodeURIComponent(
                                    submission?.url?.split("/").pop() || "",
                                  ).replace(".pdf", "")
                                } - ${submission.templateId}`
                              : "DocuSeal Template");
                          const savedFieldCount = Object.keys(
                            submission.fieldValues || {},
                          ).length;

                          return (
                            <div
                              key={`${submission.id}-${submission.templateId}`}
                              className="mb-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-[13px] font-medium text-slate-700">
                                    {templateName}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {savedFieldCount > 0
                                      ? `${savedFieldCount} saved field value${savedFieldCount === 1 ? "" : "s"}`
                                      : "No saved field values"}
                                  </div>
                                </div>
                                {submission.url ? (
                                  <a
                                    href={submission.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[13px] text-[#4f63ea] hover:text-[#3d4ed1] hover:underline"
                                  >
                                    Open Template
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          );
                        },
                      )
                    ) : (
                      <span className="text-[13px] text-slate-400">
                        No template attached
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                <button
                  type="button"
                  onClick={handleDeleteAgreement}
                  disabled={isDeleting}
                  className="flex items-center cursor-pointer gap-2 text-[13px] text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="app-control inline-flex items-center gap-2 cursor-pointer rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#4f63ea] hover:text-white disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}

          {/* Versions Tab */}
          {activeTab === "versions" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
                <h3 className="text-[14px] font-medium text-slate-700">
                  Versions ({versions.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingVersionId(null);
                    setShowVersionForm(!showVersionForm);
                    setVersionForm({
                      versionNumber: versions.length + 1,
                      isCurrent: true,
                      effectiveDate: "",
                      endDate: "",
                      notes: "",
                    });
                  }}
                  className="inline-flex items-center cursor-pointer gap-1.5 rounded-md bg-[#4f63ea] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#3d4ed1]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Version
                </button>
              </div>

              {showVersionForm && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedRowId) return;
                    setIsSavingVersion(true);
                    try {
                      if (editingVersionId) {
                        await updateAgreementVersionApi(editingVersionId, {
                          versionNumber: versionForm.versionNumber,
                          isCurrent: versionForm.isCurrent,
                          effectiveDate: versionForm.effectiveDate
                            ? new Date(versionForm.effectiveDate).toISOString()
                            : undefined,
                          endDate: versionForm.endDate
                            ? new Date(versionForm.endDate).toISOString()
                            : undefined,
                          notes: versionForm.notes,
                        });
                        toast.success("Version updated successfully");
                      } else {
                        await createAgreementVersionApi({
                          agreementId: selectedRowId,
                          versionNumber: versionForm.versionNumber,
                          isCurrent: versionForm.isCurrent,
                          effectiveDate: versionForm.effectiveDate
                            ? new Date(versionForm.effectiveDate).toISOString()
                            : undefined,
                          endDate: versionForm.endDate
                            ? new Date(versionForm.endDate).toISOString()
                            : undefined,
                          notes: versionForm.notes,
                        });
                        toast.success("Version created successfully");
                      }
                      setShowVersionForm(false);
                      setEditingVersionId(null);
                      loadVersions(selectedRowId);
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : `Failed to ${editingVersionId ? "update" : "create"} version`,
                      );
                    } finally {
                      setIsSavingVersion(false);
                    }
                  }}
                  className="border-b border-[#f0ece6] bg-[#faf9f7] p-4 space-y-3"
                >
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Version Number
                    </label>
                    <input
                      type="number"
                      value={versionForm.versionNumber}
                      onChange={(e) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          versionNumber: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={versionForm.isCurrent}
                      onChange={(e) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          isCurrent: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#4f63ea]"
                    />
                    <label className="text-[12px] text-slate-700">
                      Set as current version
                    </label>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      value={versionForm.effectiveDate}
                      onChange={(e) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          effectiveDate: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={versionForm.endDate}
                      onChange={(e) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Notes
                    </label>
                    <textarea
                      value={versionForm.notes}
                      onChange={(e) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSavingVersion}
                      className="rounded-md bg-[#4f63ea] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
                    >
                      {isSavingVersion
                        ? "Saving..."
                        : editingVersionId
                          ? "Update"
                          : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowVersionForm(false);
                        setEditingVersionId(null);
                      }}
                      className="rounded-md border border-[#ece8e1] px-3 py-1.5 text-[12px] font-medium text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="flex-1 overflow-auto">
                {versionsLoading ? (
                  <div className="flex items-center justify-center p-4 text-[13px] text-slate-400">
                    Loading versions...
                  </div>
                ) : versions.length === 0 ? (
                  <div className="flex items-center justify-center p-4 text-[13px] text-slate-400">
                    No versions found. Create one to get started.
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0ece6]">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-[#faf9f7]"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-slate-700">
                              Version {version.versionNumber}
                            </span>
                            {version.isCurrent && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-[12px] text-slate-500">
                            {version.effectiveDate
                              ? `Effective: ${new Date(version.effectiveDate).toLocaleDateString()}`
                              : "No effective date"}
                            {version.endDate &&
                              ` - ${new Date(version.endDate).toLocaleDateString()}`}
                          </div>
                          {version.notes && (
                            <div className="mt-1 text-[12px] text-slate-500">
                              {version.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVersionId(version.id);
                              setVersionForm({
                                versionNumber: version.versionNumber,
                                isCurrent: version.isCurrent,
                                effectiveDate: version.effectiveDate
                                  ? new Date(version.effectiveDate)
                                      .toISOString()
                                      .slice(0, 10)
                                  : "",
                                endDate: version.endDate
                                  ? new Date(version.endDate)
                                      .toISOString()
                                      .slice(0, 10)
                                  : "",
                                notes: version.notes || "",
                              });
                              setShowVersionForm(true);
                            }}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!window.confirm("Delete this version?"))
                                return;
                              try {
                                await deleteAgreementVersionApi(version.id);
                                toast.success("Version deleted");
                                if (selectedRowId) loadVersions(selectedRowId);
                              } catch (err) {
                                toast.error(
                                  err instanceof Error
                                    ? err.message
                                    : "Failed to delete",
                                );
                              }
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Service Terms Tab */}
          {activeTab === "terms" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
                <h3 className="text-[14px] font-medium text-slate-700">
                  Service Terms ({serviceTerms.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTermId(null);
                    setShowTermForm(!showTermForm);
                    setTermForm({
                      serviceId: "",
                      agreementVersionId: "",
                      vendorId: "",
                      vendorFlatAmount: "",
                      vendorPercentOfClient: "",
                      pricingModel: "PER_PATIENT" as PricingModel,
                      pricingConfig: "{}",
                      currency: "USD",
                      priority: 1,
                      minimumFee: "",
                      effectiveDate: "",
                      endDate: "",
                      isActive: true,
                      externalReference: "",
                    });
                  }}
                  className="inline-flex items-center cursor-pointer gap-1.5 rounded-md bg-[#4f63ea] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#3d4ed1]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Term
                </button>
              </div>

              {showTermForm && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedRowId || !termForm.serviceId) {
                      toast.error("Service is required");
                      return;
                    }
                    setIsSavingTerm(true);
                    try {
                      const parsedConfig = JSON.parse(
                        termForm.pricingConfig || "{}",
                      );
                      const finalConfig = {
                        ...parsedConfig,
                        vendorFlatAmount: termForm.vendorFlatAmount
                          ? parseFloat(termForm.vendorFlatAmount)
                          : undefined,
                        vendorPercentOfClient: termForm.vendorPercentOfClient
                          ? parseFloat(termForm.vendorPercentOfClient)
                          : undefined,
                      };

                      if (editingTermId) {
                        await updateAgreementServiceTermApi(editingTermId, {
                          serviceId: termForm.serviceId,
                          agreementVersionId: termForm.agreementVersionId,
                          vendorId: termForm.vendorId || null,
                          pricingModel: termForm.pricingModel,
                          pricingConfig: finalConfig,
                          currency: termForm.currency,
                          priority: termForm.priority,
                          minimumFee: termForm.minimumFee
                            ? parseFloat(termForm.minimumFee)
                            : undefined,
                          effectiveDate: termForm.effectiveDate
                            ? new Date(termForm.effectiveDate).toISOString()
                            : undefined,
                          endDate: termForm.endDate
                            ? new Date(termForm.endDate).toISOString()
                            : undefined,
                          isActive: termForm.isActive,
                          externalReference: termForm.externalReference,
                        });
                        toast.success("Service term updated successfully");
                      } else {
                        await createAgreementServiceTermApi({
                          agreementId: selectedRowId,
                          agreementVersionId: termForm.agreementVersionId,
                          serviceId: termForm.serviceId,
                          vendorId: termForm.vendorId || null,
                          pricingModel: termForm.pricingModel,
                          pricingConfig: finalConfig,
                          currency: termForm.currency,
                          priority: termForm.priority,
                          minimumFee: termForm.minimumFee
                            ? parseFloat(termForm.minimumFee)
                            : undefined,
                          effectiveDate: termForm.effectiveDate
                            ? new Date(termForm.effectiveDate).toISOString()
                            : undefined,
                          endDate: termForm.endDate
                            ? new Date(termForm.endDate).toISOString()
                            : undefined,
                          isActive: termForm.isActive,
                          externalReference: termForm.externalReference,
                        });
                        toast.success("Service term created successfully");
                      }
                      setShowTermForm(false);
                      setEditingTermId(null);
                      loadServiceTerms(selectedRowId);
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : `Failed to ${editingTermId ? "update" : "create"} term`,
                      );
                    } finally {
                      setIsSavingTerm(false);
                    }
                  }}
                  className="border-b border-[#f0ece6] bg-[#faf9f7] p-4 space-y-3 max-h-[400px] overflow-y-auto"
                >
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Service <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={termForm.serviceId}
                      onChange={(e) =>
                        setTermForm((prev) => ({
                          ...prev,
                          serviceId: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      required
                    >
                      <option value="">Select Service</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Agreement Version <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={termForm.agreementVersionId}
                      onChange={(e) =>
                        setTermForm((prev) => ({
                          ...prev,
                          agreementVersionId: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      required
                    >
                      <option value="">Select Agreement Version</option>
                      {selectedAgreement?.versions?.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          Version: {s.versionNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Vendor
                    </label>
                    <select
                      value={termForm.vendorId}
                      onChange={(e) =>
                        setTermForm((prev) => ({
                          ...prev,
                          vendorId: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                    >
                      <option value="">None</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Pricing Model <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={termForm.pricingModel}
                      onChange={(e) =>
                        setTermForm((prev) => ({
                          ...prev,
                          pricingModel: e.target.value as PricingModel,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      required
                    >
                      {pricingModelOptions.map((model) => (
                        <option key={model} value={model}>
                          {model.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[12px] font-medium text-slate-700">
                      Pricing Config (JSON)
                    </label>
                    <textarea
                      value={termForm.pricingConfig}
                      onChange={(e) =>
                        setTermForm((prev) => ({
                          ...prev,
                          pricingConfig: e.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-1.5 text-[12px] font-mono"
                      rows={3}
                      placeholder='{"rate": 100}'
                    />
                  </div>

                  {termForm.vendorId && (
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-3 space-y-3">
                      <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                        Vendor Payout Config
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[12px] font-medium text-slate-700">
                            Vendor Flat Amount ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={termForm.vendorFlatAmount}
                            onChange={(e) =>
                              setTermForm((prev) => ({
                                ...prev,
                                vendorFlatAmount: e.target.value,
                              }))
                            }
                            className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                            placeholder="e.g. 3000"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[12px] font-medium text-slate-700">
                            Vendor % of Client
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={termForm.vendorPercentOfClient}
                            onChange={(e) =>
                              setTermForm((prev) => ({
                                ...prev,
                                vendorPercentOfClient: e.target.value,
                              }))
                            }
                            className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                            placeholder="e.g. 70"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 italic">
                        Note: Leave both empty if vendor pricing is defined
                        inside the JSON config above.
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-slate-700">
                        Minimum Fee
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={termForm.minimumFee}
                        onChange={(e) =>
                          setTermForm((prev) => ({
                            ...prev,
                            minimumFee: e.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-slate-700">
                        Priority
                      </label>
                      <input
                        type="number"
                        value={termForm.priority}
                        onChange={(e) =>
                          setTermForm((prev) => ({
                            ...prev,
                            priority: parseInt(e.target.value) || 1,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-slate-700">
                        Effective Date
                      </label>
                      <input
                        type="date"
                        value={termForm.effectiveDate}
                        onChange={(e) =>
                          setTermForm((prev) => ({
                            ...prev,
                            effectiveDate: e.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[12px] font-medium text-slate-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={termForm.endDate}
                        onChange={(e) =>
                          setTermForm((prev) => ({
                            ...prev,
                            endDate: e.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-1.5 text-[12px]"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={termForm.isActive}
                      onChange={(e) =>
                        setTermForm((prev) => ({
                          ...prev,
                          isActive: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#4f63ea]"
                    />
                    <label className="text-[12px] text-slate-700">Active</label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSavingTerm}
                      className="rounded-md bg-[#4f63ea] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
                    >
                      {isSavingTerm
                        ? "Saving..."
                        : editingTermId
                          ? "Update"
                          : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTermForm(false);
                        setEditingTermId(null);
                      }}
                      className="rounded-md border border-[#ece8e1] px-3 py-1.5 text-[12px] font-medium text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="flex-1 overflow-auto">
                {termsLoading ? (
                  <div className="flex items-center justify-center p-4 text-[13px] text-slate-400">
                    Loading service terms...
                  </div>
                ) : serviceTerms.length === 0 ? (
                  <div className="flex items-center justify-center p-4 text-[13px] text-slate-400">
                    No service terms found. Add one to get started.
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0ece6]">
                    {serviceTerms.map((term) => (
                      <div
                        key={term.id}
                        className="px-4 py-3 hover:bg-[#faf9f7]"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-slate-700">
                                {term.service?.name || "Unknown Service"}
                              </span>
                              {term.approvalStatus === "PENDING" && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                  Pending Approval
                                </span>
                              )}
                              {term.approvalStatus === "REJECTED" && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                                  Rejected
                                </span>
                              )}
                              {term.isActive && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-[12px] text-slate-500">
                              {formatPricingModel(term.pricingModel)} •{" "}
                              {term.currency}
                              {term.vendor?.name &&
                                ` • Vendor: ${term.vendor.name}`}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              Priority: {term.priority}
                              {term.minimumFee &&
                                ` • Min Fee: $${term.minimumFee}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTermId(term.id);
                                const config =
                                  (term.pricingConfig as any) || {};
                                setTermForm({
                                  serviceId: term.serviceId,
                                  agreementVersionId:
                                    term.agreementVersionId || "",
                                  vendorId: term.vendorId || "",
                                  vendorFlatAmount:
                                    config.vendorFlatAmount?.toString() || "",
                                  vendorPercentOfClient:
                                    config.vendorPercentOfClient?.toString() ||
                                    "",
                                  pricingModel:
                                    term.pricingModel as PricingModel,
                                  pricingConfig: JSON.stringify(config),
                                  currency: term.currency || "USD",
                                  priority: term.priority || 1,
                                  minimumFee: term.minimumFee?.toString() || "",
                                  effectiveDate: term.effectiveDate
                                    ? new Date(term.effectiveDate)
                                        .toISOString()
                                        .slice(0, 10)
                                    : "",
                                  endDate: term.endDate
                                    ? new Date(term.endDate)
                                        .toISOString()
                                        .slice(0, 10)
                                    : "",
                                  isActive: !!term.isActive,
                                  externalReference:
                                    term.externalReference || "",
                                });
                                setShowTermForm(true);
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  !window.confirm("Delete this service term?")
                                )
                                  return;
                                try {
                                  await deleteAgreementServiceTermApi(term.id);
                                  toast.success("Service term deleted");
                                  if (selectedRowId)
                                    loadServiceTerms(selectedRowId);
                                } catch (err) {
                                  toast.error(
                                    err instanceof Error
                                      ? err.message
                                      : "Failed to delete",
                                  );
                                }
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  );

  const createPanel = (
    <aside className="app-panel flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-slate-700">
          Create Agreement
        </h2>
        <button
          type="button"
          onClick={closeCreateForm}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form
        onSubmit={handleCreateAgreement}
        className="flex-1 overflow-auto p-4"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Practice <span className="text-red-500">*</span>
            </label>
            {optionsLoading ? (
              <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                Loading...
              </div>
            ) : (
              <select
                value={createForm.practiceId}
                onChange={(event) => {
                  setCreateForm((prev) => ({
                    ...prev,
                    practiceId: event.target.value,
                    dealId: "",
                  }));
                }}
                className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                required
              >
                <option value="">Select Practice</option>
                {practices.map((practice) => (
                  <option key={practice.id} value={practice.id}>
                    {practice.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              value={createForm.type}
              onChange={(event) => {
                const newType = event.target.value;
                setCreateForm((prev) => ({
                  ...prev,
                  type: newType,
                }));
                if (newType === "MSA") {
                  const autoSelectIds = docusealTemplates
                    .filter((t) =>
                      AUTO_INCLUDE_TEMPLATE_NAMES.some((name) =>
                        t.name.toLowerCase().includes(name.toLowerCase()),
                      ),
                    )
                    .map((t) => String(t.id));
                  autoSelectIds.forEach((templateId) =>
                    addTemplateToForm(templateId, setCreateForm),
                  );
                }
              }}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              required
            >
              {agreementTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={createForm.status}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  status: event.target.value,
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              required
            >
              {agreementStatusOptions.map((status) => (
                <option
                  key={status}
                  value={status}
                  // disabled={status === "SIGNED" || status === "ACTIVE"}
                  disabled={status !== "DRAFT"}
                >
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          {/*<div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Value
            </label>
            <input
              type="number"
              step="0.01"
              value={createForm.value}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  value: event.target.value,
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              placeholder="0.00"
            />
          </div>*/}

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Effective Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={createForm.effectiveDate}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  effectiveDate: event.target.value,
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Renewal Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={createForm.renewalDate}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  renewalDate: event.target.value,
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>

          {/*<div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Termination Date
            </label>
            <input
              type="date"
              value={createForm.terminationDate}
              onChange={(event) =>
                setCreateForm((prev) => ({
                  ...prev,
                  terminationDate: event.target.value,
                }))
              }
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>*/}

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">
              Agreement Templates <span className="text-red-500">*</span>
            </label>

            {/* Selected templates as chips */}
            {createForm.docusealTemplates.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {createForm.docusealTemplates.map((templateId: string) => {
                  const template = docusealTemplates.find(
                    (t) => String(t.id) === templateId,
                  );
                  const isAutoInclude = template
                    ? AUTO_INCLUDE_TEMPLATE_NAMES.some((name) =>
                        template.name
                          .toLowerCase()
                          .includes(name.toLowerCase()),
                      )
                    : false;
                  return (
                    <span
                      key={templateId}
                      className="inline-flex items-center gap-1 rounded-md bg-[#f0f2fe] px-2 py-1 text-[12px] text-[#4f63ea]"
                    >
                      {template?.name || templateId}
                      {!isAutoInclude && (
                        <button
                          type="button"
                          onClick={() =>
                            removeTemplateFromForm(templateId, setCreateForm)
                          }
                          className="hover:text-red-500"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Search dropdown */}
            <div className="relative" ref={templateDropdownRef}>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => {
                    setTemplateSearch(e.target.value);
                    if (!showTemplateDropdown) setShowTemplateDropdown(true);
                  }}
                  onFocus={() => {
                    loadDocusealTemplates();
                    setShowTemplateDropdown(true);
                  }}
                  placeholder="Search templates..."
                  className="app-control w-full rounded-md py-2 pl-8 pr-3 text-[13px]"
                />
              </div>

              {showTemplateDropdown && (
                <div className="absolute z-10 mt-1 max-h-[200px] w-full overflow-y-auto rounded-md border border-[#ece8e1] bg-white shadow-lg">
                  {templatesLoading ? (
                    <div className="flex items-center justify-center py-6 text-[13px] text-slate-400">
                      Loading...
                    </div>
                  ) : docusealTemplates.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[13px] text-slate-400">
                      No templates available
                    </div>
                  ) : (
                    (() => {
                      const filtered = templateSearch
                        ? docusealTemplates.filter((t) =>
                            t.name
                              .toLowerCase()
                              .includes(templateSearch.toLowerCase()),
                          )
                        : docusealTemplates;
                      return filtered.map((template) => {
                        const templateId = String(template.id);
                        const isSelected =
                          createForm.docusealTemplates.includes(templateId);
                        const isAutoInclude = AUTO_INCLUDE_TEMPLATE_NAMES.some(
                          (name) =>
                            template.name
                              .toLowerCase()
                              .includes(name.toLowerCase()),
                        );
                        const isDisabled = isSelected || isAutoInclude;
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => {
                              if (isDisabled) return;
                              addTemplateToForm(templateId, setCreateForm);
                            }}
                            className={`w-full px-3 py-2 text-left text-[13px] hover:bg-[#faf9f7] ${
                              isDisabled
                                ? "cursor-not-allowed text-slate-400"
                                : "text-slate-700"
                            }`}
                            disabled={isDisabled}
                          >
                            {template.name}
                            {isAutoInclude && (
                              <span className="ml-1 text-xs text-slate-400">
                                (required)
                              </span>
                            )}
                            {isSelected && !isAutoInclude && (
                              <span className="ml-1 text-xs text-[#4f63ea]">
                                (selected)
                              </span>
                            )}
                          </button>
                        );
                      });
                    })()
                  )}
                </div>
              )}
            </div>

            {createForm.docusealTemplates.length > 0 && (
              <div className="mt-4 space-y-4 rounded-xl border border-dashed border-indigo-100 bg-indigo-50/30 p-4">
                <div>
                  <h3 className="text-[13px] font-semibold text-slate-700">
                    Template Fields
                  </h3>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Complete the template inputs now so the agreement can be
                    pre-populated before sending.
                  </p>
                </div>

                <div className="space-y-4">
                  {createForm.docusealTemplates.map((templateId: string) => {
                    const template = docusealTemplates.find(
                      (t) => String(t.id) === templateId,
                    );
                    if (!template) return null;

                    const editableFields = (template.fields || []).filter(
                      isEditableDocusealField,
                    );
                    const templateFieldValues =
                      createForm.docusealFieldValues[templateId] || {};
                    const submitterGroups = getTemplateSubmitterGroups(
                      template,
                      templateFieldValues,
                    );

                    return (
                      <div
                        key={templateId}
                        className="rounded-lg border border-indigo-100 bg-white p-3 shadow-sm"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[13px] font-medium text-slate-700">
                              {template.name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {editableFields.length} fillable field
                              {editableFields.length === 1 ? "" : "s"}
                            </div>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                            DocuSeal
                          </span>
                        </div>

                        {editableFields.length === 0 ? (
                          <p className="rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
                            This template has no editable fields.
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {submitterGroups.map((group) =>
                              group.fields.length > 0 ? (
                                <div key={group.submitterUuid}>
                                  <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                                    {group.submitterName}
                                  </div>
                                  <div className="grid gap-3 md:grid-cols-2">
                                    {group.fields.map((field, fieldIndex) => {
                                      const inputType =
                                        getDocusealFieldInputType(field);
                                      const value =
                                        templateFieldValues[field.uuid] ||
                                        templateFieldValues[field.name] ||
                                        "";

                                      return (
                                        <label
                                          key={field.uuid}
                                          className={`block ${
                                            group.fields.length % 2 === 1 &&
                                            fieldIndex ===
                                              group.fields.length - 1
                                              ? "md:col-span-2"
                                              : ""
                                          }`}
                                        >
                                          <span className="mb-1 block text-[12px] font-medium text-slate-700">
                                            {getDocusealFieldLabel(
                                              field,
                                              fieldIndex,
                                            )}
                                            {field.required && (
                                              <span className="ml-1 text-red-500">
                                                *
                                              </span>
                                            )}
                                          </span>
                                          <input
                                            type={inputType}
                                            value={value}
                                            required={field.required}
                                            onChange={(event) =>
                                              updateTemplateFieldValue(
                                                templateId,
                                                field.uuid,
                                                event.target.value,
                                                setCreateForm,
                                              )
                                            }
                                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                                            placeholder={`Enter ${getDocusealFieldLabel(
                                              field,
                                              fieldIndex,
                                            )}`}
                                          />
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null,
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
            <button
              type="button"
              onClick={closeCreateForm}
              className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] cursor-pointer font-medium text-slate-600 hover:bg-[#f7f5f1]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="app-control rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#f7f5f1] cursor-pointer disabled:opacity-50"
            >
              {
                // isSubmitting
                // ? "Creating..."
                //   :
                isAdmin ? "Create Agreement" : "Sent Agreement For Approval"
              }
            </button>
          </div>
          {/*<button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-[#4f63ea] py-2 text-[14px] font-medium text-white hover:bg-[#3d4ed1]"
          >
            {isSubmitting ? "Creating..." : "Create Agreement"}
          </button>*/}
        </div>
      </form>
    </aside>
  );

  if (isLoading) {
    return (
      <AppLayout
        title="Agreements"
        activeModule="Agreements"
        activeSubItem="All Agreements"
        navbarActions={navbarActions}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading agreements...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Agreements"
      activeModule="Agreements"
      activeSubItem="All Agreements"
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2 font-app-sans">
        <div className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e8e3db] bg-white">
          <div className="flex items-center justify-between border-b border-[#eeebe5] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              <span>Agreements</span>
              {/*<span className="text-slate-400">
                .{table.getRowModel().rows.length}
              </span>*/}
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                Filters
              </button>
              <button
                type="button"
                onClick={() =>
                  setSorting((current) =>
                    current[0]?.id === "creationDate"
                      ? [{ id: "creationDate", desc: !current[0].desc }]
                      : [{ id: "creationDate", desc: true }],
                  )
                }
              >
                Sort
              </button>
            </div>
          </div>

          {showFilterPanel && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] bg-[#faf9f7] px-4 py-2.5">
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, status: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Statuses</option>
                {agreementStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
              <select
                value={filters.type}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, type: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Types</option>
                {agreementTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setFilters({ search: "", status: "", type: "" })}
                className="text-[13px] text-[#4f63ea] hover:underline"
                disabled={!filters.status && !filters.type}
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-10 bg-white text-[13px] font-medium text-slate-400">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header, index) => (
                      <th
                        key={header.id}
                        className={`border-b border-[#eeebe5] px-4 py-3 ${
                          index < headerGroup.headers.length - 1
                            ? "border-r border-[#f2eee8]"
                            : ""
                        }`}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="text-[14px] text-slate-600">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      selectedRowId === row.original.id
                        ? "bg-[#fcfbf9]"
                        : "bg-white"
                    }
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <td
                        key={cell.id}
                        className={`border-b border-[#f4f1ec] px-4 py-3 ${
                          index < row.getVisibleCells().length - 1
                            ? "border-r border-[#f5f2ed]"
                            : ""
                        }`}
                      >
                        {cell.column.id === "name" ? (
                          <button
                            type="button"
                            onClick={() => handleRowClick(row.original.id)}
                            className="hover:text-[#4f63ea]"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </button>
                        ) : (
                          flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rows.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-2.5">
              <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Previous
                </button>
                {Array.from(
                  { length: pagination.totalPages },
                  (_, i) => i + 1,
                ).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setPagination((prev) => ({ ...prev, page }))}
                    className={`rounded px-2 py-1 text-[13px] ${
                      pagination.page === page
                        ? "bg-[#4f63ea] text-white"
                        : "text-slate-500 hover:bg-[#f0ece6]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {showDetailPanel && detailPanel}
        {showCreateForm && createPanel}
      </div>
    </AppLayout>
  );
}

export default AllAgreementsPage;
