import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  LayoutGrid,
  Pencil,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { exportAllPagesToCsv, formatUsDateTime } from "../../utils/csvExport";
import AppLayout from "../layout/AppLayout";
import ConfirmModal from "../shared/ConfirmModal";
import DatePicker from "../shared/DatePicker";
import Select from "../shared/Select";
import SearchSelect, { type SearchSelectOption } from "../shared/SearchSelect";
import DataTableToolbar, {
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import CredentialingModal from "./CredentialingModal";
import { formatDateLabel } from "./credentialingStore";
import {
  credentialingStatusOptions,
  contractTypeOptions,
  requestTypeOptions,
  canEditCredentialingStatus,
  isContractedStatus,
  type CredentialingFormState,
  type CredentialingRecord,
} from "./types";
import {
  createCredentialingRequestApi,
  deleteCredentialingRequestApi,
  getCredentialingRequestOptions,
  getCredentialingRequestsView,
  updateCredentialingRequestApi,
  type CredentialingOptionRecord,
} from "../../services/operations/credentialing";
import { getAllUsers } from "../../services/operations/users";
import {
  formatPayerDisplayLabel,
  getClaimPayerOptionsApi,
} from "../../services/operations/insurance";

type Filters = {
  search: string;
  practice: string;
  provider: string;
  insuranceCompany: string;
  payerLabel: string;
  status: string;
  credentialingType: string;
  contractType: string;
  assignedUser: string;
  dateFrom: string;
  dateTo: string;
};

type SortField =
  | "credentialingId"
  | "practice"
  | "provider"
  | "insuranceCompany"
  | "credentialingType"
  | "status"
  | "assignedUser"
  | "submissionDate"
  | "effectiveDate"
  | "expirationDate"
  | "updatedAt";

const defaultFilters: Filters = {
  search: "",
  practice: "",
  provider: "",
  insuranceCompany: "",
  payerLabel: "",
  status: "",
  credentialingType: "",
  contractType: "",
  assignedUser: "",
  dateFrom: "",
  dateTo: "",
};

const sortOptions: { label: string; value: SortField }[] = [
  { label: "Credentialing ID", value: "credentialingId" },
  { label: "Practice", value: "practice" },
  { label: "Provider", value: "provider" },
  { label: "Insurance Plan", value: "insuranceCompany" },
  { label: "Credentialing Type", value: "credentialingType" },
  { label: "Status", value: "status" },
  { label: "Assigned Specialist", value: "assignedUser" },
  { label: "Submission Date", value: "submissionDate" },
  { label: "Effective Date", value: "effectiveDate" },
  { label: "Expiration Date", value: "expirationDate" },
  { label: "Last Updated", value: "updatedAt" },
];

function statusTone(status: string) {
  switch (status) {
    case "Not Started":
      return "bg-slate-100 text-slate-700";
    case "Application Submitted":
      return "bg-[#f0f2fe] text-[#4f63ea]";
    case "In Process - Payer Review":
      return "bg-amber-50 text-amber-800 border border-amber-200/60";
    case "Pending Additional Info":
      return "bg-amber-100/70 text-amber-900 border border-amber-200";
    case "Contracted - Direct":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
    case "Contracted - IPA/Delegated":
      return "bg-teal-50 text-teal-700 border border-teal-200/60";
    case "Out-of-Network (OON)":
      return "bg-slate-100 text-slate-700 border border-slate-200";
    case "Declined / Application Rejected":
      return "bg-rose-50 text-rose-700 border border-rose-200/60";
    case "Re-credentialing Due":
      return "bg-orange-50 text-orange-700 border border-orange-200/60";
    case "Terminated":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getCycleTimeBadge(
  submissionDate?: string | null,
  effectiveDate?: string | null,
  activity?: CredentialingActivity[] | null,
  startDate?: string | null,
  createdAt?: string | null,
  updatedAt?: string | null,
  status?: string | null,
) {
  const startStr = startDate || submissionDate || createdAt;
  if (!startStr) return <span className="text-slate-400 font-medium">-</span>;
  const start = new Date(startStr).getTime();
  if (isNaN(start)) return <span className="text-slate-400 font-medium">-</span>;

  let endStr: string | null | undefined = effectiveDate;
  if (activity && activity.length > 0) {
    const contractedLog = activity.find((a) => {
      const text = `${a.action || ""} ${a.details || ""}`.toLowerCase();
      return (
        text.includes("contracted - direct") ||
        text.includes("contracted - ipa/delegated") ||
        text.includes("contracted")
      );
    });
    if (contractedLog?.createdAt) {
      endStr = contractedLog.createdAt;
    }
  }

  const end = endStr
    ? new Date(endStr).getTime()
    : updatedAt
      ? new Date(updatedAt).getTime()
      : Date.now();
  if (isNaN(end)) return <span className="text-slate-400 font-medium">-</span>;

  const days = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
  const contracted = isContractedStatus(status);

  if (days > 150) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 border border-rose-200"
        title={`${days} days turnaround time`}
      >
        Critical ({days}d)
      </span>
    );
  }
  if (days > 120) {
    return (
      <span
        className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200"
        title={`${days} days turnaround time`}
      >
        High Risk ({days}d)
      </span>
    );
  }
  if (days >= 60) {
    if (!contracted) return <span className="text-slate-400 font-medium">-</span>;
    return (
      <span
        className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 border border-indigo-200"
        title={`${days} days turnaround time`}
      >
        Acceptable ({days}d)
      </span>
    );
  }
  if (!contracted) return <span className="text-slate-400 font-medium">-</span>;
  return (
    <span
      className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200"
      title={`${days} days turnaround time`}
    >
      Excellent ({days}d)
    </span>
  );
}

function createLocalSearchOptions(options: string[]) {
  return async (query: string): Promise<SearchSelectOption[]> => {
    const normalized = query.trim().toLowerCase();
    return options
      .filter((option) =>
        normalized ? option.toLowerCase().includes(normalized) : true,
      )
      .map((option) => ({ label: option, value: option }));
  };
}

function CredentialingListPage() {
  const [records, setRecords] = useState<CredentialingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedRecord, setSelectedRecord] =
    useState<CredentialingRecord | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view" | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<CredentialingRecord | null>(
    null,
  );
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const getResponsivePageSize = () => {
    const height = window.innerHeight;
    if (height >= 1200) return 15;
    if (height >= 900) return 10;
    if (height >= 700) return 8;
    return 6;
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(getResponsivePageSize);
  const [userSelectedPageSize, setUserSelectedPageSize] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (!userSelectedPageSize) {
        setPageSize(getResponsivePageSize());
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [userSelectedPageSize]);
  const [optionRecords, setOptionRecords] = useState<
    CredentialingOptionRecord[]
  >([]);
  const [assignedUserOptions, setAssignedUserOptions] = useState<
    SearchSelectOption[]
  >([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadRecords() {
    setIsLoading(true);
    try {
      const data = await getCredentialingRequestsView({
        page,
        limit: pageSize,
        search: filters.search || undefined,
        practice: filters.practice || undefined,
        provider: filters.provider || undefined,
        insuranceCompany: filters.insuranceCompany || undefined,
        status: filters.status || undefined,
        credentialingType: filters.credentialingType || undefined,
        contractType: filters.contractType || undefined,
        assignedUser: filters.assignedUser || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        sortBy: sortField,
        sortOrder: sortDirection,
      });
      setRecords(data.credentialingRequests);
      setTotalRecords(data.pagination.totalRecords);
      setTotalPages(data.pagination.totalPages || 1);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
  }, [page, pageSize, filters, sortDirection, sortField]);

  useEffect(() => {
    let active = true;
    async function loadOptions() {
      try {
        const [options, usersResponse] = await Promise.all([
          getCredentialingRequestOptions(),
          getAllUsers(),
        ]);
        if (!active) return;
        setOptionRecords(options);
        
        const users = usersResponse.users || [];
        setAssignedUserOptions(
          users
            .map((user: any) => {
              const fullName = [user.firstName, user.lastName]
                .filter(Boolean)
                .join(" ")
                .trim();
              const label =
                fullName || user.userName || user.email || user.role || "";
              return {
                label: user.role ? `${label} (${user.role})` : label,
                value: user.id,
                subLabel: [user.userName, user.email, user.role]
                  .filter(Boolean)
                  .join(" · "),
              };
            })
            .filter((entry) => Boolean(entry.value && entry.label))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      } catch {
        if (active) {
          setOptionRecords([]);
          setAssignedUserOptions([]);
        }
      }
    }

    void loadOptions();
    return () => {
      active = false;
    };
  }, []);

  async function loadFilterOptions() {
    try {
      const [options, users] = await Promise.all([
        getCredentialingRequestOptions(),
        getAllUsers(),
      ]);
      setOptionRecords(options);
      setAssignedUserOptions(
        users
          .map((user: any) => {
            const fullName = [user.firstName, user.lastName]
              .filter(Boolean)
              .join(" ")
              .trim();
            const label =
              fullName || user.userName || user.email || user.role || "";
            return {
              label: user.role ? `${label} (${user.role})` : label,
              value: user.id,
              subLabel: [user.userName, user.email, user.role]
                .filter(Boolean)
                .join(" · "),
            };
          })
          .filter((entry) => Boolean(entry.value && entry.label))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
    } catch {
      setOptionRecords([]);
      setAssignedUserOptions([]);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput }));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const uniqueProviders = useMemo(
    () =>
      Array.from(
        new Set(optionRecords.map((record) => record.provider)),
      ).sort(),
    [optionRecords],
  );
  const uniquePractices = useMemo(
    () =>
      Array.from(
        new Set(optionRecords.map((record) => record.practice)),
      ).sort(),
    [optionRecords],
  );
  const searchPractices = useMemo(
    () => createLocalSearchOptions(uniquePractices),
    [uniquePractices],
  );
  const searchProviders = useMemo(
    () => createLocalSearchOptions(uniqueProviders),
    [uniqueProviders],
  );
  const searchPayers = useMemo(
    () => async (query: string) => {
      const options = await getClaimPayerOptionsApi(query.trim());
      return options.sort((a, b) => a.label.localeCompare(b.label));
    },
    [],
  );
  const searchAssignedUsers = useMemo(
    () => async (query: string) => {
      const normalized = query.trim().toLowerCase();
      return assignedUserOptions.filter((option) =>
        normalized
          ? option.label.toLowerCase().includes(normalized) ||
            option.subLabel?.toLowerCase().includes(normalized) ||
            option.value.toLowerCase().includes(normalized)
          : true,
      );
    },
    [assignedUserOptions],
  );
  const assignedUserFilterLabel = useMemo(
    () =>
      assignedUserOptions.find(
        (option) => option.value === filters.assignedUser,
      )?.label || "",
    [assignedUserOptions, filters.assignedUser],
  );

  useEffect(() => {
    const action = new URLSearchParams(window.location.search).get("action");
    if (action === "create") {
      setModalMode("create");
      window.history.replaceState({}, "", "/credentialing/list");
    }
  }, []);

  function openCreateModal() {
    setSelectedRecord(null);
    setModalMode("create");
  }

  function openViewModal(record: CredentialingRecord) {
    setSelectedRecord(record);
    setModalMode("view");
  }

  function openEditModal(record: CredentialingRecord) {
    if (!canEditCredentialingStatus(record.status)) {
      setSelectedRecord(record);
      setModalMode("view");
      return;
    }
    setSelectedRecord(record);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setSelectedRecord(null);
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  async function handleSave(form: CredentialingFormState) {
    setIsSaving(true);
    try {
      const documents = form.documents.map((document) => ({
        id: document.id,
        fileName: document.fileName || document.name,
        documentType: document.documentType || document.type,
        fileUrl: document.fileUrl,
        fileBase64: document.fileBase64,
        fileSize: document.fileSize,
        mimeType: document.mimeType,
        expiryDate: document.expiryDate || null,
        uploadedByName: document.uploadedBy || "Admin",
      }));
      const payload = {
        ...form,
        practiceId: form.practiceId || undefined,
        documents,
        followUpLogs: form.followUpLogs.map((entry) => ({
          ...entry,
          id: entry.id,
        })),
        practiceName: form.practice,
        providerId: form.providerId || undefined,
        providerName: form.provider,
        insurancePayerName: form.insuranceCompany,
        payerProviderId: form.payerProviderId || undefined,
        assignedToUserId: form.assignedUserId || undefined,
        assignedToUserName: form.assignedUser,
        requestType: form.credentialingType,
        contractType: form.contractType,
        status: form.status,
      };

      if (selectedRecord) {
        await updateCredentialingRequestApi(selectedRecord.id, payload);
      } else {
        await createCredentialingRequestApi(payload);
      }

      await loadRecords();
      await loadFilterOptions();
      closeModal();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const recordToDelete = deleteTarget || selectedRecord;
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCredentialingRequestApi(recordToDelete.id);
      await loadRecords();
      await loadFilterOptions();
      closeModal();
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  async function exportCsv() {
    try {
      toast.loading("Exporting CSV...", { id: "export-csv" });
      const headers = [
        "Credentialing ID",
        "Practice",
        "Provider",
        "Insurance Plan",
        "Credentialing Type",
        "Status",
        "Assigned Specialist",
        "Submission Date",
        "Effective Date",
        "Expiration Date",
        "Last Updated Date & Time",
      ];

      await exportAllPagesToCsv({
        filenamePrefix: "credentialing_list",
        headers,
        pageSize: 50,
        fetchPage: async (page, limit) => {
          const res = await getCredentialingRequestsView({
            page,
            limit,
            search: filters.search || undefined,
            practice: filters.practice || undefined,
            provider: filters.provider || undefined,
            insuranceCompany: filters.insuranceCompany || undefined,
            status: filters.status || undefined,
            credentialingType: filters.credentialingType || undefined,
            contractType: filters.contractType || undefined,
            assignedUser: filters.assignedUser || undefined,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            sortBy: sortField,
            sortOrder: sortDirection,
          });
          return {
            items: res.credentialingRequests,
            totalPages: res.pagination.totalPages,
          };
        },
        rowToCsvFields: (record) => [
          record.credentialingId,
          record.practice,
          record.provider,
          record.insuranceCompany,
          record.credentialingType,
          record.status,
          record.assignedUser,
          record.submissionDate,
          record.effectiveDate,
          record.expirationDate,
          formatUsDateTime(record.updatedAt),
        ],
      });
      toast.success("CSV Exported successfully", { id: "export-csv" });
    } catch (e) {
      toast.error("Failed to export CSV", { id: "export-csv" });
    }
  }

  function updateSort(nextField: SortField) {
    if (sortField === nextField) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortField(nextField);
      setSortDirection("asc");
    }
    setPage(1);
  }

  const [draftFilters, setDraftFilters] = useState<Filters>(filters);

  // Sync draft filters when modal opens or active filters reset
  const handleOpenFilterModal = () => {
    setDraftFilters(filters);
  };

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
  };

  const updateDraftFilter = <K extends keyof Filters>(
    key: K,
    value: Filters[K],
  ) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  function resetFilters() {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setSearchInput("");
    setSortField("updatedAt");
    setSortDirection("desc");
    setPage(1);
  }

  const activeFilterCount = [
    filters.practice,
    filters.provider,
    filters.insuranceCompany,
    filters.payerLabel,
    filters.status,
    filters.credentialingType,
    filters.contractType,
    filters.assignedUser,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.practice) {
      chips.push({
        key: "practice",
        label: "Practice",
        displayValue: filters.practice,
        onClear: () => {
          updateFilter("practice", "");
          setDraftFilters((curr) => ({ ...curr, practice: "" }));
        },
      });
    }
    if (filters.provider) {
      chips.push({
        key: "provider",
        label: "Provider",
        displayValue: filters.provider,
        onClear: () => {
          updateFilter("provider", "");
          setDraftFilters((curr) => ({ ...curr, provider: "" }));
        },
      });
    }
    if (filters.insuranceCompany) {
      chips.push({
        key: "insuranceCompany",
        label: "Payer",
        displayValue: filters.payerLabel || filters.insuranceCompany,
        onClear: () => {
          setFilters((current) => ({
            ...current,
            insuranceCompany: "",
            payerLabel: "",
          }));
          setDraftFilters((current) => ({
            ...current,
            insuranceCompany: "",
            payerLabel: "",
          }));
        },
      });
    }
    if (filters.status) {
      chips.push({
        key: "status",
        label: "Status",
        displayValue: filters.status,
        onClear: () => {
          updateFilter("status", "");
          setDraftFilters((curr) => ({ ...curr, status: "" }));
        },
      });
    }
    if (filters.credentialingType) {
      chips.push({
        key: "credentialingType",
        label: "Type",
        displayValue: filters.credentialingType,
        onClear: () => {
          updateFilter("credentialingType", "");
          setDraftFilters((curr) => ({ ...curr, credentialingType: "" }));
        },
      });
    }
    if (filters.contractType) {
      chips.push({
        key: "contractType",
        label: "Contract",
        displayValue: filters.contractType,
        onClear: () => {
          updateFilter("contractType", "");
          setDraftFilters((curr) => ({ ...curr, contractType: "" }));
        },
      });
    }
    if (filters.assignedUser) {
      chips.push({
        key: "assignedUser",
        label: "Specialist",
        displayValue: assignedUserFilterLabel || filters.assignedUser,
        onClear: () => {
          updateFilter("assignedUser", "");
          setDraftFilters((curr) => ({ ...curr, assignedUser: "" }));
        },
      });
    }
    if (filters.dateFrom) {
      chips.push({
        key: "dateFrom",
        label: "From",
        displayValue: filters.dateFrom,
        onClear: () => {
          updateFilter("dateFrom", "");
          setDraftFilters((curr) => ({ ...curr, dateFrom: "" }));
        },
      });
    }
    if (filters.dateTo) {
      chips.push({
        key: "dateTo",
        label: "To",
        displayValue: filters.dateTo,
        onClear: () => {
          updateFilter("dateTo", "");
          setDraftFilters((curr) => ({ ...curr, dateTo: "" }));
        },
      });
    }
    return chips;
  }, [filters, assignedUserFilterLabel]);

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Practice
        </span>
        <SearchSelect
          value={draftFilters.practice}
          onChange={(value) => updateDraftFilter("practice", value)}
          onSearch={searchPractices}
          clearable
          toggleOnSelectSame
          placeholder="Search practice"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Provider
        </span>
        <SearchSelect
          value={draftFilters.provider}
          onChange={(value) => updateDraftFilter("provider", value)}
          onSearch={searchProviders}
          clearable
          toggleOnSelectSame
          placeholder="Search provider"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Payer Name (ID)
        </span>
        <SearchSelect
          value={draftFilters.insuranceCompany}
          displayLabel={draftFilters.payerLabel}
          onChange={(value, option) =>
            setDraftFilters((current) => ({
              ...current,
              insuranceCompany: option?.label || "",
              payerLabel: formatPayerDisplayLabel(option?.label || "", value),
            }))
          }
          onSearch={searchPayers}
          clearable
          toggleOnSelectSame
          placeholder="Search payer"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Status
        </span>
        <Select
          value={draftFilters.status}
          onChange={(value) => updateDraftFilter("status", value)}
          options={[
            { label: "All Statuses", value: "" },
            ...credentialingStatusOptions.map((status) => ({
              label: status,
              value: status,
            })),
          ]}
          placeholder="All Statuses"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Request Type
        </span>
        <Select
          value={draftFilters.credentialingType}
          onChange={(value) => updateDraftFilter("credentialingType", value)}
          options={[
            { label: "All Types", value: "" },
            ...requestTypeOptions.map((type) => ({
              label: type,
              value: type,
            })),
          ]}
          placeholder="All Types"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Contract Type
        </span>
        <Select
          value={draftFilters.contractType}
          onChange={(value) => updateDraftFilter("contractType", value)}
          options={[
            { label: "All Contract Types", value: "" },
            ...contractTypeOptions.map((option) => ({
              label: option,
              value: option,
            })),
          ]}
          placeholder="All Contract Types"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Assigned Specialist
        </span>
        <SearchSelect
          value={draftFilters.assignedUser}
          displayLabel={
            assignedUserOptions.find(
              (opt) => opt.value === draftFilters.assignedUser,
            )?.label || ""
          }
          onChange={(value) => updateDraftFilter("assignedUser", value)}
          onSearch={searchAssignedUsers}
          clearable
          toggleOnSelectSame
          placeholder="Search specialist"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Submitted Date From
        </span>
        <DatePicker
          value={draftFilters.dateFrom}
          onChange={(value) => updateDraftFilter("dateFrom", value)}
          placeholder="MM-DD-YYYY"
          className="rounded-xl border-[#ece8e1]"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Submitted Date To
        </span>
        <DatePicker
          value={draftFilters.dateTo}
          onChange={(value) => updateDraftFilter("dateTo", value)}
          placeholder="MM-DD-YYYY"
          className="rounded-xl border-[#ece8e1]"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Sort Field
        </span>
        <Select
          value={sortField}
          onChange={(value) => setSortField(value as SortField)}
          options={sortOptions}
          placeholder="Updated Date"
        />
      </label>

      <div className="flex items-end">
        <button
          type="button"
          onClick={() =>
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
          }
          className="inline-flex h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-[#ece8e1] bg-white px-4 text-[13px] font-medium text-slate-700 hover:bg-[#f7f5f1] transition-colors cursor-pointer"
        >
          {sortDirection === "asc" ? (
            <ArrowUp className="h-4 w-4 text-[#4f63ea]" />
          ) : (
            <ArrowDown className="h-4 w-4 text-[#4f63ea]" />
          )}
          <span>
            Order: {sortDirection === "asc" ? "Ascending" : "Descending"}
          </span>
        </button>
      </div>
    </>
  );

  return (
    <AppLayout
      title="All Credentialing"
      activeModule="Credentialing"
      activeSubItem="All Credentialing"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-h-0 min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="All Credentialing"
            subtitle="Credentialing"
            searchPlaceholder="Search credentialing..."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={resetFilters}
            onApplyFilters={handleApplyFilters}
            onOpenFilterModal={handleOpenFilterModal}
            filterModalTitle="Filter Credentialing Records"
            filterFields={filterFieldsModal}
            addNewLabel="Add New"
            onAddNew={openCreateModal}
            onExport={exportCsv}
            onRefresh={loadRecords}
            isLoading={isLoading}
            isSaving={isSaving}
            isDeleting={isDeleting}
            page={page}
            pageSize={pageSize}
            totalRecords={totalRecords}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setUserSelectedPageSize(true);
            }}
          >
            <div className="flex flex-col min-h-0 flex-1 bg-[#fbfaf8]/60">
              {/* Top Bar with Sort & Record Count */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#f0ece6] bg-white text-[12px] text-slate-500 font-medium shrink-0">
                <span className="font-bold text-slate-700">
                  Credentialing Records <span className="ml-1 text-slate-400 font-normal">({totalRecords})</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Sort by:</span>
                  <div className="w-48">
                    <Select
                      value={sortField}
                      onChange={(val) => updateSort(val as SortField)}
                      options={sortOptions}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                    className="p-1.5 rounded-lg border border-[#ece8e1] bg-white text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    title={`Sort ${sortDirection === "asc" ? "Descending" : "Ascending"}`}
                  >
                    {sortDirection === "asc" ? (
                      <ArrowUp className="h-3.5 w-3.5 text-[#4f63ea]" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5 text-[#4f63ea]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Card List Area */}
              <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                {isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-[#ece8e1] bg-white p-4 space-y-3 animate-pulse"
                      >
                        <div className="h-5 w-1/3 bg-slate-200 rounded" />
                        <div className="h-4 w-full bg-slate-100 rounded" />
                      </div>
                    ))}
                  </div>
                ) : records.length === 0 ? (
                  <div className="rounded-2xl border border-[#ece8e1] bg-white px-4 py-14 text-center text-[13px] text-slate-400">
                    No credentialing records match the current filters.
                  </div>
                ) : (
                  records.map((record) => (
                    <div
                      key={record.id}
                      className="rounded-2xl border border-[#ece8e1] bg-white p-4 shadow-2xs hover:border-[#4f63ea]/40 hover:shadow-xs transition-all space-y-3"
                    >
                      {/* Row 1: Primary Identifiers & Specs with Explicit Field Labels */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0ece6] pb-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          {/* Credentialing ID */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4f63ea] bg-[#f0f2fe] px-1.5 py-0.5 rounded border border-[#e0e4fd]">
                              ID
                            </span>
                            <button
                              type="button"
                              onClick={() => openViewModal(record)}
                              className="font-bold text-[#4f63ea] hover:underline cursor-pointer text-[14px]"
                            >
                              {record.credentialingId}
                            </button>
                          </div>

                          <span className="text-slate-300 font-light">|</span>

                          {/* Practice */}
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-400">Practice:</span>
                            <span className="font-bold text-slate-800">{record.practice}</span>
                          </div>

                          <span className="text-slate-300 font-light">|</span>

                          {/* Provider */}
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-400">Provider:</span>
                            <span className="font-semibold text-slate-700">{record.provider}</span>
                          </div>

                          <span className="text-slate-300 font-light">|</span>

                          {/* Payer / Insurance Plan */}
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-400">Payer:</span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 border border-slate-200/60">
                              {formatPayerDisplayLabel(
                                record.insuranceCompany,
                                record.payerProviderId,
                              )}
                            </span>
                          </div>

                          <span className="text-slate-300 font-light">|</span>

                          {/* Request Type */}
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-400">Type:</span>
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700 border border-blue-100">
                              {record.credentialingType}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 ml-auto sm:ml-0">
                          {/* Status */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status:</span>
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1 text-[12px] font-medium ${statusTone(record.status)}`}
                            >
                              {record.status}
                            </span>
                          </div>

                          {/* Cycle Time */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cycle Time:</span>
                            {getCycleTimeBadge(
                              record.submissionDate,
                              record.effectiveDate,
                              record.activity,
                              record.startDate,
                              record.createdAt,
                              record.updatedAt,
                              record.status,
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 border-l border-[#f0ece6] pl-2">
                            <button
                              type="button"
                              onClick={() => openViewModal(record)}
                              className="cursor-pointer rounded-lg border border-[#ece8e1] p-1.5 text-slate-500 hover:bg-[#f7f5f1] transition-colors"
                              title="View Record"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            {canEditCredentialingStatus(record.status) ? (
                              <button
                                type="button"
                                onClick={() => openEditModal(record)}
                                className="cursor-pointer rounded-lg border border-[#ece8e1] p-1.5 text-slate-500 hover:bg-[#f7f5f1] transition-colors"
                                title="Edit Record"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Secondary Timeline Dates & Specialist */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs text-slate-500 pt-0.5">
                        <div className="rounded-xl bg-[#fbfaf8] border border-[#f2eee9] p-2">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Assigned Specialist
                          </span>
                          <span className="font-semibold text-slate-700 mt-0.5 block truncate">
                            {record.assignedUser || "-"}
                          </span>
                        </div>
                        <div className="rounded-xl bg-[#fbfaf8] border border-[#f2eee9] p-2">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Submission Date
                          </span>
                          <span className="font-semibold text-slate-700 mt-0.5 block">
                            {formatDateLabel(record.submissionDate)}
                          </span>
                        </div>
                        <div className="rounded-xl bg-[#fbfaf8] border border-[#f2eee9] p-2">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Effective Date
                          </span>
                          <span className="font-semibold text-slate-700 mt-0.5 block">
                            {formatDateLabel(record.effectiveDate)}
                          </span>
                        </div>
                        <div className="rounded-xl bg-[#fbfaf8] border border-[#f2eee9] p-2">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Expiration Date
                          </span>
                          <span className="font-semibold text-slate-700 mt-0.5 block">
                            {formatDateLabel(record.expirationDate)}
                          </span>
                        </div>
                        <div className="rounded-xl bg-[#fbfaf8] border border-[#f2eee9] p-2">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Last Updated
                          </span>
                          <span className="font-semibold text-slate-700 mt-0.5 block">
                            {formatDateLabel(record.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DataTableToolbar>
        </section>

        <CredentialingModal
          isOpen={modalMode !== null}
          mode={modalMode || "view"}
          record={selectedRecord}
          onClose={closeModal}
          onSave={handleSave}
          onRequestEdit={
            selectedRecord && canEditCredentialingStatus(selectedRecord.status)
              ? () => setModalMode("edit")
              : undefined
          }
          onDelete={() => setDeleteTarget(selectedRecord)}
          isSaving={isSaving}
          isDeleting={isDeleting}
        />

        <ConfirmModal
          isOpen={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Credentialing?"
          message={`Delete ${deleteTarget?.credentialingId || "this record"}? This cannot be undone.`}
          confirmLabel="Delete"
          type="danger"
          isConfirming={isDeleting}
          closeOnConfirm={false}
        />
      </div>
    </AppLayout>
  );
}

export default CredentialingListPage;
