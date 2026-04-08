import { GripVertical, LayoutGrid, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import type { NavbarAction } from "../layout/Navbar";

type PurchaseOrderCard = {
  id: string;
  title: string;
  vendor: string;
  amount: string;
};

type PurchaseOrderColumn = {
  id: string;
  label: string;
  badgeClassName: string;
  cards: PurchaseOrderCard[];
};

const initialColumns: PurchaseOrderColumn[] = [
  {
    id: "draft",
    label: "DRAFT",
    badgeClassName: "bg-[#e8f7ee] text-[#39a56b]",
    cards: [],
  },
  {
    id: "pending-approval",
    label: "PENDING APPROVAL",
    badgeClassName: "bg-[#eef0ff] text-[#7182e6]",
    cards: [],
  },
  {
    id: "approved",
    label: "APPROVED",
    badgeClassName: "bg-[#fff1be] text-[#b88a00]",
    cards: [],
  },
  {
    id: "sent",
    label: "SENT",
    badgeClassName: "bg-[#ffe9ea] text-[#f17b7f]",
    cards: [],
  },
  {
    id: "paid",
    label: "PAID",
    badgeClassName: "bg-[#f3e6ff] text-[#b16de3]",
    cards: [],
  },
  {
    id: "void",
    label: "VOID",
    badgeClassName: "bg-[#fff0df] text-[#ef8a3c]",
    cards: [],
  },
  {
    id: "no-value",
    label: "No Value",
    badgeClassName:
      "bg-white text-slate-500 border border-dashed border-[#d8d3ca]",
    cards: [],
  },
];

function PurchaseOrderStatusBoardPage() {
  const [columns, setColumns] = useState(initialColumns);
  const [selectedView, setSelectedView] = useState("status-board");
  const [hideEmptyColumns, setHideEmptyColumns] = useState(false);

  const visibleColumns = useMemo(
    () =>
      hideEmptyColumns
        ? columns.filter((column) => column.cards.length > 0)
        : columns,
    [columns, hideEmptyColumns],
  );

  function addCard(columnId: string) {
    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? {
              ...column,
              cards: [
                {
                  id: `${columnId}-${column.cards.length + 1}`,
                  title: `PO-${String(column.cards.length + 1).padStart(3, "0")}`,
                  vendor: "TriState Vendor",
                  amount: "$12,500",
                },
                ...column.cards,
              ],
            }
          : column,
      ),
    );
  }

  function toggleSortBoard() {
    setColumns((current) =>
      current.map((column) => ({
        ...column,
        cards: [...column.cards].reverse(),
      })),
    );
  }

  const navbarActions: NavbarAction[] = [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: () => addCard("draft"),
    },
    {
      label: "Ctrl K",
      muted: true,
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
      <div className="app-panel flex h-full flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
          <div className="relative">
            <LayoutGrid className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
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
            <button type="button" onClick={toggleSortBoard}>
              Sort
            </button>
            <button
              type="button"
              onClick={() => setColumns((current) => [...current].reverse())}
            >
              Options
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="grid min-w-[1150px] auto-cols-fr grid-flow-col">
            {visibleColumns.map((column) => (
              <section
                key={column.id}
                className="border-r border-[#f0ece6] last:border-r-0"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`inline-flex rounded px-1.5 py-0.5 text-[12px] font-semibold ${
                      column.badgeClassName
                    }`}
                  >
                    {column.label}
                  </span>
                  <span className="text-[13px] text-slate-400">-</span>
                </div>

                <div className="space-y-2 px-3 pb-4">
                  <button
                    type="button"
                    onClick={() => addCard(column.id)}
                    className="inline-flex items-center gap-2 px-1 py-1 text-[13px] text-slate-400 hover:text-slate-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New
                  </button>

                  {column.cards.map((card) => (
                    <article
                      key={card.id}
                      className="rounded-xl border border-[#ece8e1] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="mt-0.5 h-4 w-4 text-slate-300" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-slate-700">
                            {card.title}
                          </p>
                          <p className="mt-1 text-[12px] text-slate-400">
                            {card.vendor}
                          </p>
                          <p className="mt-2 text-[12px] font-medium text-slate-500">
                            {card.amount}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default PurchaseOrderStatusBoardPage;
