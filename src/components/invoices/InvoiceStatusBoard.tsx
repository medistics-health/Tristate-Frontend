import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, CreditCard, ChevronRight, AlertCircle, FileText, CheckCircle2, Clock } from "lucide-react";
import AppLayout from "../layout/AppLayout";
import { getAllInvoices, type Invoice, type InvoiceStatus } from "../../services/operations/invoices";

type ColumnDef = {
  id: InvoiceStatus;
  label: string;
  badgeClassName: string;
  icon: React.ReactNode;
};

const COLUMNS: ColumnDef[] = [
  {
    id: "DRAFT",
    label: "Draft",
    badgeClassName: "bg-slate-100 text-slate-700 border border-slate-200",
    icon: <FileText className="h-4 w-4 text-slate-500" />,
  },
  {
    id: "SENT",
    label: "Sent",
    badgeClassName: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: <Clock className="h-4 w-4 text-blue-500" />,
  },
  {
    id: "PARTIALLY_PAID",
    label: "Partially Paid",
    badgeClassName: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <CreditCard className="h-4 w-4 text-amber-500" />,
  },
  {
    id: "PAID",
    label: "Paid",
    badgeClassName: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  },
  {
    id: "CANCELLED",
    label: "Cancelled",
    badgeClassName: "bg-red-50 text-red-700 border border-red-200",
    icon: <AlertCircle className="h-4 w-4 text-red-500" />,
  },
];

export default function InvoiceStatusBoard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const data = await getAllInvoices();
        setInvoices(data);
      } catch (error) {
        console.error("Failed to load invoices", error);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  function formatCurrency(amount: string | number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(Number(amount));
  }

  function formatDate(dateStr?: string | null) {
    if (!dateStr) return "N/A";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  }

  return (
    <AppLayout title="Invoice Status Board" activeModule="Invoices" activeSubItem="Invoice Status Board">
      <div className="flex h-[calc(100vh-64px)] w-full flex-col overflow-hidden bg-[#faf9f7]">
        {/* Board Area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 pb-2 custom-scrollbar-hide">
          <div className="flex h-full gap-6 min-w-max pb-4">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              Loading board...
            </div>
          ) : (
            COLUMNS.map((col) => {
              const colInvoices = invoices.filter((inv) => inv.status === col.id);
              
              return (
                <div key={col.id} className="flex h-full w-[310px] shrink-0 flex-col rounded-xl bg-slate-200/40 border border-slate-200/60 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 bg-white/80 rounded-t-xl">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg ${col.badgeClassName.split(" ").filter(c => !c.includes("bg-") && !c.includes("border")).join(" ")} bg-white shadow-sm border border-slate-100`}>
                        {col.icon}
                      </div>
                      <h3 className="font-bold text-slate-800 text-[14px] uppercase tracking-wide">{col.label}</h3>
                    </div>
                    <span className="flex items-center justify-center h-6 min-w-6 rounded-full bg-slate-800 text-[11px] font-bold text-white shadow-sm">
                      {colInvoices.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                    {colInvoices.map((inv) => (
                      <Link
                        key={inv.id}
                        to={`/invoice/all-invoices`}
                        className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className={`px-2 py-1 text-[10px] font-bold rounded border ${col.badgeClassName}`}>
                            {inv.invoiceNumber || "INV"}
                          </div>
                          <span className="text-[14px] font-bold text-slate-900">
                            {formatCurrency(inv.totalAmount)}
                          </span>
                        </div>
                        
                        <div className="font-bold text-slate-700 text-[13px] mb-4 leading-tight group-hover:text-indigo-600 transition-colors">
                          {inv.practice?.name || "Unknown Practice"}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-50 mt-auto">
                          <div className="flex items-center gap-1.5 font-medium">
                            <CalendarDays className="h-3 w-3" />
                            <span>Due {formatDate(inv.dueDate)}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                      </Link>
                    ))}

                    {colInvoices.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-slate-200/60 bg-slate-50/50 text-slate-400 text-[12px] font-medium italic">
                        Empty Column
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>
      </div>
      <style>{`
        .custom-scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </AppLayout>
  );
}
