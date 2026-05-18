import { useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  RefreshCw,
  Search,
  Unlink,
  Link2,
  Building,
  TrendingUp,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import {
  getMercuryTransactions,
  syncMercuryTransactions,
  reconcileMercuryTransaction,
  type MercuryTransaction,
} from "../../services/operations/mercury";

const RECON_STATUS_OPTIONS = [
  { value: "", label: "All Transactions" },
  { value: "UNMATCHED", label: "Unmatched" },
  { value: "MATCHED", label: "Matched" },
  { value: "RECONCILED", label: "Reconciled" },
];

const DIRECTION_OPTIONS = [
  { value: "", label: "All Directions" },
  { value: "CREDIT", label: "Credits (Deposits)" },
  { value: "DEBIT", label: "Debits (Payments)" },
];

function formatMoney(amount: string | number | null | undefined) {
  if (amount === undefined || amount === null) return "-";
  const n = Number(amount);
  if (isNaN(n)) return String(amount);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Math.abs(n));
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTimeAgo(dateStr?: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function reconStatusStyle(status: string) {
  switch (status) {
    case "RECONCILED": return "bg-emerald-100 text-emerald-700";
    case "MATCHED": return "bg-blue-100 text-blue-700";
    default: return "bg-amber-100 text-amber-700";
  }
}

function reconStatusIcon(status: string) {
  switch (status) {
    case "RECONCILED": return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "MATCHED": return <Link2 className="h-3.5 w-3.5" />;
    default: return <Unlink className="h-3.5 w-3.5" />;
  }
}

export default function MercuryBankingPage() {
  const [transactions, setTransactions] = useState<MercuryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ reconciliationStatus: "", direction: "", search: "" });
  const [selectedTxn, setSelectedTxn] = useState<MercuryTransaction | null>(null);
  const [isReconSubmitting, setIsReconSubmitting] = useState(false);
  const [reconValue, setReconValue] = useState("RECONCILED");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(true);
  const [environment, setEnvironment] = useState("production");

  async function loadTransactions(page = 1) {
    try {
      setIsLoading(true);
      const data = await getMercuryTransactions({
        page,
        limit: pagination.limit,
        reconciliationStatus: filters.reconciliationStatus || undefined,
        direction: filters.direction || undefined,
      });
      setTransactions(data.transactions ?? []);
      setWarningMessage(data.warning ?? data.message ?? null);
      setIsConfigured(data.configured !== false);
      if (data.environment) setEnvironment(data.environment);
      if (data.pagination) {
        setPagination(data.pagination);
      } else {
        setPagination((prev) => ({ ...prev, page, total: data.total ?? 0, totalPages: Math.ceil((data.total ?? 0) / prev.limit) }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions(1);
  }, [filters.reconciliationStatus, filters.direction]);

  async function handleSync() {
    setIsSyncing(true);
    try {
      const result = await syncMercuryTransactions();
      toast.success(result.message ?? "Mercury sync complete");
      await loadTransactions(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleReconcile() {
    if (!selectedTxn) return;
    setIsReconSubmitting(true);
    try {
      await reconcileMercuryTransaction(selectedTxn.id, {
        reconciliationStatus: reconValue,
      });
      toast.success("Transaction reconciliation updated");
      setSelectedTxn(null);
      await loadTransactions(pagination.page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reconcile");
    } finally {
      setIsReconSubmitting(false);
    }
  }

  const filteredTxns = transactions.filter((txn) => {
    if (!filters.search) return true;
    const q = filters.search.toLowerCase();
    return (
      txn.description?.toLowerCase().includes(q) ||
      txn.counterpartyName?.toLowerCase().includes(q) ||
      txn.mercuryTransactionId.toLowerCase().includes(q)
    );
  });

  // Summary stats
  const totalCredits = transactions.filter((t) => t.direction === "CREDIT").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const totalDebits = transactions.filter((t) => t.direction === "DEBIT").reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const unmatched = transactions.filter((t) => t.reconciliationStatus === "UNMATCHED").length;
  const reconciled = transactions.filter((t) => t.reconciliationStatus === "RECONCILED").length;

  return (
    <AppLayout
      title="Mercury Banking"
      activeModule="Integrations"
      activeSubItem="Mercury Banking"
      navbarIcon={<Banknote className="h-4 w-4 text-slate-500" />}
      navbarActions={[
        {
          label: isSyncing ? "Syncing…" : "Sync Transactions",
          icon: <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />,
          onClick: handleSync,
        },
      ]}
    >
      <div className="flex h-full gap-2">
        {/* ── Main Panel ── */}
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white">

          {/* Header */}
          <div className="border-b border-[#f0ece6] px-5 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900">
                <Banknote className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-[16px] font-semibold text-slate-800">Mercury Bank — Transaction Ledger</h1>
                <p className="text-[12px] text-slate-400">Read-only banking layer · Reconciliation & visibility</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {isConfigured ? (
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${environment === "sandbox" ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" /> {environment === "sandbox" ? "Sandbox Connected" : "Live Connected"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-600">
                    <AlertCircle className="h-3.5 w-3.5" /> API Key Not Configured
                  </span>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total Credits", value: formatMoney(totalCredits), icon: <ArrowDownLeft className="h-4 w-4" />, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Total Debits", value: formatMoney(totalDebits), icon: <ArrowUpRight className="h-4 w-4" />, color: "text-red-500", bg: "bg-red-50" },
                { label: "Unmatched", value: String(unmatched), icon: <Unlink className="h-4 w-4" />, color: "text-amber-600", bg: "bg-amber-50" },
                { label: "Reconciled", value: String(reconciled), icon: <CheckCircle2 className="h-4 w-4" />, color: "text-blue-600", bg: "bg-blue-50" },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${card.bg} ${card.color}`}>
                      {card.icon}
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{card.label}</span>
                  </div>
                  <div className={`text-[20px] font-semibold ${card.color}`}>{card.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning Banner */}
          {warningMessage && (
            <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-5 py-2.5 text-[12px] text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {warningMessage}
            </div>
          )}

          {/* Mercury V1 Info Banner */}
          {!isConfigured && (
            <div className="flex items-start gap-3 border-b border-blue-100 bg-blue-50 px-5 py-3 text-[12px] text-blue-700">
              <Shield className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-0.5">Mercury v1 Integration — Read-Only Mode</div>
                <div className="text-blue-600">
                  Set <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">MERCURY_API_KEY</code> in backend .env to enable live transaction sync. 
                  In v1, Mercury is used for read-only visibility: bank balances, transaction history, and matching Stripe deposits to bank deposits.
                  Vendor payment initiation is planned for a future phase.
                </div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] px-5 py-2.5">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search transactions…"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                className="app-control w-full rounded-lg pl-8 pr-3 py-1.5 text-[13px]"
              />
            </div>
            <select
              value={filters.direction}
              onChange={(e) => setFilters((prev) => ({ ...prev, direction: e.target.value }))}
              className="app-control rounded-lg px-3 py-1.5 text-[13px]"
            >
              {DIRECTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={filters.reconciliationStatus}
              onChange={(e) => setFilters((prev) => ({ ...prev, reconciliationStatus: e.target.value }))}
              className="app-control rounded-lg px-3 py-1.5 text-[13px]"
            >
              {RECON_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="ml-auto text-[12px] text-slate-400">
              {pagination.total} transaction{pagination.total !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-[13px] text-slate-400">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading transactions…
              </div>
            ) : filteredTxns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <Banknote className="h-10 w-10 opacity-20" />
                <p className="text-[14px]">No transactions found.</p>
                <p className="text-[12px]">
                  {isConfigured ? "Try syncing to pull latest transactions from Mercury." : "Configure your Mercury API key in the backend .env file."}
                </p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#f0ece6] bg-[#faf9f7] text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2.5 text-left">Date</th>
                    <th className="px-5 py-2.5 text-left">Description / Counterparty</th>
                    <th className="px-5 py-2.5 text-left">Direction</th>
                    <th className="px-5 py-2.5 text-right">Amount</th>
                    <th className="px-5 py-2.5 text-left">Status</th>
                    <th className="px-5 py-2.5 text-left">Reconciliation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxns.map((txn) => (
                    <tr
                      key={txn.id}
                      onClick={() => { setSelectedTxn(txn); setReconValue(txn.reconciliationStatus || "RECONCILED"); }}
                      className="cursor-pointer border-b border-[#f0ece6] hover:bg-[#faf9f7] transition-colors"
                    >
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{formatDate(txn.postedAt)}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-700 truncate max-w-xs">
                          {txn.counterpartyName || txn.description || "—"}
                        </div>
                        {txn.description && txn.counterpartyName && (
                          <div className="text-[12px] text-slate-400 truncate">{txn.description}</div>
                        )}
                        <div className="text-[11px] text-slate-300 font-mono">{txn.mercuryTransactionId.slice(0, 12)}…</div>
                      </td>
                      <td className="px-5 py-3">
                        {txn.direction === "CREDIT" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                            <ArrowDownLeft className="h-3 w-3" /> Credit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
                            <ArrowUpRight className="h-3 w-3" /> Debit
                          </span>
                        )}
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold ${txn.direction === "CREDIT" ? "text-emerald-600" : "text-red-500"}`}>
                        {txn.direction === "DEBIT" ? "−" : "+"}{formatMoney(txn.amount)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${txn.status === "SENT" ? "bg-emerald-50 text-emerald-700" : txn.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${reconStatusStyle(txn.reconciliationStatus)}`}>
                          {reconStatusIcon(txn.reconciliationStatus)}
                          {txn.reconciliationStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!isLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#f0ece6] px-5 py-3">
              <span className="text-[12px] text-slate-400">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => loadTransactions(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-[#f0ece6] bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-[#faf9f7] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadTransactions(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-[#f0ece6] bg-white px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-[#faf9f7] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Detail / Reconcile Panel ── */}
        {selectedTxn && (
          <aside className="app-panel flex w-[380px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
              <Circle className="h-4 w-4 text-slate-300" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
                Transaction Detail
              </span>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="rounded-md p-1 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Amount display */}
              <div className={`flex items-center justify-between rounded-xl p-4 ${selectedTxn.direction === "CREDIT" ? "bg-emerald-50" : "bg-red-50"}`}>
                <div>
                  <div className="text-[11px] font-medium uppercase text-slate-400">
                    {selectedTxn.direction === "CREDIT" ? "Credit (Deposit)" : "Debit (Payment)"}
                  </div>
                  <div className={`text-[28px] font-bold mt-0.5 ${selectedTxn.direction === "CREDIT" ? "text-emerald-600" : "text-red-500"}`}>
                    {selectedTxn.direction === "DEBIT" ? "−" : "+"}{formatMoney(selectedTxn.amount)}
                  </div>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${selectedTxn.direction === "CREDIT" ? "bg-emerald-100" : "bg-red-100"}`}>
                  {selectedTxn.direction === "CREDIT" ? (
                    <ArrowDownLeft className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <ArrowUpRight className="h-6 w-6 text-red-500" />
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                {[
                  { label: "Date", value: formatDate(selectedTxn.postedAt) },
                  { label: "Time", value: formatTimeAgo(selectedTxn.postedAt) },
                  { label: "Counterparty", value: selectedTxn.counterpartyName },
                  { label: "Description", value: selectedTxn.description },
                  { label: "Status", value: selectedTxn.status },
                  { label: "Account ID", value: selectedTxn.accountId },
                  { label: "Mercury ID", value: selectedTxn.mercuryTransactionId },
                ].map(({ label, value }) =>
                  value ? (
                    <div key={label} className="flex items-start justify-between gap-2">
                      <span className="text-slate-400 shrink-0">{label}</span>
                      <span className="text-right text-slate-700 font-medium break-all text-[12px]">{value}</span>
                    </div>
                  ) : null
                )}
              </div>

              {/* Matched Entity */}
              {selectedTxn.matchedEntityType && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[13px]">
                  <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
                    <Link2 className="h-4 w-4" /> Matched to CRM Record
                  </div>
                  <div className="text-[12px] text-blue-600">
                    Type: {selectedTxn.matchedEntityType}
                    {selectedTxn.matchedEntityId && <div>ID: {selectedTxn.matchedEntityId.slice(0, 16)}…</div>}
                  </div>
                </div>
              )}

              {/* Reconcile Form */}
              <div>
                <h4 className="mb-2 text-[13px] font-medium text-slate-700">Update Reconciliation</h4>
                <div className="space-y-3 rounded-xl border border-[#f0ece6] p-3">
                  <div>
                    <label className="mb-1 block text-[12px] text-slate-500">Status</label>
                    <select
                      value={reconValue}
                      onChange={(e) => setReconValue(e.target.value)}
                      className="app-control w-full rounded-lg px-3 py-2 text-[13px]"
                    >
                      <option value="UNMATCHED">Unmatched</option>
                      <option value="MATCHED">Matched</option>
                      <option value="RECONCILED">Reconciled</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleReconcile}
                    disabled={isReconSubmitting}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  >
                    {isReconSubmitting ? "Saving…" : "Save Reconciliation"}
                  </button>
                </div>
              </div>

              {/* Info Box */}
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[12px] text-slate-500">
                <div className="flex items-center gap-1.5 font-medium text-slate-600 mb-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Mercury v1 — Read-Only Layer
                </div>
                In v1, Mercury is used for transaction visibility and reconciliation only.
                Vendor payment initiation via Mercury API is planned for Phase 2+.
              </div>
            </div>
          </aside>
        )}
      </div>
    </AppLayout>
  );
}
