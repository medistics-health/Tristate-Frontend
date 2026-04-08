import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Circle,
  GripVertical,
  Home,
  LayoutGrid,
  Pencil,
  Plus,
  Sparkles,
  UserCircle2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";

type VendorContractsStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "action-required"
  | "closed";

type VendorContractsCard = {
  id: string;
  title: string;
  status: VendorContractsStatus;
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

type VendorContracts = {
  id: VendorContractsStatus;
  label: string;
  badgeClassName: string;
};

const Vendors: VendorContracts[] = [
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

const initialCards: VendorContractsCard[] = [
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

function VendorContractPage() {
  const [cards, setCards] = useState(initialCards);
  const [selectedAuditId, setSelectedAuditId] = useState(
    initialCards[4]?.id ?? "",
  );
  const [activeTab, setActiveTab] =
    useState<(typeof detailTabs)[number]["id"]>("home");
  const [hideClosed, setHideClosed] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(true);

  const visibleLanes = useMemo(
    () =>
      hideClosed ? Vendors.filter((lane) => lane.id !== "closed") : Vendors,
    [hideClosed],
  );

  const cardsByLane = useMemo(
    () =>
      Object.fromEntries(
        visibleLanes.map((lane) => [
          lane.id,
          cards.filter((card) => card.status === lane.id),
        ]),
      ) as Record<VendorContractsStatus, VendorContractsCard[]>,
    [cards, visibleLanes],
  );

  const selectedAudit =
    cards.find((card) => card.id === selectedAuditId) ??
    cards.find((card) =>
      visibleLanes.some((lane) => lane.id === card.status),
    ) ??
    null;

  function addAudit(status: VendorContractsStatus) {
    const nextId = `audit-${cards.length + 1}`;
    const newCard: VendorContractsCard = {
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

  function toggleOptions() {
    setShowDetailPanel((current) => !current);
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => addAudit("scheduled"),
    },
    {
      label: "Ctrl K",
      muted: true,
    },
  ];

  return (
    <AppLayout
      title="Vendors"
      activeModule="Vendors"
      activeSubItem="Vendor Contracts"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2">
        <div className="app-panel min-w-0 flex-1 overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-slate-400" />
              <span>Agreement Pipeline</span>
              <span className="text-slate-400">� {cards.length}</span>
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
              <button type="button" onClick={toggleOptions}>
                Options
              </button>
            </div>
          </div>

          <div className="min-h-0 overflow-auto">
            <div className="grid min-w-[1050px] auto-cols-fr grid-flow-col">
              {visibleLanes.map((lane) => (
                <section
                  key={lane.id}
                  className="border-r border-[#f0ece6] last:border-r-0"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-[12px] font-semibold ${lane.badgeClassName}`}
                    >
                      {lane.label}
                    </span>
                    <span className="text-[13px] text-slate-400">-</span>
                  </div>

                  <div className="space-y-2 px-3 pb-4">
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
                          className={`flex w-full items-start gap-2 rounded-lg border px-3 py-3 text-left ${
                            isSelected
                              ? "border-[#e6e1d8] bg-[#fbfaf8] shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                              : "border-[#ece8e1] bg-white"
                          }`}
                        >
                          <GripVertical className="mt-0.5 h-4 w-4 text-slate-300" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-slate-400">
                              {card.title}
                            </p>
                          </div>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => addAudit(lane.id)}
                      className="inline-flex items-center gap-2 px-1 py-1 text-[13px] text-slate-400 hover:text-slate-600"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New
                    </button>
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        {showDetailPanel && selectedAudit ? (
          <aside className="app-panel flex w-[340px] flex-col overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
              <button
                type="button"
                onClick={() => setShowDetailPanel(false)}
                className="text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-md bg-[#f7f5f1] px-1.5 py-1 text-slate-300"
              >
                <Circle className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[14px] font-medium text-slate-700">
                    {selectedAudit.title}
                  </p>
                  <span className="text-[13px] text-slate-400">
                    {selectedAudit.createdAt}
                  </span>
                </div>
              </div>
              <Sparkles className="h-4 w-4 text-slate-400" />
            </div>

            <div className="flex items-center gap-5 border-b border-[#f0ece6] px-4 py-3">
              {detailTabs.map((tab) => {
                const active = tab.id === activeTab;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 border-b pb-3 text-[13px] font-medium ${
                      active
                        ? "border-slate-400 text-slate-700"
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
                <div className="inline-flex items-center gap-2 text-slate-700">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fff1bd] text-[11px] text-[#b78800]">
                    S
                  </span>
                  {selectedAudit.createdBy}
                </div>

                <div>
                  <p className="text-slate-400">{selectedAudit.overallScore}</p>
                </div>
                <div>
                  <p className="text-slate-400">{selectedAudit.scoreLabel}</p>
                </div>

                <div>
                  <p className="text-slate-400">Status</p>
                </div>
                <div>
                  <span className="inline-flex rounded-md bg-[#f0e6ff] px-2 py-0.5 text-[#9b70dc]">
                    {selectedAudit.status === "closed"
                      ? "CLOSED"
                      : selectedAudit.status.toUpperCase()}
                  </span>
                </div>

                <div>
                  <p className="truncate text-slate-400">Suggested ...</p>
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
                <div className="inline-flex items-center gap-2 text-slate-700">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fff1bd] text-[11px] text-[#b78800]">
                    S
                  </span>
                  {selectedAudit.updatedBy}
                </div>
              </div>

              <div className="px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-slate-700">
                    Practice
                  </p>
                  <Pencil className="h-4 w-4 text-slate-300" />
                </div>
                <div className="min-h-[260px] rounded-xl border border-dashed border-[#ece8e1] bg-white p-3 text-[13px] text-slate-500">
                  {selectedAudit.practice}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
              <button
                type="button"
                className="rounded-md border border-[#ece8e1] px-3 py-2 text-[13px] font-medium text-slate-600"
              >
                Options | Ctrl O
              </button>
              <button
                type="button"
                className="rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white"
              >
                Open | Ctrl Enter
              </button>
            </div>
          </aside>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default VendorContractPage;
