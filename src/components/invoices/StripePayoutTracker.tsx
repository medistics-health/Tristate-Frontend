import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  RotateCcw,
  Wallet,
  X,
  Clock3,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import {
  getInvoiceStripePayoutSummary,
  type StripePayoutRow,
  type StripePayoutSummaryResponse,
} from "../../services/operations/stripePayouts";

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);
}

function statusBadgeClass(status: string) {
  switch (status.toUpperCase()) {
    case "SENT":
      return "bg-green-100 text-green-700 border-green-200";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "FAILED":
      return "bg-red-100 text-red-700 border-red-200";
    case "SKIPPED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    case "PAID":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "PARTIALLY_PAID":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${className}`}
    >
      {children}
    </span>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  accent = "text-slate-700",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#f0ece6] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>
        <div className={`rounded-xl bg-slate-50 p-2 ${accent}`}>{icon}</div>
      </div>
      <p className="mt-3 text-[24px] font-black tracking-tight text-slate-800">
        {value}
      </p>
    </div>
  );
}

function TransferDetailsModal({
  row,
  onClose,
}: {
  row: StripePayoutRow | null;
  onClose: () => void;
}) {
  if (!row) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f0ece6] px-6 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Transfer details
            </p>
            <h3 className="truncate text-[18px] font-black text-slate-800">
              {row.invoiceNumber || row.invoiceId}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#f0ece6] bg-[#fcfbf8] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Connected Account
              </p>
              <p className="mt-2 text-[15px] font-semibold text-slate-800">
                {row.stripeConnectedAccountName}
              </p>
              <p className="mt-1 text-[12px] text-slate-500">
                {row.stripeConnectedAccountId}
              </p>
            </div>
            <div className="rounded-2xl border border-[#f0ece6] bg-[#fcfbf8] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Transfer Amount
              </p>
              <p className="mt-2 text-[15px] font-semibold text-slate-800">
                {formatCurrency(row.amount, row.currency)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#f0ece6] bg-[#fcfbf8] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Status
              </p>
              <div className="mt-2">
                <Badge className={statusBadgeClass(row.status)}>{row.status}</Badge>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#f0ece6] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Stripe Transfer ID
              </p>
              <p className="mt-2 break-all text-[13px] font-semibold text-slate-700">
                {row.stripeTransferId || "Not available"}
              </p>
            </div>
            <div className="rounded-2xl border border-[#f0ece6] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Transfer Group
              </p>
              <p className="mt-2 break-all text-[13px] font-semibold text-slate-700">
                {row.transferGroup || "Not available"}
              </p>
            </div>
          </div>

          {row.failureMessage ? (
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
              {row.failureMessage}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function StripePayoutTracker() {
  const [data, setData] = useState<StripePayoutSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [accountId, setAccountId] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);
      const summary = await getInvoiceStripePayoutSummary({
        page,
        limit: 12,
        accountId: accountId || undefined,
        status: status === "ALL" ? undefined : status,
        search: search.trim() || undefined,
      });
      setData(summary);
      setSelectedRowId((current) => {
        if (summary.rows.length === 0) return null;
        if (current && summary.rows.some((row) => row.id === current)) return current;
        return summary.rows[0]?.id || null;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load payouts";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, accountId, status, search]);

  const totals = data?.totals ?? {
    totalAllocated: 0,
    totalSent: 0,
    totalPending: 0,
    totalFailed: 0,
    totalSkipped: 0,
    customerPaidTotal: 0,
    transferCount: 0,
  };

  const selectedRow = useMemo(
    () => data?.rows.find((row) => row.id === selectedRowId) || null,
    [data?.rows, selectedRowId],
  );

  if (isLoading && !data) {
    return (
      <AppLayout
        title="Invoice Transfer Status"
        activeModule="Invoices"
        activeSubItem="Invoice Transfer Status"
      >
        <div className="flex h-full items-center justify-center text-slate-400">
          Loading transfer status...
        </div>
      </AppLayout>
    );
  }

  if (error && !data) {
    return (
      <AppLayout
        title="Invoice Transfer Status"
        activeModule="Invoices"
        activeSubItem="Invoice Transfer Status"
      >
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <p className="text-red-500">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white"
          >
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Invoice Transfer Status"
      activeModule="Invoices"
      activeSubItem="Invoice Transfer Status"
      navbarIcon={<Wallet className="h-4 w-4 text-slate-500" />}
      navbarActions={[
        {
          label: "Refresh",
          icon: <RotateCcw className="h-4 w-4" />,
          onClick: loadData,
        },
      ]}
    >
      <div className="flex h-full flex-col gap-2 overflow-hidden">
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            label="Customer Collected"
            value={formatCurrency(totals.customerPaidTotal)}
            icon={<Wallet className="h-4 w-4" />}
          />
          <SummaryTile
            label="Transferred"
            value={formatCurrency(totals.totalSent)}
            icon={<CheckCircle2 className="h-4 w-4" />}
            accent="text-green-700"
          />
          <SummaryTile
            label="Pending"
            value={formatCurrency(totals.totalPending)}
            icon={<Clock3 className="h-4 w-4" />}
            accent="text-amber-700"
          />
          <SummaryTile
            label="Failed / Skipped"
            value={formatCurrency(totals.totalFailed + totals.totalSkipped)}
            icon={<AlertTriangle className="h-4 w-4" />}
            accent="text-red-700"
          />
        </div>

        <div className="min-h-0 flex-1 rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
              <div>
                <h3 className="text-[15px] font-semibold text-slate-800">
                  Transfer Ledger
                </h3>
                <p className="mt-1 text-[13px] text-slate-500">
                  Invoice amount transferred to connected accounts and transfer status only.
                </p>
              </div>
              <div className="text-[12px] text-slate-400">
                {data?.pagination.total || 0} records
              </div>
            </div>

            <div className="border-b border-[#f0ece6] px-4 py-4">
              <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_180px_auto]">
                <div className="relative">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search invoice or account"
                    className="w-full rounded-lg border border-[#e8e1d8] bg-white px-3 py-2 text-[13px] outline-none"
                  />
                </div>
                <select
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-[#e8e1d8] bg-white px-3 py-2 text-[13px]"
                >
                  <option value="">All connected accounts</option>
                  {data?.connectedAccounts.map((account) => (
                    <option
                      key={account.stripeConnectedAccountId}
                      value={account.stripeConnectedAccountId}
                    >
                      {account.stripeConnectedAccountName}
                    </option>
                  ))}
                </select>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                  className="w-full rounded-lg border border-[#e8e1d8] bg-white px-3 py-2 text-[13px]"
                >
                  <option value="ALL">All statuses</option>
                  <option value="SENT">Sent</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                  <option value="SKIPPED">Skipped</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setAccountId("");
                    setStatus("ALL");
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#e8e1d8] px-3 py-2 text-[13px] font-medium text-slate-600"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100vh-310px)] min-h-0 overflow-auto">
              <table className="min-w-full divide-y divide-[#f0ece6] text-[13px]">
                <thead className="sticky top-0 z-[1] bg-[#faf9f7] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                    <th className="px-4 py-3 text-left font-semibold">Connected Account</th>
                    <th className="px-4 py-3 text-left font-semibold">Transfer Amount</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece6]">
                  {data?.rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                      className={`cursor-pointer hover:bg-[#fbfaf8] ${
                        selectedRowId === row.id ? "bg-[#f4f7ff]" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {row.invoiceNumber || row.invoiceId.slice(0, 8).toUpperCase()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-700">
                          {row.stripeConnectedAccountName}
                        </div>
                        <div className="text-[12px] text-slate-400">
                          {row.stripeConnectedAccountId}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {formatCurrency(row.amount, row.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusBadgeClass(row.status)}>{row.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {(data?.rows.length || 0) === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10">
                        <EmptyStateIllustration
                          title="No transfer records"
                          description="Try a different filter or wait for the next paid invoice webhook."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
              <p className="text-[12px] text-slate-400">
                Page {data?.pagination.page || 1} of {data?.pagination.totalPages || 1}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={(data?.pagination.page || 1) <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-md border border-[#e8e1d8] px-3 py-1.5 text-[13px] text-slate-600 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={(data?.pagination.page || 1) >= (data?.pagination.totalPages || 1)}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-md border border-[#e8e1d8] px-3 py-1.5 text-[13px] text-slate-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
        </div>

        <TransferDetailsModal row={selectedRow} onClose={() => setSelectedRowId(null)} />
      </div>
    </AppLayout>
  );
}

export default StripePayoutTracker;
