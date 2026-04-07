import type { AgreementsField } from "../types";

type AgreementsFilterPanelProps = {
  fields: AgreementsField[];
};

function getFieldPrefix(type: AgreementsField["type"]) {
  switch (type) {
    case "text":
      return "Abc";
    case "date":
      return "📅";
    case "user":
      return "◎";
    case "relation":
      return "⌂";
    default:
      return "123";
  }
}

function AgreementsFilterPanel({ fields }: AgreementsFilterPanelProps) {
  const visibleFields = fields.filter((field) => field.visible);
  const hiddenFields = fields.filter((field) => !field.visible);

  return (
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
                key={field.id}
                className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left text-[14px] text-slate-600"
              >
                <span className="text-[11px] text-slate-400">
                  {getFieldPrefix(field.type)}
                </span>
                {field.label}
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
                key={field.id}
                className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left text-[14px] text-slate-500"
              >
                <span className="text-[11px] text-slate-400">
                  {getFieldPrefix(field.type)}
                </span>
                {field.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

export default AgreementsFilterPanel;
