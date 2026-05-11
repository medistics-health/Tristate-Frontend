import { useEffect, useState } from "react";
import { RefreshCw, AlertCircle, CheckCircle2, Clock, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import {
  getSyncLogs,
  retrySyncJob,
  connectQuickBooks,
  getQuickBooksStatus,
  disconnectQuickBooks,
  type ExternalSyncJob,
} from "../../services/operations/quickbooks";
import { getAllCompanies, type Company } from "../../services/operations/companies";

export default function AccountingSyncDashboard() {
  const [logs, setLogs] = useState<ExternalSyncJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetryingMap, setIsRetryingMap] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  // Connection State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<{ isConnected: boolean; realmId?: string } | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  async function loadLogs(page = 1) {
    try {
      setIsLoading(true);
      const data = await getSyncLogs(page, pagination.limit);
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load sync logs.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLogs(1);
    loadCompanies();

    // Listen for QuickBooks connection success from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'qb-connected') {
        toast.success("QuickBooks connected successfully!");
        if (selectedCompanyId) {
          checkConnectionStatus(selectedCompanyId);
        } else {
          loadCompanies(); // Re-load to get the status for the first company
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedCompanyId]);

  async function loadCompanies() {
    try {
      const data = await getAllCompanies();
      setCompanies(data);
      if (data.length > 0) {
        setSelectedCompanyId(data[0].id);
        checkConnectionStatus(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load companies", error);
    }
  }

  async function checkConnectionStatus(companyId: string) {
    if (!companyId) return;
    try {
      setIsStatusLoading(true);
      const data = await getQuickBooksStatus(companyId);
      // The API returns { connected: true, connection: { ... } }
      // We map 'connected' to our local 'isConnected' state
      setConnectionStatus({
        isConnected: !!(data as any).connected,
        realmId: (data as any).connection?.realmId
      });
    } catch (error) {
      setConnectionStatus(null);
    } finally {
      setIsStatusLoading(false);
    }
  }

  async function handleConnect() {
    if (!selectedCompanyId) return;
    try {
      const { authUrl } = await connectQuickBooks(selectedCompanyId);
      // Open in a popup window instead of redirecting the current page
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        authUrl, 
        'QuickBooks', 
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection failed.");
    }
  }

  async function handleDisconnect() {
    if (!selectedCompanyId) return;
    if (!confirm("Are you sure you want to disconnect this company from QuickBooks?")) return;
    try {
      await disconnectQuickBooks(selectedCompanyId);
      toast.success("Disconnected successfully.");
      checkConnectionStatus(selectedCompanyId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Disconnect failed.");
    }
  }

  async function handleRetry(jobId: string) {
    try {
      setIsRetryingMap(prev => ({ ...prev, [jobId]: true }));
      await retrySyncJob(jobId);
      toast.success("Retry triggered successfully.");
      await loadLogs(pagination.page);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retry failed.");
    } finally {
      setIsRetryingMap(prev => ({ ...prev, [jobId]: false }));
    }
  }

  async function handleRetryFailedSyncs() {
    const failedJobs = logs.filter(l => l.status === "FAILED");
    if (failedJobs.length === 0) {
      toast.success("No failed syncs on this page.");
      return;
    }

    let successCount = 0;
    for (const job of failedJobs) {
      try {
        setIsRetryingMap(prev => ({ ...prev, [job.id]: true }));
        await retrySyncJob(job.id);
        successCount++;
      } catch (err) {
        // ignore individual errors, handle summary at end
      } finally {
        setIsRetryingMap(prev => ({ ...prev, [job.id]: false }));
      }
    }

    if (successCount === failedJobs.length) {
      toast.success(`Successfully retried all ${successCount} jobs.`);
    } else {
      toast.error(`Retried ${successCount} of ${failedJobs.length} failed jobs.`);
    }
    await loadLogs(pagination.page);
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "FAILED": return "bg-red-100 text-red-700";
      case "IN_PROGRESS": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-700";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "COMPLETED": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "FAILED": return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "IN_PROGRESS": return <RefreshCw className="h-4 w-4 text-amber-600 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-slate-500" />;
    }
  }

  function formatTimeAgo(dateString: string | null) {
    if (!dateString) return "-";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "-";

    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hrs ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  }

  function formatEntityType(type: string) {
    return type.replace(/_/g, " ");
  }

  const failedCount = logs.filter(l => l.status === "FAILED").length;

  return (
    <AppLayout title="Accounting Sync" activeModule="Integrations" activeSubItem="Accounting Sync">
      <div className="flex h-full flex-col p-6 max-w-7xl mx-auto w-full">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">QuickBooks Sync Log</h1>
            <p className="mt-1 text-sm text-slate-500">Monitor and manage bidirectional syncs with QuickBooks Online.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadLogs(pagination.page)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Log
            </button>
            <button
              onClick={handleRetryFailedSyncs}
              disabled={failedCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AlertCircle className="h-4 w-4" />
              Retry Failed ({failedCount})
            </button>
          </div>
        </div>

        {/* Connection Management */}
        <div className="mb-8 rounded-xl border border-indigo-100 bg-indigo-50/30 p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-indigo-100">
                <img src="https://quickbooks.intuit.com/cas/dam/IMAGE/A8u8GvpJS/apple-touch-icon-152x152.png" alt="QB" className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">QuickBooks Connection</h2>
                <p className="text-xs text-slate-500">Connect a company to enable automated accounting sync.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-64">
                <select
                  value={selectedCompanyId}
                  onChange={(e) => {
                    setSelectedCompanyId(e.target.value);
                    checkConnectionStatus(e.target.value);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select a Company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {isStatusLoading ? (
                <div className="text-sm text-slate-400 animate-pulse">Checking status...</div>
              ) : connectionStatus?.isConnected ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 border border-emerald-100">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    CONNECTED ({connectionStatus.realmId})
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="text-xs font-bold text-red-600 hover:text-red-700 underline underline-offset-4"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={!selectedCompanyId}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2ca01c] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#258a17] focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  Connect to QuickBooks
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200 z-10">
                <tr>
                  <th className="px-6 py-4 font-semibold w-1/4">Entity</th>
                  <th className="px-6 py-4 font-semibold w-1/5">Sync Type</th>
                  <th className="px-6 py-4 font-semibold w-1/6">Status</th>
                  <th className="px-6 py-4 font-semibold w-1/6">Last Sync</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Loading sync logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No sync logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900 flex items-center gap-2">
                          {formatEntityType(log.entityType)}
                          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{log.entityId.slice(0, 8)}</span>
                        </div>
                        {log.externalId && (
                          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                            QB ID: {log.externalId}
                          </div>
                        )}
                        {log.lastError && (
                          <div className="mt-1.5 text-xs text-red-600 max-w-xs truncate" title={log.lastError}>
                            {log.lastError}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {log.system}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(log.status)}`}>
                          {getStatusIcon(log.status)}
                          {log.status}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <CalendarDays className="h-4 w-4" />
                          {formatTimeAgo(log.lastSyncedAt || log.updatedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRetry(log.id)}
                          disabled={log.status === "COMPLETED" || isRetryingMap[log.id]}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          {isRetryingMap[log.id] ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Retrying
                            </>
                          ) : (
                            "Retry"
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
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
                  onClick={() => loadLogs(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => loadLogs(pagination.page + 1)}
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
