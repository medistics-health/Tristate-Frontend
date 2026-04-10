import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  Circle,
  ExternalLink,
  GripVertical,
  Home,
  LayoutGrid,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";

type AssessmentProgresstatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "action-required"
  | "closed";

type AssessmentProgressCard = {
  id: string;
  title: string;
  status: AssessmentProgresstatus;
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

type assessmentProgres = {
  id: AssessmentProgresstatus;
  label: string;
  badgeClassName: string;
};

const assessmentProgress: assessmentProgres[] = [
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

const initialCards: AssessmentProgressCard[] = [
  {
    id: "audit-1",
    title: "Untitled",
    status: "scheduled",
    type: "COMPLIANCE",
    createdBy: "Siddhi Gajjar",
    createdAt: "Created now",
    overallScore: "Overall Score",
    scoreLabel: "Overall Score",
    suggestedService: "Suggested Services",
    lastUpdate: "Apr 8, 2026 2:50 PM",
    updatedBy: "Siddhi Gajjar",
    practice: "TriState Specialty Imaging",
  },
  {
    id: "audit-2",
    title: "Untitled",
    status: "in-progress",
    type: "COMPLIANCE",
    createdBy: "Siddhi Gajjar",
    createdAt: "Created now",
    overallScore: "Overall Score",
    scoreLabel: "Overall Score",
    suggestedService: "Suggested Services",
    lastUpdate: "Apr 8, 2026 2:50 PM",
    updatedBy: "Siddhi Gajjar",
    practice: "Hudson Valley Imaging",
  },
  {
    id: "audit-3",
    title: "Untitled",
    status: "in-progress",
    type: "COMPLIANCE",
    createdBy: "Siddhi Gajjar",
    createdAt: "Created now",
    overallScore: "Overall Score",
    scoreLabel: "Overall Score",
    suggestedService: "Suggested Services",
    lastUpdate: "Apr 8, 2026 2:50 PM",
    updatedBy: "Siddhi Gajjar",
    practice: "Metro Practice Group",
  },
  {
    id: "audit-4",
    title: "Untitled",
    status: "completed",
    type: "COMPLIANCE",
    createdBy: "Siddhi Gajjar",
    createdAt: "Created now",
    overallScore: "Overall Score",
    scoreLabel: "Overall Score",
    suggestedService: "Suggested Services",
    lastUpdate: "Apr 8, 2026 2:50 PM",
    updatedBy: "Siddhi Gajjar",
    practice: "Northfield Medical",
  },
  {
    id: "audit-5",
    title: "Untitled",
    status: "closed",
    type: "COMPLIANCE",
    createdBy: "Siddhi Gajjar",
    createdAt: "Created now",
    overallScore: "Overall Score",
    scoreLabel: "Overall Score",
    suggestedService: "Suggested Services",
    lastUpdate: "Apr 8, 2026 2:50 PM",
    updatedBy: "Siddhi Gajjar",
    practice: "TriState Specialty Imaging",
  },
];

const detailTabs = [
  { id: "home", label: "Home", icon: <Home className="h-4 w-4" /> },
  { id: "tasks", label: "Tasks", icon: <CheckSquare className="h-4 w-4" /> },
  { id: "more", label: "+2 More", icon: null },
] as const;

function AvatarPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-700">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fff1bd] text-[11px] text-[#b78800]">
        {name.charAt(0)}
      </span>
      {name}
    </span>
  );
}

function AssessmentProgressPage() {
  const [cards, setCards] = useState(initialCards);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(
    initialCards[4]?.id ?? null,
  );
  const [activeTab, setActiveTab] =
    useState<(typeof detailTabs)[number]["id"]>("home");
  const [hideClosed, setHideClosed] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const visibleLanes = useMemo(
    () =>
      hideClosed
        ? assessmentProgress.filter((lane) => lane.id !== "closed")
        : assessmentProgress,
    [hideClosed],
  );

  const cardsByLane = useMemo(
    () =>
      Object.fromEntries(
        visibleLanes.map((lane) => [
          lane.id,
          cards.filter((card) => card.status === lane.id),
        ]),
      ) as Record<AssessmentProgresstatus, AssessmentProgressCard[]>,
    [cards, visibleLanes],
  );

  const selectedAudit = useMemo(
    () => cards.find((card) => card.id === selectedAuditId) || null,
    [cards, selectedAuditId],
  );

  function createAudit(status: AssessmentProgresstatus) {
    const nextId = `audit-${cards.length + 1}`;
    const newCard: AssessmentProgressCard = {
      id: nextId,
      title: "Untitled",
      status,
      type: "COMPLIANCE",
      createdBy: "Siddhi Gajjar",
      createdAt: "Created now",
      overallScore: "Overall Score",
      scoreLabel: "Overall Score",
      suggestedService: "Suggested Services",
      lastUpdate: "Apr 8, 2026 2:50 PM",
      updatedBy: "Siddhi Gajjar",
      practice: "New Practice",
    };

    setCards((current) => [newCard, ...current]);
    setSelectedAuditId(nextId);
    setShowDetailPanel(true);
  }

  function sortLanesByCount() {
    setCards((current) =>
      [...current].sort((left, right) =>
        left.status.localeCompare(right.status),
      ),
    );
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => createAudit("scheduled"),
    },
  ];

  return (
    <AppLayout
      title="Assessments"
      activeModule="Assessments"
      activeSubItem="Assessment Progress"
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
              <span>Assessment Progress</span>
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
              <button type="button" onClick={sortLanesByCount}>
                Sort
              </button>
              <button
                type="button"
                onClick={() => setShowDetailPanel((prev) => !prev)}
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
                    {cardsByLane[lane.id]?.map((card) => {
                      const isSelected = selectedAudit?.id === card.id;

                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => {
                            setSelectedAuditId(card.id);
                            setShowDetailPanel(true);
                          }}
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
                    })}

                    <button
                      type="button"
                      onClick={() => createAudit(lane.id)}
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
          <aside className="app-panel relative flex w-[340px] flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-[#f0ece6]">
            <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
              <button
                type="button"
                onClick={() => setShowDetailPanel(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-md bg-[#f7f5f1] px-1.5 py-1 text-slate-300"
              >
                <Circle className="h-3.5 w-3.5" />
              </button>
              <input
                value={selectedAudit.title}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setCards((current) =>
                    current.map((c) =>
                      c.id === selectedAudit.id
                        ? { ...c, title: nextValue }
                        : c,
                    ),
                  );
                }}
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[14px] font-medium text-slate-700 outline-none focus:border-[#9cb1f6] focus:bg-white"
              />
              <span className="text-[13px] text-slate-400">Now</span>
              <Sparkles className="h-4 w-4 text-slate-400" />
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
                    {tab.id === "more" ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-[#f0ece6] px-4 py-4 text-[13px]">
                <div>
                  <p className="text-slate-400">Type</p>
                </div>
                <div>
                  <span className="inline-flex rounded-md bg-[#e8f7ee] px-2 py-0.5 text-[#2ba36f]">
                    {selectedAudit.type}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <Circle className="h-3.5 w-3.5" />
                  <span>Created by</span>
                </div>
                <div>
                  <AvatarPill name={selectedAudit.createdBy} />
                </div>

                <div className="text-slate-400">Overall Score</div>
                <div className="text-slate-700">
                  {selectedAudit.overallScore}
                </div>

                <div>
                  <p className="text-slate-400">Status</p>
                </div>
                <div>
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[12px] font-medium ${
                      assessmentProgress.find(
                        (l) => l.id === selectedAudit.status,
                      )?.badgeClassName
                    }`}
                  >
                    {selectedAudit.status.toUpperCase()}
                  </span>
                </div>

                <div>
                  <p className="truncate text-slate-400">Suggested Service</p>
                </div>
                <div>
                  <span className="inline-flex rounded-md bg-[#f7f5f1] px-2 py-0.5 text-slate-400">
                    {selectedAudit.suggestedService}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Last update</span>
                </div>
                <div className="text-slate-700">{selectedAudit.lastUpdate}</div>

                <div className="flex items-center gap-2 text-slate-400">
                  <UserCircle2 className="h-3.5 w-3.5" />
                  <span>Updated by</span>
                </div>
                <div>
                  <AvatarPill name={selectedAudit.updatedBy} />
                </div>
              </div>

              <div className="px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-slate-700">
                    Practice
                  </p>
                </div>
                <div className="min-h-[260px] rounded-xl border border-dashed border-[#ece8e1] bg-white p-3 text-[13px] text-slate-500">
                  {selectedAudit.practice || "No practice associated."}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowOptionsMenu((current) => !current)}
                  className="rounded-md border border-[#9cb1f6] px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
                >
                  Options
                </button>

                {showOptionsMenu ? (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 w-[205px] rounded-xl border border-[#ece8e1] bg-white p-2 shadow-[0_8px_32px_rgba(15,23,42,0.12)] z-20">
                    <button
                      type="button"
                      onClick={() => {
                        setCards((current) =>
                          current.filter((c) => c.id !== selectedAudit.id),
                        );
                        setShowDetailPanel(false);
                        setShowOptionsMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-slate-500 hover:bg-[#f7f5f1]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete record
                    </button>
                    <button
                      type="button"
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-slate-500 hover:bg-[#f7f5f1]"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore record
                    </button>
                    <button
                      type="button"
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-slate-500 hover:bg-[#f7f5f1]"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Export
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className="rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
              >
                Open
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowOptionsMenu((current) => !current)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </aside>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default AssessmentProgressPage;
