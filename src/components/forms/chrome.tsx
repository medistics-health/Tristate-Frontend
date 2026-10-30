import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import AppLayout from "../layout/AppLayout";
import { ClipboardList } from "lucide-react";
import type { FormStatus, RecipientStatus } from "./types";
import { statusLabel } from "./types";

export function FormsLayout({
  title,
  activeSubItem,
  actions,
  children,
}: {
  title: string;
  activeSubItem: string;
  actions?: { label: string; icon?: ReactNode; onClick: () => void }[];
  children: ReactNode;
}) {
  return (
    <AppLayout
      title={title}
      activeModule="Forms"
      activeSubItem={activeSubItem}
      navbarIcon={<ClipboardList className="h-4 w-4" />}
      navbarActions={actions}
    >
      {children}
    </AppLayout>
  );
}

export function StatusPill({ status, scheduled = false }: { status: FormStatus; scheduled?: boolean }) {
  const styles: Record<FormStatus, string> = {
    DRAFT: "bg-[#f3f0ea] text-slate-600",
    PUBLISHED: "bg-[#e7f6ee] text-[#1f7a45]",
    CLOSED: "bg-[#fff1bd] text-[#8a6800]",
    ARCHIVED: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium ${styles[status]}`}>
      {statusLabel(status, scheduled)}
    </span>
  );
}

export function RecipientPill({ status }: { status: RecipientStatus }) {
  const styles: Record<RecipientStatus, string> = {
    PENDING: "bg-slate-100 text-slate-600",
    NOT_OPENED: "bg-[#eef2ff] text-[#3d4db5]",
    IN_PROGRESS: "bg-[#fff1bd] text-[#8a6800]",
    COMPLETED: "bg-[#e7f6ee] text-[#1f7a45]",
    BOUNCED: "bg-[#fde8e8] text-[#b42318]",
    EXPIRED: "bg-slate-100 text-slate-500",
    REMOVED: "bg-slate-100 text-slate-400",
  };
  const labels: Record<RecipientStatus, string> = {
    PENDING: "Pending",
    NOT_OPENED: "Not opened",
    IN_PROGRESS: "In progress",
    COMPLETED: "Completed",
    BOUNCED: "Bounced",
    EXPIRED: "Expired",
    REMOVED: "Removed",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDay(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#ece8e1] bg-white ${className}`}>{children}</div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-[12px] font-medium text-slate-500">{children}</label>;
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-[#e4dfd6] bg-white px-3 py-2 text-[13px] text-slate-700 outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#9cb1f6] focus:ring-2 focus:ring-[#4f63ea]/10 ${props.className || ""}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-[#e4dfd6] bg-white px-3 py-2 text-[13px] text-slate-700 outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#9cb1f6] focus:ring-2 focus:ring-[#4f63ea]/10 ${props.className || ""}`}
    />
  );
}

type BufferedCommit = {
  value: string;
  onCommit: (value: string) => void;
  delay?: number;
};

function useBufferedDraft(value: string, onCommit: (value: string) => void, delay = 120) {
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const commitRef = useRef(onCommit);
  const valueRef = useRef(value);
  commitRef.current = onCommit;
  valueRef.current = value;

  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === valueRef.current) return;
    const timer = window.setTimeout(() => commitRef.current(draft), delay);
    return () => window.clearTimeout(timer);
  }, [draft, delay]);

  return {
    draft,
    setDraft,
    onFocus() {
      focused.current = true;
    },
    onBlur() {
      focused.current = false;
      if (draft !== valueRef.current) commitRef.current(draft);
    },
  };
}

export function BufferedInput({
  value,
  onCommit,
  delay,
  onFocus,
  onBlur,
  onChange,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & BufferedCommit) {
  const field = useBufferedDraft(value, onCommit, delay);
  return (
    <TextInput
      {...props}
      value={field.draft}
      onFocus={(event) => {
        field.onFocus();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        field.onBlur();
        onBlur?.(event);
      }}
      onChange={(event) => {
        field.setDraft(event.target.value);
        onChange?.(event);
      }}
    />
  );
}

export function BufferedTextArea({
  value,
  onCommit,
  delay,
  onFocus,
  onBlur,
  onChange,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & BufferedCommit) {
  const field = useBufferedDraft(value, onCommit, delay);
  return (
    <TextArea
      {...props}
      value={field.draft}
      onFocus={(event) => {
        field.onFocus();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        field.onBlur();
        onBlur?.(event);
      }}
      onChange={(event) => {
        field.setDraft(event.target.value);
        onChange?.(event);
      }}
    />
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#4f63ea] px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition-[background-color,transform,box-shadow] duration-150 ease-out hover:bg-[#4254d0] hover:shadow active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f63ea]/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition-[background-color,border-color,transform,box-shadow] duration-150 ease-out hover:border-[#e0dbd3] hover:bg-[#f7f5f1] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f63ea]/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${className}`}
    >
      {children}
    </button>
  );
}
