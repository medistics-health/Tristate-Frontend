import {
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  Circle,
  ExternalLink,
  Home,
  LayoutList,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";

type VendorsStatus = "NOT STARTED" | "IN PROGRESS" | "DONE";
type VendorsTemplate = "INITIAL Vendors" | "FOLLOW UP";

type VendorsRecord = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  status: VendorsStatus;
  template: VendorsTemplate;
  overallScore: string;
  practice: string;
  deleted: boolean;
  selected: boolean;
};

const detailTabs = [
  { id: "home", label: "Home", icon: <Home className="h-4 w-4" /> },
  { id: "tasks", label: "Tasks", icon: <CheckSquare className="h-4 w-4" /> },
  { id: "more", label: "+2 More", icon: null },
] as const;

const initialVendorss: VendorsRecord[] = [
  {
    id: "Vendors-1",
    name: "Untitled",
    createdAt: "Apr 8, 2026 3:07 PM",
    updatedAt: "Apr 8, 2026 3:07 PM",
    createdBy: "Siddhi Gajjar",
    updatedBy: "Siddhi Gajjar",
    status: "NOT STARTED",
    template: "INITIAL Vendors",
    overallScore: "Overall Score",
    practice: "",
    deleted: false,
    selected: false,
  },
  {
    id: "Vendors-2",
    name: "Untitled",
    createdAt: "Apr 8, 2026 3:22 PM",
    updatedAt: "Apr 8, 2026 3:22 PM",
    createdBy: "Siddhi Gajjar",
    updatedBy: "Siddhi Gajjar",
    status: "NOT STARTED",
    template: "INITIAL Vendors",
    overallScore: "Overall Score",
    practice: "",
    deleted: false,
    selected: false,
  },
  {
    id: "Vendors-3",
    name: "Untitled",
    createdAt: "Apr 8, 2026 3:22 PM",
    updatedAt: "Apr 8, 2026 3:23 PM",
    createdBy: "Siddhi Gajjar",
    updatedBy: "Siddhi Gajjar",
    status: "NOT STARTED",
    template: "INITIAL Vendors",
    overallScore: "Overall Score",
    practice: "",
    deleted: true,
    selected: false,
  },
];

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

function AllVendorsPage() {
  const [records, setRecords] = useState(initialVendorss);
  const [selectedVendorsId, setSelectedVendorsId] = useState(
    initialVendorss[2]?.id ?? "",
  );
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [activeTab, setActiveTab] =
    useState<(typeof detailTabs)[number]["id"]>("home");
  const [filterDeletedOnly, setFilterDeletedOnly] = useState(false);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
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

  const visibleRecords = useMemo(() => {
    const filtered = filterDeletedOnly
      ? records.filter((record) => record.deleted)
      : records;

    return [...filtered].sort((left, right) =>
      sortNewestFirst
        ? right.updatedAt.localeCompare(left.updatedAt)
        : left.updatedAt.localeCompare(right.updatedAt),
    );
  }, [records, filterDeletedOnly, sortNewestFirst]);

  const selectedVendors =
    visibleRecords.find((record) => record.id === selectedVendorsId) ??
    records.find((record) => record.id === selectedVendorsId) ??
    visibleRecords[0] ??
    null;

  function updateVendors(
    VendorsId: string,
    updater: (record: VendorsRecord) => VendorsRecord,
  ) {
    setRecords((current) =>
      current.map((record) =>
        record.id === VendorsId ? updater(record) : record,
      ),
    );
  }

  function createVendors() {
    const nextId = `Vendors-${records.length + 1}`;
    const newRecord: VendorsRecord = {
      id: nextId,
      name: "Untitled",
      createdAt: "Created now",
      updatedAt: "Apr 8, 2026 3:23 PM",
      createdBy: "Siddhi Gajjar",
      updatedBy: "Siddhi Gajjar",
      status: "NOT STARTED",
      template: "INITIAL Vendors",
      overallScore: "Overall Score",
      practice: "",
      deleted: false,
      selected: false,
    };

    setRecords((current) => [newRecord, ...current]);
    setSelectedVendorsId(nextId);
    setShowDetailPanel(true);
    setShowOptionsMenu(false);
  }

  function restoreSelectedVendors() {
    if (!selectedVendors) return;

    updateVendors(selectedVendors.id, (record) => ({
      ...record,
      deleted: false,
      updatedAt: "Apr 8, 2026 3:23 PM",
    }));
  }

  function deleteSelectedVendors() {
    if (!selectedVendors) return;

    updateVendors(selectedVendors.id, (record) => ({
      ...record,
      deleted: true,
      updatedAt: "Apr 8, 2026 3:23 PM",
    }));
    setShowOptionsMenu(false);
  }

  function destroySelectedVendors() {
    if (!selectedVendors) return;

    const nextRecords = records.filter(
      (record) => record.id !== selectedVendors.id,
    );
    setRecords(nextRecords);
    setSelectedVendorsId(nextRecords[0]?.id ?? "");
    setShowOptionsMenu(false);
  }

  function exportSelectedVendors() {
    if (!selectedVendors) return;

    updateVendors(selectedVendors.id, (record) => ({
      ...record,
      name: `${record.name} Exported`,
      updatedAt: "Apr 8, 2026 3:23 PM",
    }));
    setShowOptionsMenu(false);
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: createVendors,
    },
    {
      label: "Ctrl K",
      muted: true,
    },
  ];

  return (
    <AppLayout
      title="Vendorss"
      activeModule="Vendorss"
      activeSubItem="All Vendorss"
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
              <span>All Vendorss</span>
              <span className="text-slate-400">. {visibleRecords.length}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setFilterDeletedOnly((current) => !current)}
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
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[42px_minmax(0,1.2fr)_180px_190px_190px_190px_48px] border-b border-[#f0ece6] bg-white text-[14px] text-slate-400">
                <div className="flex items-center justify-center border-r border-[#f0ece6] py-2.5">
                  <input
                    type="checkbox"
                    checked={
                      visibleRecords.length > 0 &&
                      visibleRecords.every((record) => record.selected)
                    }
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setRecords((current) =>
                        current.map((record) => ({
                          ...record,
                          selected: checked,
                        })),
                      );
                    }}
                    className="h-4 w-4 rounded border-[#cfc8bb] text-[#4f63ea] focus:ring-[#4f63ea]"
                  />
                </div>
                <div className="flex items-center gap-2 border-r border-[#f0ece6] px-4">
                  <span className="text-[11px] uppercase tracking-[0.04em]">
                    Abc
                  </span>
                  <span>Name</span>
                </div>
                <div className="flex items-center gap-2 border-r border-[#f0ece6] px-4">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Creation date</span>
                </div>
                <div className="flex items-center gap-2 border-r border-[#f0ece6] px-4">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Last update</span>
                </div>
                <div className="flex items-center gap-2 border-r border-[#f0ece6] px-4">
                  <UserCircle2 className="h-3.5 w-3.5" />
                  <span>Updated by</span>
                </div>
                <div className="flex items-center gap-2 border-r border-[#f0ece6] px-4">
                  <UserCircle2 className="h-3.5 w-3.5" />
                  <span>Created by</span>
                </div>
                <div className="flex items-center justify-center px-3">
                  <Plus className="h-4 w-4" />
                </div>
              </div>

              {visibleRecords.map((record) => {
                const isActive = selectedVendors?.id === record.id;

                return (
                  <div
                    key={record.id}
                    className={`grid grid-cols-[42px_minmax(0,1.2fr)_180px_190px_190px_190px_48px] border-b border-[#f0ece6] text-[14px] ${
                      isActive ? "bg-[#fcfbf9]" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-center border-r border-[#f0ece6] py-3">
                      <input
                        type="checkbox"
                        checked={record.selected}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          updateVendors(record.id, (current) => ({
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
                        setSelectedVendorsId(record.id);
                        setShowDetailPanel(true);
                      }}
                      className="flex items-center gap-2 border-r border-[#f0ece6] px-4 text-left"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#f7f5f1] text-[11px] text-slate-300">
                        -
                      </span>
                      <span
                        className={
                          record.deleted ? "text-slate-300" : "text-slate-600"
                        }
                      >
                        {record.name}
                      </span>
                    </button>

                    <div className="flex items-center border-r border-[#f0ece6] px-4 text-slate-700">
                      {record.createdAt}
                    </div>
                    <div className="flex items-center border-r border-[#f0ece6] px-4 text-slate-700">
                      {record.updatedAt}
                    </div>
                    <div className="flex items-center border-r border-[#f0ece6] px-4">
                      <AvatarPill name={record.updatedBy} />
                    </div>
                    <div className="flex items-center border-r border-[#f0ece6] px-4">
                      <AvatarPill name={record.createdBy} />
                    </div>
                    <div />
                  </div>
                );
              })}

              <button
                type="button"
                onClick={createVendors}
                className="flex w-full items-center gap-3 border-b border-[#f0ece6] px-4 py-3 text-[14px] text-slate-400"
              >
                <Plus className="h-4 w-4" />
                Add New
              </button>

              <div className="flex items-center gap-2 px-4 py-3 text-[14px] text-slate-400">
                <span>Calculate</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </section>

        {showDetailPanel && selectedVendors ? (
          <aside className="app-panel relative flex w-[340px] flex-col overflow-hidden rounded-2xl">
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
                value={selectedVendors.name}
                onChange={(event) => {
                  updateVendors(selectedVendors.id, (record) => ({
                    ...record,
                    name: event.target.value,
                  }));
                }}
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[14px] font-medium text-slate-700 outline-none focus:border-[#9cb1f6] focus:bg-white"
              />
              <span className="text-[13px] text-slate-400">Created now</span>
              <Sparkles className="h-4 w-4 text-slate-400" />
            </div>

            {selectedVendors.deleted ? (
              <div className="flex items-center justify-between bg-[#eb4d4d] px-4 py-2.5 text-[14px] font-medium text-white">
                <span>This record has been deleted</span>
                <button
                  type="button"
                  onClick={restoreSelectedVendors}
                  className="rounded-md border border-white/30 bg-white/10 px-3 py-1.5 text-[13px]"
                >
                  <span className="inline-flex items-center gap-2">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </span>
                </button>
              </div>
            ) : null}

            <div className="flex items-center gap-5 border-b border-[#f0ece6] px-4 pt-3">
              {detailTabs.map((tab) => {
                const isActive = activeTab === tab.id;

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
                <div className="flex items-center gap-2 text-slate-400">
                  <Circle className="h-3.5 w-3.5" />
                  <span>Created by</span>
                </div>
                <div>
                  <AvatarPill name={selectedVendors.createdBy} />
                </div>

                <div className="text-slate-400">Overall Score</div>
                <div className="text-slate-400">
                  {selectedVendors.overallScore}
                </div>

                <div className="text-slate-400">Status</div>
                <div>
                  <span className="inline-flex rounded-md bg-[#e8f7ee] px-2 py-0.5 text-[#2ba36f]">
                    {selectedVendors.status}
                  </span>
                </div>

                <div className="text-slate-400">Template</div>
                <div>
                  <span className="inline-flex rounded-md bg-[#e8f7ee] px-2 py-0.5 text-[#2ba36f]">
                    {selectedVendors.template}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>Last update</span>
                </div>
                <div className="text-slate-700">
                  {selectedVendors.updatedAt}
                </div>

                <div className="flex items-center gap-2 text-slate-400">
                  <UserCircle2 className="h-3.5 w-3.5" />
                  <span>Updated by</span>
                </div>
                <div>
                  <AvatarPill name={selectedVendors.updatedBy} />
                </div>
              </div>

              <div className="px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-slate-700">
                    Practice
                  </p>
                </div>
                <div className="min-h-[240px] rounded-xl border border-dashed border-[#ece8e1] bg-white p-3 text-[13px] text-slate-500">
                  {selectedVendors.practice}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowOptionsMenu((current) => !current)}
                  className="rounded-md border border-[#9cb1f6] px-3 py-2 text-[13px] font-medium text-slate-600"
                >
                  Options | Ctrl O
                </button>

                {showOptionsMenu ? (
                  <div className="absolute bottom-[calc(100%+8px)] left-0 w-[205px] rounded-xl border border-[#ece8e1] bg-white p-2 shadow-[0_8px_32px_rgba(15,23,42,0.12)]">
                    <button
                      type="button"
                      onClick={deleteSelectedVendors}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-slate-500 hover:bg-[#f7f5f1]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete record
                    </button>
                    <button
                      type="button"
                      onClick={restoreSelectedVendors}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-slate-500 hover:bg-[#f7f5f1]"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restore record
                    </button>
                    <button
                      type="button"
                      onClick={destroySelectedVendors}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-slate-500 hover:bg-[#f7f5f1]"
                    >
                      <Trash2 className="h-4 w-4" />
                      Permanently destroy r...
                    </button>
                    <button
                      type="button"
                      onClick={exportSelectedVendors}
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
                className="rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white"
              >
                Open | Ctrl J
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowOptionsMenu((current) => !current)}
              className="absolute right-4 top-4 text-slate-400"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </aside>
        ) : null}
      </div>
    </AppLayout>
  );
}

export default AllVendorsPage;
