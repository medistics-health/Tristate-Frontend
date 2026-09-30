import React, { useState, useMemo } from "react";
import {  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Plus,
  X,
  Save,
  Trash2,
  FileText,
  DollarSign,
  Percent,
  Settings,
  Building2,
  List,
  ChevronLeft,
  Circle,
} from "lucide-react";
import AppLayout from "../layout/AppLayout";
import { DetailCard, EmptyStateIllustration } from "../shared/tablePageUtils";
import DataTableToolbar from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import MultiSelect from "../shared/MultiSelect";

type PrefundingRate = {
  id: string;
  name: string;
  basis: string;
  pricingModel: string;
  rate: number;
  practiceIds: string[];
};

const DUMMY_PRACTICES = [
  { id: "p1", name: "Alpha Care" },
  { id: "p2", name: "Beta Health" },
  { id: "p3", name: "Gamma Wellness" },
];

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

const INITIAL_DATA: PrefundingRate[] = [
  {
    id: "r1",
    name: "Standard Monthly Fee",
    basis: "Monthly",
    pricingModel: "Flat Fee",
    rate: 150.0,
    practiceIds: ["p1", "p2"],
  },
  {
    id: "r2",
    name: "Claim Processing",
    basis: "Per Claim",
    pricingModel: "Addition",
    rate: 2.5,
    practiceIds: ["p1", "p3"],
  },
  {
    id: "r3",
    name: "Volume Discount",
    basis: "Monthly",
    pricingModel: "Percentage",
    rate: -5,
    practiceIds: ["p2"],
  },
];

export default function PrefundingRates() {
  const [data, setData] = useState<PrefundingRate[]>(INITIAL_DATA);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const [formData, setFormData] = useState<Omit<PrefundingRate, "id">>({
    name: "",
    basis: "Monthly",
    pricingModel: "Flat Fee",
    rate: 0,
    practiceIds: [],
  });

  const selectedItem = useMemo(
    () => data.find((item) => item.id === selectedRowId) || null,
    [data, selectedRowId]
  );

  const filteredData = useMemo(() => {
    if (!searchInput) return data;
    const lowerSearch = searchInput.toLowerCase();
    return data.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerSearch) ||
        item.basis.toLowerCase().includes(lowerSearch) ||
        item.pricingModel.toLowerCase().includes(lowerSearch)
    );
  }, [data, searchInput]);

  const columns = useMemo<ColumnDef<PrefundingRate>[]>(() => [
    {
      accessorKey: "name",
      header: () => (
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          <span>Name</span>
        </div>
      ),
      cell: (info) => <span className="font-medium">{info.getValue() as string}</span>,
    },
    {
      accessorKey: "basis",
      header: () => (
        <div className="flex items-center gap-2">
          <List className="h-3.5 w-3.5 text-slate-400" />
          <span>Basis</span>
        </div>
      ),
      cell: (info) => info.getValue(),
    },
    {
      accessorKey: "pricingModel",
      header: () => (
        <div className="flex items-center gap-2">
          <Settings className="h-3.5 w-3.5 text-slate-400" />
          <span>Pricing Model</span>
        </div>
      ),
      cell: (info) => {
        const val = info.getValue() as string;
        return (
          <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            {val}
          </span>
        );
      },
    },
    {
      accessorKey: "rate",
      header: () => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5 text-slate-400" />
          <span>Rate</span>
        </div>
      ),
      cell: (info) => {
        const val = info.getValue() as number;
        return val.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        });
      },
    },
    {
      accessorKey: "practiceIds",
      header: () => (
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span>Practices</span>
        </div>
      ),
      cell: (info) => {
        const ids = info.getValue() as string[];
        return (
          <div className="flex flex-wrap gap-1">
            {ids.map((id) => {
              const practice = DUMMY_PRACTICES.find((p) => p.id === id);
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
  ], []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleOpenCreateForm = () => {
    setFormData({
      name: "",
      basis: "Monthly",
      pricingModel: "Flat Fee",
      rate: 0,
      practiceIds: [],
    });
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

  const handleSave = () => {
    if (!formData.name) return;

    if (showCreateForm) {
      const newRate: PrefundingRate = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
      };
      setData((prev) => [...prev, newRate]);
      setShowCreateForm(false);
    } else if (isEditing && selectedRowId) {
      setData((prev) =>
        prev.map((item) =>
          item.id === selectedRowId ? { ...item, ...formData } : item
        )
      );
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (selectedRowId) {
      setData((prev) => prev.filter((item) => item.id !== selectedRowId));
      setShowDetailPanel(false);
      setSelectedRowId(null);
    }
  };

  const FormContent = () => (
    <div className="space-y-4 py-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
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
        <Select
            placeholder=""
          value={formData.basis}
          onChange={(val) => setFormData((prev) => ({ ...prev, basis: val }))}
          options={BASIS_OPTIONS}
          disabled={!showCreateForm && !isEditing}
        />
      </div>
      <div>
        <Select
            placeholder=""
          value={formData.pricingModel}
          onChange={(val) => setFormData((prev) => ({ ...prev, pricingModel: val }))}
          options={PRICING_MODELS}
          disabled={!showCreateForm && !isEditing}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Rate</label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="text-slate-400 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            className="w-full rounded-md border border-slate-300 pl-7 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={formData.rate}
            onChange={(e) => setFormData((prev) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
            disabled={!showCreateForm && !isEditing}
          />
        </div>
      </div>
      <div>
        <MultiSelect
            placeholder=""
          options={DUMMY_PRACTICES.map((p) => ({ value: p.id, label: p.name }))}
          value={formData.practiceIds}
          onChange={(val) => setFormData((prev) => ({ ...prev, practiceIds: val }))}
          disabled={!showCreateForm && !isEditing}
        />
      </div>
    </div>
  );

  return (
    <AppLayout title="Prefunding Rates" activeModule="Prefunding">
            <div className="app-split font-app-sans">
        {/* Main Content */}
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <div className="h-full flex flex-col max-w-full">
            <DataTableToolbar
              title="Prefunding Rates"
              subtitle="Manage prefunding rate line items, bases, and pricing models."
              searchPlaceholder="Search rates..."
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              activeFilterCount={0}
              activeChips={[]}
              onResetFilters={() => setSearchInput("")}
              addNewLabel="Add Rate"
              onAddNew={handleOpenCreateForm}
            >
              <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th key={header.id} className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-4 py-3 text-left font-medium last:border-r-0">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="bg-white">
                    {table.getRowModel().rows.length > 0 ? (
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
                        <td colSpan={columns.length} className="px-6 py-8 text-center text-slate-500">
                          <EmptyStateIllustration />
                          <p className="mt-2">No prefunding rates found.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DataTableToolbar>
          </div>
        </section>

        {/* Sidebar */}
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
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
                {showCreateForm ? "Create Rate" : isEditing ? "Edit Rate" : "Rate Details"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <FormContent />
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-[#e8e4dc] px-6 py-4 bg-slate-50">
              {showCreateForm || isEditing ? (
                <>
                  <button
                    onClick={() => {
                      if (showCreateForm) {
                        setShowCreateForm(false);
                      } else {
                        setIsEditing(false);
                      }
                    }}
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
    </AppLayout>
  );
}