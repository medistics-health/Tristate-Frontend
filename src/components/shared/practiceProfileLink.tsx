import { ArrowRight } from "lucide-react";

export function practiceProfilePath(practiceId: string) {
  return `/practice/${practiceId}/profile`;
}

const PRACTICE_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function practiceOptionHref(option: {
  value?: string | null;
  href?: string;
}) {
  if (option.href) return option.href;
  const practiceId = String(option.value || "").trim();
  return PRACTICE_ID_RE.test(practiceId)
    ? practiceProfilePath(practiceId)
    : undefined;
}

export function openPracticeProfile(practiceId: string) {
  const href = practiceOptionHref({ value: practiceId });
  if (!href) return;
  window.open(href, "_blank", "noopener,noreferrer");
}

export function PracticeProfileArrow({
  practiceId,
  href,
  label,
}: {
  practiceId?: string;
  href?: string;
  label?: string;
}) {
  const target = href || (practiceId ? practiceProfilePath(practiceId) : "");
  if (!target) return null;

  return (
    <button
      type="button"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        window.open(target, "_blank", "noopener,noreferrer");
      }}
      className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#4f63ea]"
      aria-label={label ? `Open ${label} profile` : "Open practice profile"}
      title="Open practice profile"
    >
      <ArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}
