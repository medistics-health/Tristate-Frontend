import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Inbox } from "lucide-react";
import { FormsLayout, formatWhen } from "./chrome";
import { getDocument, getResponse, listResponses, type ResponseRow } from "./api";
import type { FormQuestion } from "./types";

type AnswerValue = {
  valueText?: string | null;
  valueNumber?: number | string | null;
  valueDate?: string | null;
  valueJson?: unknown;
} | null;

type ResponseDetail = Awaited<ReturnType<typeof getResponse>>;

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  return letters || "?";
}

function answerText(value: AnswerValue, display: string | null | undefined, options: { id: string; label: string }[]) {
  if (display) return display;
  if (!value) return "";
  if (value.valueText) return value.valueText;
  if (value.valueNumber !== null && value.valueNumber !== undefined && value.valueNumber !== "") return String(value.valueNumber);
  if (value.valueDate) return formatWhen(value.valueDate);
  const json = value.valueJson;
  if (json && typeof json === "object" && !Array.isArray(json)) {
    const record = json as { optionId?: string; optionIds?: string[]; otherText?: string; amount?: number; frequency?: string };
    if (record.optionId) {
      const label = options.find((option) => option.id === record.optionId)?.label;
      return [label, record.otherText].filter(Boolean).join(": ");
    }
    if (Array.isArray(record.optionIds)) {
      const labels = record.optionIds
        .map((id) => options.find((option) => option.id === id)?.label)
        .filter(Boolean);
      return [...labels, record.otherText].filter(Boolean).join(", ");
    }
    if (record.amount !== undefined && record.amount !== null) {
      return [record.amount, record.frequency].filter(Boolean).join(" ");
    }
  }
  if (Array.isArray(json)) return json.map(String).join(", ");
  return "";
}

export default function FormResponsesPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [optionsByQuestion, setOptionsByQuestion] = useState<Record<string, { id: string; label: string }[]>>({});
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<ResponseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDocument(id)
      .then((form) => {
        if (cancelled) return;
        setTitle(form.title);
        const next: Record<string, { id: string; label: string }[]> = {};
        form.sections.forEach((section) => {
          section.questions.forEach((question: FormQuestion) => {
            next[question.id] = question.options || [];
          });
        });
        setOptionsByQuestion(next);
      })
      .catch((error: Error) => {
        if (!cancelled) toast.error(error.message);
      });
    listResponses(id)
      .then((data) => {
        if (cancelled) return;
        setRows(data.responses);
        setSelectedId((current) => current || data.responses[0]?.id || "");
      })
      .catch((error: Error) => {
        if (!cancelled) toast.error(error.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    getResponse(id, selectedId)
      .then((response) => {
        if (!cancelled) setDetail(response);
      })
      .catch((error: Error) => {
        if (!cancelled) toast.error(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id, selectedId]);

  const selectedRow = useMemo(() => rows.find((row) => row.id === selectedId) || null, [rows, selectedId]);
  const respondent = detail?.respondent || selectedRow?.respondent || "Anonymous";
  const practice = detail?.practice || selectedRow?.practice || "";
  const email = detail?.email || selectedRow?.email || "";

  return (
    <FormsLayout title="Responses" activeSubItem="All Forms">
      <div className="flex h-full min-h-[640px] flex-col gap-2 font-app-sans">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-xs">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate("/forms")}
              className="mb-1 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-1 py-0.5 text-[13px] text-slate-500 transition-colors duration-150 hover:bg-[#f7f5f1] hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Forms
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[18px] font-semibold text-slate-900">{title || "Responses"}</h1>
              <span className="rounded-full bg-[#f4f6ff] px-2 py-0.5 text-[12px] font-medium text-[#3144c4]">
                {rows.length} submitted
              </span>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[300px_minmax(0,1fr)]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
            <div className="border-b border-[#f0ece6] px-4 py-3 text-[12px] font-medium tracking-wide text-slate-400 uppercase">
              Submissions
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {rows.map((row) => {
                const active = row.id === selectedId;
                const name = row.respondent || "Anonymous";
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setSelectedId(row.id)}
                    className={`mb-1 flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-150 ${
                      active ? "bg-[#f4f6ff]" : "hover:bg-[#fbfaf8]"
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${active ? "bg-[#4f63ea] text-white" : "bg-[#f3f0ea] text-slate-600"}`}>
                      {initials(name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-slate-800">{name}</span>
                      <span className="block truncate text-[12px] text-slate-400">
                        {[row.practice || row.email, formatWhen(row.submittedAt)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                );
              })}
              {!loading && rows.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-16 text-center">
                  <Inbox className="mb-2 h-5 w-5 text-slate-300" />
                  <p className="text-[13px] text-slate-400">No responses yet.</p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
            {detail ? (
              <>
                <div className="border-b border-[#f0ece6] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef1ff] text-[13px] font-semibold text-[#3144c4]">
                      {initials(respondent)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-semibold text-slate-900">{respondent}</p>
                      <p className="truncate text-[12px] text-slate-400">
                        {[practice, email, formatWhen(detail.submittedAt)].filter(Boolean).join(" · ") || "No practice"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                  <div className="mx-auto max-w-3xl space-y-3">
                    {detail.answers.map((answer, index) => {
                      const raw = answerText(answer.value, answer.display, optionsByQuestion[answer.questionId] || []);
                      const text = (answer.type === "DATE" || answer.type === "date") && raw ? formatWhen(raw) : raw;
                      return (
                        <div key={answer.questionId} className="rounded-xl border border-[#f0ece6] bg-[#fbfaf8] px-4 py-3">
                          <p className="text-[12px] text-slate-400">{index + 1}. {answer.label}</p>
                          <p className={`mt-1 text-[14px] leading-6 ${text ? "text-slate-800" : "text-slate-400"}`}>
                            {text || "Not answered"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <Inbox className="mb-2 h-5 w-5 text-slate-300" />
                <p className="text-[13px] text-slate-400">{loading ? "Loading responses…" : "Select a response."}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </FormsLayout>
  );
}
