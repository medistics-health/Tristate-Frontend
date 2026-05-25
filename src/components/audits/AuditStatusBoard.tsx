import {
  ChevronDown,
  ChevronLeft,
  Circle,
  GripVertical,
  LayoutGrid,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";
import {
  getAudit,
  getAuditsView,
  updateAuditApi,
  deleteAuditApi,
} from "../../services/operations/audits";
import type { Audit, AuditBody } from "./types";

type AuditPipelineStatus = "scheduled" | "in-progress" | "completed" | "action-required" | "closed";

type AuditPipelineCard = {
  id: string;
  title: string;
  status: AuditPipelineStatus;
  type: string;
  createdBy: string;
  createdAt: string;
  overallScore: string;
  scoreLabel: string;
  suggestedService: string;
  lastUpdate: string;
  updatedBy: string;
  practice: string;
};

type AuditPipelineProgress = {
  id: AuditPipelineStatus;
  label: string;
  badgeClassName: string;
};

const pipelineLanes: AuditPipelineProgress[] = [
  {
    id: "scheduled",
    label: "SCHEDULED",
    badgeClassName: "bg-[#e8f7ee] text-[#2ba36f]",
  },
  {
    id: "in-progress",
    label: "IN PROGRESS",
    badgeClassName: "bg-[#eef1ff] text-[#6b7de2]",
  },
  {
    id: "completed",
    label: "COMPLETED",
    badgeClassName: "bg-[#fff1bd] text-[#b78800]",
  },
  {
    id: "action-required",
    label: "ACTION REQUIRED",
    badgeClassName: "bg-[#ffe8e8] text-[#ef5d5d]",
  },
  {
    id: "closed",
    label: "CLOSED",
    badgeClassName: "bg-[#f0e6ff] text-[#9b70dc]",
  },
];

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatStatusLabel(value: string) {
  return value.replace(/_/g, " ");
}

function mapAuditStatusToLane(status: string): AuditPipelineStatus {
  const valid: AuditPipelineStatus[] = [
    "scheduled",
    "in-progress",
    "completed",
    "action-required",
    "closed",
  ];
  return valid.includes(status as AuditPipelineStatus)
    ? (status as AuditPipelineStatus)
    : "scheduled";
}

function mapAuditToCard(audit: Audit): AuditPipelineCard {
  const extended = audit as Audit & { status?: string };
  return {
    id: audit.id,
    title: `${audit.practice?.name || "Practice"} - ${audit.type}`,
    status: mapAuditStatusToLane(extended.status || "scheduled"),
    type: audit.type,
    createdBy: "System",
    createdAt: formatDateTime(audit.createdAt),
    overallScore: audit.score != null ? String(audit.score) : "-",
    scoreLabel: "Score",
    suggestedService: "Audit Record",
    lastUpdate: formatDateTime(audit.updatedAt),
    updatedBy: "System",
    practice: audit.practice?.name || "No practice linked",
  };
}

function AuditStatusBoard() {
  const [cards, setCards] = useState<AuditPipelineCard[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState("");
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [hideClosed, setHideClosed] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  type AuditFormState = {
    practiceId: string;
    dealId: string;
    type: string;
    score: string;
  };

  const initialFormState: AuditFormState = {
    practiceId: "",
    dealId: "",
    type: "COMPLIANCE",
    score: "",
  };

  const [editForm, setEditForm] = useState<AuditFormState>(initialFormState);

  useEffect(() => {
    async function loadAudits() {
      try {
        setIsLoading(true);
        const view = await getAuditsView();
        const nextCards = view.rows.map((row) => {
          const values = row.values as Record<string, string | number>;
          return {
            id: row.id,
            title: `${String(values.practiceName || "Practice")} - ${String(values.type)}`,
            status: "scheduled" as AuditPipelineStatus,
            type: String(values.type),
            createdBy: "System",
            createdAt: String(values.creationDate || formatDateTime()),
            overallScore: String(values.score ?? "-"),
            scoreLabel: "Score",
            suggestedService: "Audit Record",
            lastUpdate: String(values.lastUpdate || ""),
            updatedBy: "System",
            practice: String(values.practiceName || "No practice linked"),
          };
        });
        setCards(nextCards);
        setSelectedAuditId((current) => current || nextCards[0]?.id || "");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load audit pipeline";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadAudits();
  }, []);

  useEffect(() => {
    if (!selectedAuditId) {
      setSelectedAudit(null);
      return;
    }

    async function loadAuditDetail() {
      try {
        setIsAuditLoading(true);
        const audit = await getAudit(selectedAuditId);
        setSelectedAudit(audit);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load audit details";
        toast.error(message);
      } finally {
        setIsAuditLoading(false);
      }
    }

    loadAuditDetail();
  }, [selectedAuditId]);

  function buildFormState(audit?: Audit | null): AuditFormState {
    if (!audit) return initialFormState;
    return {
      practiceId: audit.practiceId,
      dealId: audit.dealId || "",
      type: audit.type,
      score: String(audit.score || ""),
    };
  }

  useEffect(() => {
    if (selectedAudit) {
      setEditForm(buildFormState(selectedAudit));
    }
  }, [selectedAudit]);

  function buildPayload(form: AuditFormState): Partial<AuditBody> {
    return {
      practiceId: form.practiceId,
      dealId: form.dealId || null,
      type: form.type as AuditBody["type"],
      ...(form.score ? { score: Number.parseFloat(form.score) } : {}),
    };
  }

  async function handleUpdateAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.practiceId) {
      toast.error("Practice is required");
      return;
    }

    setIsSaving(true);
    try {
      await updateAuditApi(selectedAuditId, buildPayload(editForm));
      const view = await getAuditsView();
      const nextCards = view.rows.map((row) => {
        const values = row.values as Record<string, string | number>;
        return {
          id: row.id,
          title: `${String(values.practiceName || "Practice")} - ${String(values.type)}`,
          status: "scheduled" as AuditPipelineStatus,
          type: String(values.type),
          createdBy: "System",
          createdAt: String(values.creationDate || formatDateTime()),
          overallScore: String(values.score ?? "-"),
          scoreLabel: "Score",
          suggestedService: "Audit Record",
          lastUpdate: String(values.lastUpdate || ""),
          updatedBy: "System",
          practice: String(values.practiceName || "No practice linked"),
        };
      });
      setCards(nextCards);
      const updated = await getAudit(selectedAuditId);
      setSelectedAudit(updated);
      toast.success("Audit updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update audit";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAudit() {
    if (!selectedAuditId) return;
    if (!window.confirm("Are you sure you want to delete this audit?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAuditApi(selectedAuditId);
      const view = await getAuditsView();
      const nextCards = view.rows.map((row) => {
        const values = row.values as Record<string, string | number>;
        return {
          id: row.id,
          title: `${String(values.practiceName || "Practice")} - ${String(values.type)}`,
          status: "scheduled" as AuditPipelineStatus,
          type: String(values.type),
          createdBy: "System",
          createdAt: String(values.creationDate || formatDateTime()),
          overallScore: String(values.score ?? "-"),
          scoreLabel: "Score",
          suggestedService: "Audit Record",
          lastUpdate: String(values.lastUpdate || ""),
          updatedBy: "System",
          practice: String(values.practiceName || "No practice linked"),
        };
      });
      setCards(nextCards);
      setShowDetailPanel(false);
      setSelectedAuditId("");
      setSelectedAudit(null);
      toast.success("Audit deleted successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete audit";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const visibleLanes = useMemo(
    () =>
      hideClosed
        ? pipelineLanes.filter((lane) => lane.id !== "closed")
        : pipelineLanes,
    [hideClosed],
  );

  const cardsByLane = useMemo(() => {
    const sortedCards = [...cards].sort((left, right) =>
      sortNewestFirst
        ? right.lastUpdate.localeCompare(left.lastUpdate)
        : left.lastUpdate.localeCompare(right.lastUpdate),
    );

    return Object.fromEntries(
      visibleLanes.map((lane) => [
        lane.id,
        sortedCards.filter((card) => card.status === lane.id),
      ]),
    ) as Record<AuditPipelineStatus, AuditPipelineCard[]>;
  }, [cards, sortNewestFirst, visibleLanes]);

  const selectedPipelineCard =
    cards.find((card) => card.id === selectedAuditId) ??
    cards.find((card) =>
      visibleLanes.some((lane) => lane.id === card.status),
    ) ??
    null;

  function openAudit(cardId: string) {
    setSelectedAuditId(cardId);
    setShowDetailPanel(true);
  }

  function handleCreateAttempt() {
    toast("Create new audits from All Audits.");
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: handleCreateAttempt,
    },
  ];

  const auditTypeOptions = [
    "COMPLIANCE",
    "SECURITY",
    "QUALITY",
    "FINANCIAL",
    "OPERATIONAL",
  ];

  return (
    <AppLayout
      title="Practice Audits"
      activeModule="Audits"
      activeSubItem="Audit Status Board"
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
              <span>Audit Status Board</span>
              <span className="text-slate-400">. {cards.length}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setHideClosed((current) => !current)}
              >
                Filter
              </button>
              <button
                type="button"
                onClick={() => setSortNewestFirst((current) => !current)}
              >
                Sort
              </button>
              <button
                type="button"
                onClick={() => setShowDetailPanel((current) => !current)}
              >
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
                      <div className="rounded-lg border border-[#ece8e1] bg-white px-3 py-3 text-[13px] text-slate-400">
                        Loading...
                      </div>
                    ) : cardsByLane[lane.id]?.length ? (
                      cardsByLane[lane.id].map((card) => {
                        const isSelected =
                          selectedPipelineCard?.id === card.id;

                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => openAudit(card.id)}
                            className={`flex w-full items-start gap-2 rounded-lg border px-3 py-3 text-left transition-all ${
                              isSelected
                                ? "border-[#9cb1f6] bg-white shadow-[0_4px_12px_rgba(157,177,246,0.15)]"
                                : "border-[#ece8e1] bg-white hover:border-[#cfc8bb]"
                            }`}
                          >
                            <GripVertical className="mt-0.5 h-4 w-4 text-slate-300" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[14px] font-medium text-slate-700">
                                {card.title}
                              </p>
                              <p className="mt-1 truncate text-[12px] text-slate-400">
                                {card.practice}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="rounded-lg border border-dashed border-[#ece8e1] px-3 py-3 text-[13px] text-slate-400">
                        No audits
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCreateAttempt}
                      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[#ece8e1] px-3 py-2 text-[13px] text-slate-400 hover:border-[#cfc8bb] hover:text-slate-600 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add New
                    </button>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        {showDetailPanel && selectedPipelineCard ? (
          <aside className="app-panel relative flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
              <button
                type="button"
                onClick={() => setShowDetailPanel(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <Circle className="h-4 w-4 text-slate-300" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
                {selectedAudit?.type || "Audit"}
              </span>
            </div>

            {isAuditLoading || !selectedAudit ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading audit...
              </div>
            ) : (
              <form
                onSubmit={handleUpdateAudit}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-auto p-4">
                  <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Practice</span>
                      <span className="text-right text-slate-700">
                        {selectedAudit.practice?.name || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Deal</span>
                      <span className="text-right text-slate-700">
                        {selectedAudit.deal?.name || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Created</span>
                      <span className="text-right text-slate-700">
                        {formatDateTime(selectedAudit.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Update</span>
                      <span className="text-right text-slate-700">
                        {formatDateTime(selectedAudit.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editForm.type}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            type: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        required
                      >
                        {auditTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Score
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.score}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            score: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                  <button
                    type="button"
                    onClick={handleDeleteAudit}
                    disabled={isDeleting}
                    className="flex cursor-pointer items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="app-control inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#4f63ea] hover:text-white disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </aside>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default AuditStatusBoard;
