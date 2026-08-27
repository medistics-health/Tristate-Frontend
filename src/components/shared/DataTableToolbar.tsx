import React, { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import TablePagination from "./TablePagination";

export type FilterFieldType = "select" | "search-select" | "date" | "custom";

export type ActiveFilterChip = {
  key: string;
  label: string;
  displayValue: string;
  onClear: () => void;
};

type DataTableToolbarProps = {
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  // Filter modal props
  activeFilterCount: number;
  activeChips?: ActiveFilterChip[];
  onResetFilters: () => void;
  onApplyFilters?: () => void;
  onOpenFilterModal?: () => void;
  filterModalTitle?: string;
  filterFields?: ReactNode;
  // Action buttons
  addNewLabel?: string;
  onAddNew?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  skeletonRows?: number;
  extraActions?: ReactNode;
  // Optional Pagination
  page?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  children?: ReactNode;
};

export default function DataTableToolbar({
  title,
  subtitle,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  activeFilterCount,
  activeChips = [],
  onResetFilters,
  onApplyFilters,
  onOpenFilterModal,
  filterModalTitle = "Filter Records",
  filterFields,
  addNewLabel = "Add New",
  onAddNew,
  onExport,
  onRefresh,
  isLoading = false,
  isSaving = false,
  isDeleting = false,
  skeletonRows = 6,
  extraActions,
  page,
  pageSize,
  totalRecords,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 8, 10, 15, 25, 50],
  children,
}: DataTableToolbarProps) {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);



  const handleOpen = () => {
    if (onOpenFilterModal) onOpenFilterModal();
    setIsFilterModalOpen(true);
  };

  const handleApply = () => {
    if (onApplyFilters) onApplyFilters();
    setIsFilterModalOpen(false);
  };

  const handleReset = () => {
    onResetFilters();
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 w-full overflow-hidden font-app-sans">
      {/* Top Header Row */}
      <div className="border-b border-[#f0ece6] bg-gradient-to-r from-white via-[#fcfbf8] to-[#f7f3eb] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title && (
            <div className="min-w-0 flex-1">
              {subtitle && (
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
                  {subtitle}
                </div>
              )}
              <h1 className="mt-0.5 text-[22px] font-semibold text-slate-800 tracking-tight">
                {title}
              </h1>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {onAddNew && (
              <button
                type="button"
                onClick={onAddNew}
                disabled={isSaving || isDeleting || isLoading}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#4f63ea] px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition-all hover:bg-[#3d4ed1] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
              >
                {isSaving || isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isSaving ? "Saving..." : isDeleting ? "Deleting..." : addNewLabel}
              </button>
            )}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading || isSaving || isDeleting}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-[#f7f5f1] hover:border-[#dcd6cb] transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
                title="Refresh table data"
              >
                <RefreshCw
                  className={`h-4 w-4 text-slate-500 ${isLoading ? "animate-spin text-[#4f63ea]" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}

            {onExport && (
              <button
                type="button"
                onClick={onExport}
                disabled={isSaving || isDeleting || isLoading || totalRecords === 0}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-[#f7f5f1] hover:border-[#dcd6cb] transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-slate-500"
              >
                <Download className="h-4 w-4 text-slate-500" />
                Export
              </button>
            )}

            {/* Filter Trigger Button */}
            {filterFields && (
              <button
                type="button"
                onClick={handleOpen}
                className={`relative inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                  activeFilterCount > 0
                    ? "border-[#4f63ea]/40 bg-[#f0f2fe] text-[#4f63ea] hover:bg-[#e4e7fd]"
                    : "border-[#ece8e1] bg-white text-slate-700 hover:bg-[#f7f5f1] hover:border-[#dcd6cb]"
                }`}
              >
                <Filter className={`h-4 w-4 ${activeFilterCount > 0 ? "text-[#4f63ea]" : "text-slate-500"}`} />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#4f63ea] text-[11px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}

            {extraActions}

            {/* Search Control (Optional) */}
            {onSearchChange && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={searchValue || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="app-control w-56 rounded-xl border border-[#ece8e1] bg-white py-2 pl-9 pr-3 text-[13px] text-slate-800 placeholder-slate-400 focus:border-[#4f63ea] focus:ring-1 focus:ring-[#4f63ea]/20 outline-none transition-all"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Filter Chips Bar (if any filters active) */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#f0ece6] bg-[#fcfbf9] px-5 py-2.5">
          <span className="text-[12px] font-medium text-slate-500">Active Filters:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e4e7fd] bg-[#f0f2fe] px-2.5 py-1 text-[12px] font-medium text-[#3b4bbf]"
            >
              <span className="text-slate-500 font-normal">{chip.label}:</span>
              <span className="font-semibold text-[#4f63ea]">{chip.displayValue}</span>
              <button
                type="button"
                onClick={chip.onClear}
                className="ml-0.5 text-[#4f63ea] hover:text-rose-600 rounded-full p-0.5 hover:bg-rose-50 transition-colors"
                title={`Remove ${chip.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onResetFilters}
            className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1 text-[12px] font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition-colors shadow-2xs"
          >
            <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
            Clear All
          </button>
        </div>
      )}

      {/* Main Content (Table / Dashboard) */}
      <div ref={containerRef} className="flex flex-col min-h-0 flex-1 overflow-hidden">
        {isLoading ? (
          <DataTableSkeleton rows={skeletonRows} />
        ) : (
          <div className="flex flex-col flex-1 min-h-0 overflow-auto font-app-sans">
            {children}
          </div>
        )}
      </div>

      {/* Footer Pagination (if props provided) */}
      {page !== undefined && onPageChange && pageSize !== undefined && totalRecords !== undefined && totalPages !== undefined && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={totalRecords}
          totalPages={totalPages}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}

      {/* Theme-based Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-xs font-app-sans animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-3xl rounded-2xl border border-[#ece8e1] bg-white shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#f0ece6] bg-gradient-to-r from-white via-[#fcfbf8] to-[#f7f3eb] px-6 py-4 rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0f2fe] text-[#4f63ea]">
                  <Filter className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-slate-800">
                    {filterModalTitle}
                  </h3>
                  <p className="text-[12px] text-slate-500">
                    Apply criteria to refine table records
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-[#f7f5f1] hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[calc(80vh-140px)] overflow-y-auto custom-scrollbar p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {filterFields}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-[#f0ece6] bg-[#faf9f7] px-6 py-3.5 rounded-b-2xl">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/60 px-3.5 py-2 text-[13px] font-semibold text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                Clear All Filters
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="rounded-lg border border-[#ece8e1] bg-white px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="rounded-lg bg-[#4f63ea] px-5 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-[#3d4ed1] transition-all cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DataTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar animate-pulse font-app-sans">
      {/* Table Header Skeleton */}
      <div className="flex items-center gap-4 border-b border-[#f0ece6] pb-3 px-2">
        <div className="h-4 w-28 rounded-md bg-slate-200" />
        <div className="h-4 w-36 rounded-md bg-slate-200" />
        <div className="h-4 w-24 rounded-md bg-slate-200" />
        <div className="h-4 w-32 rounded-md bg-slate-200" />
        <div className="ml-auto h-4 w-20 rounded-md bg-slate-200" />
      </div>

      {/* Row Skeletons */}
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center gap-4 rounded-xl border border-[#f4f4ec] bg-[#fbfaf8]/80 p-3.5"
        >
          <div className="h-[#1rem] w-32 rounded-md bg-slate-200/80" />
          <div className="h-[#1rem] w-40 rounded-md bg-slate-100" />
          <div className="h-6 w-20 rounded-lg bg-slate-200/70" />
          <div className="h-[#1rem] w-28 rounded-md bg-slate-100" />
          <div className="ml-auto h-[#1rem] w-24 rounded-md bg-slate-200/80" />
        </div>
      ))}
    </div>
  );
}

export function SortableHeaderCell({
  header,
}: {
  header: any;
}) {
  "use no memo";
  if (!header || header.isPlaceholder) return null;

  const canSort = header.column.getCanSort();
  const isSorted = header.column.getIsSorted();

  return (
    <button
      type="button"
      onClick={
        canSort
          ? (event) => {
              event.preventDefault();
              header.column.toggleSorting(isSorted === "asc");
            }
          : undefined
      }
      className={`flex w-full items-center justify-between gap-1.5 font-medium transition-colors ${
        canSort ? "cursor-pointer hover:text-slate-800" : "cursor-default text-slate-400"
      }`}
    >
      <span className="truncate">{flexRenderHeader(header)}</span>
      {canSort && (
        <span className="inline-flex shrink-0 items-center">
          {isSorted === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-[#4f63ea]" />
          ) : isSorted === "desc" ? (
            <ArrowDown className="h-3.5 w-3.5 text-[#4f63ea]" />
          ) : (
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-300 opacity-60 hover:opacity-100 transition-opacity" />
          )}
        </span>
      )}
    </button>
  );
}

function flexRenderHeader(header: any) {
  if (typeof header.column.columnDef.header === "function") {
    return header.column.columnDef.header(header.getContext());
  }
  return header.column.columnDef.header;
}
