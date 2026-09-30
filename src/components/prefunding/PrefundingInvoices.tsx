import React, { useMemo, useState, useEffect } from "react";
import AppLayout from "../layout/AppLayout";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { FileText, Building2, CalendarDays, DollarSign, Circle, X, ChevronLeft } from "lucide-react";
import DataTableToolbar, { SortableHeaderCell, type ActiveFilterChip } from "../shared/DataTableToolbar";

type InvoiceStatus = "Draft" | "Pending Approval" | "Approved" | "Posted";

type Invoice = {
  id: string;
  invoiceNumber: string;
  practice: string;
  prefundingCycle: string;
  totalAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  invoiceDate: string;
  recipient: string;
  createdBy: string;
  createdDate: string;
  postedDate: string | null;
};

const dummyInvoices: Invoice[] = [
  {
    id: "1",
    invoiceNumber: "INV-2026-045",
    practice: "Metro Health",
    prefundingCycle: "Weekly",
    totalAmount: 14500.0,
    status: "Pending Approval",
    dueDate: "2026-10-02",
    invoiceDate: "2026-09-30",
    recipient: "finance@metrohealth.com",
    createdBy: "Admin User",
    createdDate: "2026-09-30",
    postedDate: null,
  },
  {
    id: "2",
    invoiceNumber: "INV-2026-044",
    practice: "City Care Clinic",
    prefundingCycle: "Monthly",
    totalAmount: 8200.0,
    status: "Approved",
    dueDate: "2026-09-28",
    invoiceDate: "2026-09-25",
    recipient: "billing@citycare.com",
    createdBy: "Admin User",
    createdDate: "2026-09-25",
    postedDate: null,
  },
  {
    id: "3",
    invoiceNumber: "INV-2026-043",
    practice: "Downtown Dental",
    prefundingCycle: "Weekly",
    totalAmount: 21000.0,
    status: "Posted",
    dueDate: "2026-09-25",
    invoiceDate: "2026-09-20",
    recipient: "accounts@downtowndental.com",
    createdBy: "Admin User",
    createdDate: "2026-09-20",
    postedDate: "2026-09-24",
  },
  // Add some more to show pagination
  {
    id: "4",
    invoiceNumber: "INV-2026-042",
    practice: "CareCenter",
    prefundingCycle: "Weekly",
    totalAmount: 12000.0,
    status: "Draft",
    dueDate: "2026-09-20",
    invoiceDate: "2026-09-15",
    recipient: "billing@carecenter.com",
    createdBy: "Admin User",
    createdDate: "2026-09-15",
    postedDate: null,
  },
  {
    id: "5",
    invoiceNumber: "INV-2026-041",
    practice: "Metro Health",
    prefundingCycle: "Weekly",
    totalAmount: 13500.0,
    status: "Posted",
    dueDate: "2026-09-18",
    invoiceDate: "2026-09-13",
    recipient: "finance@metrohealth.com",
    createdBy: "Admin User",
    createdDate: "2026-09-13",
    postedDate: "2026-09-14",
  },
];

export default function PrefundingInvoices() {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
  });

  const selectedInvoice = useMemo(() => {
    return dummyInvoices.find(inv => inv.id === selectedRowId);
  }, [selectedRowId]);

  // Client-side filtering & search
  const filteredData = useMemo(() => {
    let result = dummyInvoices;
    if (searchInput) {
      const lower = searchInput.toLowerCase();
      result = result.filter(inv => 
        inv.invoiceNumber.toLowerCase().includes(lower) || 
        inv.practice.toLowerCase().includes(lower) ||
        inv.status.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [searchInput]);

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return filteredData.slice(start, start + pagination.limit);
  }, [filteredData, pagination]);

  const totalPages = Math.ceil(filteredData.length / pagination.limit);

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: () => (
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Invoice Number</span>
          </div>
        ),
      },
      {
        accessorKey: "practice",
        header: () => (
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <span>Practice</span>
          </div>
        ),
      },
      {
        accessorKey: "prefundingCycle",
        header: () => (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Cycle</span>
          </div>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: () => (
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-slate-400" />
            <span>Total Amount</span>
          </div>
        ),
        cell: ({ getValue }) => {
          const val = getValue() as number;
          return <span>${val.toLocaleString()}</span>;
        },
      },
      {
        accessorKey: "status",
        header: () => (
          <div className="flex items-center gap-2">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span>Status</span>
          </div>
        ),
        cell: ({ getValue }) => {
          const status = getValue() as InvoiceStatus;
          let badgeClass = "bg-slate-100 text-slate-700";
          if (status === "Pending Approval") badgeClass = "bg-yellow-100 text-yellow-700";
          if (status === "Approved") badgeClass = "bg-blue-100 text-blue-700";
          if (status === "Posted") badgeClass = "bg-emerald-100 text-emerald-700";
          return (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
              {status}
            </span>
          );
        },
      },
      {
        accessorKey: "dueDate",
        header: () => (
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
            <span>Due Date</span>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: paginatedData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const navbarActions: any[] = [];
  const activeChips: ActiveFilterChip[] = [];

  return (
    <AppLayout title="Prefunding Invoices" activeModule="Prefunding" navbarActions={navbarActions}>
      <div className="app-split font-app-sans">
        {/* Main Content */}
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <div className="h-full flex flex-col max-w-full">
            <DataTableToolbar
              title="Prefunding Invoices"
              subtitle="Manage and post prefunding invoices"
              searchPlaceholder="Search invoices..."
              searchValue={searchInput}
              onSearchChange={(val) => {
                setSearchInput(val);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              activeFilterCount={0}
              activeChips={activeChips}
              onResetFilters={() => setSearchInput("")}
              page={pagination.page}
              pageSize={pagination.limit}
              totalRecords={filteredData.length}
              totalPages={totalPages}
              onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
              onPageSizeChange={(newSize) => {
                setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }));
              }}
            >
              <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                {paginatedData.length === 0 ? (
                  <div className="flex h-[400px] flex-col items-center justify-center p-8 text-center bg-white rounded-b-xl border border-[#e8e4dc] border-t-0">
                    <p className="text-slate-500">No invoices found matching your criteria</p>
                  </div>
                ) : (
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-4 py-3 text-left font-medium last:border-r-0"
                            >
                              <SortableHeaderCell header={header} />
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody className="bg-white">
                      {table.getRowModel().rows.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedRowId(row.original.id)}
                          className={`cursor-pointer transition-colors ${selectedRowId === row.original.id ? 'bg-[#f0f4f8]' : 'hover:bg-[#fcfaf8]'}`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td 
                              key={cell.id} 
                              className="border-b border-[#f0ece6] border-r border-[#fcfaf8] px-4 py-3 text-[13px] text-slate-700 last:border-r-0"
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </DataTableToolbar>
          </div>
        </section>

        {/* Sidebar */}
        {selectedRowId && selectedInvoice && (
          <div className="flex w-[480px] flex-shrink-0 flex-col border-l border-[#f0ece6] bg-white transition-all duration-300">
            <div className="flex h-[45px] flex-shrink-0 items-center gap-2 border-b border-[#f0ece6] bg-[#fcfaf8] px-3">
              <button
                type="button"
                onClick={() => setSelectedRowId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <Circle className="h-4 w-4 text-slate-300" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
                Invoice Details
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">{selectedInvoice.invoiceNumber}</h3>
                <p className="text-sm text-slate-500 mt-1">{selectedInvoice.practice}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">Invoice Date</p>
                  <p className="text-sm text-slate-800 mt-1">{selectedInvoice.invoiceDate}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Due Date</p>
                  <p className="text-sm text-slate-800 mt-1">{selectedInvoice.dueDate}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Recipient</p>
                  <p className="text-sm text-slate-800 mt-1 truncate" title={selectedInvoice.recipient}>{selectedInvoice.recipient}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Amount</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">${selectedInvoice.totalAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t border-[#e8e4dc] pt-6">
                <h4 className="text-sm font-medium text-slate-800 mb-4">System Information</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Status</span>
                    <span className="text-xs font-medium text-slate-800">{selectedInvoice.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Created By</span>
                    <span className="text-xs font-medium text-slate-800">{selectedInvoice.createdBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Created Date</span>
                    <span className="text-xs font-medium text-slate-800">{selectedInvoice.createdDate}</span>
                  </div>
                  {selectedInvoice.postedDate && (
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Posted Date</span>
                      <span className="text-xs font-medium text-slate-800">{selectedInvoice.postedDate}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-[#e8e4dc] pt-6 space-y-3">
                <button className="w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition-colors">
                  Preview PDF
                </button>
                {selectedInvoice.status === "Pending Approval" && (
                  <button className="w-full py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors">
                    Approve Invoice
                  </button>
                )}
                {selectedInvoice.status === "Approved" && (
                  <button className="w-full py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors">
                    Post Invoice
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}