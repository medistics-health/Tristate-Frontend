import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  FileText,
  DollarSign,
  Settings,
  Building2,
  List,
  ChevronLeft,
  Circle,
  Save,
  Trash2,
} from "lucide-react";
import AppLayout from "../layout/AppLayout";
import { DetailCard, EmptyStateIllustration } from "../shared/tablePageUtils";
import DataTableToolbar, { SortableHeaderCell, type ActiveFilterChip } from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import MultiSelect from "../shared/MultiSelect";
import toast from "react-hot-toast";
import {
  getPrefundingRates,
  createPrefundingRate,
  updatePrefundingRate,
  deletePrefundingRate,
} from "../../services/operations/prefundingRates";
import { getAllPractices, type Practice } from "../../services/operations/practices";

type PrefundingRate = {
  id: string;
  name: string;
  basis: string;
  pricingModel: string;
  rate: number;
  practiceIds: string[];
};

const PRICING_MODELS = [
  { value: "Addition", label: "Addition" },
  { value: "Subtraction", label: "Subtraction" },
  { value: "Multiplication", label: "Multiplication" },
  { value: "Division", label: "Division" },
  { value: "Percentage", label: "Percentage" },
  { value: "Flat Fee", label: "Flat Fee" },
];

const BASIS_OPTIONS = [
  { value: "Per Claim", label: "Per Claim" },
  { value: "Per Provider", label: "Per Provider" },
  { value: "Monthly", label: "Monthly" },
  { value: "Transaction", label: "Transaction" },
];

export default function PrefundingRates() {
  const [data, setData] = useState<PrefundingRate[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Server-side State
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 0 });
  const [searchInput, setSearchInput] = useState("");
  
  type Filters = { pricingModel: string; practiceId: string };
  const defaultFilters: Filters = { pricingModel: "", practiceId: "" };
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<Filters>(defaultFilters);

  // Detail Panel State
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<Omit<PrefundingRate, "id">>({
    name: "",
    basis: "Monthly",
    pricingModel: "Flat Fee",
    rate: 0,
    practiceIds: [],
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const sortBy = sorting.length > 0 ? sorting[0].id : undefined;
      const sortOrder = sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

      const [ratesRes, practicesRes] = await Promise.all([
        getPrefundingRates({
          page: pagination.page,
          limit: pagination.limit,
          search: searchInput,
          pricingModel: filters.pricingModel,
          practiceId: filters.practiceId,
          sortBy,
          sortOrder
        }),
        practices.length === 0 ? getAllPractices() : Promise.resolve(practices),
      ]);

      const ratesList = ratesRes?.rates || [];
      const mappedRates = ratesList.map((r: any) => ({
        ...r,
        practiceIds: r.practiceRates ? r.practiceRates.map((pr: any) => pr.practiceId) : [],
        rate: Number(r.rate),
      }));
      
      setData(mappedRates);
      
      if (ratesRes?.pagination) {
        setPagination(prev => ({
          ...prev,
          totalRecords: ratesRes.pagination.totalRecords,
          totalPages: ratesRes.pagination.totalPages
        }));
      }

      if (practicesRes && Array.isArray(practicesRes)) {
        setPractices(practicesRes);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load prefunding rates");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchInput, filters, sorting]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = useMemo<ColumnDef<PrefundingRate>[]>(() => [
    {
      accessorKey: "name",
      header: () => (
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          <span>Name</span>
        </div>
      ),
      cell: (info) => <span className="font-medium">{info.getValue() as string}</span>,
    },
    {
      accessorKey: "basis",
      header: () => (
        <div className="flex items-center gap-2">
          <List className="h-3.5 w-3.5" />
          <span>Basis</span>
        </div>
      ),
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: "pricingModel",
      header: () => (
        <div className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5" />
          <span>Pricing Model</span>
        </div>
      ),
      cell: (info) => {
        const val = info.getValue() as string;
        const colors: Record<string, string> = {
          "Percentage": "bg-purple-100 text-purple-700",
          "Flat Fee": "bg-emerald-100 text-emerald-700",
          "Addition": "bg-blue-100 text-blue-700",
          "Subtraction": "bg-red-100 text-red-700",
          "Multiplication": "bg-amber-100 text-amber-700",
          "Division": "bg-cyan-100 text-cyan-700",
        };
        const colorClass = colors[val] || "bg-slate-100 text-slate-700";
        return (
          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
            {val}
          </span>
        );
      },
    },
    {
      accessorKey: "rate",
      header: () => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5" />
          <span>Rate</span>
        </div>
      ),
      cell: (info) => {
        const val = info.getValue() as number;
        const model = info.row.original.pricingModel;
        if (model === "Percentage") return `${val}%`;
        if (model === "Multiplication") return `x${val}`;
        if (model === "Division") return `/${val}`;
        return val.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        });
      },
    },
    {
      accessorKey: "practiceIds",
      enableSorting: false,
      header: () => (
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span>Practices</span>
        </div>
      ),
      cell: (info) => {
        const ids = (info.getValue() as string[]) || [];
        return (
          <div className="flex flex-wrap gap-1">
            {ids.map((id) => {
              const practice = practices.find((p) => p.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex rounded-full bg-[#e8e5f9] px-2 py-0.5 text-xs text-[#4f63ea]"
                >
                  {practice?.name || id}
                </span>
              );
            })}
          </div>
        );
      },
    },
  ], [practices]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleOpenCreateForm = () => {
    setFormData({ name: "", basis: "Monthly", pricingModel: "Flat Fee", rate: 0, practiceIds: [] });
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setIsEditing(false);
  };

  const handleRowClick = (id: string) => {
    const item = data.find((d) => d.id === id);
    if (item) {
      setFormData(item);
      setSelectedRowId(id);
      setShowDetailPanel(true);
      setShowCreateForm(false);
      setIsEditing(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }
    try {
      if (showCreateForm) {
        await createPrefundingRate(formData);
        toast.success("Prefunding rate created successfully");
      } else if (isEditing && selectedRowId) {
        await updatePrefundingRate(selectedRowId, formData);
        toast.success("Prefunding rate updated successfully");
      }
      await loadData();
      setShowCreateForm(false);
      setIsEditing(false);
      if (showCreateForm) {
        setShowDetailPanel(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save prefunding rate");
    }
  };

  const handleDelete = async () => {
    if (selectedRowId) {
      if (!window.confirm("Are you sure you want to delete this rate?")) return;
      try {
        await deletePrefundingRate(selectedRowId);
        toast.success("Prefunding rate deleted successfully");
        await loadData();
        setShowDetailPanel(false);
        setSelectedRowId(null);
      } catch (error: any) {
        toast.error(error.message || "Failed to delete prefunding rate");
      }
    }
  };

  const renderFormContent = () => (
    <div className="space-y-4 py-4">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="e.g. Standard Monthly Fee"
          disabled={!showCreateForm && !isEditing}
        />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">Basis</label>
        <Select
          placeholder="Select basis"
          value={formData.basis}
          onChange={(val) => setFormData((prev) => ({ ...prev, basis: val }))}
          options={BASIS_OPTIONS}
          disabled={!showCreateForm && !isEditing}
        />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">Pricing Model</label>
        <Select
          placeholder="Select pricing model"
          value={formData.pricingModel}
          onChange={(val) => setFormData((prev) => ({ ...prev, pricingModel: val }))}
          options={PRICING_MODELS}
          disabled={!showCreateForm && !isEditing}
        />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">Rate <span className="text-red-500">*</span></label>
        <div className="relative">
          {formData.pricingModel !== "Percentage" && formData.pricingModel !== "Multiplication" && formData.pricingModel !== "Division" && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-slate-400 sm:text-sm">$</span>
            </div>
          )}
          {formData.pricingModel === "Multiplication" && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-slate-400 sm:text-sm">x</span>
            </div>
          )}
          {formData.pricingModel === "Division" && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-slate-400 sm:text-sm">/</span>
            </div>
          )}
          <input
            type="number"
            className={`w-full rounded-md border border-slate-300 ${formData.pricingModel === "Percentage" ? "pl-3 pr-8" : "pl-7 pr-3"} py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
            value={formData.rate}
            onChange={(e) => setFormData((prev) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
            placeholder="0"
            disabled={!showCreateForm && !isEditing}
          />
          {formData.pricingModel === "Percentage" && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-slate-400 sm:text-sm">%</span>
            </div>
          )}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">Practices</label>
        <MultiSelect
          placeholder="Select practices"
          options={practices.map((p) => ({ value: p.id, label: p.name }))}
          value={formData.practiceIds}
          onChange={(val) => setFormData((prev) => ({ ...prev, practiceIds: val }))}
          disabled={!showCreateForm && !isEditing}
        />
      </div>
    </div>
  );

  const selectedItem = useMemo(() => data.find((item) => item.id === selectedRowId) || null, [data, selectedRowId]);

  const activeFilterChips: ActiveFilterChip[] = [];
  if (filters.pricingModel) {
    activeFilterChips.push({
      key: "pricingModel",
      label: "Pricing Model",
      displayValue: filters.pricingModel,
      onClear: () => {
        setFilters((prev) => ({ ...prev, pricingModel: "" }));
        setDraftFilters((prev) => ({ ...prev, pricingModel: "" }));
      }
    });
  }
  if (filters.practiceId) {
    const practiceName = practices.find(p => p.id === filters.practiceId)?.name || filters.practiceId;
    activeFilterChips.push({
      key: "practiceId",
      label: "Practice",
      displayValue: practiceName,
      onClear: () => {
        setFilters((prev) => ({ ...prev, practiceId: "" }));
        setDraftFilters((prev) => ({ ...prev, practiceId: "" }));
      }
    });
  }
  const activeFilterCount = activeFilterChips.length;

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setPagination(p => ({ ...p, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setSearchInput("");
    setPagination(p => ({ ...p, page: 1 }));
  };

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Pricing Model</span>
        <Select
          value={draftFilters.pricingModel}
          onChange={(val) => setDraftFilters((prev) => ({ ...prev, pricingModel: val }))}
          options={[{ value: "", label: "All Models" }, ...PRICING_MODELS]}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Practice</span>
        <Select
          value={draftFilters.practiceId}
          onChange={(val) => setDraftFilters((prev) => ({ ...prev, practiceId: val }))}
          options={[{ value: "", label: "All Practices" }, ...practices.map(p => ({ value: p.id, label: p.name }))]}
        />
      </label>
    </>
  );

  return (
    <AppLayout title="Prefunding Rates" activeModule="Prefunding">
      <div className="h-full bg-[#f4f1ec] p-6">
        <div className="app-split font-app-sans">
          <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
            <div className="h-full flex flex-col max-w-full">
              <DataTableToolbar
                title="Prefunding Rates"
                subtitle="Manage prefunding rate line items, bases, and pricing models."
                searchPlaceholder="Search rates..."
                searchValue={searchInput}
                onSearchChange={setSearchInput}
                activeFilterCount={activeFilterCount}
                activeChips={activeFilterChips}
                onResetFilters={handleResetFilters}
                onApplyFilters={handleApplyFilters}
                filterModalTitle="Filter Rates"
                filterFields={filterFieldsModal}
                addNewLabel="Add Rate"
                onAddNew={handleOpenCreateForm}
                onRefresh={loadData}
                isLoading={isLoading}
                page={pagination.page}
                pageSize={pagination.limit}
                totalRecords={pagination.totalRecords}
                totalPages={pagination.totalPages}
                onPageChange={(page) => setPagination(p => ({ ...p, page }))}
                onPageSizeChange={(limit) => setPagination(p => ({ ...p, limit, page: 1 }))}
              >
                <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th key={header.id} className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-4 py-3 text-left font-medium last:border-r-0">
                              {header.isPlaceholder ? null : <SortableHeaderCell header={header} />}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="bg-white">
                      {data.length > 0 ? (
                        table.getRowModel().rows.map((row) => (
                          <tr
                            key={row.id}
                            onClick={() => handleRowClick(row.original.id)}
                            className={`cursor-pointer transition-colors ${selectedRowId === row.original.id ? 'bg-[#f0f4f8]' : 'hover:bg-[#fcfaf8]'}`}
                          >
                            {row.getVisibleCells().map((cell) => (
                              <td key={cell.id} className="border-b border-[#f0ece6] border-r border-[#fcfaf8] px-4 py-3 text-[13px] text-slate-700 last:border-r-0">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columns.length} className="border-b border-[#f0ece6] px-4 py-12 text-center text-slate-500">
                            No prefunding rates found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </DataTableToolbar>
            </div>
          </section>

          {(showDetailPanel || showCreateForm) && (
            <div className="flex w-[480px] flex-shrink-0 flex-col border-l border-[#f0ece6] bg-white transition-all duration-300">
              <div className="flex h-[45px] flex-shrink-0 items-center gap-2 border-b border-[#f0ece6] bg-[#fcfaf8] px-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailPanel(false);
                    setShowCreateForm(false);
                    setIsEditing(false);
                    setSelectedRowId(null);
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <Circle className="h-4 w-4 text-slate-300" />
                <h2 className="text-[13px] font-semibold text-slate-700">
                  {showCreateForm ? "New Rate" : selectedItem?.name}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {renderFormContent()}
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-[#e8e4dc] px-6 py-4 bg-slate-50">
                {showCreateForm ? (
                  <>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                  </>
                ) : isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Edit Rate
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
