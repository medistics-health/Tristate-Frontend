import type { ReactNode } from "react";

export type StandardEntityRow = {
  id: string;
  name: string;
  creationDate: string;
  lastUpdate: string;
  updatedBy: string;
  createdBy: string;
};

export type MetricTableRow = {
  id: string;
  name: string;
  vendor: string;
  amount: string;
  dueIn: string;
  createdBy: string;
};

export function parseRelativeAge(value: string) {
  const parts = value.split(" ");
  const amount = Number(parts[0]);
  const unit = parts[1];

  if (Number.isNaN(amount)) {
    return 0;
  }

  if (unit.startsWith("day")) {
    return amount;
  }

  if (unit.startsWith("month")) {
    return amount * 30;
  }

  if (unit.startsWith("year")) {
    return amount * 365;
  }

  return amount;
}

export function parseDueIn(value: string) {
  const amount = Number(value.split(" ")[0]);
  return Number.isNaN(amount) ? 0 : amount;
}

export function buildStandardEntityRow(
  index: number,
  itemLabel: string,
): StandardEntityRow {
  return {
    id: `record-${index}`,
    name: `${itemLabel} ${index}`,
    creationDate: "0 days ago",
    lastUpdate: "0 days ago",
    updatedBy: "Siddhi Gajjar",
    createdBy: "Siddhi Gajjar",
  };
}

export function buildMetricTableRow(
  prefix: string,
  index: number,
): MetricTableRow {
  return {
    id: `${prefix}-${index}`,
    name: `PO-00${index}`,
    vendor: "New Vendor",
    amount: "$6,000",
    dueIn: "7 days",
    createdBy: "Siddhi Gajjar",
  };
}

export function EmptyStateIllustration() {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-36">
      <ellipse cx="81" cy="98" rx="36" ry="8" fill="#e8eef7" />
      <path
        d="M50 31c5-8 16-13 28-13 9 0 17 3 23 8 4-2 8-3 12-3 11 0 19 7 19 17 0 9-5 15-12 18l-21 28c-5 6-12 9-20 9-5 0-10-1-14-4L44 56c-3-3-5-7-5-12 0-7 4-11 11-13Z"
        fill="#bdeeff"
        stroke="#3f4a56"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M47 54 84 33l43 25-39 23-41-27Z"
        fill="#3f8cff"
        stroke="#3f4a56"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M47 54v8l41 27v-8L47 54Zm80 4v8L88 89v-8l39-23Z"
        fill="#70abff"
        stroke="#3f4a56"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="m56 54 28-16 33 19"
        stroke="#9dd1ff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <ellipse cx="84" cy="51" rx="10" ry="7" fill="#c7f0ff" />
      <circle
        cx="120"
        cy="39"
        r="10"
        fill="#4ba3ff"
        stroke="#3f4a56"
        strokeWidth="2.2"
      />
      <path
        d="M117 39h6M120 36v6"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CountPill({ children }: { children: ReactNode }) {
  return <span className="text-[14px] text-slate-400">{children}</span>;
}

export function DetailCard({
  title,
  badge,
  infoRows,
  metric,
}: {
  title: string;
  badge?: { label: string; className: string } | null;
  infoRows?: { label: string; value: string }[];
  metric?: { label: string; value: string } | null;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-[#eadfcd] bg-gradient-to-br from-[#f9f4ec] via-white to-[#f4f7fb] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[18px] font-semibold text-slate-800">
            {title}
          </h2>
        </div>
        {badge ? (
          <span
            className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
        ) : null}
      </div>

      {infoRows && infoRows.length > 0 ? (
        <div className="space-y-2 text-[13px] text-slate-700">
          {infoRows.map((row) => (
            <div key={row.label}>
              {row.label}: {row.value}
            </div>
          ))}
        </div>
      ) : null}

      {metric ? (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/80 bg-white/80 px-3 py-2 text-[12px] text-slate-600">
          <span>{metric.label}</span>
          <span className="text-[18px] font-semibold text-slate-800">
            {metric.value}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function TableSkeletonLoader({
  columns = 6,
  rows = 5,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs animate-pulse">
      <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3.5 flex items-center gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 rounded-md bg-slate-200/80 ${
              i === 0 ? "w-28" : i === 1 ? "w-44" : "flex-1"
            }`}
          />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="px-4 py-3.5 flex items-center gap-4">
            <div className="h-4 w-24 rounded-md bg-slate-200/70" />
            <div className="h-4 w-40 rounded-md bg-slate-100" />
            <div className="h-4 w-28 rounded-md bg-slate-100" />
            <div className="h-5 w-20 rounded-full bg-slate-200/60" />
            <div className="h-4 flex-1 rounded-md bg-slate-100" />
            <div className="h-6 w-16 rounded-md bg-slate-200/70 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeletonLoader({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 rounded-md bg-slate-200" />
            <div className="h-5 w-16 rounded-full bg-slate-100" />
          </div>
          <div className="h-3 w-48 rounded-md bg-slate-100" />
          <div className="h-3 w-36 rounded-md bg-slate-100" />
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="h-3 w-20 rounded-md bg-slate-100" />
            <div className="h-6 w-24 rounded-xl bg-slate-200/80" />
          </div>
        </div>
      ))}
    </div>
  );
}

