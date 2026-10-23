import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FormsLayout, GhostButton, Panel, PrimaryButton, TextInput } from "./chrome";
import { addRecipientEmails, getDocument, publishForm } from "./api";
import { getAllPractices } from "../../services/operations/practices";
import { getPersonsView } from "../../services/operations/persons";

type Choice = { id: string; label: string; detail: string };

export default function SendFormPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("");
  const [practiceQuery, setPracticeQuery] = useState("");
  const [personQuery, setPersonQuery] = useState("");
  const [practices, setPractices] = useState<Choice[]>([]);
  const [people, setPeople] = useState<Choice[]>([]);
  const [practiceIds, setPracticeIds] = useState<string[]>([]);
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getDocument(id)
      .then((form) => {
        setTitle(form.title);
        setStatus(form.status);
      })
      .catch((error: Error) => toast.error(error.message));
  }, [id]);

  useEffect(() => {
    getAllPractices()
      .then((rows) => setPractices(rows.map((practice) => ({ id: practice.id, label: practice.name, detail: practice.company?.name || "" }))))
      .catch((error: Error) => toast.error(error.message));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getPersonsView({ search: personQuery, limit: 40, page: 1 })
        .then((view) => {
          setPeople(
            view.rows
              .map((row) => ({
                id: String(row.values.id || ""),
                label: String(row.values.fullName || ""),
                detail: String(row.values.email || ""),
              }))
              .filter((person) => person.id && person.detail),
          );
        })
        .catch((error: Error) => toast.error(error.message));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [personQuery]);

  const visiblePractices = practices.filter((practice) => practice.label.toLowerCase().includes(practiceQuery.toLowerCase()));

  function toggle(list: string[], value: string, setList: (next: string[]) => void) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function send() {
    if (!practiceIds.length && !personIds.length) {
      toast.error("Choose at least one practice or person.");
      return;
    }
    setSending(true);
    try {
      await addRecipientEmails(id, [], practiceIds, personIds, false);
      if (status === "DRAFT") await publishForm(id);
      toast.success(status === "DRAFT" ? "Form sent." : "Recipients added.");
      navigate(`/forms/${id}/responses`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send this form.");
    } finally {
      setSending(false);
    }
  }

  return (
    <FormsLayout title="Send form" activeSubItem="All Forms">
      <div className="mx-auto max-w-5xl space-y-4 font-app-sans">
        <div className="flex items-end justify-between gap-3">
          <div>
            <Link to="/forms" className="text-[13px] text-[#4f63ea]">Forms</Link>
            <h1 className="text-[20px] font-semibold text-slate-800">{title || "Send form"}</h1>
            <p className="text-[13px] text-slate-500">Choose practices, people, or both. Each person needs an email.</p>
          </div>
          <PrimaryButton disabled={sending} onClick={send}>
            {sending ? "Sending…" : `Send to ${practiceIds.length + personIds.length || ""}`.trim()}
          </PrimaryButton>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Picker
            title="Practices"
            query={practiceQuery}
            onQuery={setPracticeQuery}
            rows={visiblePractices}
            selected={practiceIds}
            onToggle={(value) => toggle(practiceIds, value, setPracticeIds)}
          />
          <Picker
            title="People"
            query={personQuery}
            onQuery={setPersonQuery}
            rows={people}
            selected={personIds}
            onToggle={(value) => toggle(personIds, value, setPersonIds)}
          />
        </div>
        <GhostButton onClick={() => navigate("/forms")}>Cancel</GhostButton>
      </div>
    </FormsLayout>
  );
}

function Picker({
  title,
  query,
  onQuery,
  rows,
  selected,
  onToggle,
}: {
  title: string;
  query: string;
  onQuery: (value: string) => void;
  rows: Choice[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <Panel className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        <span className="text-[12px] text-slate-400">{selected.length} selected</span>
      </div>
      <TextInput value={query} onChange={(event) => onQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} />
      <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
        {rows.map((row) => (
          <label key={row.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#f7f5f1]">
            <input type="checkbox" checked={selected.includes(row.id)} onChange={() => onToggle(row.id)} />
            <span className="min-w-0 flex-1">
              <span className="block text-slate-800">{row.label}</span>
              {row.detail ? <span className="text-[12px] text-slate-400">{row.detail}</span> : null}
            </span>
          </label>
        ))}
        {rows.length === 0 ? <p className="px-2 py-6 text-[13px] text-slate-400">No matches.</p> : null}
      </div>
    </Panel>
  );
}
