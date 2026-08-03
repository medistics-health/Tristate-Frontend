import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { LayoutList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import {
  getInvoiceLineItemsView,
  type InvoiceLineItemRow,
} from "../../services/operations/invoiceLineItems";

type InvoiceLineItemsViewMode = "client" | "tristate";

function AllInvoiceLineItems({
  viewMode = "client",
}: {
  viewMode?: InvoiceLineItemsViewMode;
}) {
  const isTristateView = viewMode === "tristate";
  const pageTitle = isTristateView
    ? "Tristate Invoice Line Items"
    : "Client Invoice Line Items";
  const [rows, setRows] = useState<InvoiceLineItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ invoiceNumber: "" });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "creationDate", desc: true },
  ]);

  const columns = useMemo(
    () =>
      [
        {
          id: "invoiceLabel",
          accessorFn: (row: InvoiceLineItemRow) => row.values.invoiceLabel,
          header: () => "Invoice",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.invoiceLabel || "-"),
        },
        {
          id: "serviceName",
          accessorFn: (row: InvoiceLineItemRow) => row.values.serviceName,
          header: () => "Service",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.serviceName || "-"),
        },
        {
          id: "description",
          accessorFn: (row: InvoiceLineItemRow) => row.values.description,
          header: () => "Description",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.description || "-"),
        },
        {
          id: "quantity",
          accessorFn: (row: InvoiceLineItemRow) => row.values.quantity,
          header: () => "Quantity",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.quantity ?? "-"),
        },

        ...(isTristateView
          ? ([
              {
                id: "totalPrice",
                accessorFn: (row: InvoiceLineItemRow) => row.values.totalPrice,
                header: () => "Total Price",
                cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
                  String(row.original.values.totalPrice || "-"),
              },
              {
                id: "companyFeeDeductionAmount",
                accessorFn: (row: InvoiceLineItemRow) =>
                  row.values.companyFeeDeductionAmount,
                header: () => "Company Absorbed",
                cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
                  String(row.original.values.companyFeeDeductionAmount || "-"),
              },
            ] as ColumnDef<InvoiceLineItemRow>[])
          : []),
        ...(!isTristateView
          ? ([
              {
                id: "externalTotalPrice",
                accessorFn: (row: InvoiceLineItemRow) =>
                  row.values.externalTotalPrice,
                header: () => "Total Price",
                cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
                  String(row.original.values.totalPrice || "-"),
              },
            ] as ColumnDef<InvoiceLineItemRow>[])
          : [
              {
                id: "externalTotalPrice",
                accessorFn: (row: InvoiceLineItemRow) =>
                  row.values.externalTotalPrice,
                header: () => "Transfer Total",
                cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
                  String(row.original.values.externalTotalPrice || "-"),
              },
            ]),
        {
          id: "creationDate",
          accessorFn: (row: InvoiceLineItemRow) => row.values.creationDate,
          header: () => "Created",
          cell: ({ row }: { row: { original: InvoiceLineItemRow } }) =>
            String(row.original.values.creationDate),
        },
      ] as ColumnDef<InvoiceLineItemRow>[],
    [isTristateView],
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
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getInvoiceLineItemsView({
          page: pagination.page,
          limit: pagination.limit,
          invoiceNumber: filters.invoiceNumber || undefined,
        });
        setRows(data.rows);
        setPagination(data.pagination);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load invoice line items";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [pagination.page, pagination.limit, sorting, filters]);

  if (isLoading) {
    return (
      <AppLayout
        title="Invoice Line Items"
        activeModule="Invoice Line Items"
        activeSubItem={pageTitle}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading invoice line items...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout
        title="Invoice Line Items"
        activeModule="Invoice Line Items"
        activeSubItem={pageTitle}
      >
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="text-red-500">{error}</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="app-control rounded-md px-4 py-2 text-[14px] font-medium"
          >
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Invoice Line Items"
      activeModule="Invoice Line Items"
      activeSubItem={pageTitle}
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
    >
      <div className="flex h-full gap-2">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              <span>{pageTitle}</span>
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowFilterPanel((current) => !current)}
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
              <input
                type="text"
                value={filters.invoiceNumber}
                onChange={(event) => {
                  setFilters({ invoiceNumber: event.target.value });
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder="Filter by invoice number"
                className="app-control min-w-[240px] rounded-md px-3 py-1.5 text-[13px]"
              />
              <button
                type="button"
                onClick={() => setFilters({ invoiceNumber: "" })}
                className="text-[13px] text-[#4f63ea] hover:underline"
                disabled={!filters.invoiceNumber}
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            {rows.length === 0 ? (
              <div className="relative flex min-h-[400px] items-center justify-center">
                <div className="flex max-w-md flex-col items-center px-6 text-center">
                  <EmptyStateIllustration />
                  <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                    No {pageTitle.toLowerCase()} found
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    No invoice line items matched the current filter
                  </p>
                </div>
              </div>
            ) : (
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10 bg-white">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-3 py-2 text-left text-[13px] font-medium text-slate-400 last:border-r-0"
                        >
                          {header.isPlaceholder ? null : (
                            <button
                              type="button"
                              onClick={
                                header.column.getCanSort()
                                  ? header.column.getToggleSortingHandler()
                                  : undefined
                              }
                              className="flex w-full items-center gap-2"
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </button>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => {
                    return (
                      <tr key={row.id} className="bg-white hover:bg-[#faf9f7]">
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-3 py-2 text-[13px] text-slate-600 last:border-r-0"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
                    className={`rounded px-2 py-1 text-[13px] ${pagination.page === page ? "bg-[#4f63ea] text-white" : "text-slate-500 hover:bg-[#f0ece6]"}`}
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
        </section>
      </div>
    </AppLayout>
  );
}

export default AllInvoiceLineItems;
