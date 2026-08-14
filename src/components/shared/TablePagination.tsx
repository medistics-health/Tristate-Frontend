import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Select from "./Select";

type TablePaginationProps = {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
};

export default function TablePagination({
  page,
  pageSize,
  totalRecords,
  totalPages,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [8, 15, 25, 50],
}: TablePaginationProps) {
  const startItem = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalRecords);

  // Generate page numbers array with smart ellipsis logic
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#f0ece6] bg-[#faf9f7] px-5 py-3 text-[13px] font-app-sans text-slate-600">
      {/* Items count summary & page size selector */}
      <div className="flex items-center gap-4">
        <span className="text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-800">{startItem}</span> to{" "}
          <span className="font-semibold text-slate-800">{endItem}</span> of{" "}
          <span className="font-semibold text-slate-800">{totalRecords}</span> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-2 border-l border-[#ece8e1] pl-4">
            <span className="text-[12px] text-slate-500 font-medium">Rows per page:</span>
            <div className="w-20">
              <Select
                value={String(pageSize)}
                onChange={(val) => onPageSizeChange(Number(val))}
                options={pageSizeOptions.map((opt) => ({
                  label: String(opt),
                  value: String(opt),
                }))}
                placement="top"
              />
            </div>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#ece8e1] bg-white text-slate-600 transition-colors hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:opacity-40 shadow-2xs"
          title="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((p, idx) => (
          <React.Fragment key={idx}>
            {typeof p === "number" ? (
              <button
                type="button"
                onClick={() => onPageChange(p)}
                className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg px-2.5 text-[13px] font-medium transition-all ${
                  p === page
                    ? "bg-[#4f63ea] text-white shadow-sm"
                    : "border border-[#ece8e1] bg-white text-slate-700 hover:bg-[#f7f5f1] shadow-2xs"
                }`}
              >
                {p}
              </button>
            ) : (
              <span className="px-1 text-slate-400 font-medium">...</span>
            )}
          </React.Fragment>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#ece8e1] bg-white text-slate-600 transition-colors hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:opacity-40 shadow-2xs"
          title="Next Page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function getResponsivePageSize(defaultSize = 10): number {
  if (typeof window === "undefined") return defaultSize;
  const height = window.innerHeight;
  if (height < 700) return 6;
  if (height < 900) return 10;
  if (height < 1100) return 15;
  return 20;
}
