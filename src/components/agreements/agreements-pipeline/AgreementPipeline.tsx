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
import AppLayout from "../../layout/AppLayout";
import type { NavbarAction } from "../../layout/Navbar";
import {
  deleteAgreementApi,
  getAgreement,
  getAllAgreements,
  updateAgreementApi,
  type Agreement,
  type AgreementBody,
} from "../../../services/operations/agreements";

// type AgreementPipelineStatus =
//   | "scheduled"
//   | "in-progress"
//   | "completed"
//   | "action-required"
//   | "closed";

type AgreementPipelineStatus = "draft" | "active" | "expired" | "terminated";

type AgreementPipelineCard = {
  id: string;
  title: string;
  status: AgreementPipelineStatus;
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

type AgreementPipelineProgress = {
  id: AgreementPipelineStatus;
  label: string;
  badgeClassName: string;
};

const pipelineLanes: AgreementPipelineProgress[] = [
  {
    id: "active",
    label: "ACTIVE",
    badgeClassName: "bg-[#e8f7ee] text-[#2ba36f]",
  },
  {
    id: "draft",
    label: "DRAFT",
    badgeClassName: "bg-[#eef1ff] text-[#6b7de2]",
  },
  {
    id: "expired",
    label: "EXPIRED",
    badgeClassName: "bg-[#fff1bd] text-[#b78800]",
  },
  {
    id: "terminated",
    label: "TERMINATED",
    badgeClassName: "bg-[#ffe8e8] text-[#ef5d5d]",
  },
  // {
  //   id: "closed",
  //   label: "CLOSED",
  //   badgeClassName: "bg-[#f0e6ff] text-[#9b70dc]",
  // },
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

function mapAgreementStatusToLane(status: string): AgreementPipelineStatus {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "ACTIVE":
      return "active";
    case "EXPIRED":
      return "expired";
    case "TERMINATED":
      return "terminated";
    default:
      return "active";
  }
}

function mapAgreementToCard(agreement: Agreement): AgreementPipelineCard {
  return {
    id: agreement.id,
    title: `${agreement.practice?.name || "Practice"} - ${agreement.type}`,
    status: mapAgreementStatusToLane(agreement.status),
    type: agreement.type,
    createdBy: "System",
    createdAt: formatDateTime(agreement.createdAt),
    overallScore: "Agreement Value",
    scoreLabel: formatStatusLabel(agreement.status),
    suggestedService: "Agreement Record",
    lastUpdate: formatDateTime(agreement.updatedAt),
    updatedBy: "System",
    practice: agreement.practice?.name || "No practice linked",
  };
}

function AgreementPipelinePage() {
  const [cards, setCards] = useState<AgreementPipelineCard[]>([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState("");
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isAgreementLoading, setIsAgreementLoading] = useState(false);
  const [hideClosed, setHideClosed] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  type AgreementFormState = {
    practiceId: string;
    dealId: string;
    type: string;
    status: string;
    value: string;
    effectiveDate: string;
    renewalDate: string;
    terminationDate: string;
  };

  const initialFormState: AgreementFormState = {
    practiceId: "",
    dealId: "",
    type: "MSA",
    status: "DRAFT",
    value: "",
    effectiveDate: "",
    renewalDate: "",
    terminationDate: "",
  };

  const [editForm, setEditForm] =
    useState<AgreementFormState>(initialFormState);

  useEffect(() => {
    async function loadAgreements() {
      try {
        setIsLoading(true);
        const agreements = await getAllAgreements();
        const nextCards = agreements.map(mapAgreementToCard);
        setCards(nextCards);
        setSelectedAgreementId((current) => current || nextCards[0]?.id || "");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load agreement pipeline";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadAgreements();
  }, []);

  useEffect(() => {
    if (!selectedAgreementId) {
      setSelectedAgreement(null);
      return;
    }

    async function loadAgreementDetail() {
      try {
        setIsAgreementLoading(true);
        const agreement = await getAgreement(selectedAgreementId);
        setSelectedAgreement(agreement);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to load agreement details";
        toast.error(message);
      } finally {
        setIsAgreementLoading(false);
      }
    }

    loadAgreementDetail();
  }, [selectedAgreementId]);

  function formatDateForInput(value?: string | null) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  }

  function buildFormState(agreement?: Agreement | null): AgreementFormState {
    if (!agreement) return initialFormState;
    return {
      practiceId: agreement.practiceId,
      dealId: agreement.dealId || "",
      type: agreement.type,
      status: agreement.status,
      value: String(agreement.value || ""),
      effectiveDate: formatDateForInput(agreement.effectiveDate),
      renewalDate: formatDateForInput(agreement.renewalDate),
      terminationDate: formatDateForInput(agreement.terminationDate),
    };
  }

  useEffect(() => {
    if (selectedAgreement) {
      setEditForm(buildFormState(selectedAgreement));
    }
  }, [selectedAgreement]);

  function buildPayload(form: AgreementFormState): AgreementBody {
    return {
      practiceId: form.practiceId,
      dealId: form.dealId || null,
      type: form.type,
      status: form.status,
      value: Number.parseFloat(form.value) || undefined,
      ...(form.effectiveDate
        ? { effectiveDate: new Date(form.effectiveDate).toISOString() }
        : {}),
      ...(form.renewalDate
        ? { renewalDate: new Date(form.renewalDate).toISOString() }
        : {}),
      ...(form.terminationDate
        ? { terminationDate: new Date(form.terminationDate).toISOString() }
        : {}),
    };
  }

  async function handleUpdateAgreement(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.practiceId) {
      toast.error("Practice is required");
      return;
    }

    setIsSaving(true);
    try {
      await updateAgreementApi(selectedAgreementId, buildPayload(editForm));
      const agreements = await getAllAgreements();
      const nextCards = agreements.map(mapAgreementToCard);
      setCards(nextCards);
      const updated = await getAgreement(selectedAgreementId);
      setSelectedAgreement(updated);
      toast.success("Agreement updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update agreement";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAgreement() {
    if (!selectedAgreementId) return;
    if (!window.confirm("Are you sure you want to delete this agreement?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAgreementApi(selectedAgreementId);
      const agreements = await getAllAgreements();
      const nextCards = agreements.map(mapAgreementToCard);
      setCards(nextCards);
      setShowDetailPanel(false);
      setSelectedAgreementId("");
      setSelectedAgreement(null);
      toast.success("Agreement deleted successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete agreement";
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
    ) as Record<AgreementPipelineStatus, AgreementPipelineCard[]>;
  }, [cards, sortNewestFirst, visibleLanes]);

  const selectedAudit =
    cards.find((card) => card.id === selectedAgreementId) ??
    cards.find((card) =>
      visibleLanes.some((lane) => lane.id === card.status),
    ) ??
    null;

  function openAgreement(cardId: string) {
    setSelectedAgreementId(cardId);
    setShowDetailPanel(true);
  }

  function handleCreateAttempt() {
    toast("Create new agreements from All Agreements.");
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: handleCreateAttempt,
    },
  ];

  return (
    <AppLayout
      title="Agreements"
      activeModule="Agreements"
      activeSubItem="Agreement Pipeline"
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
              <span>Agreement Pipeline</span>
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
                        const isSelected = selectedAudit?.id === card.id;

                        return (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => openAgreement(card.id)}
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
                        No agreements
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

        {showDetailPanel && selectedAudit ? (
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
                {selectedAgreement?.type || "Agreement"}
              </span>
            </div>

            {isAgreementLoading || !selectedAgreement ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading agreement...
              </div>
            ) : (
              <form
                onSubmit={handleUpdateAgreement}
                className="flex flex-1 flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-auto p-4">
                  <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Practice</span>
                      <span className="text-right text-slate-700">
                        {selectedAgreement.practice?.name || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Deal</span>
                      <span className="text-right text-slate-700">
                        {selectedAgreement.deal?.name || "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Created</span>
                      <span className="text-right text-slate-700">
                        {formatDateTime(selectedAgreement.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Update</span>
                      <span className="text-right text-slate-700">
                        {formatDateTime(selectedAgreement.updatedAt)}
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
                        {["MSA", "SOW", "RENEWAL", "ADDENDUM"].map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
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
                        {["DRAFT", "ACTIVE", "EXPIRED", "TERMINATED"].map(
                          (status) => (
                            <option key={status} value={status}>
                              {formatStatusLabel(status)}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Value
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editForm.value}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            value: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Effective Date
                      </label>
                      <input
                        type="date"
                        value={editForm.effectiveDate}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            effectiveDate: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Renewal Date
                      </label>
                      <input
                        type="date"
                        value={editForm.renewalDate}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            renewalDate: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[13px] font-medium text-slate-700">
                        Termination Date
                      </label>
                      <input
                        type="date"
                        value={editForm.terminationDate}
                        onChange={(event) =>
                          setEditForm((prev) => ({
                            ...prev,
                            terminationDate: event.target.value,
                          }))
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                  <button
                    type="button"
                    onClick={handleDeleteAgreement}
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

export default AgreementPipelinePage;
