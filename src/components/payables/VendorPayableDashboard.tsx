import { useEffect, useState } from "react";
import { DollarSign, RefreshCw, FileText, CheckCircle, Clock, Check } from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import {
  getVendorPayables,
  releasePayable,
  syncPayableToQuickBooks,
  generatePayableStatement,
  type VendorPayable,
} from "../../services/operations/payables";

export default function VendorPayableDashboard() {
  const [payables, setPayables] = useState<VendorPayable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, { type: string; loading: boolean }>>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  async function loadPayables(page = 1) {
    try {
      setIsLoading(true);
      const data = await getVendorPayables(page, pagination.limit);
      setPayables(data.payables);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load vendor payables.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPayables(1);
  }, []);

  function setActionState(id: string, actionType: string, state: boolean) {
    setActionLoadingMap(prev => ({
      ...prev,
      [id]: { type: actionType, loading: state }
    }));
  }

  function isActionLoading(id: string, actionType: string) {
    return actionLoadingMap[id]?.type === actionType && actionLoadingMap[id]?.loading;
  }

  function isAnyActionLoading(id: string) {
    return actionLoadingMap[id]?.loading;
  }

  async function handleRelease(id: string) {
    try {
      setActionState(id, "release", true);
      await releasePayable(id);
      toast.success("Payable released successfully.");
      await loadPayables(pagination.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to release payable.");
    } finally {
      setActionState(id, "release", false);
    }
  }

  async function handleSync(id: string) {
    try {
      setActionState(id, "sync", true);
      await syncPayableToQuickBooks(id);
      toast.success("Synced to QuickBooks successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync to QuickBooks.");
    } finally {
      setActionState(id, "sync", false);
    }
  }

  async function handleGenerateStatement(id: string) {
    try {
      setActionState(id, "statement", true);
      const url = await generatePayableStatement(id);
      toast.success("Statement generated!");
      window.open(url, "_blank");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate statement.");
    } finally {
      setActionState(id, "statement", false);
    }
  }

  function formatCurrency(amount: string | number) {
    const num = typeof amount === "number" ? amount : Number.parseFloat(amount as string);
    if (isNaN(num)) return amount;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
  }

  function formatPolicy(policy: string) {
    return policy.replace(/_/g, " ");
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "APPROVED":
      case "PAID":
        return "bg-green-100 text-green-700";
      case "DRAFT":
      case "PENDING_APPROVAL":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  return (
    <AppLayout title="Vendor Payables" activeModule="Vendors" activeSubItem="Vendor Payables">
      <div className="flex h-full flex-col p-6 max-w-7xl mx-auto w-full">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Vendor Payables</h1>
            <p className="mt-1 text-sm text-slate-500">Manage and release payments to vendors and subcontractors.</p>
          </div>
          <button
            onClick={() => loadPayables(pagination.page)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200 z-10">
                <tr>
                  <th className="px-6 py-4 font-semibold">Vendor</th>
                  <th className="px-6 py-4 font-semibold">Related Practice</th>
                  <th className="px-6 py-4 font-semibold">Amount Owed</th>
                  <th className="px-6 py-4 font-semibold">Status & Policy</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Loading vendor payables...
                    </td>
                  </tr>
                ) : payables.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No vendor payables found.
                    </td>
                  </tr>
                ) : (
                  payables.map((payable) => {
                    const isApproved = payable.status === "APPROVED" || payable.status === "PAID";
                    
                    return (
                      <tr key={payable.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{payable.vendor?.name}</div>
                          <div className="mt-1 text-xs text-slate-500 font-mono">#{payable.payableNumber || payable.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {payable.practice?.name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">
                            {formatCurrency(payable.totalAmount)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(payable.status)}`}>
                              {isApproved ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {payable.status === "DRAFT" ? "ON HOLD" : payable.status.replace(/_/g, " ")}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                              {formatPolicy(payable.releasePolicy)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleRelease(payable.id)}
                              disabled={isApproved || isAnyActionLoading(payable.id)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isActionLoading(payable.id, "release") ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                              ) : isApproved ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                              )}
                              {isApproved ? "Released" : "Release Payable"}
                            </button>
                            
                            <button
                              onClick={() => handleGenerateStatement(payable.id)}
                              disabled={isAnyActionLoading(payable.id)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isActionLoading(payable.id, "statement") ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                              ) : (
                                <FileText className="h-3.5 w-3.5 text-blue-500" />
                              )}
                              Statement
                            </button>

                            <button
                              onClick={() => handleSync(payable.id)}
                              disabled={isAnyActionLoading(payable.id)}
                              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 border border-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {isActionLoading(payable.id, "sync") ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                              )}
                              Sync QB
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
              <span className="text-sm text-slate-500">
                Showing page <span className="font-medium text-slate-900">{pagination.page}</span> of{" "}
                <span className="font-medium text-slate-900">{pagination.totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => loadPayables(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadPayables(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
