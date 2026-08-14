import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DollarSign, RefreshCw, FileText, CheckCircle, Clock, Check, X, Trash2, Link2, ExternalLink, Download } from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import {
  getVendorPayables,
  releasePayable,
  syncPayableToQuickBooks,
  syncBillPaymentToQuickBooks,
  generatePayableStatement,
  createVendorPayable,
  deletePayable,
  payVendorPayable,
  downloadQuickBooksBillPdf,
  type VendorPayable,
} from "../../services/operations/payables";
import { getAllVendors, type Vendor } from "../../services/operations/vendors";
import { getAllPractices, type Practice } from "../../services/operations/practices";
import {
  canFinanceWrite,
  canOperationsAndFinanceWrite,
  readStoredUser,
} from "../../utils/auth";
import DataTableToolbar, {
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import { getResponsivePageSize } from "../shared/TablePagination";

export default function VendorPayableDashboard() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canWritePayables = canOperationsAndFinanceWrite(currentRole);
  const canFinanceActions = canFinanceWrite(currentRole);
  const navigate = useNavigate();
  const [payables, setPayables] = useState<VendorPayable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, { type: string; loading: boolean }>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: getResponsivePageSize(),
    total: 0,
    totalPages: 0,
  });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [previewPayable, setPreviewPayable] = useState<VendorPayable | null>(null);
  const [userSelectedPageSize, setUserSelectedPageSize] = useState(false);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    vendorId: "",
    practiceId: "",
    totalAmount: "",
    description: "Manual payable",
  });

  useEffect(() => {
    function handleResize() {
      if (!userSelectedPageSize) {
        const newSize = getResponsivePageSize();
        setPagination((prev) => ({ ...prev, limit: newSize }));
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [userSelectedPageSize]);

  type PayableFilters = {
    search: string;
    status: string;
    vendorId: string;
    practiceId: string;
  };

  const defaultFilters: PayableFilters = {
    search: "",
    status: "",
    vendorId: "",
    practiceId: "",
  };

  const [filters, setFilters] = useState<PayableFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<PayableFilters>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");

  const handleOpenFilterModal = () => {
    setDraftFilters(filters);
  };

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setSearchInput("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const activeFilterCount = [
    filters.status,
    filters.vendorId,
    filters.practiceId,
  ].filter(Boolean).length;

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.status) {
      chips.push({
        key: "status",
        label: "Status",
        displayValue: filters.status.replace(/_/g, " "),
        onClear: () => {
          setFilters((curr) => ({ ...curr, status: "" }));
          setDraftFilters((curr) => ({ ...curr, status: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.vendorId) {
      const vendorName = vendors.find((v) => v.id === filters.vendorId)?.name || filters.vendorId;
      chips.push({
        key: "vendorId",
        label: "Vendor",
        displayValue: vendorName,
        onClear: () => {
          setFilters((curr) => ({ ...curr, vendorId: "" }));
          setDraftFilters((curr) => ({ ...curr, vendorId: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.practiceId) {
      const practiceName = practices.find((p) => p.id === filters.practiceId)?.name || filters.practiceId;
      chips.push({
        key: "practiceId",
        label: "Practice",
        displayValue: practiceName,
        onClear: () => {
          setFilters((curr) => ({ ...curr, practiceId: "" }));
          setDraftFilters((curr) => ({ ...curr, practiceId: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    return chips;
  }, [filters, vendors, practices]);

  const refreshPayables = async (pageTarget = pagination.page) => {
    try {
      setIsLoading(true);
      const data = await getVendorPayables({
        page: pageTarget,
        limit: pagination.limit,
        ...(searchInput.trim() && { search: searchInput.trim() }),
        ...(filters.status && { status: filters.status }),
        ...(filters.vendorId && { vendorId: filters.vendorId }),
        ...(filters.practiceId && { practiceId: filters.practiceId }),
      });
      setPayables(data.payables);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load vendor payables.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshPayables();
    }, 400);
    return () => clearTimeout(timer);
  }, [
    pagination.page,
    pagination.limit,
    searchInput,
    filters.status,
    filters.vendorId,
    filters.practiceId,
  ]);

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    try {
      const [vData, pData] = await Promise.all([getAllVendors(), getAllPractices()]);
      setVendors(vData);
      setPractices(pData);
    } catch (error) {
      console.error("Failed to load options", error);
    }
  }

  async function handleCreatePayable(e: React.FormEvent) {
    e.preventDefault();
    if (!canWritePayables) {
      toast.error("You do not have permission to create vendor payables.");
      return;
    }
    if (!createForm.vendorId || !createForm.practiceId || !createForm.totalAmount) {
      toast.error("Please fill in all required fields.");
      return;
    }
    try {
      setIsSubmitting(true);
      await createVendorPayable({
        ...createForm,
        totalAmount: Number(createForm.totalAmount),
      });
      toast.success("Vendor payable created successfully.");
      setIsCreateModalOpen(false);
      loadPayables(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create payable.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
    if (!canFinanceActions) {
      toast.error("Only finance/admin can release payables.");
      return;
    }
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
    if (!canFinanceActions) {
      toast.error("Only finance/admin can sync vendor bills.");
      return;
    }
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

  async function handleSyncPayment(id: string) {
    if (!canFinanceActions) {
      toast.error("Only finance/admin can sync bill payments.");
      return;
    }
    try {
      setActionState(id, "syncPayment", true);
      await syncBillPaymentToQuickBooks(id);
      toast.success("Bill payment synced to QuickBooks successfully.");
      await loadPayables(pagination.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync bill payment.");
    } finally {
      setActionState(id, "syncPayment", false);
    }
  }

  async function handleGenerateStatement(id: string) {
    try {
      setActionState(id, "statement", true);
      await generatePayableStatement(id);
      const payable = payables.find(p => p.id === id);
      if (payable) setPreviewPayable(payable);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate statement.");
    } finally {
      setActionState(id, "statement", false);
    }
  }

  async function handleDelete(id: string) {
    if (!canFinanceActions) {
      toast.error("Only finance/admin can delete payables.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this payable?")) return;
    try {
      setActionState(id, "delete", true);
      await deletePayable(id);
      toast.success("Payable deleted successfully.");
      await loadPayables(pagination.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete payable.");
    } finally {
      setActionState(id, "delete", false);
    }
  }

  async function handlePayPayable(id: string) {
    if (!canFinanceActions) {
      toast.error("Only finance/admin can mark payable as paid.");
      return;
    }
    try {
      setActionState(id, "pay", true);
      await payVendorPayable(id);
      toast.success("Vendor payable marked as paid successfully.");
      await loadPayables(pagination.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark payable as paid.");
    } finally {
      setActionState(id, "pay", false);
    }
  }

  async function handleDownloadBill(id: string) {
    try {
      setActionState(id, "download", true);
      await downloadQuickBooksBillPdf(id, `bill-${id}.pdf`);
      toast.success("Bill PDF downloaded successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download bill PDF.");
    } finally {
      setActionState(id, "download", false);
    }
  }

  function handleCopyPayLink(id: string) {
    const link = `${window.location.origin}/vendors/payables/pay/${id}`;
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied to clipboard!");
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

  const filterFieldsModal = (
    <div className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Status
        </span>
        <Select
          value={draftFilters.status}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, status: val }))
          }
          options={[
            { label: "All Statuses", value: "" },
            { label: "DRAFT", value: "DRAFT" },
            { label: "PENDING_APPROVAL", value: "PENDING_APPROVAL" },
            { label: "APPROVED", value: "APPROVED" },
            { label: "RELEASED", value: "RELEASED" },
            { label: "PAID", value: "PAID" },
            { label: "VOID", value: "VOID" },
          ]}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Vendor
        </span>
        <Select
          value={draftFilters.vendorId}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, vendorId: val }))
          }
          options={[
            { label: "All Vendors", value: "" },
            ...vendors.map((v) => ({ label: v.name, value: v.id })),
          ]}
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Practice
        </span>
        <Select
          value={draftFilters.practiceId}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, practiceId: val }))
          }
          options={[
            { label: "All Practices", value: "" },
            ...practices.map((p) => ({ label: p.name, value: p.id })),
          ]}
        />
      </label>
    </div>
  );

  return (
    <AppLayout title="Vendor Payables" activeModule="Vendors" activeSubItem="Vendor Payables">
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="Vendor Payables"
            subtitle="Manage vendor splits, releases, and QuickBooks sync"
            searchPlaceholder="Search payables by payable number, vendor, or practice..."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={resetFilters}
            onApplyFilters={handleApplyFilters}
            onOpenFilterModal={handleOpenFilterModal}
            filterModalTitle="Filter Vendor Payables"
            filterFields={filterFieldsModal}
            addNewLabel={canWritePayables ? "Add Payable" : undefined}
            onAddNew={canWritePayables ? () => setIsCreateModalOpen(true) : undefined}
            onRefresh={() => refreshPayables()}
            isLoading={isLoading}
            page={pagination.page}
            pageSize={pagination.limit}
            totalRecords={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            onPageSizeChange={(newSize) => {
              setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }));
              setUserSelectedPageSize(true);
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-slate-600 border-separate border-spacing-0">
                <thead className="sticky top-0 bg-white text-[12px] uppercase tracking-wide text-slate-400 z-10 border-b border-[#f0ece6]">
                  <tr>
                    <th className="px-6 py-3.5 font-bold border-b border-[#f0ece6] border-r border-[#f4f1ec]">Vendor</th>
                    <th className="px-6 py-3.5 font-bold border-b border-[#f0ece6] border-r border-[#f4f1ec]">Related Practice</th>
                    <th className="px-6 py-3.5 font-bold border-b border-[#f0ece6] border-r border-[#f4f1ec]">Amount Owed</th>
                    <th className="px-6 py-3.5 font-bold border-b border-[#f0ece6] border-r border-[#f4f1ec]">Status & Policy</th>
                    <th className="px-6 py-3.5 font-bold border-b border-[#f0ece6] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payables.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        No vendor payables found.
                      </td>
                    </tr>
                  ) : (
                    payables.map((payable) => {
                      const isReleased = payable.status === "RELEASED" || payable.status === "PAID" || (payable.status === "APPROVED" && !!payable.releasedAt);

                      return (
                        <tr key={payable.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-5 align-top min-w-[220px]">
                            <div className="font-bold text-slate-900 text-[14px] leading-snug">
                              {payable.vendor?.name}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                #{payable.payableNumber || payable.id.slice(0, 8)}
                              </span>
                              {payable.quickbooksBillId && (
                                <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wider scale-95 origin-left">
                                  QB Bill
                                </span>
                              )}
                              {payable.quickbooksBillPaymentId && (
                                <span className="text-[10px] font-extrabold bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 uppercase tracking-wider scale-95 origin-left">
                                  QB Paid
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5 align-top min-w-[200px]">
                            <div className="text-[13px] font-medium text-slate-600 leading-relaxed">
                              {payable.practice?.name}
                            </div>
                          </td>
                          <td className="px-6 py-5 align-top">
                            <div className="text-[15px] font-extrabold text-slate-800">
                              {formatCurrency(payable.totalAmount)}
                            </div>
                          </td>
                          <td className="px-6 py-5 align-top w-[180px]">
                            <div className="flex flex-col items-start gap-2.5">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${getStatusStyle(payable.status)} shadow-sm`}>
                                {isReleased ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {payable.status === "DRAFT" || (payable.status === "APPROVED" && !payable.releasedAt) ? "ON HOLD" : payable.status.replace(/_/g, " ")}
                              </span>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  Policy
                                </span>
                                <span className="text-[12px] font-semibold text-slate-500 uppercase">
                                  {formatPolicy(payable.releasePolicy)}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 align-top text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              {/* Release Action */}
                              {canFinanceActions && (
                                <button
                                  onClick={() => handleRelease(payable.id)}
                                  disabled={isReleased || isAnyActionLoading(payable.id)}
                                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                  {isActionLoading(payable.id, "release") ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                  ) : isReleased ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <DollarSign className="h-4 w-4 text-emerald-500" />
                                  )}
                                  {isReleased ? "Released" : "Release"}
                                </button>
                              )}

                              {/* Sync Bill to QB (only show after paid) */}
                              {canFinanceActions &&
                                !payable.quickbooksBillId &&
                                payable.status === "PAID" && (
                                <button
                                  onClick={() => handleSync(payable.id)}
                                  disabled={isAnyActionLoading(payable.id)}
                                  className="bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[12px] font-bold transition-all shadow-sm"
                                  title="Sync Bill to QB"
                                >
                                  {isActionLoading(payable.id, "sync") ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-4 w-4" />
                                  )}
                                  <div className="flex flex-col items-start leading-none gap-0 text-left">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Sync</span>
                                    <span className="text-[12px] font-extrabold uppercase">Inv</span>
                                  </div>
                                </button>
                                )}

                              {/* Pay Now Button (Direct checkout) */}
                              {canFinanceActions &&
                                isReleased &&
                                payable.status !== "PAID" && (
                                <>
                                  <button
                                    onClick={() => navigate(`/vendors/payables/pay/${payable.id}`)}
                                    disabled={isAnyActionLoading(payable.id)}
                                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 text-[12px] font-bold text-indigo-700 hover:bg-indigo-100 transition-all shadow-sm"
                                    title="Pay Bill Now"
                                  >
                                    <ExternalLink className="h-4 w-4 text-indigo-500" />
                                    <div className="flex flex-col items-start leading-none gap-0 text-left">
                                      <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-tighter">Bill Pay</span>
                                      <span className="text-[12px] font-extrabold uppercase text-indigo-700">Pay Now</span>
                                    </div>
                                  </button>

                                  <button
                                    onClick={() => handleCopyPayLink(payable.id)}
                                    disabled={isAnyActionLoading(payable.id)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 transition-all shadow-sm"
                                    title="Copy Pay Link"
                                  >
                                    <Link2 className="h-4 w-4 text-slate-500" />
                                  </button>

                                  <button
                                    onClick={() => handlePayPayable(payable.id)}
                                    disabled={isAnyActionLoading(payable.id)}
                                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-bold text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm"
                                    title="Mark as Paid"
                                  >
                                    {isActionLoading(payable.id, "pay") ? (
                                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                                    ) : (
                                      <Check className="h-4 w-4 text-emerald-600" />
                                    )}
                                    <div className="flex flex-col items-start leading-none gap-0 text-left">
                                      <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-tighter">Record</span>
                                      <span className="text-[12px] font-extrabold uppercase text-emerald-700">Paid</span>
                                    </div>
                                  </button>
                                </>
                                )}

                              {/* Bill Payment Sync to QB */}
                              {canFinanceActions &&
                                isReleased &&
                                !payable.quickbooksBillPaymentId &&
                                !!payable.quickbooksBillId && (
                                <button
                                  onClick={() => handleSyncPayment(payable.id)}
                                  disabled={isAnyActionLoading(payable.id)}
                                  className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[12px] font-bold transition-all shadow-sm"
                                  title="Sync Payment to QB"
                                >
                                  {isActionLoading(payable.id, "syncPayment") ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4 text-slate-400" />
                                  )}
                                  <div className="flex flex-col items-start leading-none gap-0 text-left">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Sync</span>
                                    <span className="text-[12px] font-extrabold uppercase">Pmt</span>
                                  </div>
                                </button>
                                )}

                              {/* Download Bill PDF from QB */}
                              {payable.status === "PAID" && !!payable.quickbooksBillId && (
                                <button
                                  onClick={() => handleDownloadBill(payable.id)}
                                  disabled={isAnyActionLoading(payable.id)}
                                  className="bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-200 inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[12px] font-bold transition-all shadow-sm"
                                  title="Download Bill PDF"
                                >
                                  {isActionLoading(payable.id, "download") ? (
                                    <RefreshCw className="h-4 w-4 animate-spin text-emerald-500" />
                                  ) : (
                                    <Download className="h-4 w-4 text-emerald-600" />
                                  )}
                                  <div className="flex flex-col items-start leading-none gap-0 text-left">
                                    <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-tighter">QuickBooks</span>
                                    <span className="text-[12px] font-extrabold uppercase text-emerald-700">Download</span>
                                  </div>
                                </button>
                              )}

                              {/* Delete Action */}
                              {canFinanceActions && (
                                <button
                                  onClick={() => handleDelete(payable.id)}
                                  disabled={isAnyActionLoading(payable.id)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 disabled:opacity-50 transition-all shadow-sm"
                                  title="Delete Payable"
                                >
                                  {isActionLoading(payable.id, "delete") ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </DataTableToolbar>
        </section>
      </div>

      {/* Create Payable Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-800">Create Vendor Payable</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayable} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vendor</label>
                <select
                  required
                  value={createForm.vendorId}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, vendorId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Practice</label>
                <select
                  required
                  value={createForm.practiceId}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, practiceId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                >
                  <option value="">Select Practice</option>
                  {practices.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total Amount ($)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={createForm.totalAmount}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 shadow-md shadow-indigo-200"
                >
                  {isSubmitting ? "Creating..." : "Create Payable"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Statement Preview Modal */}
      {previewPayable && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-4xl max-h-[90vh] rounded-[32px] bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
            {/* Header / Actions */}
            <div className="flex items-center justify-between border-b border-slate-50 px-10 py-6 bg-slate-50/30 print:hidden">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight">Statement Preview</h3>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{previewPayable.payableNumber || "DRAFT STATEMENT"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <RefreshCw className="h-4 w-4" /> Print Statement
                </button>
                <button
                  onClick={() => setPreviewPayable(null)}
                  className="h-11 w-11 flex items-center justify-center rounded-2xl bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto p-12 bg-white print:p-0 print:overflow-visible printable-statement">
              <div className="max-w-3xl mx-auto space-y-12 print:max-w-none print:m-0">
                {/* Brand & Meta */}
                <div className="flex justify-between items-start">
                  <div className="space-y-4">
                    <div className="h-12 w-48 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 font-black italic text-xl uppercase tracking-tighter print:border print:border-slate-200">
                      Tristate MSO
                    </div>
                    <div className="text-sm text-slate-500 leading-relaxed max-w-[240px]">
                      123 Enterprise Way, Suite 500<br />
                      New Jersey, NJ 07102<br />
                      support@tristate-mso.com
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <h4 className="text-4xl font-black text-slate-800 uppercase tracking-tight">Statement</h4>
                    <p className="text-sm font-bold text-slate-400">Date: {new Date().toLocaleDateString()}</p>
                    <p className="text-sm font-bold text-indigo-600">ID: {previewPayable.id.slice(0, 12).toUpperCase()}</p>
                  </div>
                </div>

                <div className="h-px bg-slate-100 w-full" />

                {/* Billing Addresses */}
                <div className="grid grid-cols-2 gap-12">
                  <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Remit To (Vendor)</h5>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 text-lg">{previewPayable.vendor?.name}</p>
                      <p className="text-sm text-slate-500">{(previewPayable.vendor as any)?.remitEmail || "billing@vendor.com"}</p>
                      <p className="text-sm text-slate-500">Vendor ID: {previewPayable.vendorId.slice(0, 8)}</p>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Billed To (Practice)</h5>
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 text-lg">{previewPayable.practice?.name}</p>
                      <p className="text-sm text-slate-500">Practice ID: {previewPayable.practiceId.slice(0, 8)}</p>
                      <p className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-2 print:border print:border-emerald-200">Active Partnership</p>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="rounded-3xl border border-slate-100 overflow-hidden print:border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50 print:bg-slate-100">
                        <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px]">Service / Description</th>
                        <th className="px-6 py-4 font-black text-slate-400 uppercase tracking-widest text-[10px] text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 print:divide-slate-200">
                      <tr>
                        <td className="px-6 py-6 font-bold text-slate-700">
                          Professional Medical Services Breakdown
                          <p className="text-xs font-medium text-slate-400 mt-1">Generated from billing run item snapshots</p>
                        </td>
                        <td className="px-6 py-6 text-right font-black text-slate-900 text-lg">
                          {formatCurrency(previewPayable.totalAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Summary / Footer */}
                <div className="flex justify-end pt-4">
                  <div className="w-64 space-y-3 bg-slate-50 rounded-3xl p-6 print:bg-slate-50 print:border print:border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                      <span></span>
                      <span>{formatCurrency(previewPayable.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                      <span>Tax (0%)</span>
                      <span>$0.00</span>
                    </div>
                    <div className="h-px bg-slate-200 w-full" />
                    <div className="flex justify-between items-center text-lg font-black text-slate-900">
                      <span>Total</span>
                      <span>{formatCurrency(previewPayable.totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-8">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-[0.3em]">Tristate Enterprise Secure Document</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          /* Hide everything by default */
          body * { visibility: hidden !important; }
          
          /* Show only the statement content and its parents */
          .printable-statement, .printable-statement * { 
            visibility: visible !important; 
          }
          
          /* Position the statement perfectly on the paper */
          .printable-statement {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: white !important;
          }

          /* Strip away all web-only UI styling for the print-out */
          .printable-statement { 
            box-shadow: none !important; 
            border: none !important;
          }

          /* Ensure colors and lines are sharp */
          * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
        }
      ` }} />
    </AppLayout>
  );
}
