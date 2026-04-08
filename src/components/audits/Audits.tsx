import {
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  Circle,
  Home,
  LayoutList,
  Pencil,
  Plus,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import { useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";

type AuditRecordStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "action-required"
  | "closed";

type AuditRecord = {
  id: string;
  title: string;
  type: string;
  createdBy: string;
  createdAt: string;
  overallScore: string;
  status: AuditRecordStatus;
  suggestedService: string;
  lastUpdate: string;
  updatedBy: string;
  practice: string;
  selected: boolean;
  updatedAtValue: number;
};

type AuditListViewProps = {
  viewLabel: string;
  activeSubItem: string;
};

const detailTabs = [
  { id: "home", label: "Home" },
  { id: "tasks", label: "Tasks" },
  { id: "more", label: "+2 More" },
] as const;

const statusBadgeClassNames: Record<AuditRecordStatus, string> = {
  scheduled: "bg-[#e8f7ee] text-[#2ba36f]",
  "in-progress": "bg-[#eef1ff] text-[#6b7de2]",
  completed: "bg-[#fff1bd] text-[#b78800]",
  "action-required": "bg-[#ffe8e8] text-[#ef5d5d]",
  closed: "bg-[#f0e6ff] text-[#9b70dc]",
};

const initialRecords: AuditRecord[] = Array.from({ length: 8 }, (_, index) => ({
  id: `audit-row-${index + 1}`,
  title: "",
  type: "COMPLIANCE",
  createdBy: "Siddhi Gajjar",
  createdAt: "Created now",
  overallScore: "Overall Score",
  status: index === 6 ? "in-progress" : index === 7 ? "closed" : "scheduled",
  suggestedService: "Suggested Services",
  lastUpdate: "Apr 8, 2026 2:57 PM",
  updatedBy: "Siddhi Gajjar",
  practice: "",
  selected: false,
  updatedAtValue: 202604081457 - index,
}));

function formatStatusLabel(status: AuditRecordStatus) {
  return status.replace(/-/g, " ").toUpperCase();
}

function AuditListView({ viewLabel, activeSubItem }: AuditListViewProps) {
  const [records, setRecords] = useState(initialRecords);
  const [selectedAuditId, setSelectedAuditId] = useState(initialRecords[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<(typeof detailTabs)[number]["id"]>("home");
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [showOnlyOpenRecords, setShowOnlyOpenRecords] = useState(false);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

  const visibleRecords = useMemo(() => {
    const filtered = showOnlyOpenRecords
      ? records.filter((record) => record.status !== "closed")
      : records;

    return [...filtered].sort((left, right) =>
      sortNewestFirst
        ? right.updatedAtValue - left.updatedAtValue
        : left.updatedAtValue - right.updatedAtValue,
    );
  }, [records, showOnlyOpenRecords, sortNewestFirst]);

  const selectedAudit =
    visibleRecords.find((record) => record.id === selectedAuditId) ??
    records.find((record) => record.id === selectedAuditId) ??
    visibleRecords[0] ??
    null;

  function upsertSelectedAudit(
    auditId: string,
    updater: (record: AuditRecord) => AuditRecord,
  ) {
    setRecords((current) =>
      current.map((record) => (record.id === auditId ? updater(record) : record)),
    );
  }

  function createAudit() {
    const nextId = `audit-row-${records.length + 1}`;
    const newRecord: AuditRecord = {
      id: nextId,
      title: "",
      type: "COMPLIANCE",
      createdBy: "Siddhi Gajjar",
      createdAt: "Created now",
      overallScore: "Overall Score",
      status: "scheduled",
      suggestedService: "Suggested Services",
      lastUpdate: "Apr 8, 2026 2:57 PM",
      updatedBy: "Siddhi Gajjar",
      practice: "",
      selected: false,
      updatedAtValue: Date.now(),
    };

    setRecords((current) => [newRecord, ...current]);
    setSelectedAuditId(nextId);
    setShowDetailPanel(true);
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: createAudit,
    },
    {
      label: "Ctrl K",
      muted: true,
    },
  ];

  return (
    <AppLayout
      title="Practice Audits"
      activeModule="Audits"
      activeSubItem={activeSubItem}
      navbarIcon={<LayoutList className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2">
        <section className="app-panel min-w-0 flex-1 overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700"
            >
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              <span>{viewLabel}</span>
              <span className="text-slate-400">. {visibleRecords.length}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowOnlyOpenRecords((current) => !current)}
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

          <div className="min-h-0 overflow-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[42px_minmax(0,1fr)] border-b border-[#f0ece6] text-slate-400">
                <div className="flex items-center justify-center border-r border-[#f0ece6] py-2.5">
                  <button
                    type="button"
                    onClick={createAudit}
                    className="inline-flex h-4 w-4 items-center justify-center"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div />
              </div>

              {visibleRecords.map((record) => {
                const isSelected = record.id === selectedAudit?.id;

                return (
                  <div
                    key={record.id}
                    className={`grid grid-cols-[42px_minmax(0,1fr)] border-b border-[#f0ece6] ${
                      isSelected ? "bg-[#fcfbf9]" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-center border-r border-[#f0ece6] py-3">
                      <input
                        type="checkbox"
                        checked={record.selected}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          upsertSelectedAudit(record.id, (current) => ({
                            ...current,
                            selected: checked,
                          }));
                        }}
                        className="h-4 w-4 rounded border-[#cfc8bb] text-[#4f63ea] focus:ring-[#4f63ea]"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAuditId(record.id);
                        setShowDetailPanel(true);
                      }}
                      className="flex min-h-[38px] items-center px-4 text-left"
                    >
                      <span
                        className={`text-[14px] ${
                          record.title ? "text-slate-600" : "text-slate-300"
                        }`}
                      >
                        {record.title || "Untitled"}
                      </span>
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={createAudit}
                className="flex min-h-[38px] w-full items-center gap-3 border-b border-[#f0ece6] px-4 text-[14px] text-slate-400"
              >
                <Plus className="h-4 w-4" />
                Add New
              </button>
            </div>
          </div>
        </section>

        {showDetailPanel && selectedAudit ? (
          <aside className="app-panel flex w-[340px] flex-col overflow-hidden rounded-2xl">
            <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
              <button
                type="button"
                onClick={() => setShowDetailPanel(false)}
                className="text-slate-400"
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
                  const nextTitle = event.target.value;
                  upsertSelectedAudit(selectedAudit.id, (current) => ({
                    ...current,
                    title: nextTitle,
                  }));
                }}
                placeholder="Name"
                className="min-w-0 flex-1 rounded-md border border-[#9cb1f6] bg-white px-1.5 py-0.5 text-[14px] text-slate-700 outline-none placeholder:text-slate-400"
              />
              <span className="text-[13px] text-slate-400">{selectedAudit.createdAt}</span>
              <Sparkles className="h-4 w-4 text-slate-400" />
            </div>

            <div className="flex items-center gap-5 border-b border-[#f0ece6] px-4 pt-3">
              {detailTabs.map((tab) => {
                const isActive = tab.id === activeTab;
                const icon =
                  tab.id === "home" ? (
                    <Home className="h-4 w-4" />
                  ) : tab.id === "tasks" ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : null;

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
                    {icon}
                    {tab.label}
                    {tab.id === "more" ? <ChevronDown className="h-3.5 w-3.5" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-[#f0ece6] px-4 py-4 text-[13px]">
                <div className="text-slate-400">Type</div>
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

                <div className="text-slate-400">Overall Score</div>
                <div className="text-slate-400">{selectedAudit.overallScore}</div>

                <div className="text-slate-400">Status</div>
                <div>
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 ${statusBadgeClassNames[selectedAudit.status]}`}
                  >
                    {formatStatusLabel(selectedAudit.status)}
                  </span>
                </div>

                <div className="truncate text-slate-400">Suggested ...</div>
                <div>
                  <span className="inline-flex rounded-md bg-[#f7f5f1] px-2 py-0.5 text-slate-400">
                    {selectedAudit.suggestedService}
                  </span>
                </div>

                <div className="text-slate-400">Last update</div>
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
                  <p className="text-[13px] font-medium text-slate-700">Practice</p>
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

export function AllPracticeAuditsPage() {
  return (
    <AuditListView
      viewLabel="All Practice Aud..."
      activeSubItem="All Practice Audits"
    />
  );
}

export default function Audits() {
  return <AuditListView viewLabel="All Audits" activeSubItem="All Audits" />;
}
