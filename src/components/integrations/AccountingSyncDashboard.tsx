import { useEffect, useMemo, useState } from "react";
import { RefreshCw, AlertCircle, CheckCircle2, Clock, CalendarDays } from "lucide-react";
import toast from "react-hot-toast";
import { exportAllPagesToCsv, formatUsDateTime } from "../../utils/csvExport";
import AppLayout from "../layout/AppLayout";
import DataTableToolbar from "../shared/DataTableToolbar";
import {
  getQuickBooksStatus,
  getSyncLogs,
  retrySyncJob,
  type ExternalSyncJob,
} from "../../services/operations/quickbooks";
import { getAllCompanies, type Company } from "../../services/operations/companies";
import { canManageIntegrations, readStoredUser } from "../../utils/auth";

export default function AccountingSyncDashboard() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canWriteIntegrations = canManageIntegrations(currentRole);
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
      const data = await getSyncLogs(page, pagination.limit, selectedCompanyId);
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load sync logs.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();

    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'qb-connected') {
        loadCompanies();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []); // Run once on mount

  // Check status and refresh logs when company selection changes
  useEffect(() => {
    if (selectedCompanyId) {
      checkConnectionStatus(selectedCompanyId);
    } else {
      setConnectionStatus(null);
    }
    loadLogs(1);
  }, [selectedCompanyId]);

  async function loadCompanies() {
    try {
      const data = await getAllCompanies();
      const companyList = Array.isArray(data) ? data : [];
      setCompanies(companyList);
    } catch (error) {
      console.error("Failed to load companies:", error);
      setCompanies([]);
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

  // Handlers for sync logs
  async function handleRetry(jobId: string) {
    if (!canWriteIntegrations) {
      toast.error("Only finance/admin can retry sync jobs.");
      return;
    }
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
    if (!canWriteIntegrations) {
      toast.error("Only finance/admin can retry sync jobs.");
      return;
    }
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

  const failedCount = useMemo(
    () => logs.filter((l) => l.status === "FAILED").length,
    [logs],
  );

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

  const [searchInput, setSearchInput] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const handleOpenFilterModal = () => {
    setDraftStatus(selectedStatus);
  };

  const handleApplyFilters = () => {
    setSelectedStatus(draftStatus);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setSelectedStatus("");
    setDraftStatus("");
    setSearchInput("");
    setSelectedCompanyId("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const activeFilterCount = (selectedStatus ? 1 : 0) + (selectedCompanyId ? 1 : 0);
  const activeFilterChips = [
    ...(selectedCompanyId
      ? [
          {
            key: "companyId",
            label: "Company",
            displayValue: companies.find((c) => c.id === selectedCompanyId)?.name || selectedCompanyId,
            onClear: () => setSelectedCompanyId(""),
          },
        ]
      : []),
    ...(selectedStatus
      ? [
          {
            key: "status",
            label: "Status",
            displayValue: selectedStatus,
            onClear: () => setSelectedStatus(""),
          },
        ]
      : []),
  ];

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = searchInput.trim()
      ? log.entityType.toLowerCase().includes(searchInput.toLowerCase()) ||
        log.entityId.toLowerCase().includes(searchInput.toLowerCase()) ||
        (log.externalId && log.externalId.toLowerCase().includes(searchInput.toLowerCase()))
      : true;
    const matchesStatus = selectedStatus ? log.status === selectedStatus : true;
    return matchesSearch && matchesStatus;
  });

  const exportCsv = async () => {
    try {
      toast.loading("Exporting CSV...", { id: "export-csv" });
      const headers = ["Sync ID", "Entity Type", "Entity ID", "QB External ID", "System", "Status", "Last Synced Date & Time"];

      await exportAllPagesToCsv({
        filenamePrefix: "accounting_sync_logs",
        headers,
        pageSize: 50,
        fetchPage: async (page, limit) => {
          const res = await getSyncLogs(page, limit, selectedCompanyId || undefined);
          return {
            items: res.logs,
            totalPages: res.pagination.totalPages,
          };
        },
        rowToCsvFields: (l) => [
          l.id,
          l.entityType,
          l.entityId,
          l.externalId || "",
          l.system,
          l.status,
          formatUsDateTime(l.lastSyncedAt || l.updatedAt),
        ],
      });
      toast.success("CSV Exported successfully", { id: "export-csv" });
    } catch (e) {
      toast.error("Failed to export CSV", { id: "export-csv" });
    }
  };

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Filter by Company
        </span>
        <select
          value={selectedCompanyId}
          onChange={(e) => setSelectedCompanyId(e.target.value)}
          className="w-full rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#4f63ea]"
        >
          <option value="">All Companies</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Status
        </span>
        <select
          value={draftStatus}
          onChange={(e) => setDraftStatus(e.target.value)}
          className="w-full rounded-md border border-[#ece8e1] bg-white px-3 py-1.5 text-[13px] outline-none focus:border-[#4f63ea]"
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PENDING">Pending</option>
        </select>
      </label>
    </>
  );

  return (
    <AppLayout title="Accounting Sync" activeModule="Integrations" activeSubItem="Accounting Sync">
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="QuickBooks Sync Log"
            subtitle="Monitor & manage QuickBooks syncs"
            searchPlaceholder="Search sync logs by entity or ID..."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={resetFilters}
            onApplyFilters={handleApplyFilters}
            onOpenFilterModal={handleOpenFilterModal}
            filterModalTitle="Filter Sync Logs"
            filterFields={filterFieldsModal}
            onExport={exportCsv}
            onRefresh={() => loadLogs(pagination.page)}
            isLoading={isLoading}
            page={pagination.page}
            pageSize={pagination.limit}
            totalRecords={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(page) => loadLogs(page)}
            onPageSizeChange={(newSize) => {
              setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }));
            }}
            extraActions={
              canWriteIntegrations && failedCount > 0 ? (
                <button
                  type="button"
                  onClick={handleRetryFailedSyncs}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-amber-700 transition-colors shadow-sm"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Retry Failed ({failedCount})
                </button>
              ) : undefined
            }
          >
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-[13px] text-slate-600">
                <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                  <tr className="border-b border-[#f0ece6] bg-[#faf9f7]">
                    <th className="px-4 py-3 font-semibold w-1/4 text-slate-500">Entity</th>
                    <th className="px-4 py-3 font-semibold w-1/5 text-slate-500">Sync Type</th>
                    <th className="px-4 py-3 font-semibold w-1/6 text-slate-500">Status</th>
                    <th className="px-4 py-3 font-semibold w-1/6 text-slate-500">Last Sync</th>
                    <th className="px-4 py-3 font-semibold text-right text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece6]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        Loading sync logs...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        No sync logs found.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3">
                          <div className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {log.system}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(log.status)}`}>
                            {getStatusIcon(log.status)}
                            {log.status}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <CalendarDays className="h-4 w-4" />
                            {formatTimeAgo(log.lastSyncedAt || log.updatedAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canWriteIntegrations ? (
                            <button
                              type="button"
                              onClick={() => handleRetry(log.id)}
                              disabled={log.status === "COMPLETED" || isRetryingMap[log.id]}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4f63ea] hover:text-[#3d4ed1] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">
                              Read only
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </DataTableToolbar>
        </section>
      </div>
    </AppLayout>
  );
}
