const rows = Array.from({ length: 3 }, () => ({
  name: "Untitled",
  createdAt: "Mar 23, 2026 6:47 PM",
  updatedAt: "Mar 23, 2026 6:47 PM",
  updatedBy: "Siddhi Gajjar",
}));

const visibleFields = [
  "Name",
  "Creation date",
  "Last update",
  "Updated by",
  "Created by",
];

const hiddenFields = [
  "Deleted at",
  "Effective Date",
  "Id",
  "Practice",
  "Renewal Date",
  "Status",
  "Termination Date",
  "Type",
  "Value",
];

function AgreementsContent() {
  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-[#ece8e1] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-[#efebe4] px-4 py-3">
          <div className="flex items-center gap-2 text-[15px] font-medium text-slate-700">
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-500" fill="none">
              <path
                d="M4.5 5.5H15.5M4.5 10H15.5M4.5 14.5H15.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span>All Agreements</span>
            <span className="text-slate-400">· 3</span>
            <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-400">
              <path
                d="M5 7.5L10 12.5L15 7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="ml-auto flex items-center gap-6 text-[14px] text-slate-500">
            <button className="font-medium text-slate-700">Filter</button>
            <button>Sort</button>
            <button>Options</button>
          </div>
        </div>

        <div className="grid grid-cols-[52px_1.2fr_1.15fr_1.1fr_1fr] border-b border-[#efebe4] text-[13px] font-medium text-slate-400">
          <div className="flex items-center justify-center border-r border-[#f2eee8] py-3">
            <span className="h-4 w-4 rounded border border-[#bbb8b2]" />
          </div>
          <div className="border-r border-[#f2eee8] px-4 py-3">Abc Name</div>
          <div className="border-r border-[#f2eee8] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">📅</span>
              Creation date
            </div>
          </div>
          <div className="border-r border-[#f2eee8] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">🗓</span>
              Last update
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">◎</span>
              Updated by
            </div>
          </div>
        </div>

        <div className="flex-1">
          {rows.map((row, index) => (
            <div
              key={`${row.name}-${index}`}
              className="grid grid-cols-[52px_1.2fr_1.15fr_1.1fr_1fr] border-b border-[#f4f1ec] text-[14px] text-slate-600"
            >
              <div className="flex items-center justify-center border-r border-[#f5f2ed] py-3">
                <span className="h-4 w-4 rounded border border-[#bbb8b2]" />
              </div>
              <div className="border-r border-[#f5f2ed] px-4 py-3">
                <span className="inline-flex items-center rounded-md bg-[#f3f2f0] px-2.5 py-1 text-slate-400">
                  {row.name}
                </span>
              </div>
              <div className="border-r border-[#f5f2ed] px-4 py-3">
                {row.createdAt}
              </div>
              <div className="border-r border-[#f5f2ed] px-4 py-3">
                {row.updatedAt}
              </div>
              <div className="px-4 py-3">
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f7dc77] text-[11px] font-semibold text-[#7a5d00]">
                    S
                  </span>
                  {row.updatedBy}
                </span>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-[52px_1fr] border-b border-[#f4f1ec] text-[14px] text-slate-400">
            <div className="flex items-center justify-center py-3 text-lg">+</div>
            <div className="py-3">Add New</div>
          </div>

          <div className="px-12 py-3 text-[14px] text-slate-400">
            <button className="inline-flex items-center gap-2">
              Calculate
              <svg viewBox="0 0 20 20" className="h-4 w-4">
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <aside className="w-[348px] border-l border-[#efebe4] bg-[#fcfbf9] shadow-[-8px_0_24px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3 border-b border-[#efebe4] px-4 py-3">
          <button className="text-xl leading-none text-slate-400">×</button>
          <h2 className="text-[15px] font-medium text-slate-700">Filter</h2>
        </div>

        <div className="h-[calc(100%-53px)] overflow-y-auto">
          <div className="border-b border-[#efebe4] px-4 py-3">
            <input
              type="text"
              placeholder="Search fields"
              className="w-full bg-transparent text-[14px] text-slate-500 outline-none placeholder:text-slate-300"
            />
          </div>

          <div className="px-4 py-3">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.03em] text-slate-300">
              Visible fields
            </p>
            <div className="space-y-1">
              {visibleFields.map((field) => (
                <button
                  key={field}
                  className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left text-[14px] text-slate-600"
                >
                  <span className="text-[11px] text-slate-400">Abc</span>
                  {field}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[#efebe4] bg-[#f7f5f1] px-4 py-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.03em] text-slate-300">
              Hidden fields
            </p>
          </div>

          <div className="px-4 py-3">
            <div className="space-y-1">
              {hiddenFields.map((field) => (
                <button
                  key={field}
                  className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left text-[14px] text-slate-500"
                >
                  <span className="text-[11px] text-slate-400">123</span>
                  {field}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default AgreementsContent;
