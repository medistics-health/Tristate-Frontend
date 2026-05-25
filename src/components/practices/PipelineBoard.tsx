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
  getAllPractices,
  getPractice,
  updatePracticeApi,
  deletePracticeApi,
  type Practice,
  type PracticeBody,
} from "../../services/operations/practices";

type PipelineContractsStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "action-required"
  | "closed";

type PipelineContractsCard = {
  id: string;
  title: string;
  status: PipelineContractsStatus;
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

type PipelineContractsProgress = {
  id: PipelineContractsStatus;
  label: string;
  badgeClassName: string;
};

const pipelineLanes: PipelineContractsProgress[] = [
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

function mapPracticeStatusToLane(status: string): PipelineContractsStatus {
  switch (status) {
    case "LEAD":
      return "scheduled";
    case "ACTIVE":
      return "in-progress";
    case "INACTIVE":
      return "completed";
    case "CLOSED":
      return "closed";
    default:
      return "scheduled";
  }
}

function mapPracticeToCard(practice: Practice): PipelineContractsCard {
  return {
    id: practice.id,
    title: practice.name,
    status: mapPracticeStatusToLane(practice.status),
    type: practice.status,
    createdBy: "System",
    createdAt: formatDateTime(practice.createdAt),
    overallScore: "-",
    scoreLabel: "Score",
    suggestedService: "Practice Record",
    lastUpdate: formatDateTime(practice.updatedAt),
    updatedBy: "System",
    practice: practice.name,
  };
}

function PipelineBoardPage() {
  const [cards, setCards] = useState<PipelineContractsCard[]>([]);
  const [selectedPracticeId, setSelectedPracticeId] = useState("");
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isPracticeLoading, setIsPracticeLoading] = useState(false);
  const [hideClosed, setHideClosed] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  type PracticeFormState = {
    name: string;
    npi: string;
    status: string;
    region: string;
    source: string;
  };

  const initialFormState: PracticeFormState = {
    name: "",
    npi: "",
    status: "LEAD",
    region: "",
    source: "DIRECT",
  };

  const [editForm, setEditForm] = useState<PracticeFormState>(initialFormState);

  useEffect(() => {
    async function loadPractices() {
      try {
        setIsLoading(true);
        const practices = await getAllPractices();
        const nextCards = practices.map(mapPracticeToCard);
        setCards(nextCards);
        setSelectedPracticeId((current) => current || nextCards[0]?.id || "");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load practice pipeline";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadPractices();
  }, []);

  useEffect(() => {
    if (!selectedPracticeId) {
      setSelectedPractice(null);
      return;
    }

    async function loadPracticeDetail() {
      try {
        setIsPracticeLoading(true);
        const practice = await getPractice(selectedPracticeId);
        setSelectedPractice(practice);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load practice details";
        toast.error(message);
      } finally {
        setIsPracticeLoading(false);
      }
    }

    loadPracticeDetail();
  }, [selectedPracticeId]);

  function buildFormState(
    practice?: Practice | null,
  ): PracticeFormState {
    if (!practice) return initialFormState;
    return {
      name: practice.name,
      npi: practice.npi || "",
      status: practice.status,
      region: practice.region,
      source: practice.source,
    };
  }

  useEffect(() => {
    if (selectedPractice) {
      setEditForm(buildFormState(selectedPractice));
    }
  }, [selectedPractice]);

  function buildPayload(form: PracticeFormState): Partial<PracticeBody> {
    return {
      name: form.name,
      npi: form.npi || undefined,
      status: form.status as PracticeBody["status"],
      region: form.region,
      source: form.source as PracticeBody["source"],
    };
  }

  async function handleUpdatePractice(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.name) {
      toast.error("Name is required");
      return;
    }

    setIsSaving(true);
    try {
      await updatePracticeApi(selectedPracticeId, buildPayload(editForm));
      const practices = await getAllPractices();
      const nextCards = practices.map(mapPracticeToCard);
      setCards(nextCards);
      const updated = await getPractice(selectedPracticeId);
      setSelectedPractice(updated);
      toast.success("Practice updated successfully");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update practice";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePractice() {
    if (!selectedPracticeId) return;
    if (!window.confirm("Are you sure you want to delete this practice?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePracticeApi(selectedPracticeId);
      const practices = await getAllPractices();
      const nextCards = practices.map(mapPracticeToCard);
      setCards(nextCards);
      setShowDetailPanel(false);
      setSelectedPracticeId("");
      setSelectedPractice(null);
      toast.success("Practice deleted successfully");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete practice";
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
    ) as Record<PipelineContractsStatus, PipelineContractsCard[]>;
  }, [cards, sortNewestFirst, visibleLanes]);

  const selectedPipelineCard =
    cards.find((card) => card.id === selectedPracticeId) ??
    cards.find((card) =>
      visibleLanes.some((lane) => lane.id === card.status),
    ) ??
    null;

  function openPractice(cardId: string) {
    setSelectedPracticeId(cardId);
    setShowDetailPanel(true);
  }

  function handleCreateAttempt() {
    toast("Create new practices from All Practices.");
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: handleCreateAttempt,
    },
  ];

  const practiceStatusOptions = ["LEAD", "ACTIVE", "INACTIVE", "CLOSED"] as const;
  const practiceSourceOptions = [
    "DIRECT",
    "REFERRAL",
    "CHANNEL_PARTNER",
    "OUTBOUND",
    "INBOUND",
  ] as const;

  return (
    <AppLayout
      title="Practice"
      activeModule="Practice"
      activeSubItem="Pipeline Board"
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
              <span>Pipeline Board</span>
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
                            onClick={() => openPractice(card.id)}
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
                        No practices
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
                {selectedPractice?.name || "Practice"}
              </span>
            </div>

            {isPracticeLoading || !selectedPractice ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading practice...
              </div>
            ) : (
              <form
                onSubmit={handleUpdatePractice}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-auto p-4">
                  <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">NPI</span>
                      <span className="text-right text-slate-700">
                        {selectedPractice.npi || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Bucket</span>
                      <span className="text-right text-slate-700">
                        {selectedPractice.bucket.join(", ") || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Created</span>
                      <span className="text-right text-slate-700">
                        {formatDateTime(selectedPractice.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Update</span>
                      <span className="text-right text-slate-700">
                        {formatDateTime(selectedPractice.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Status <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editForm.status}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            status: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        required
                      >
                        {practiceStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {formatStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Region <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.region}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            region: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Source <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={editForm.source}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            source: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        required
                      >
                        {practiceSourceOptions.map((source) => (
                          <option key={source} value={source}>
                            {formatStatusLabel(source)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                  <button
                    type="button"
                    onClick={handleDeletePractice}
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

export default PipelineBoardPage;
