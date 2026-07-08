import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Download,
  Eye,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../layout/AppLayout";
import ConfirmModal from "../../shared/ConfirmModal";
import Select from "../../shared/Select";
import {
  addPlanToPayer,
  buildInsuranceRecord,
  createInsuranceFormState,
  formatDateLabel,
  removePlan,
  setInsuranceRecords,
  updatePlan,
  useInsuranceRecords,
} from "./insuranceStore";
import { payerTypeOptions, reCredentialingCycleOptions } from "./types";
import type { InsuranceFormState, InsurancePlan, InsuranceRecord } from "./types";

type Filters = {
  search: string;
  payerType: string;
  reCredentialingCycle: string;
};

type SortField =
  | "payerName"
  | "payerType"
  | "contact"
  | "plans"
  | "turnaroundTime"
  | "reCredentialingCycle"
  | "updatedAt";

const defaultFilters: Filters = {
  search: "",
  payerType: "",
  reCredentialingCycle: "",
};

const sortOptions: { label: string; value: SortField }[] = [
  { label: "Payer Name", value: "payerName" },
  { label: "Payer Type", value: "payerType" },
  { label: "Contact", value: "contact" },
  { label: "Plans", value: "plans" },
  { label: "Turnaround Time", value: "turnaroundTime" },
  { label: "Re-credentialing Cycle", value: "reCredentialingCycle" },
  { label: "Last Updated", value: "updatedAt" },
];

function sortValue(record: InsuranceRecord, field: SortField) {
  switch (field) {
    case "payerName":
      return record.payerName;
    case "payerType":
      return record.payerType;
    case "contact":
      return record.contact;
    case "plans":
      return String(record.plans.length).padStart(10, "0");
    case "turnaroundTime":
      return record.turnaroundTime;
    case "reCredentialingCycle":
      return record.reCredentialingCycle;
    case "updatedAt":
      return record.updatedAt || "";
    default:
      return "";
  }
}

function PlanForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: InsurancePlan | null;
  onSave: (data: { planName: string; planId?: string }) => void;
  onCancel: () => void;
}) {
  const [planName, setPlanName] = useState(initial?.planName || "");
  const [planId, setPlanId] = useState(initial?.planId || "");

  return (
    <div className="flex items-end gap-2 rounded-xl border border-[#ece8e1] bg-[#faf9f7] p-3">
      <label className="flex-1">
        <span className="mb-1 block text-[11px] font-medium text-slate-500">
          Plan Name
        </span>
        <input
          type="text"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          className="app-control w-full rounded-lg px-3 py-1.5 text-[13px]"
          placeholder="e.g. HMO Plan"
        />
      </label>
      <label className="w-32">
        <span className="mb-1 block text-[11px] font-medium text-slate-500">
          Plan ID
        </span>
        <input
          type="text"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
          className="app-control w-full rounded-lg px-3 py-1.5 text-[13px]"
          placeholder="Optional"
        />
      </label>
      <button
        type="button"
        onClick={() => onSave({ planName: planName.trim(), planId: planId.trim() })}
        disabled={!planName.trim()}
        className="rounded-lg bg-[#4f63ea] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {initial ? "Update" : "Add"}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function InsuranceListPage() {
  const records = useInsuranceRecords();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedRecord, setSelectedRecord] =
    useState<InsuranceRecord | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view" | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<InsuranceRecord | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [addingPlan, setAddingPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
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

      if (
        query &&
        ![
          record.payerName,
          record.payerType,
          record.contact,
          record.turnaroundTime,
          record.reCredentialingCycle,
          ...record.plans.map((p) => p.planName),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      ) {
        return false;
      }

      if (filters.payerType && record.payerType !== filters.payerType)
        return false;
      if (
        filters.reCredentialingCycle &&
        record.reCredentialingCycle !== filters.reCredentialingCycle
      )
        return false;

      return true;
    });
  }, [filters, records]);

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      const aValue = sortValue(a, sortField);
      const bValue = sortValue(b, sortField);
      const comparison = String(aValue).localeCompare(
        String(bValue),
        undefined,
        {
          numeric: true,
          sensitivity: "base",
        },
      );
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredRecords, sortDirection, sortField]);

  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRecords = useMemo(
    () =>
      sortedRecords.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
      ),
    [currentPage, pageSize, sortedRecords],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    const action = new URLSearchParams(window.location.search).get("action");
    if (action === "create") {
      setModalMode("create");
      window.history.replaceState({}, "", "/credentialing/insurance");
    }
  }, []);

  function toggleExpand(payerId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(payerId)) {
        next.delete(payerId);
      } else {
        next.add(payerId);
      }
      return next;
    });
  }

  function openCreateModal() {
    setSelectedRecord(null);
    setModalMode("create");
    setAddingPlan(false);
    setEditingPlanId(null);
  }

  function openViewModal(record: InsuranceRecord) {
    setSelectedRecord(record);
    setModalMode("view");
    setAddingPlan(false);
    setEditingPlanId(null);
  }

  function openEditModal(record: InsuranceRecord) {
    setSelectedRecord(record);
    setModalMode("edit");
    setAddingPlan(false);
    setEditingPlanId(null);
  }

  function closeModal() {
    setModalMode(null);
    setSelectedRecord(null);
    setAddingPlan(false);
    setEditingPlanId(null);
  }

  function handleSave(form: InsuranceFormState) {
    const nextRecord = buildInsuranceRecord(selectedRecord, form);
    const nextRecords = selectedRecord
      ? records.map((record) =>
          record.id === selectedRecord.id ? nextRecord : record,
        )
      : [nextRecord, ...records];
    setInsuranceRecords(nextRecords);
    closeModal();
  }

  function handleDelete() {
    if (!selectedRecord) return;
    setInsuranceRecords(
      records.filter((record) => record.id !== selectedRecord.id),
    );
    closeModal();
    setDeleteTarget(null);
  }

  function handleAddPlan(data: { planName: string; planId?: string }) {
    if (!selectedRecord) return;
    addPlanToPayer(selectedRecord.id, data);
    setSelectedRecord(
      records.find((r) => r.id === selectedRecord.id) ?? null,
    );
    setAddingPlan(false);
  }

  function handleUpdatePlan(data: { planName: string; planId?: string }) {
    if (!selectedRecord || !editingPlanId) return;
    updatePlan(selectedRecord.id, editingPlanId, data);
    setSelectedRecord(
      records.find((r) => r.id === selectedRecord.id) ?? null,
    );
    setEditingPlanId(null);
  }

  function handleRemovePlan(planId: string) {
    if (!selectedRecord) return;
    removePlan(selectedRecord.id, planId);
    setSelectedRecord(
      records.find((r) => r.id === selectedRecord.id) ?? null,
    );
  }

  function exportCsv() {
    const header = [
      "Payer Name",
      "Payer Type",
      "Plans",
      "Contact",
      "Turnaround Time",
      "Re-credentialing Cycle",
      "Last Updated",
    ];
    const rows = sortedRecords.map((record) => [
      record.payerName,
      record.payerType,
      record.plans.map((p) => p.planName).join("; "),
      record.contact,
      record.turnaroundTime,
      record.reCredentialingCycle,
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
    link.download = "insurance-list.csv";
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
    filters.payerType,
    filters.reCredentialingCycle,
  ].filter(Boolean).length;
  const rangeLabel =
    sortedRecords.length === 0
      ? "Showing 0 of 0"
      : `Showing ${(currentPage - 1) * pageSize + 1} to ${Math.min(
          currentPage * pageSize,
          sortedRecords.length,
        )} of ${sortedRecords.length}`;

  const formPayerName = selectedRecord?.payerName || "";
  const formPayerType = selectedRecord?.payerType || "";
  const formContact = selectedRecord?.contact || "";
  const formTurnaroundTime = selectedRecord?.turnaroundTime || "";
  const formReCredentialingCycle =
    selectedRecord?.reCredentialingCycle || "";
  const [editPayerName, setEditPayerName] = useState(formPayerName);
  const [editPayerType, setEditPayerType] = useState(formPayerType);
  const [editContact, setEditContact] = useState(formContact);
  const [editTurnaroundTime, setEditTurnaroundTime] =
    useState(formTurnaroundTime);
  const [editReCredentialingCycle, setEditReCredentialingCycle] = useState(
    formReCredentialingCycle,
  );

  useEffect(() => {
    setEditPayerName(formPayerName);
    setEditPayerType(formPayerType);
    setEditContact(formContact);
    setEditTurnaroundTime(formTurnaroundTime);
    setEditReCredentialingCycle(formReCredentialingCycle);
  }, [
    formPayerName,
    formPayerType,
    formContact,
    formTurnaroundTime,
    formReCredentialingCycle,
  ]);

  function handleModalSave() {
    const form: InsuranceFormState = {
      payerName: editPayerName,
      payerType: editPayerType as InsuranceRecord["payerType"],
      contact: editContact,
      turnaroundTime: editTurnaroundTime,
      reCredentialingCycle:
        editReCredentialingCycle as InsuranceRecord["reCredentialingCycle"],
    };
    handleSave(form);
  }

  const activePlans = selectedRecord?.plans || [];

  return (
    <AppLayout
      title="Insurance"
      activeModule="Credentialing"
      activeSubItem="Insurance"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={[
        {
          label: "New Insurance",
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
                  Add New Insurance
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
                    placeholder="Search insurance..."
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
              <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Payer Type
                  </span>
                  <Select
                    value={filters.payerType}
                    onChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        payerType: value,
                      }))
                    }
                    options={[
                      { label: "All Types", value: "" },
                      ...payerTypeOptions.map((type) => ({
                        label: type,
                        value: type,
                      })),
                    ]}
                    placeholder="All Types"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Re-credentialing Cycle
                  </span>
                  <Select
                    value={filters.reCredentialingCycle}
                    onChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        reCredentialingCycle: value,
                      }))
                    }
                    options={[
                      { label: "All Cycles", value: "" },
                      ...reCredentialingCycleOptions.map((cycle) => ({
                        label: cycle,
                        value: cycle,
                      })),
                    ]}
                    placeholder="All Cycles"
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
                  <th className="w-10 border-b border-[#f0ece6] px-2 py-3" />
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
                  <th className="border-b border-[#f0ece6] px-4 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-14 text-center text-[13px] text-slate-400"
                    >
                      No insurance records match the current filters.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.flatMap((record) => {
                    const isExpanded = expandedIds.has(record.id);
                    const payerRow = (
                      <tr key={record.id} className="text-[13px] text-slate-600">
                        <td className="w-10 border-b border-[#f4f1ec] px-2 py-3">
                          <button
                            type="button"
                            onClick={() => toggleExpand(record.id)}
                            className="rounded p-0.5 text-slate-400 hover:text-slate-600"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                        <td className="border-b border-[#f4f1ec] px-4 py-3 font-medium text-slate-700">
                          <button
                            type="button"
                            onClick={() => openViewModal(record)}
                            className="text-left hover:text-[#4f63ea]"
                          >
                            {record.payerName}
                          </button>
                        </td>
                        <td className="border-b border-[#f4f1ec] px-4 py-3">
                          {record.payerType}
                        </td>
                        <td className="border-b border-[#f4f1ec] px-4 py-3">
                          {record.plans.length}
                        </td>
                        <td className="border-b border-[#f4f1ec] px-4 py-3">
                          {record.contact}
                        </td>
                        <td className="border-b border-[#f4f1ec] px-4 py-3">
                          {record.turnaroundTime}
                        </td>
                        <td className="border-b border-[#f4f1ec] px-4 py-3">
                          {record.reCredentialingCycle}
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
                    );

                    if (!isExpanded) return [payerRow];

                    const plans = record.plans;
                    if (plans.length === 0) {
                      return [
                        payerRow,
                        <tr
                          key={`${record.id}-empty`}
                          className="bg-[#faf9f7] text-[13px] text-slate-400"
                        >
                          <td className="border-b border-[#f4f1ec]" />
                          <td
                            colSpan={8}
                            className="border-b border-[#f4f1ec] px-4 py-3 pl-14 italic"
                          >
                            No plans added yet.
                          </td>
                        </tr>,
                      ];
                    }

                    return [
                      payerRow,
                      ...plans.map((plan, planIndex) => (
                        <tr
                          key={plan.id}
                          className="bg-[#faf9f7] text-[13px] text-slate-600"
                        >
                          <td className="border-b border-[#f4f1ec]" />
                          <td
                            colSpan={8}
                            className="border-b border-[#f4f1ec] px-4 py-2.5 pl-14"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-slate-400">
                                {planIndex + 1}.
                              </span>
                              <span className="font-medium text-slate-700">
                                {plan.planName}
                              </span>
                              {plan.planId ? (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                                  ID: {plan.planId}
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )),
                    ];
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[#f0ece6] px-6 py-4">
            <div className="text-[13px] text-slate-500">{rangeLabel}</div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
                className="rounded-lg border border-[#ece8e1] px-3 py-2 text-[13px] text-slate-600 hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1,
              ).map((pageNumber) => (
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
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="rounded-lg border border-[#ece8e1] px-3 py-2 text-[13px] text-slate-600 hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {modalMode !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
              <div className="border-b border-[#f0ece6] px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-800">
                  {modalMode === "create"
                    ? "Add Insurance"
                    : modalMode === "edit"
                      ? "Edit Insurance"
                      : "Insurance Details"}
                </h2>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5 custom-scrollbar">
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Payer Name
                  </span>
                  <input
                    type="text"
                    value={editPayerName}
                    onChange={(e) => setEditPayerName(e.target.value)}
                    readOnly={modalMode === "view"}
                    className="app-control w-full rounded-xl px-3 py-2 text-[13px]"
                    placeholder="Enter payer name"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Payer Type
                  </span>
                  {modalMode === "view" ? (
                    <input
                      type="text"
                      value={editPayerType}
                      readOnly
                      className="app-control w-full rounded-xl px-3 py-2 text-[13px]"
                    />
                  ) : (
                    <Select
                      value={editPayerType}
                      onChange={(value) => setEditPayerType(value)}
                      options={payerTypeOptions.map((type) => ({
                        label: type,
                        value: type,
                      }))}
                      placeholder="Select payer type"
                    />
                  )}
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Contact
                  </span>
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    readOnly={modalMode === "view"}
                    className="app-control w-full rounded-xl px-3 py-2 text-[13px]"
                    placeholder="Enter contact email or phone"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Turnaround Time
                  </span>
                  <input
                    type="text"
                    value={editTurnaroundTime}
                    onChange={(e) => setEditTurnaroundTime(e.target.value)}
                    readOnly={modalMode === "view"}
                    className="app-control w-full rounded-xl px-3 py-2 text-[13px]"
                    placeholder="e.g. 45 days"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">
                    Re-credentialing Cycle
                  </span>
                  {modalMode === "view" ? (
                    <input
                      type="text"
                      value={editReCredentialingCycle}
                      readOnly
                      className="app-control w-full rounded-xl px-3 py-2 text-[13px]"
                    />
                  ) : (
                    <Select
                      value={editReCredentialingCycle}
                      onChange={(value) =>
                        setEditReCredentialingCycle(value)
                      }
                      options={reCredentialingCycleOptions.map((cycle) => ({
                        label: cycle,
                        value: cycle,
                      }))}
                      placeholder="Select cycle"
                    />
                  )}
                </label>

                <div className="border-t border-[#f0ece6] pt-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-slate-700">
                      Plans ({activePlans.length})
                    </h3>
                    {modalMode !== "view" && !addingPlan && (
                      <button
                        type="button"
                        onClick={() => setAddingPlan(true)}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-[#4f63ea] hover:text-[#3d4ed1]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Plan
                      </button>
                    )}
                  </div>

                  {addingPlan && (
                    <div className="mb-3">
                      <PlanForm
                        onSave={handleAddPlan}
                        onCancel={() => setAddingPlan(false)}
                      />
                    </div>
                  )}

                  {activePlans.length === 0 && !addingPlan ? (
                    <p className="text-[12px] text-slate-400 italic">
                      No plans added yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activePlans.map((plan) => {
                        const isEditing = editingPlanId === plan.id;
                        return (
                          <div key={plan.id}>
                            {isEditing ? (
                              <PlanForm
                                initial={plan}
                                onSave={handleUpdatePlan}
                                onCancel={() => setEditingPlanId(null)}
                              />
                            ) : (
                              <div className="flex items-center justify-between rounded-xl border border-[#ece8e1] bg-white px-3 py-2.5">
                                <div className="flex items-center gap-3">
                                  <span className="text-[13px] font-medium text-slate-700">
                                    {plan.planName}
                                  </span>
                                  {plan.planId ? (
                                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                                      ID: {plan.planId}
                                    </span>
                                  ) : null}
                                </div>
                                {modalMode !== "view" && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingPlanId(plan.id)}
                                      className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600"
                                      title="Edit plan"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemovePlan(plan.id)}
                                      className="rounded-lg p-1.5 text-slate-400 hover:text-red-500"
                                      title="Remove plan"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-[#f0ece6] px-6 py-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
                >
                  {modalMode === "view" ? "Close" : "Cancel"}
                </button>
                {modalMode !== "view" && (
                  <button
                    type="button"
                    onClick={handleModalSave}
                    className="rounded-xl bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
                  >
                    {modalMode === "create" ? "Create" : "Save Changes"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={deleteTarget !== null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Insurance?"
          message={`Delete ${deleteTarget?.payerName || "this record"}? This cannot be undone.`}
          confirmLabel="Delete"
          type="danger"
        />
      </div>
    </AppLayout>
  );
}

export default InsuranceListPage;
