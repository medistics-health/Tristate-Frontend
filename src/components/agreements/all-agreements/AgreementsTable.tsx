import type {
  AgreementsCellValue,
  AgreementsField,
  AgreementsRow,
  AgreementsUserValue,
} from "../types";

type AgreementsTableProps = {
  title: string;
  totalCount: number;
  fields: AgreementsField[];
  rows: AgreementsRow[];
};

function getFieldPrefix(field: AgreementsField) {
  switch (field.type) {
    case "text":
      return "Abc";
    case "date":
      return "Cal";
    case "user":
      return "Usr";
    default:
      return "123";
  }
}

function isUserValue(value: AgreementsCellValue): value is AgreementsUserValue {
  return Boolean(
    value &&
    typeof value === "object" &&
    "name" in value &&
    "initials" in value,
  );
}

function renderCellValue(field: AgreementsField, row: AgreementsRow) {
  const value = row.values[field.id];

  if (field.id === "name" && typeof value === "string") {
    return (
      <span className="inline-flex items-center rounded-md bg-[#f3f2f0] px-2.5 py-1 text-slate-400">
        {value}
      </span>
    );
  }

  if (isUserValue(value)) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f7dc77] text-[11px] font-semibold text-[#7a5d00]">
          {value.initials}
        </span>
        {value.name}
      </span>
    );
  }

  return value ?? "—";
}

function AgreementsTable({
  title,
  totalCount,
  fields,
  rows,
}: AgreementsTableProps) {
  const visibleFields = fields.filter((field) => field.visible).slice(0, 4);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center border-b border-[#efebe4] px-4 py-3">
        <div className="flex items-center gap-2 text-[15px] font-medium text-slate-700">
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4 text-slate-500"
            fill="none"
          >
            <path
              d="M4.5 5.5H15.5M4.5 10H15.5M4.5 14.5H15.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span>{title}</span>
          <span className="text-slate-400">· {totalCount}</span>
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
        {visibleFields.map((field, index) => (
          <div
            key={field.id}
            className={`px-4 py-3 ${
              index < visibleFields.length - 1
                ? "border-r border-[#f2eee8]"
                : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-500">{getFieldPrefix(field)}</span>
              {field.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[52px_1.2fr_1.15fr_1.1fr_1fr] border-b border-[#f4f1ec] text-[14px] text-slate-600"
          >
            <div className="flex items-center justify-center border-r border-[#f5f2ed] py-3">
              <span className="h-4 w-4 rounded border border-[#bbb8b2]" />
            </div>
            {visibleFields.map((field, index) => (
              <div
                key={field.id}
                className={`px-4 py-3 ${
                  index < visibleFields.length - 1
                    ? "border-r border-[#f5f2ed]"
                    : ""
                }`}
              >
                {renderCellValue(field, row)}
              </div>
            ))}
          </div>
        ))}

        <div className="grid grid-cols-[52px_1fr] border-b border-[#f4f1ec] text-[14px] text-slate-400">
          <div className="flex items-center justify-center py-3 text-lg">+</div>
          <div className="py-3">Add New</div>
        </div>
      </div>
    </div>
  );
}

export default AgreementsTable;
