import {
  ChevronDown,
  ChevronLeft,
  Circle,
  Home,
  LayoutGrid,
  Plus,
  Receipt,
  Send,
  CheckSquare,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";
import {
  approveBillingRunApi,
  billingRunStatusOptions,
  calculateBillingRunApi,
  getBillingRun,
  getBillingRunsView,
  postBillingRunApi,
  type BillingRunDetail,
  type BillingRunRow,
  type BillingRunStatus,
} from "../../services/operations/billings";

type LaneDef = {
  id: BillingRunStatus;
  label: string;
  badgeClassName: string;
};

const laneDefs: LaneDef[] = [
  { id: "PENDING", label: "PENDING", badgeClassName: "bg-slate-100 text-slate-700" },
  { id: "CALCULATED", label: "CALCULATED", badgeClassName: "bg-emerald-100 text-emerald-700" },
  { id: "REVIEW_REQUIRED", label: "REVIEW REQUIRED", badgeClassName: "bg-amber-100 text-amber-700" },
  { id: "APPROVED", label: "APPROVED", badgeClassName: "bg-indigo-100 text-indigo-700" },
  { id: "POSTED", label: "POSTED", badgeClassName: "bg-violet-100 text-violet-700" },
];

const detailTabs = [
  { id: "home", label: "Home", icon: <Home className="h-4 w-4" /> },
  { id: "actions", label: "Actions", icon: <CheckSquare className="h-4 w-4" /> },
  { id: "billing", label: "Billing", icon: <Receipt className="h-4 w-4" /> },
] as const;

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function formatMoney(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "-";
  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(numericValue);
}

function BillingStatusBoardPage() {
  const [rows, setRows] = useState<BillingRunRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<BillingRunDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [hidePosted, setHidePosted] = useState(false);
  const [activeTab, setActiveTab] =
    useState<(typeof detailTabs)[number]["id"]>("home");
  const [isActionLoading, setIsActionLoading] = useState<
    "calculate" | "approve" | "post" | null
  >(null);

  useEffect(() => {
    async function loadRuns() {
      try {
        setIsLoading(true);
        const data = await getBillingRunsView({
          page: 1,
          limit: 100,
        });
        setRows(data.rows);
        const firstId = data.rows[0]?.id ?? null;
        if (firstId && !selectedRunId) {
          setSelectedRunId(firstId);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load billing runs";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadRuns();
  }, []);

  useEffect(() => {
    if (!selectedRunId) return;

    async function loadRun() {
      try {
        setIsDetailLoading(true);
        const run = await getBillingRun(selectedRunId);
        setSelectedRun(run);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load billing run";
        toast.error(message);
      } finally {
        setIsDetailLoading(false);
      }
    }

    loadRun();
  }, [selectedRunId]);

  const visibleLanes = useMemo(
    () => (hidePosted ? laneDefs.filter((lane) => lane.id !== "POSTED") : laneDefs),
    [hidePosted],
  );

  const cardsByLane = useMemo(() => {
    const grouped = Object.fromEntries(
      visibleLanes.map((lane) => [lane.id, rows.filter((row) => row.values.status === lane.id)]),
    ) as Record<BillingRunStatus, BillingRunRow[]>;
    return grouped;
  }, [rows, visibleLanes]);

  async function refreshAll(selectedId?: string | null) {
    const data = await getBillingRunsView({ page: 1, limit: 100 });
    setRows(data.rows);
    const targetId = selectedId ?? selectedRunId ?? data.rows[0]?.id ?? null;
    if (targetId) {
      setSelectedRunId(targetId);
      const run = await getBillingRun(targetId);
      setSelectedRun(run);
    }
  }

  async function handleRunAction(action: "calculate" | "approve" | "post") {
    if (!selectedRun) return;
    setIsActionLoading(action);
    try {
      if (action === "calculate") {
        await calculateBillingRunApi(selectedRun.id);
        toast.success("Billing run calculated");
      }
      if (action === "approve") {
        await approveBillingRunApi(selectedRun.id);
        toast.success("Billing run approved");
      }
      if (action === "post") {
        const result = await postBillingRunApi(selectedRun.id);
        toast.success(`Posted ${result.invoices.length} invoice(s)`);
      }
      await refreshAll(selectedRun.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Failed to ${action} billing run`;
      toast.error(message);
    } finally {
      setIsActionLoading(null);
    }
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "Refresh",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => refreshAll(),
    },
  ];

  return (
    <AppLayout
      title="Billing Status Board"
      activeModule="Billing"
      activeSubItem="Billing Status Board"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2 font-app-sans">
        <div className="app-panel min-w-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-sm border border-[#f0ece6]">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-slate-400" />
              <span>Billing Status Board</span>
              <span className="text-slate-400">. {rows.length}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button type="button" onClick={() => setHidePosted((current) => !current)}>
                Filter
              </button>
              <button type="button" onClick={() => setShowDetailPanel((prev) => !prev)}>
                Options
              </button>
            </div>
          </div>

          <div className="min-h-0 h-full overflow-auto">
            <div className="grid min-w-[1050px] auto-cols-fr grid-flow-col h-full bg-[#fcfbf9]">
              {visibleLanes.map((lane) => (
                <section
                  key={lane.id}
                  className="border-r border-[#f0ece6] last:border-r-0 flex flex-col"
                >
                  <div className="flex items-center gap-3 px-4 py-3 sticky top-0 bg-[#fcfbf9] z-10">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-[12px] font-semibold ${lane.badgeClassName}`}
                    >
                      {lane.label}
                    </span>
                    <span className="text-[13px] text-slate-400">
                      {cardsByLane[lane.id]?.length || 0}
                    </span>
                  </div>

                  <div className="space-y-2 px-3 pb-4 flex-1 overflow-y-auto">
                    {isLoading ? (
                      <div className="px-3 py-4 text-[13px] text-slate-400">Loading...</div>
                    ) : (
                      cardsByLane[lane.id]?.map((card) => {
                        const isSelected = selectedRunId === card.id;

                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => {
                              setSelectedRunId(card.id);
                              setShowDetailPanel(true);
                            }}
                            className={`flex w-full items-start gap-2 rounded-lg border px-3 py-3 text-left transition-all ${
                              isSelected
                                ? "border-[#9cb1f6] bg-white shadow-[0_4px_12px_rgba(157,177,246,0.15)]"
                                : "border-[#ece8e1] bg-white hover:border-[#cfc8bb]"
                            }`}
                          >
                            <Circle className="mt-0.5 h-4 w-4 text-slate-300" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-medium text-slate-700">
                                {card.values.practiceName}
                              </p>
                              <p className="mt-1 truncate text-[12px] text-slate-400">
                                {card.values.period}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {card.values.itemCount} items · {card.values.snapshotCount} snapshots
                              </p>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        {showDetailPanel && selectedRun ? (
          <aside className="app-panel relative flex w-[360px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-[#f0ece6]">
            <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
              <button
                type="button"
                onClick={() => setShowDetailPanel(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" className="rounded-md bg-[#f7f5f1] px-1.5 py-1 text-slate-300">
                <Circle className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-medium text-slate-700">
                  {selectedRun.practice?.name || "Billing Run"}
                </div>
                <div className="text-[12px] text-slate-400">
                  {formatDateTime(selectedRun.periodStart).split(",")[0]} - {formatDateTime(selectedRun.periodEnd).split(",")[0]}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-5 border-b border-[#f0ece6] px-4 pt-3">
              {detailTabs.map((tab) => {
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 border-b pb-3 text-[13px] font-medium ${
                      isActive
                        ? "border-slate-500 text-slate-700"
                        : "border-transparent text-slate-400"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {isDetailLoading ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading billing run...
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 border-b border-[#f0ece6] px-4 py-3">
                  <button
                    type="button"
                    disabled={
                      isActionLoading !== null ||
                      selectedRun.status === "POSTED" ||
                      selectedRun.status === "CLOSED"
                    }
                    onClick={() => handleRunAction("calculate")}
                    className="app-control inline-flex items-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium disabled:opacity-50"
                  >
                    {isActionLoading === "calculate" ? "Calculating..." : "Calculate"}
                  </button>
                  <button
                    type="button"
                    disabled={
                      isActionLoading !== null ||
                      !["CALCULATED", "REVIEW_REQUIRED"].includes(selectedRun.status)
                    }
                    onClick={() => handleRunAction("approve")}
                    className="inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50"
                  >
                    {isActionLoading === "approve" ? "Approving..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={isActionLoading !== null || selectedRun.status !== "APPROVED"}
                    onClick={() => handleRunAction("post")}
                    className="inline-flex items-center gap-2 rounded-md bg-[#1f7a5b] px-3 py-2 text-[12px] font-medium text-white disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isActionLoading === "post" ? "Posting..." : "Post"}
                  </button>
                </div>

                <div className="flex-1 overflow-auto">
                  <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-[#f0ece6] px-4 py-4 text-[13px]">
                    <div className="text-slate-400">Status</div>
                    <div className="text-slate-700">{formatStatusLabel(selectedRun.status)}</div>

                    <div className="text-slate-400">Practice</div>
                    <div className="text-slate-700">{selectedRun.practice?.name || "-"}</div>

                    <div className="text-slate-400">Snapshots</div>
                    <div className="text-slate-700">{selectedRun.inputSnapshots?.length || 0}</div>

                    <div className="text-slate-400">Items</div>
                    <div className="text-slate-700">{selectedRun.items?.length || 0}</div>

                    <div className="text-slate-400">Approved At</div>
                    <div className="text-slate-700">{formatDateTime(selectedRun.approvedAt)}</div>

                    <div className="text-slate-400">Created</div>
                    <div className="text-slate-700">{formatDateTime(selectedRun.createdAt)}</div>
                  </div>

                  <div className="px-4 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[13px] font-medium text-slate-700">Calculated Amounts</p>
                    </div>
                    <div className="space-y-2">
                      {(selectedRun.items || []).length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#ece8e1] bg-white p-3 text-[13px] text-slate-500">
                          No calculated items yet.
                        </div>
                      ) : (
                        selectedRun.items?.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-[#ece8e1] bg-white p-3 text-[13px]"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-medium text-slate-700">
                                {item.service?.name || item.serviceId}
                              </span>
                              <span className="text-slate-700">
                                {formatMoney(item.clientAmount)}
                              </span>
                            </div>
                            <div className="mt-1 text-[12px] text-slate-400">
                              Vendor {formatMoney(item.vendorAmount)} · Margin {formatMoney(item.marginAmount)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </aside>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default BillingStatusBoardPage;
