import {
  CalendarDays,
  ChevronDown,
  LayoutList,
  Plus,
  UserCircle2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import {
  AvatarPill,
  DetailSidePanel,
  getStandardNavbarActions,
  type DetailTabId,
} from "../shared/PageComponents";

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

function AllVendorsPage() {
  const [records, setRecords] = useState(initialVendorss);
  const [selectedVendorsId, setSelectedVendorsId] = useState(
    initialVendorss[2]?.id ?? "",
  );
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTabId>("home");
  const [filterDeletedOnly, setFilterDeletedOnly] = useState(false);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);

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
  }

  function exportSelectedVendors() {
    if (!selectedVendors) return;

    updateVendors(selectedVendors.id, (record) => ({
      ...record,
      name: `${record.name} Exported`,
      updatedAt: "Apr 8, 2026 3:23 PM",
    }));
  }

  const navbarActions = getStandardNavbarActions(createVendors);

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

        {selectedVendors && (
          <DetailSidePanel
            isOpen={showDetailPanel}
            onClose={() => setShowDetailPanel(false)}
            title={selectedVendors.name}
            onTitleChange={(newTitle) =>
              updateVendors(selectedVendors.id, (r) => ({ ...r, name: newTitle }))
            }
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onDelete={deleteSelectedVendors}
            onRestore={restoreSelectedVendors}
            onExport={exportSelectedVendors}
            metadata={[
              {
                label: (
                  <>
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>Created by</span>
                  </>
                ),
                value: <AvatarPill name={selectedVendors.createdBy} />,
              },
              {
                label: "Overall Score",
                value: selectedVendors.overallScore,
              },
              {
                label: "Status",
                value: (
                  <span className="inline-flex rounded-md bg-[#e8f7ee] px-2 py-0.5 text-[#2ba36f]">
                    {selectedVendors.status}
                  </span>
                ),
              },
              {
                label: "Template",
                value: (
                  <span className="inline-flex rounded-md bg-[#e8f7ee] px-2 py-0.5 text-[#2ba36f]">
                    {selectedVendors.template}
                  </span>
                ),
              },
              {
                label: (
                  <>
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>Last update</span>
                  </>
                ),
                value: selectedVendors.updatedAt,
              },
              {
                label: (
                  <>
                    <UserCircle2 className="h-3.5 w-3.5" />
                    <span>Updated by</span>
                  </>
                ),
                value: <AvatarPill name={selectedVendors.updatedBy} />,
              },
            ]}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-medium text-slate-700">Practice</p>
            </div>
            <div className="min-h-[240px] rounded-xl border border-dashed border-[#ece8e1] bg-white p-3 text-[13px] text-slate-500">
              {selectedVendors.practice || "No practice details provided."}
            </div>
          </DetailSidePanel>
        )}
      </div>
    </AppLayout>
  );
}

export default AllVendorsPage;
