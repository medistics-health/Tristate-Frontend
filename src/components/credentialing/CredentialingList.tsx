import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  LayoutGrid,
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
import CredentialingModal from "./CredentialingModal";
import {
  buildCredentialingRecord,
  formatDateLabel,
  setCredentialingRecords,
  useCredentialingRecords,
} from "./credentialingStore";
import {
  credentialingStatusOptions,
  contractTypeOptions,
  requestTypeOptions,
  type CredentialingFormState,
  type CredentialingRecord,
} from "./types";

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

function sortValue(record: CredentialingRecord, field: SortField) {
  switch (field) {
    case "credentialingId":
      return record.credentialingId;
    case "provider":
      return record.provider;
    case "insuranceCompany":
      return record.insuranceCompany;
    case "credentialingType":
      return record.credentialingType;
    case "status":
      return record.status;
    case "assignedUser":
      return record.assignedUser;
    case "submissionDate":
      return record.submissionDate || "";
    case "effectiveDate":
      return record.effectiveDate || "";
    case "expirationDate":
      return record.expirationDate || "";
    case "updatedAt":
      return record.updatedAt || "";
    default:
      return "";
  }
}

function CredentialingListPage() {
  const records = useCredentialingRecords();
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: searchInput }));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const query = filters.search.trim().toLowerCase();
      const recordDate =
        record.updatedAt || record.submissionDate || record.createdAt;

      if (
        query &&
        ![
          record.credentialingId,
          record.practice,
          record.provider,
          record.insuranceCompany,
          record.assignedUser,
          record.credentialingType,
          record.contractType,
          record.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }

      if (
        filters.practice &&
        !record.practice.toLowerCase().includes(filters.practice.toLowerCase())
      ) {
        return false;
      }

      if (
        filters.provider &&
        !record.provider.toLowerCase().includes(filters.provider.toLowerCase())
      ) {
        return false;
      }

      if (
        filters.insuranceCompany &&
        !record.insuranceCompany
          .toLowerCase()
          .includes(filters.insuranceCompany.toLowerCase())
      ) {
        return false;
      }

      if (filters.status && record.status !== filters.status) return false;
      if (
        filters.credentialingType &&
        record.credentialingType !== filters.credentialingType
      )
        return false;
      if (filters.contractType && record.contractType !== filters.contractType)
        return false;
      if (
        filters.assignedUser &&
        !record.assignedUser
          .toLowerCase()
          .includes(filters.assignedUser.toLowerCase())
      ) {
        return false;
      }

      if (filters.dateFrom && recordDate < filters.dateFrom) return false;
      if (filters.dateTo && recordDate > filters.dateTo) return false;

      return true;
    });
  }, [filters, records]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const aValue = sortValue(a, sortField);
      const bValue = sortValue(b, sortField);
      const comparison = String(aValue).localeCompare(String(bValue), undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredRecords, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = useMemo(
    () => sortedRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, pageSize, sortedRecords],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const uniqueProviders = useMemo(
    () => Array.from(new Set(records.map((record) => record.provider))).sort(),
    [records],
  );
  const uniquePractices = useMemo(
    () => Array.from(new Set(records.map((record) => record.practice))).sort(),
    [records],
  );
  const uniqueInsuranceCompanies = useMemo(
    () =>
      Array.from(new Set(records.map((record) => record.insuranceCompany))).sort(),
    [records],
  );
  const uniqueAssignedUsers = useMemo(
    () => Array.from(new Set(records.map((record) => record.assignedUser))).sort(),
    [records],
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

  function handleSave(form: CredentialingFormState) {
    const nextRecord = buildCredentialingRecord(selectedRecord, form);
    const nextRecords = selectedRecord
      ? records.map((record) =>
          record.id === selectedRecord.id ? nextRecord : record,
        )
      : [nextRecord, ...records];
    setCredentialingRecords(nextRecords);
    closeModal();
  }

  function handleDelete() {
    if (!selectedRecord) return;
    setCredentialingRecords(
      records.filter((record) => record.id !== selectedRecord.id),
    );
    closeModal();
    setDeleteTarget(null);
  }

  function exportCsv() {
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
    const rows = sortedRecords.map((record) => [
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
  const rangeLabel =
    sortedRecords.length === 0
      ? "Showing 0 of 0"
      : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
          currentPage * pageSize,
          sortedRecords.length,
        )} of ${sortedRecords.length}`;

  return (
    <AppLayout
      title="Credentialing List"
      activeModule="Credentialing"
      activeSubItem="Credentialing List"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={[
        {
          label: "New record",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreateModal,
        },
      ]}
    >
      <div className="flex h-full gap-2 font-app-sans">
        <section className="app-panel min-h-0 min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-[#f0ece6] bg-gradient-to-r from-white via-[#fcfbf8] to-[#f7f3eb] px-6 py-6">
            <div className="flex flex-wrap items-end justify-end gap-5">
              

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
                >
                  <Plus className="h-4 w-4" />
                  Add New Credentialing
                </button>
                <button
                  type="button"
                  onClick={exportCsv}
                  className="rounded-xl border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
                >
                  <Download className="mr-2 inline h-4 w-4" />
                  Export
                </button>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Search credentialing..."
                    className="app-control w-72 rounded-xl py-2 pl-10 pr-3 text-[13px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-[#f0ece6] px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className="rounded-xl border border-[#ece8e1] px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
              >
                {showFilters ? "Hide Filters" : "Show Filters"}
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="text-[13px] font-medium text-slate-500 hover:text-slate-700"
              >
                Reset Filters
              </button>
              <div className="ml-auto flex items-center gap-2 text-[13px] text-slate-400">
                <span>{activeFilterCount} active filters</span>
                <span>•</span>
                <span>{sortedRecords.length} records</span>
              </div>
            </div>
          </div>

          {showFilters ? (
            <div className="border-b border-[#f0ece6] bg-[#faf9f7] px-6 py-5">
              <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-5">
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Practice
                  </span>
                  <input
                    type="text"
                    list="credentialing-practices"
                    value={filters.practice}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        practice: event.target.value,
                      }))
                    }
                    className="app-control w-full rounded-xl px-3 py-2 text-[13px]"
                    placeholder="Filter by practice"
                  />
                  <datalist id="credentialing-practices">
                    {uniquePractices.map((practice) => (
                      <option key={practice} value={practice} />
                    ))}
                  </datalist>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Provider
                  </span>
                  <input
                    type="text"
                    list="credentialing-providers"
                    value={filters.provider}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        provider: event.target.value,
                      }))
                    }
                    className="app-control w-full rounded-xl px-3 py-2 text-[13px]"
                    placeholder="Filter by provider"
                  />
                  <datalist id="credentialing-providers">
                    {uniqueProviders.map((provider) => (
                      <option key={provider} value={provider} />
                    ))}
                  </datalist>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Insurance Company
                  </span>
                  <input
                    type="text"
                    list="credentialing-insurance"
                    value={filters.insuranceCompany}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        insuranceCompany: event.target.value,
                      }))
                    }
                    className="app-control w-full rounded-xl px-3 py-2 text-[13px]"
                    placeholder="Filter by payer"
                  />
                  <datalist id="credentialing-insurance">
                    {uniqueInsuranceCompanies.map((insurance) => (
                      <option key={insurance} value={insurance} />
                    ))}
                  </datalist>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Status
                  </span>
                  <Select
                    value={filters.status}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, status: value }))
                    }
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
                    onChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        credentialingType: value,
                      }))
                    }
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
                    onChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        contractType: value,
                      }))
                    }
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
                  <input
                    type="text"
                    list="credentialing-assigned"
                    value={filters.assignedUser}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        assignedUser: event.target.value,
                      }))
                    }
                    className="app-control w-full rounded-xl px-3 py-2 text-[13px]"
                    placeholder="Filter by user"
                  />
                  <datalist id="credentialing-assigned">
                    {uniqueAssignedUsers.map((user) => (
                      <option key={user} value={user} />
                    ))}
                  </datalist>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Date Range From
                  </span>
                  <DatePicker
                    value={filters.dateFrom}
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, dateFrom: value }))
                    }
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
                    onChange={(value) =>
                      setFilters((current) => ({ ...current, dateTo: value }))
                    }
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
                        className="inline-flex items-center gap-1.5"
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
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-14 text-center text-[13px] text-slate-400"
                    >
                      No credentialing records match the current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((record) => (
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
                            className="rounded-lg border border-[#ece8e1] p-2 text-slate-500 hover:bg-[#f7f5f1]"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(record)}
                            className="rounded-lg border border-[#ece8e1] p-2 text-slate-500 hover:bg-[#f7f5f1]"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(record)}
                            className="rounded-lg border border-[#ece8e1] p-2 text-slate-500 hover:bg-[#f7f5f1] hover:text-red-600"
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
                className="rounded-lg border border-[#ece8e1] px-3 py-2 text-[13px] text-slate-600 hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`min-w-10 rounded-lg px-3 py-2 text-[13px] ${
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
                className="rounded-lg border border-[#ece8e1] px-3 py-2 text-[13px] text-slate-600 hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:opacity-40"
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
        />

        <ConfirmModal
          isOpen={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Credentialing?"
          message={`Delete ${deleteTarget?.credentialingId || "this record"}? This cannot be undone.`}
          confirmLabel="Delete"
          type="danger"
        />
      </div>
    </AppLayout>
  );
}

export default CredentialingListPage;
