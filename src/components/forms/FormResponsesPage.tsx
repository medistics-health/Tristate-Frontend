import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FormsLayout, Panel, formatWhen } from "./chrome";
import { getDocument, getResponse, listResponses, type ResponseRow } from "./api";

function answerText(value: {
  valueText?: string | null;
  valueNumber?: number | string | null;
  valueDate?: string | null;
  valueJson?: unknown;
} | null) {
  if (!value) return "Not answered";
  if (value.valueText) return value.valueText;
  if (value.valueNumber !== null && value.valueNumber !== undefined && value.valueNumber !== "") return String(value.valueNumber);
  if (value.valueDate) return String(value.valueDate).slice(0, 10);
  if (Array.isArray(value.valueJson)) return value.valueJson.map(String).join(", ");
  if (value.valueJson && typeof value.valueJson === "object") return JSON.stringify(value.valueJson);
  return "Not answered";
}

export default function FormResponsesPage() {
  const { id = "" } = useParams();
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<ResponseRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof getResponse>> | null>(null);

  useEffect(() => {
    getDocument(id)
      .then((form) => setTitle(form.title))
      .catch((error: Error) => toast.error(error.message));
    listResponses(id)
      .then((data) => {
        setRows(data.responses);
        if (data.responses[0]) setSelectedId(data.responses[0].id);
      })
      .catch((error: Error) => toast.error(error.message));
  }, [id]);

  useEffect(() => {
    if (!selectedId) return;
    getResponse(id, selectedId)
      .then(setDetail)
      .catch((error: Error) => toast.error(error.message));
  }, [id, selectedId]);

  return (
    <FormsLayout title="Responses" activeSubItem="All Forms">
      <div className="space-y-4 font-app-sans">
        <div>
          <Link to="/forms" className="text-[13px] text-[#4f63ea]">Forms</Link>
          <h1 className="text-[20px] font-semibold text-slate-800">{title || "Responses"}</h1>
          <p className="text-[13px] text-slate-500">{rows.length} submitted</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Panel className="overflow-hidden">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={`block w-full border-b border-[#f3f0ea] px-4 py-3 text-left ${selectedId === row.id ? "bg-[#f7f8ff]" : ""}`}
              >
                <span className="block text-[13px] font-medium">{row.respondent || "Anonymous"}</span>
                <span className="text-[12px] text-slate-400">{row.practice || row.email || "—"} · {formatWhen(row.submittedAt)}</span>
              </button>
            ))}
            {rows.length === 0 ? <p className="p-4 text-[13px] text-slate-400">No responses yet.</p> : null}
          </Panel>
          <Panel className="p-5">
            {detail ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[16px] font-semibold">{detail.respondent || "Anonymous"}</p>
                  <p className="text-[12px] text-slate-400">{detail.practice || "No practice"} · {formatWhen(detail.submittedAt)}</p>
                </div>
                {detail.answers.map((answer, index) => (
                  <div key={answer.questionId}>
                    <p className="text-[12px] text-slate-400">{index + 1}. {answer.label}</p>
                    <p className="text-[14px] text-slate-800">{answerText(answer.value)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-slate-400">Select a response.</p>
            )}
          </Panel>
        </div>
      </div>
    </FormsLayout>
  );
}
