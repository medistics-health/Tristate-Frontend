import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FormsLayout, GhostButton, Panel, formatDay, formatWhen } from "./chrome";
import { useFormStore } from "./store";
import { flattenQuestions, type FormQuestion, type FormRecord } from "./types";

export default function ResultsPage() {
  const { id = "" } = useParams();
  const form = useFormStore().forms.find((item) => item.id === id);
  const [tab, setTab] = useState<"Overview" | "Questions" | "Responses" | "Trends">("Overview");
  const [practice, setPractice] = useState("ALL");
  const [selected, setSelected] = useState(0);
  const [trend, setTrend] = useState<"day" | "week" | "month">("day");

  if (!form) return null;
  const practices = Array.from(new Set(form.responses.map((item) => item.practice).filter(Boolean)));
  const responses = form.responses.filter((item) => practice === "ALL" || item.practice === practice);
  const sent = form.recipients.filter((item) => !["BOUNCED", "REMOVED", "PENDING"].includes(item.status));
  const completed = form.recipients.filter((item) => item.status === "COMPLETED").length;
  const inProgress = form.recipients.filter((item) => item.status === "IN_PROGRESS").length;
  const notOpened = form.recipients.filter((item) => item.status === "NOT_OPENED").length;
  const bounced = form.recipients.filter((item) => item.status === "BOUNCED").length;
  const rate = sent.length ? Math.round((completed / sent.length) * 100) : 0;
  const dropoff = completed + inProgress ? Math.round((inProgress / (completed + inProgress)) * 100) : 0;

  const kpis = [
    ["Total sent", sent.length],
    ["Responded", completed],
    ["Completion rate", `${rate}%`],
    ["In progress", inProgress],
    ["Not opened", notOpened],
    ["Bounced", bounced],
    ["Drop-off", `${dropoff}%`],
  ];

  return (
    <FormsLayout title="Results" activeSubItem="All Forms">
      <div className="space-y-4 font-app-sans">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link to={`/forms/${form.id}`} className="text-[13px] text-[#4f63ea]">{form.refCode}</Link>
            <h1 className="text-[22px] font-semibold text-slate-800">{form.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={practice} onChange={(event) => setPractice(event.target.value)} className="h-10 rounded-lg border border-[#ece8e1] bg-white px-3 text-[13px]">
              <option value="ALL">All practices</option>
              {practices.map((item) => <option key={item}>{item}</option>)}
            </select>
            <GhostButton onClick={() => toast.success("CSV export started")}>CSV</GhostButton>
            <GhostButton onClick={() => toast.success("Excel export started")}>Excel</GhostButton>
            <GhostButton onClick={() => toast.success("PDF report started")}>PDF</GhostButton>
          </div>
        </div>
        {practice !== "ALL" ? (
          <button type="button" onClick={() => setPractice("ALL")} className="rounded-full bg-[#eef2ff] px-3 py-1 text-[12px] text-[#3144c4]">
            Practice: {practice} ×
          </button>
        ) : null}
        <div className="flex gap-2">
          {(["Overview", "Questions", "Responses", "Trends"] as const).map((item) => (
            <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${tab === item ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-[#ece8e1]"}`}>
              {item}
            </button>
          ))}
        </div>
        {tab === "Overview" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map(([label, value]) => (
                <Panel key={label} className="px-4 py-3">
                  <p className="text-[12px] text-slate-400">{label}</p>
                  <p className="mt-1 text-[24px] font-semibold text-slate-800">{value}</p>
                </Panel>
              ))}
            </div>
            <Panel className="overflow-hidden">
              <div className="px-4 py-3 text-[14px] font-semibold">By practice</div>
              <table className="w-full text-left text-[13px]">
                <thead className="text-[12px] uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Practice</th>
                    <th className="px-4 py-2">Responses</th>
                    <th className="px-4 py-2">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {practiceRows(form).map((row) => (
                    <tr key={row.name} className="border-t border-[#f3f0ea]">
                      <td className="px-4 py-2">
                        <button type="button" className="text-[#4f63ea]" onClick={() => setPractice(row.name)}>{row.name}</button>
                      </td>
                      <td className="px-4 py-2">{row.responses}</td>
                      <td className="px-4 py-2">{row.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </>
        ) : null}
        {tab === "Questions" ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {flattenQuestions(form).filter((item) => item.question.type !== "content").map(({ question }) => (
              <QuestionCard key={question.id} question={question} form={form} responses={responses} />
            ))}
          </div>
        ) : null}
        {tab === "Responses" ? (
          <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Panel className="overflow-hidden">
              {responses.map((response, index) => (
                <button key={response.id} type="button" onClick={() => setSelected(index)} className={`block w-full border-b border-[#f3f0ea] px-4 py-3 text-left ${selected === index ? "bg-[#f7f8ff]" : ""}`}>
                  <span className="block text-[13px] font-medium">{form.responseMode === "ANONYMOUS" ? "Anonymous" : response.respondent}</span>
                  <span className="text-[12px] text-slate-400">{response.practice || "No practice"} · {formatDay(response.submittedAt)}</span>
                </button>
              ))}
              {responses.length === 0 ? <p className="p-4 text-[13px] text-slate-400">No responses in this filter.</p> : null}
            </Panel>
            {responses[selected] ? (
              <Panel className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[16px] font-semibold">{form.responseMode === "ANONYMOUS" ? "Anonymous response" : responses[selected].respondent}</p>
                    <p className="text-[12px] text-slate-400">{formatWhen(responses[selected].submittedAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <GhostButton disabled={selected === 0} onClick={() => setSelected((value) => value - 1)}>Previous</GhostButton>
                    <GhostButton disabled={selected >= responses.length - 1} onClick={() => setSelected((value) => value + 1)}>Next</GhostButton>
                  </div>
                </div>
                <div className="space-y-4">
                  {flattenQuestions(form).map(({ question }, index) => (
                    <div key={question.id}>
                      <p className="text-[12px] text-slate-400">{index + 1}. {question.label}</p>
                      <p className="text-[14px] text-slate-800">{displayAnswer(responses[selected].answers[question.id]) || "Not answered"}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
          </div>
        ) : null}
        {tab === "Trends" ? (
          <Panel className="p-4">
            <div className="mb-4 flex gap-2">
              {(["day", "week", "month"] as const).map((item) => (
                <button key={item} type="button" onClick={() => setTrend(item)} className={`rounded-full px-3 py-1 text-[12px] capitalize ${trend === item ? "bg-[#4f63ea] text-white" : "bg-[#f7f5f1]"}`}>{item}</button>
              ))}
            </div>
            <TrendChart responses={responses} mode={trend} />
          </Panel>
        ) : null}
      </div>
    </FormsLayout>
  );
}

function practiceRows(form: FormRecord) {
  const names = Array.from(new Set(form.recipients.map((item) => item.practice).filter(Boolean)));
  return names.map((name) => {
    const recipients = form.recipients.filter((item) => item.practice === name && !["BOUNCED", "REMOVED", "PENDING"].includes(item.status));
    const responses = form.responses.filter((item) => item.practice === name).length;
    const shown = responses < 3 && form.responseMode === "ANONYMOUS" ? "—" : responses;
    return {
      name,
      responses: shown,
      rate: recipients.length ? Math.round((responses / recipients.length) * 100) : 0,
    };
  });
}

function displayAnswer(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.join("; ");
  return value || "";
}

function QuestionCard({ question, responses }: { question: FormQuestion; form: FormRecord; responses: FormRecord["responses"] }) {
  const values = responses.map((item) => item.answers[question.id]).filter((value) => value && !(Array.isArray(value) && value.length === 0));
  const skipped = responses.length - values.length;
  const counts = new Map<string, number>();
  values.forEach((value) => {
    const items = Array.isArray(value) ? value : [value];
    items.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
  });
  const rows = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...rows.map((row) => row[1]), 1);
  const numeric = values.map((value) => Number(Array.isArray(value) ? value[0] : value)).filter((value) => !Number.isNaN(value));
  return (
    <Panel className="p-4">
      <p className="text-[14px] font-semibold text-slate-800">{question.label}</p>
      <p className="mt-1 text-[12px] text-slate-400">n = {values.length} answered · {skipped} skipped</p>
      {numeric.length && (question.type === "rating" || question.type === "number" || question.type === "price" || question.type === "fees") ? (
        <p className="mt-2 text-[13px] text-slate-600">
          Avg {average(numeric)} · Median {median(numeric)} · Min {Math.min(...numeric)} · Max {Math.max(...numeric)}
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        {rows.slice(0, 6).map(([label, count]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-[12px]">
              <span>{label}</span>
              <span>{count} · {values.length ? Math.round((count / values.length) * 100) : 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#f3f0ea]">
              <div className="h-full rounded-full bg-[#4f63ea]" style={{ width: `${(count / max) * 100}%` }} />
            </div>
          </div>
        ))}
        {question.type === "long_text" || question.type === "short_text" ? (
          <ul className="space-y-1 text-[13px] text-slate-600">
            {values.slice(0, 4).map((value, index) => <li key={index}>“{displayAnswer(value)}”</li>)}
          </ul>
        ) : null}
      </div>
    </Panel>
  );
}

function TrendChart({ responses, mode }: { responses: FormRecord["responses"]; mode: "day" | "week" | "month" }) {
  const buckets = useMemo(() => {
    const map = new Map<string, number>();
    responses.forEach((response) => {
      const date = new Date(response.submittedAt);
      const key = mode === "month"
        ? `${date.getFullYear()}-${date.getMonth() + 1}`
        : mode === "week"
          ? `${date.getFullYear()}-W${Math.ceil(date.getDate() / 7)}`
          : date.toLocaleDateString();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [mode, responses]);
  const max = Math.max(...buckets.map((item) => item[1]), 1);
  return (
    <div className="flex h-48 items-end gap-3">
      {buckets.map(([label, count]) => (
        <div key={label} className="flex flex-1 flex-col items-center gap-2">
          <div className="w-full rounded-t-lg bg-[#4f63ea]" style={{ height: `${(count / max) * 140}px` }} />
          <span className="text-[11px] text-slate-400">{label}</span>
        </div>
      ))}
      {buckets.length === 0 ? <p className="text-[13px] text-slate-400">No submissions in this range.</p> : null}
    </div>
  );
}

function average(values: number[]) {
  return (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1);
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1);
}
