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
