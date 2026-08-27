export const PRACTICE_SERVICE_LINE_OPTIONS = [
  { label: "HR", value: "HR" },
  { label: "Benefits", value: "BENEFITS" },
  { label: "Credentialing", value: "CREDENTIALING" },
  { label: "RCM", value: "RCM" },
  { label: "CCM", value: "CCM" },
  { label: "VBC", value: "VBC" },
  { label: "Back Office", value: "BACK_OFFICE" },
  { label: "Compliance", value: "COMPLIANCE" },
  { label: "MSP/IT", value: "MSP_IT" },
  { label: "EMR", value: "EMR" },
  { label: "Syngate", value: "SYNGATE" },
  { label: "Sales", value: "SALES" },
  { label: "Credit Cards", value: "CREDIT_CARDS" },
] as const;

export type PracticeServiceLine =
  (typeof PRACTICE_SERVICE_LINE_OPTIONS)[number]["value"];

export function formatPracticeServiceLine(value: string) {
  return (
    PRACTICE_SERVICE_LINE_OPTIONS.find((option) => option.value === value)
      ?.label ?? value
  );
}

export function parsePracticeServiceLines(value: unknown): PracticeServiceLine[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const allowed = new Set<string>(
    PRACTICE_SERVICE_LINE_OPTIONS.map((option) => option.value),
  );

  return [
    ...new Set(
      values
        .map((item) => String(item).trim())
        .filter((item): item is PracticeServiceLine => allowed.has(item)),
    ),
  ];
}
