import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Link2,
  Unlink2,
  Clock,
  Server,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { getQuickBooksStatus, connectQuickBooks, disconnectQuickBooks, type QuickBooksConnectionStatus } from "../../services/operations/quickbooks";
import { getAllCompanies, type Company } from "../../services/operations/companies";

export default function QuickBooksIntegrations() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [statuses, setStatuses] = useState<Record<string, QuickBooksConnectionStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState<Record<string, boolean>>({});
  const [isDisconnecting, setIsDisconnecting] = useState<Record<string, boolean>>({});
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    return setupMessageListener();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllStatuses();
    }, 10000);
    setAutoRefreshInterval(interval);
    return () => clearInterval(interval);
  }, [companies]);

  function setupMessageListener() {
    const handleMessage = (event: MessageEvent) => {
      if (event.data === "qb-connected") {
        refreshAllStatuses();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }

  async function loadData() {
    try {
      setIsLoading(true);
      const comps = await getAllCompanies();
      setCompanies(comps);

      const statusMap: Record<string, QuickBooksConnectionStatus> = {};
      await Promise.all(
        comps.map(async (company) => {
          try {
            const status = await getQuickBooksStatus(company.id);
            statusMap[company.id] = status;
          } catch (err) {
            console.error(`Failed to load status for ${company.name}:`, err);
            statusMap[company.id] = {
              connected: false,
              connection: null,
              accountInfo: null,
              tokenExpiresAt: null,
              isTokenExpired: null,
              lastSyncAt: null,
              lastError: null,
            };
          }
        })
      );

      setStatuses(statusMap);
    } catch (error) {
      toast.error("Failed to load companies");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshAllStatuses() {
    if (companies.length === 0) return;

    const statusMap: Record<string, QuickBooksConnectionStatus> = {};
    await Promise.all(
      companies.map(async (company) => {
        try {
          const status = await getQuickBooksStatus(company.id);
          statusMap[company.id] = status;
        } catch (err) {
          statusMap[company.id] = statuses[company.id] || {
            connected: false,
            connection: null,
            accountInfo: null,
            tokenExpiresAt: null,
            isTokenExpired: null,
            lastSyncAt: null,
            lastError: null,
          };
        }
      })
    );

    setStatuses(statusMap);
  }

  async function handleConnect(companyId: string) {
    try {
      setIsConnecting((prev) => ({ ...prev, [companyId]: true }));
      const { authUrl } = await connectQuickBooks(companyId);

      const width = 600, height = 700;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      window.open(authUrl, "qb-auth", `width=${width},height=${height},left=${left},top=${top}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect");
    } finally {
      setIsConnecting((prev) => ({ ...prev, [companyId]: false }));
    }
  }

  async function handleDisconnect(companyId: string) {
    const company = companies.find((c) => c.id === companyId);
    if (!window.confirm(`Disconnect ${company?.name} from QuickBooks?`)) return;

    try {
      setIsDisconnecting((prev) => ({ ...prev, [companyId]: true }));
      await disconnectQuickBooks(companyId);
      toast.success("Disconnected successfully");
      await refreshAllStatuses();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect");
    } finally {
      setIsDisconnecting((prev) => ({ ...prev, [companyId]: false }));
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDaysAgo = (dateString: string | null | undefined) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="space-y-4 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#4f63ea] mx-auto" />
          <p className="text-sm text-slate-500">Loading QuickBooks connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 text-base">QuickBooks Online</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage accounting integrations for your companies
          </p>
        </div>
        <button
          onClick={refreshAllStatuses}
          className="flex items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex-shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Companies Table View */}
      <div className="rounded-xl border border-[#ece8e1] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#fbfaf8] border-b border-[#f1efeb]">
                <th className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px] w-2/5">
                  Company
                </th>
                <th className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                  Last Sync
                </th>
                <th className="px-4 py-3 text-right font-bold text-slate-400 uppercase tracking-widest text-[10px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1efeb]">
              {companies.map((company) => {
                const status = statuses[company.id];
                const isConnected = status?.connected;
                const accountInfo = status?.accountInfo;
                const lastError = status?.lastError;

                return (
                  <tr key={company.id} className="hover:bg-[#fbfaf8]/50 transition-colors group">
                    {/* Company Name */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-bold text-slate-800 text-[13px]">{company.name}</p>
                        {isConnected && accountInfo?.name && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{accountInfo.name}</p>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {isConnected ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-600">Connected</span>
                          {status?.connection?.isSandbox && (
                            <span className="text-[10px] text-blue-600 font-medium">• Sandbox</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-slate-300" />
                          <span className="text-xs font-medium text-slate-500">Disconnected</span>
                        </div>
                      )}
                      {lastError && (
                        <p className="text-[10px] text-rose-600 mt-1 truncate max-w-xs">⚠ {lastError.substring(0, 40)}</p>
                      )}
                    </td>

                    {/* Last Sync */}
                    <td className="px-4 py-3">
                      <div className="text-[12px]">
                        <p className="font-semibold text-slate-800">
                          {formatDaysAgo(status?.lastSyncAt)}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {status?.lastSyncAt ? formatDate(status.lastSyncAt).split(",")[0] : "Never"}
                        </p>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {isConnected ? (
                          <>
                            <button
                              onClick={() => handleConnect(company.id)}
                              disabled={isConnecting[company.id]}
                              className="flex items-center gap-1 rounded-md bg-blue-50 text-blue-600 px-2.5 py-1.5 text-[11px] font-bold hover:bg-blue-100 transition-all disabled:opacity-50"
                            >
                              {isConnecting[company.id] ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Link2 className="h-3 w-3" />
                              )}
                              Reconnect
                            </button>
                            <button
                              onClick={() => handleDisconnect(company.id)}
                              disabled={isDisconnecting[company.id]}
                              className="flex items-center gap-1 rounded-md bg-rose-50 text-rose-600 px-2.5 py-1.5 text-[11px] font-bold hover:bg-rose-100 transition-all disabled:opacity-50"
                            >
                              {isDisconnecting[company.id] ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Unlink2 className="h-3 w-3" />
                              )}
                              Disconnect
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleConnect(company.id)}
                            disabled={isConnecting[company.id]}
                            className="flex items-center gap-1 rounded-md bg-emerald-600 text-white px-2.5 py-1.5 text-[11px] font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm"
                          >
                            {isConnecting[company.id] ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Link2 className="h-3 w-3" />
                            )}
                            Connect
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expandable Details - Hidden by Default */}
      <details className="rounded-lg border border-[#ece8e1] bg-white overflow-hidden group">
        <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#fbfaf8] font-bold text-slate-800 text-sm select-none">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Account Details
        </summary>

        <div className="border-t border-[#f1efeb] p-4">
          {companies.map((company) => {
            const status = statuses[company.id];
            const isConnected = status?.connected;
            const accountInfo = status?.accountInfo;

            if (!isConnected) return null;

            return (
              <div key={company.id} className="mb-4 pb-4 border-b border-[#f1efeb] last:mb-0 last:pb-0 last:border-0">
                <p className="font-bold text-slate-800 text-sm mb-3">{company.name}</p>
                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  {accountInfo?.name && (
                    <div>
                      <p className="text-slate-500 font-medium">QB Company</p>
                      <p className="text-slate-800 font-semibold">{accountInfo.name}</p>
                    </div>
                  )}
                  {accountInfo?.email && (
                    <div>
                      <p className="text-slate-500 font-medium flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email
                      </p>
                      <p className="text-slate-800 font-semibold truncate">{accountInfo.email}</p>
                    </div>
                  )}
                  {accountInfo?.phone && (
                    <div>
                      <p className="text-slate-500 font-medium flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Phone
                      </p>
                      <p className="text-slate-800 font-semibold">{accountInfo.phone}</p>
                    </div>
                  )}
                  {accountInfo?.country && (
                    <div>
                      <p className="text-slate-500 font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Country
                      </p>
                      <p className="text-slate-800 font-semibold">{accountInfo.country}</p>
                    </div>
                  )}
                  {status?.connection?.realmId && (
                    <div>
                      <p className="text-slate-500 font-medium">Realm ID</p>
                      <p className="text-slate-800 font-mono text-[10px]">{status.connection.realmId}</p>
                    </div>
                  )}
                  {accountInfo?.fiscalYearStartMonth && (
                    <div>
                      <p className="text-slate-500 font-medium flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Fiscal Year
                      </p>
                      <p className="text-slate-800 font-semibold">Month {accountInfo.fiscalYearStartMonth}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </div>
  );
}
