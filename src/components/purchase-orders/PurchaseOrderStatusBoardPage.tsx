import {
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
  FileText,
  CheckSquare,
} from "lucide-react";
import { useMemo, useRef, useState, useEffect } from "react";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";

type PurchaseOrderCard = {
  id: string;
  title: string;
  vendor: string;
  amount: string;
  status: string;
};

type PurchaseOrderColumn = {
  id: string;
  label: string;
  badgeClassName: string;
};

const initialColumns: PurchaseOrderColumn[] = [
  {
    id: "draft",
    label: "DRAFT",
    badgeClassName: "bg-[#e8f7ee] text-[#39a56b]",
  },
  {
    id: "pending-approval",
    label: "PENDING APPROVAL",
    badgeClassName: "bg-[#eef0ff] text-[#7182e6]",
  },
  {
    id: "approved",
    label: "APPROVED",
    badgeClassName: "bg-[#fff1be] text-[#b88a00]",
  },
  {
    id: "sent",
    label: "SENT",
    badgeClassName: "bg-[#ffe9ea] text-[#f17b7f]",
  },
  {
    id: "paid",
    label: "PAID",
    badgeClassName: "bg-[#f3e6ff] text-[#b16de3]",
  },
  {
    id: "void",
    label: "VOID",
    badgeClassName: "bg-[#fff0df] text-[#ef8a3c]",
  },
  {
    id: "no-value",
    label: "No Value",
    badgeClassName:
      "bg-white text-slate-500 border border-dashed border-[#d8d3ca]",
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

function PurchaseOrderStatusBoardPage() {
  const [columns] = useState(initialColumns);
  const [cards, setCards] = useState<PurchaseOrderCard[]>([]);
  const [selectedView, setSelectedView] = useState("status-board");
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [activeTab, setActiveTab] =
    useState<(typeof detailTabs)[number]["id"]>("home");
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

  const visibleColumns = useMemo(
    () =>
      hideEmptyColumns
        ? columns.filter((column) => cards.some((c) => c.status === column.id))
        : columns,
    [columns, cards, hideEmptyColumns],
  );

  const cardsByLane = useMemo(() => {
    const map: Record<string, PurchaseOrderCard[]> = {};
    columns.forEach((col) => (map[col.id] = []));
    cards.forEach((card) => {
      if (map[card.status]) map[card.status].push(card);
    });
    return map;
  }, [cards, columns]);

  const selectedCard = useMemo(
    () => cards.find((c) => c.id === selectedCardId) || null,
    [cards, selectedCardId],
  );

  function addCard(status: string) {
    const nextId = `po-${cards.length + 1}`;
    const newCard = {
      id: nextId,
      title: `PO-${String(cards.length + 1).padStart(3, "0")}`,
      vendor: "TriState Vendor",
      amount: "$12,500",
      status: status,
    };
    setCards((current) => [newCard, ...current]);
    setSelectedCardId(nextId);
    setShowDetailPanel(true);
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => addCard("draft"),
    },
  ];

  return (
    <AppLayout
      title="Purchase Orders"
      activeModule="Purchase Orders"
      activeSubItem="PO Status Board"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="flex h-full gap-2 font-app-sans">
        <div className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-[#f0ece6]">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <div className="relative">
              <LayoutGrid className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedView}
                onChange={(event) => setSelectedView(event.target.value)}
                className="min-w-56 appearance-none rounded-md bg-transparent py-1.5 pl-8 pr-10 text-[14px] font-medium text-slate-700 outline-none"
              >
                <option value="status-board">PO Status Board</option>
              </select>
            </div>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setHideEmptyColumns((current) => !current)}
              >
                Filter
              </button>
              <button
                type="button"
                onClick={() => setCards((prev) => [...prev].reverse())}
              >
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

          <div className="min-h-0 flex-1 overflow-auto">
            <div className="grid min-w-[1150px] auto-cols-fr grid-flow-col h-full bg-[#fcfbf9]">
              {visibleColumns.map((column) => (
                <section
                  key={column.id}
                  className="border-r border-[#f0ece6] last:border-r-0 flex flex-col"
                >
                  <div className="flex items-center gap-3 px-4 py-3 sticky top-0 bg-[#fcfbf9] z-10">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[12px] font-semibold ${
                        column.badgeClassName
                      }`}
                    >
                      {column.label}
                    </span>
                    <span className="text-[13px] text-slate-400">
                      {cardsByLane[column.id]?.length || 0}
                    </span>
                  </div>

                  <div className="space-y-2 px-3 pb-4 flex-1 overflow-y-auto">
                    {cardsByLane[column.id]?.map((card) => {
                      const isSelected = selectedCardId === card.id;

                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => {
                            setSelectedCardId(card.id);
                            setShowDetailPanel(true);
                          }}
                          className={`flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                            isSelected
                              ? "border-[#9cb1f6] bg-white shadow-[0_4px_12px_rgba(157,177,246,0.15)]"
                              : "border-[#ece8e1] bg-white hover:border-[#cfc8bb]"
                          }`}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <GripVertical className="h-4 w-4 text-slate-300" />
                            <p className="text-[13px] font-medium text-slate-700">
                              {card.title}
                            </p>
                          </div>
                          <p className="mt-1 text-[12px] text-slate-400 pl-6">
                            {card.vendor}
                          </p>
                          <p className="mt-1 text-[12px] font-medium text-slate-500 pl-6">
                            {card.amount}
                          </p>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => addCard(column.id)}
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

        {showDetailPanel && selectedCard ? (
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
                value={selectedCard.title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setCards((current) =>
                    current.map((c) =>
                      c.id === selectedCard.id ? { ...c, title: nextTitle } : c,
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
                <div className="flex items-center gap-2 text-slate-400">
                  <Circle className="h-3.5 w-3.5" />
                  <span>Status</span>
                </div>
                <div>
                  <span
                    className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                      columns.find((c) => c.id === selectedCard.status)
                        ?.badgeClassName
                    }`}
                  >
                    {columns.find((c) => c.id === selectedCard.status)?.label}
                  </span>
                </div>

                <div className="text-slate-400">Vendor</div>
                <div className="text-slate-700 truncate">
                  {selectedCard.vendor}
                </div>

                <div className="text-slate-400">Amount</div>
                <div className="text-slate-700">{selectedCard.amount}</div>

                <div className="flex items-center gap-2 text-slate-400">
                  <Circle className="h-3.5 w-3.5" />
                  <span>Created by</span>
                </div>
                <div>
                  <AvatarPill name="Siddhi Gajjar" />
                </div>
              </div>

              <div className="px-4 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-slate-700">
                    Details
                  </p>
                </div>
                <div className="min-h-[240px] rounded-xl border border-dashed border-[#ece8e1] bg-white p-3 text-[13px] text-slate-500">
                  No additional details provided.
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
                          current.filter((c) => c.id !== selectedCard.id),
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

export default PurchaseOrderStatusBoardPage;
