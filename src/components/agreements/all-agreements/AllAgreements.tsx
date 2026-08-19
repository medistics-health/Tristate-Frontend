import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useRef } from "react";
import {
  canBusinessWrite,
  hasAdminAccess,
  readStoredUser,
} from "../../../utils/auth";
import {
  ChevronDown,
  ChevronLeft,
  Circle,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  ExternalLink,
  FileText,
  GitBranch,
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
import { DetailCard } from "../../../components/shared/tablePageUtils";
import DataTableToolbar, {
  SortableHeaderCell,
  type ActiveFilterChip,
} from "../../shared/DataTableToolbar";
import Select from "../../shared/Select";
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
  TERMINATED: "bg-red-100 text-red-700",
  INACTIVE: "bg-red-100 text-red-700",
  ARCHIVED: "bg-zinc-100 text-zinc-600",
};

const agreementStatusOptions = [
  "DRAFT",
  "SENT",
  "ACTIVE",
  "EXPIRED",
  "TERMINATED",
  "SIGNED",
  "INACTIVE",
];

const agreementTypeOptions = ["MSA", "SOW", "RENEWAL", "ADDENDUM"];

const AUTO_INCLUDE_TEMPLATE_NAMES = [
  "Master Service Agreement",
  "BAA",
  "Credentialing Exhibit",
  "Mutual NDA",
  // "Exhibit P",
];

const HIDDEN_TEMPLATE_NAME_PATTERNS = ["Khan_", "Dr. Anil Patel", "Dr. Anul Patel", "Dr. Shah"];

function isHiddenTemplate(name: string): boolean {
  const lower = name.toLowerCase();
  return HIDDEN_TEMPLATE_NAME_PATTERNS.some((p) =>
    lower.includes(p.toLowerCase()),
  );
}

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
  serviceIds: string[];
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
  serviceIds: [],
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
      fieldName.includes("first party") &&
      fieldName.includes("name")
    ) {
      value = "Tristate";
    } else if (
      fieldName.includes("second party") &&
      fieldName.includes("name")
    ) {
      value = practice?.name || "";
    } else if (
      fieldName.includes("client") ||
      fieldName.includes("practice") ||
      fieldName.includes("clinic")
    ) {
      // value = practice?.name || "";
    } else if (fieldName.includes("npi")) {
      values[field.uuid] = practice?.npi || "";
      continue;
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
    serviceIds: agreement.services?.map((s) => s.id) || [],
  };
}

type AgreementRow = {
  id: string;
  values: Record<string, string | number | null>;
};

function AllAgreementsPage() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const isAdmin = hasAdminAccess(currentRole);
  const canWriteAgreements = canBusinessWrite(currentRole);
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
  const [profileAgreementOpenHandled, setProfileAgreementOpenHandled] =
    useState(false);
  const templateDropdownRef = useRef<HTMLDivElement>(null);
  const createFormAutoFilledValuesRef = useRef<
    Record<string, Record<string, string>>
  >({});
  const prevPracticeIdRef = useRef<string>("");

  // Tabs for detail panel
  const [activeTab, setActiveTab] = useState<"overview" | "versions">(
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
        id: "services",
        accessorFn: (row: AgreementRow) => row.values.services,
        header: () => "Services",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.services || "-"),
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
        accessorFn: (row: AgreementRow) => {
          const timestamp = Date.parse(
            String(row.values.createdAt || row.values.creationDate || ""),
          );
          return Number.isNaN(timestamp) ? 0 : timestamp;
        },
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
          const isComplete = status.includes(" signed");
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

  const refreshAgreementRecords = async () => {
    if (!(filters.search.length > 2 || filters.search.length === 0)) return;

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
        params.sortBy =
          (
            {
              creationDate: "createdAt",
              lastUpdate: "updatedAt",
            } as Record<string, string>
          )[sorting[0].id] || sorting[0].id;
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
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshAgreementRecords();
    }, 500);

    return () => clearTimeout(timer);
  }, [pagination.page, pagination.limit, sorting, filters, searchParams]);

  useEffect(() => {
    if ((showCreateForm || showDetailPanel) && practices.length === 0) {
      setOptionsLoading(true);
      Promise.all([
        getAllPractices(),
        getAllServices(),
      ])
        .then(([practiceList, serviceList]) => {
          setPractices(practiceList);
          setServices(serviceList);
        })
        .catch((err) => console.error("Failed to load options:", err))
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
    const agreementId = searchParams.get("agreementId");
    const tab = searchParams.get("tab");
    const action = searchParams.get("action");

    if (profileAgreementOpenHandled || action === "create" || !agreementId) {
      return;
    }

    setProfileAgreementOpenHandled(true);
    void (async () => {
      await handleRowClick(agreementId);
      if (tab === "versions") {
        setActiveTab("versions");
        await loadVersions(agreementId);
      }
    })();
  }, [profileAgreementOpenHandled, searchParams]);

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
      const loadedVersions = data as AgreementVersion[];
      if (
        loadedVersions.length > 0 &&
        !loadedVersions.some((version) => version.isCurrent)
      ) {
        const nextCurrentVersion = [...loadedVersions].sort(
          (a, b) => b.versionNumber - a.versionNumber,
        )[0];
        const updatedVersion = await updateAgreementVersionApi(
          nextCurrentVersion.id,
          { isCurrent: true },
        );
        setVersions(
          loadedVersions.map((version) =>
            version.id === updatedVersion.id
              ? { ...version, isCurrent: true }
              : version,
          ),
        );
        return;
      }
      setVersions(loadedVersions);
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

  function handleTabChange(tab: "overview" | "versions") {
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
    if (!canWriteAgreements) {
      toast.error("You do not have permission to create agreements.");
      return;
    }
    setCreateForm(initialFormState);
    createFormAutoFilledValuesRef.current = {};
    prevPracticeIdRef.current = "";
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
    prevPracticeIdRef.current = "";
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
      ...(form.serviceIds?.length > 0
        ? { serviceIds: form.serviceIds }
        : {}),
    };
  }

  async function handleCreateAgreement(e: React.FormEvent) {
    e.preventDefault();
    if (!canWriteAgreements) {
      toast.error("You do not have permission to create agreements.");
      return;
    }
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
    if (!canWriteAgreements) {
      toast.error("You do not have permission to update agreements.");
      return;
    }
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
    if (!canWriteAgreements) {
      toast.error("You do not have permission to inactivate agreements.");
      return;
    }
    if (editForm.status === "INACTIVE") {
      toast.error("Agreement is Already Inactive");
      return;
    }
    if (!window.confirm("Are you sure you want to Inactive this agreement?")) {
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
      toast.success("Agreement Inactivated successfully");
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
        const visible = response.templates.data.filter((t) => !isHiddenTemplate(t.name));
        setDocusealTemplates(visible);
        applyAutoSelectTemplates(visible);
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
      prevPracticeIdRef.current = createForm.practiceId;
      return;
    }

    const practiceChanged = prevPracticeIdRef.current !== createForm.practiceId;
    prevPracticeIdRef.current = createForm.practiceId;

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

          if (practiceChanged || !currentValue || currentValue === previousValue) {
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
  function getSignedDocumentUrls(submission: {
    signedDocUrl?: string | null;
    signedDocUrls?: string | null;
  }) {
    const rawValue = submission.signedDocUrl || submission.signedDocUrls;
    if (!rawValue) return [];

    const trimmed = rawValue.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (url): url is string => typeof url === "string" && Boolean(url),
        );
      }
    } catch {
      // Support plain string and comma-separated URL formats.
    }

    return trimmed
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);
  }

  function getDocumentLabel(url: string, fallback: string) {
    try {
      const pathname = new URL(url).pathname;
      const filename = decodeURIComponent(pathname.split("/").pop() || "");
      return filename.replace(/\.pdf$/i, "") || fallback;
    } catch {
      return fallback;
    }
  }

  const navbarActions = canWriteAgreements
    ? [
        {
          label: "New record",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreateForm,
        },
      ]
    : [];

  const activeFilterCount = [filters.status, filters.type].filter(Boolean).length;

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.status) {
      chips.push({
        key: "status",
        label: "Status",
        displayValue: formatStatusLabel(filters.status),
        onClear: () => {
          setFilters((curr) => ({ ...curr, status: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.type) {
      chips.push({
        key: "type",
        label: "Type",
        displayValue: filters.type,
        onClear: () => {
          setFilters((curr) => ({ ...curr, type: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    return chips;
  }, [filters.status, filters.type]);

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Status
        </span>
        <Select
          value={filters.status}
          onChange={(val) => {
            setFilters((prev) => ({ ...prev, status: val }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          options={[
            { label: "All Statuses", value: "" },
            ...agreementStatusOptions.map((status) => ({
              label: formatStatusLabel(status),
              value: status,
            })),
          ]}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Type
        </span>
        <Select
          value={filters.type}
          onChange={(val) => {
            setFilters((prev) => ({ ...prev, type: val }));
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          options={[
            { label: "All Types", value: "" },
            ...agreementTypeOptions.map((type) => ({
              label: type,
              value: type,
            })),
          ]}
        />
      </label>
    </>
  );

  const detailPanel = (
    <aside className="app-panel app-detail-panel relative flex w-full max-w-full lg:w-[500px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
                    TERMINATED: "bg-red-100 text-red-700",
                    INACTIVE: "bg-red-100 text-red-700",
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
                        <option
                          key={status}
                          value={status}
                          disabled={
                            status !== "TERMINATED" && status !== "INACTIVE"
                          }
                        >
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
                              : "External Agreement");
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

              {canWriteAgreements && (
                <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                  <button
                    type="button"
                    onClick={handleDeleteAgreement}
                    disabled={isDeleting}
                    className="flex items-center cursor-pointer gap-2 text-[13px] text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Inactivating..." : "Inactive"}
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
              )}
            </form>
          )}

          {/* Versions Tab */}
          {activeTab === "versions" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
                <h3 className="text-[14px] font-medium text-slate-700">
                  Versions ({versions.length})
                </h3>
                {canWriteAgreements && (
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
                )}
              </div>

              {showVersionForm && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!canWriteAgreements) {
                      toast.error(
                        "You do not have permission to update agreement versions.",
                      );
                      return;
                    }
                    if (!selectedRowId) return;
                    const isOnlyCurrentVersion =
                      editingVersionId &&
                      versions.find(
                        (version) => version.id === editingVersionId,
                      )?.isCurrent &&
                      versions.filter((version) => version.isCurrent).length ===
                        1;

                    if (isOnlyCurrentVersion && !versionForm.isCurrent) {
                      toast.error(
                        "At least one agreement version must remain current.",
                      );
                      return;
                    }

                    const nextIsCurrent =
                      versions.length === 0 || versionForm.isCurrent;

                    setIsSavingVersion(true);
                    try {
                      if (editingVersionId) {
                        await updateAgreementVersionApi(editingVersionId, {
                          versionNumber: versionForm.versionNumber,
                          isCurrent: nextIsCurrent,
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
                          isCurrent: nextIsCurrent,
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
                      disabled={
                        Boolean(editingVersionId) &&
                        Boolean(
                          versions.find(
                            (version) => version.id === editingVersionId,
                          )?.isCurrent,
                        ) &&
                        versions.filter((version) => version.isCurrent)
                          .length === 1
                      }
                      onChange={(e) =>
                        setVersionForm((prev) => ({
                          ...prev,
                          isCurrent: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-[#4f63ea] disabled:opacity-50"
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
                        {canWriteAgreements && (
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
                                  if (
                                    version.isCurrent &&
                                    versions.length > 1
                                  ) {
                                    const nextCurrentVersion = versions
                                      .filter((item) => item.id !== version.id)
                                      .sort(
                                        (a, b) =>
                                          b.versionNumber - a.versionNumber,
                                      )[0];
                                    await updateAgreementVersionApi(
                                      nextCurrentVersion.id,
                                      { isCurrent: true },
                                    );
                                  }
                                  await deleteAgreementVersionApi(version.id);
                                  toast.success("Version deleted");
                                  if (selectedRowId)
                                    loadVersions(selectedRowId);
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
                        )}
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
    <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
                if (newType) {
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
              Services
            </label>
            <div className="relative">
              {optionsLoading ? (
                <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                  Loading...
                </div>
              ) : (
                <>
                  {createForm.serviceIds.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {createForm.serviceIds.map((serviceId) => {
                        const service = services.find((s) => s.id === serviceId);
                        return (
                          <span
                            key={serviceId}
                            className="inline-flex items-center gap-1 rounded-md bg-[#f0f2fe] px-2 py-1 text-[12px] text-[#4f63ea]"
                          >
                            {service?.name || serviceId}
                            <button
                              type="button"
                              onClick={() =>
                                setCreateForm((prev) => ({
                                  ...prev,
                                  serviceIds: prev.serviceIds.filter(
                                    (id) => id !== serviceId,
                                  ),
                                }))
                              }
                              className="hover:text-red-500"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <details className="relative">
                    <summary className="app-control flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-[13px] text-slate-600">
                      <span className={createForm.serviceIds.length === 0 ? "text-slate-400" : ""}>
                        {createForm.serviceIds.length === 0
                          ? "Select services..."
                          : `${createForm.serviceIds.length} service${createForm.serviceIds.length === 1 ? "" : "s"} selected`}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </summary>
                    <div className="absolute z-10 mt-1 max-h-[200px] w-full overflow-y-auto rounded-md border border-[#ece8e1] bg-white shadow-lg">
                      {services.length === 0 ? (
                        <div className="px-4 py-6 text-center text-[13px] text-slate-400">
                          No services available
                        </div>
                      ) : (
                        services.map((service) => {
                          const isSelected = createForm.serviceIds.includes(service.id);
                          return (
                            <label
                              key={service.id}
                              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-[#faf9f7]"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() =>
                                  setCreateForm((prev) => ({
                                    ...prev,
                                    serviceIds: isSelected
                                      ? prev.serviceIds.filter((id) => id !== service.id)
                                      : [...prev.serviceIds, service.id],
                                  }))
                                }
                                className="h-4 w-4 rounded border-[#cec8bf]"
                              />
                              {service.name}
                            </label>
                          );
                        })
                      )}
                    </div>
                  </details>
                </>
              )}
            </div>
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
                    const practiceName =
                      practices.find(
                        (p) => p.id === createForm.practiceId,
                      )?.name || "";
                    const submitterGroups = getTemplateSubmitterGroups(
                      template,
                      templateFieldValues,
                      practiceName,
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

  return (
    <AppLayout
      title="Agreements"
      activeModule="Agreements"
      activeSubItem="All Agreements"
      // navbarActions={navbarActions}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="Agreements"
            subtitle="Agreements"
            searchPlaceholder="Search agreements..."
            searchValue={filters.search}
            onSearchChange={(value) =>
              setFilters((prev) => ({ ...prev, search: value }))
            }
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={() =>
              setFilters({ search: "", status: "", type: "" })
            }
            filterModalTitle="Filter Agreements"
            filterFields={filterFieldsModal}
            addNewLabel={canWriteAgreements ? "Add Agreement" : undefined}
            onAddNew={canWriteAgreements ? openCreateForm : undefined}
            onRefresh={refreshAgreementRecords}
            isLoading={isLoading}
            isSaving={isSaving || isSubmitting}
            isDeleting={isDeleting}
            extraActions={
              <button
                type="button"
                onClick={() =>
                  setSorting((current) =>
                    current[0]?.id === "creationDate"
                      ? [{ id: "creationDate", desc: !current[0].desc }]
                      : [{ id: "creationDate", desc: true }],
                  )
                }
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-[#f7f5f1] hover:border-[#dcd6cb] transition-colors"
              >
                Sort
              </button>
            }
            page={pagination.page}
            pageSize={pagination.limit}
            totalRecords={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            onPageSizeChange={(newSize) =>
              setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }))
            }
          >
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header, index) => (
                        <th
                          key={header.id}
                          className={`border-b border-[#eeebe5] px-4 py-3 font-medium ${
                            index < headerGroup.headers.length - 1
                              ? "border-r border-[#f2eee8]"
                              : ""
                          }`}
                        >
                          <SortableHeaderCell header={header} />
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
          </DataTableToolbar>
        </section>

        {showDetailPanel && detailPanel}
        {showCreateForm && createPanel}
      </div>
    </AppLayout>
  );
}

export default AllAgreementsPage;
