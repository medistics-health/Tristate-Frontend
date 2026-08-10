import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import ConfirmModal from "../shared/ConfirmModal";
import DatePicker from "../shared/DatePicker";
import Select from "../shared/Select";
import SearchSelect, { type SearchSelectOption } from "../shared/SearchSelect";
import CredentialingModal from "./CredentialingModal";
import { formatDateLabel } from "./credentialingStore";
import {
  credentialingStatusOptions,
  contractTypeOptions,
  requestTypeOptions,
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

type Filters = {
  search: string;
  practice: string;
  provider: string;
  insuranceCompany: string;
  status: string;
  credentialingType: string;
  contractType: string;
  assignedUser: string;
  dateFrom: string;
  dateTo: string;
};

type SortField =
  | "credentialingId"
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
  status: "",
  credentialingType: "",
  contractType: "",
  assignedUser: "",
  dateFrom: "",
  dateTo: "",
};

const sortOptions: { label: string; value: SortField }[] = [
  { label: "Credentialing ID", value: "credentialingId" },
  { label: "Provider", value: "provider" },
  { label: "Insurance Company", value: "insuranceCompany" },
  { label: "Credentialing Type", value: "credentialingType" },
  { label: "Status", value: "status" },
  { label: "Assigned To", value: "assignedUser" },
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
      return "bg-indigo-100 text-indigo-700";
    case "In Process - Payer Review":
      return "bg-amber-100 text-amber-800";
    case "Pending Additional Info":
      return "bg-amber-50 text-amber-700";
    case "Contracted - Direct":
      return "bg-emerald-100 text-emerald-700";
    case "Contracted - IPA/Delegated":
      return "bg-teal-100 text-teal-700";
    case "Out-of-Network (OON)":
      return "bg-slate-200 text-slate-700";
    case "Declined / Application Rejected":
      return "bg-rose-100 text-rose-700";
    case "Re-credentialing Due":
      return "bg-orange-100 text-orange-700";
    case "Terminated":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
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
  const [showFilters, setShowFilters] = useState(true);
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
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [optionRecords, setOptionRecords] = useState<CredentialingOptionRecord[]>(
    [],
  );
  const [assignedUserOptions, setAssignedUserOptions] = useState<SearchSelectOption[]>([]);
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
        const [options, users] = await Promise.all([
          getCredentialingRequestOptions(),
          getAllUsers(),
        ]);
        if (!active) return;
        setOptionRecords(options);
        setAssignedUserOptions(
          users
            .map((user: any) => {
              const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
              const label = fullName || user.userName || user.email || user.role || "";
              return {
                label: user.role ? `${label} (${user.role})` : label,
                value: user.id,
                subLabel: [user.userName, user.email, user.role].filter(Boolean).join(" · "),
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput }));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const uniqueProviders = useMemo(
    () => Array.from(new Set(optionRecords.map((record) => record.provider))).sort(),
    [optionRecords],
  );
  const uniquePractices = useMemo(
    () => Array.from(new Set(optionRecords.map((record) => record.practice))).sort(),
    [optionRecords],
  );
  const uniqueInsuranceCompanies = useMemo(
    () =>
      Array.from(new Set(optionRecords.map((record) => record.insuranceCompany))).sort(),
    [optionRecords],
  );
  const searchPractices = useMemo(() => createLocalSearchOptions(uniquePractices), [uniquePractices]);
  const searchProviders = useMemo(() => createLocalSearchOptions(uniqueProviders), [uniqueProviders]);
  const searchPayers = useMemo(() => createLocalSearchOptions(uniqueInsuranceCompanies), [uniqueInsuranceCompanies]);
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
    () => assignedUserOptions.find((option) => option.value === filters.assignedUser)?.label || "",
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
        documents,
        practiceName: form.practice,
        providerName: form.provider,
        insurancePayerName: form.insuranceCompany,
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
      closeModal();
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  async function exportCsv() {
    const allData = await getCredentialingRequestsView({
      page: 1,
      limit: Math.max(totalRecords, pageSize),
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
    const header = [
      "Credentialing ID",
      "Provider",
      "Insurance Company",
      "Credentialing Type",
      "Status",
      "Assigned To",
      "Submission Date",
      "Effective Date",
      "Expiration Date",
      "Last Updated",
    ];
    const rows = allData.credentialingRequests.map((record) => [
      record.credentialingId,
      record.provider,
      record.insuranceCompany,
      record.credentialingType,
      record.status,
      record.assignedUser,
      record.submissionDate,
      record.effectiveDate,
      record.expirationDate,
      record.updatedAt,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "credentialing-list.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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

  function resetFilters() {
      setFilters(defaultFilters);
      setSearchInput("");
      setSortField("updatedAt");
      setSortDirection("desc");
      setPage(1);
  }

  const activeFilterCount = [
    filters.practice,
    filters.provider,
    filters.insuranceCompany,
    filters.status,
    filters.credentialingType,
    filters.contractType,
    filters.assignedUser,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;
  const currentPage = page;
  const rangeLabel =
    totalRecords === 0
      ? "Showing 0 of 0"
      : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
          currentPage * pageSize,
          totalRecords,
        )} of ${totalRecords}`;

  return (
    <AppLayout
      title="All Credentialing"
      activeModule="Credentialing"
      activeSubItem="All Credentialing"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={[
        {
          label: "New record",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreateModal,
        },
      ]}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-h-0 min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-[#f0ece6] bg-gradient-to-r from-white via-[#fcfbf8] to-[#f7f3eb] px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Credentialing
                </div>
                <h1 className="mt-1 text-[22px] font-semibold text-slate-800">
                  All Credentialing
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openCreateModal}
                  disabled={isSaving || isDeleting}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#4f63ea] px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
                >
                  {isSaving || isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {isSaving ? "Saving..." : isDeleting ? "Deleting..." : "Add New"}
                </button>
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={isSaving || isDeleting}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#ece8e1] px-3.5 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search"
                    className="app-control w-56 rounded-xl py-2 pl-10 pr-3 text-[13px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-[#f0ece6] px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <div className="text-[13px] font-medium text-slate-700">
                  Filters
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {activeFilterCount} active
                </span>
                <span className="text-[12px] text-slate-400">
                  {totalRecords} records
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFilters((current) => !current)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
                >
                  {showFilters ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
          {showFilters ? (
            <div className="border-b border-[#f0ece6] bg-[#faf9f7] px-5 py-4">
              <div className="grid gap-3 xl:grid-cols-3 2xl:grid-cols-5">
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Practice
                  </span>
                  <SearchSelect
                    value={filters.practice}
                    onChange={(value) => updateFilter("practice", value)}
                    onSearch={searchPractices}
                    placeholder="Search practice"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Provider
                  </span>
                  <SearchSelect
                    value={filters.provider}
                    onChange={(value) => updateFilter("provider", value)}
                    onSearch={searchProviders}
                    placeholder="Search provider"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Insurance Company
                  </span>
                  <SearchSelect
                    value={filters.insuranceCompany}
                    onChange={(value) => updateFilter("insuranceCompany", value)}
                    onSearch={searchPayers}
                    placeholder="Search payer"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Status
                  </span>
                  <Select
                    value={filters.status}
                    onChange={(value) => updateFilter("status", value)}
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
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Request Type
                  </span>
                  <Select
                    value={filters.credentialingType}
                    onChange={(value) => updateFilter("credentialingType", value)}
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
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Contract Type
                  </span>
                  <Select
                    value={filters.contractType}
                    onChange={(value) => updateFilter("contractType", value)}
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
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Assigned User
                  </span>
                  <SearchSelect
                    value={filters.assignedUser}
                    displayLabel={assignedUserFilterLabel}
                    onChange={(value) =>
                      updateFilter(
                        "assignedUser",
                        value === filters.assignedUser ? "" : value,
                      )
                    }
                    onSearch={searchAssignedUsers}
                    placeholder="Search user"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Date Range From
                  </span>
                  <DatePicker
                    value={filters.dateFrom}
                    onChange={(value) => updateFilter("dateFrom", value)}
                    placeholder="Start date"
                    className="rounded-xl"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Date Range To
                  </span>
                  <DatePicker
                    value={filters.dateTo}
                    onChange={(value) => updateFilter("dateTo", value)}
                    placeholder="End date"
                    className="rounded-xl"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Sort By
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
                      setSortDirection((current) =>
                        current === "asc" ? "desc" : "asc",
                      )
                    }
                    className="inline-flex h-[42px] items-center gap-2 rounded-xl border border-[#ece8e1] bg-white px-4 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
                  >
                    {sortDirection === "asc" ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowDown className="h-4 w-4" />
                    )}
                    {sortDirection === "asc" ? "Ascending" : "Descending"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                <tr>
                  {sortOptions.map((column) => (
                    <th
                      key={column.value}
                      className="border-b border-[#f0ece6] px-4 py-3"
                    >
                      <button
                        type="button"
                        onClick={() => updateSort(column.value)}
                        className="inline-flex cursor-pointer items-center gap-1.5"
                      >
                        <span>{column.label}</span>
                        {sortField === column.value ? (
                          sortDirection === "asc" ? (
                            <ArrowUp className="h-3.5 w-3.5 text-slate-300" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-slate-300" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />
                        )}
                      </button>
                    </th>
                  ))}
                  <th className="border-b border-[#f0ece6] px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-8"
                    >
                      <div className="space-y-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                          <div
                            key={index}
                            className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_0.9fr] gap-3 rounded-2xl border border-[#ece8e1] bg-white px-4 py-4"
                          >
                            {Array.from({ length: 11 }).map((__, colIndex) => (
                              <div
                                key={colIndex}
                                className="h-4 animate-pulse rounded bg-slate-200/80"
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-14 text-center text-[13px] text-slate-400"
                    >
                      No credentialing records match the current filters.
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="text-[13px] text-slate-600">
                      <td className="border-b border-[#f4f1ec] px-4 py-3 font-medium text-slate-700">
                        <button
                          type="button"
                          onClick={() => openViewModal(record)}
                          className="text-left hover:text-[#4f63ea]"
                        >
                          {record.credentialingId}
                        </button>
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3">
                        {record.provider}
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3">
                        {record.insuranceCompany}
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3">
                        {record.credentialingType}
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${statusTone(record.status)}`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3">
                        {record.assignedUser}
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3">
                        {formatDateLabel(record.submissionDate)}
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3">
                        {formatDateLabel(record.effectiveDate)}
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3">
                        {formatDateLabel(record.expirationDate)}
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3">
                        {formatDateLabel(record.updatedAt)}
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openViewModal(record)}
                            className="cursor-pointer rounded-lg border border-[#ece8e1] p-2 text-slate-500 hover:bg-[#f7f5f1]"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(record)}
                            className="cursor-pointer rounded-lg border border-[#ece8e1] p-2 text-slate-500 hover:bg-[#f7f5f1]"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(record);
                              setDeleteTarget(record);
                            }}
                            className="cursor-pointer rounded-lg border border-[#ece8e1] p-2 text-slate-500 hover:bg-[#f7f5f1] hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[#f0ece6] px-6 py-4">
            <div className="text-[13px] text-slate-500">
              {rangeLabel}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="cursor-pointer rounded-lg border border-[#ece8e1] px-3 py-2 text-[13px] text-slate-600 hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`min-w-10 cursor-pointer rounded-lg px-3 py-2 text-[13px] ${
                      currentPage === pageNumber
                        ? "bg-[#4f63ea] text-white"
                        : "border border-[#ece8e1] text-slate-600 hover:bg-[#f7f5f1]"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ),
              )}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                }
                className="cursor-pointer rounded-lg border border-[#ece8e1] px-3 py-2 text-[13px] text-slate-600 hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <CredentialingModal
          isOpen={modalMode !== null}
          mode={modalMode || "view"}
          record={selectedRecord}
          onClose={closeModal}
          onSave={handleSave}
          onRequestEdit={() => setModalMode("edit")}
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


