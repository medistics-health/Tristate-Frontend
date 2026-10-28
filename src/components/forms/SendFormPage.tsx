import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Building2, Check, Search, Users, X } from "lucide-react";
import { FormsLayout, GhostButton, PrimaryButton } from "./chrome";
import { getDocument, sendFormEmails } from "./api";
import { getAllPractices } from "../../services/operations/practices";
import { getPersonsView } from "../../services/operations/persons";

type Choice = { id: string; label: string; detail: string; selectable: boolean };

export default function SendFormPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [practiceQuery, setPracticeQuery] = useState("");
  const [personQuery, setPersonQuery] = useState("");
  const [practices, setPractices] = useState<Choice[]>([]);
  const [people, setPeople] = useState<Choice[]>([]);
  const [knownPeople, setKnownPeople] = useState<Choice[]>([]);
  const [practiceIds, setPracticeIds] = useState<string[]>([]);
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [peopleLoading, setPeopleLoading] = useState(true);

  useEffect(() => {
    getDocument(id)
      .then((form) => {
        setTitle(form.title);
      })
      .catch((error: Error) => toast.error(error.message));
  }, [id]);

  useEffect(() => {
    getAllPractices()
      .then((rows) => setPractices(rows.map((practice) => {
        const email = practiceEmails(practice);
        return {
          id: practice.id,
          label: practice.name,
          detail: email || "No email",
          selectable: Boolean(email),
        };
      })))
      .catch((error: Error) => toast.error(error.message));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPeopleLoading(true);
      getPersonsView({ search: personQuery, limit: 40, page: 1 })
        .then((view) => {
          const next = view.rows
            .map((row) => {
              const email = String(row.values.email || "").trim();
              return {
                id: String(row.values.id || ""),
                label: String(row.values.fullName || ""),
                detail: email || "No email",
                selectable: Boolean(email),
              };
            })
            .filter((person) => person.id);
          setPeople(next);
          setKnownPeople((current) => {
            const merged = new Map(current.map((person) => [person.id, person]));
            next.forEach((person) => merged.set(person.id, person));
            return [...merged.values()];
          });
        })
        .catch((error: Error) => toast.error(error.message))
        .finally(() => setPeopleLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [personQuery]);

  const visiblePractices = practices.filter((practice) => {
    const query = practiceQuery.trim().toLowerCase();
    if (!query) return true;
    return practice.label.toLowerCase().includes(query) || practice.detail.toLowerCase().includes(query);
  });
  const total = practiceIds.length + personIds.length;
  const selectedPractices = practices.filter((practice) => practiceIds.includes(practice.id));
  const selectedPeople = knownPeople.filter((person) => personIds.includes(person.id));

  function toggle(list: string[], value: string, setList: (next: string[]) => void, selectable = true) {
    if (!selectable && !list.includes(value)) return;
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function send() {
    if (!total) {
      toast.error("Choose at least one practice or person.");
      return;
    }
    setSending(true);
    try {
      const practiceTargets = practiceIds.filter((practiceId) => practices.some((practice) => practice.id === practiceId && practice.selectable));
      const personTargets = personIds.filter((personId) => knownPeople.some((person) => person.id === personId && person.selectable));
      if (!practiceTargets.length && !personTargets.length) {
        toast.error("Choose at least one practice or person with an email.");
        return;
      }
      const delivery = await sendFormEmails(id, practiceTargets, personTargets);
      const sent = delivery.sent ?? 0;
      const failed = delivery.failed ?? 0;
      if (!sent) {
        throw new Error(delivery.errors?.[0] || "The form email could not be sent.");
      }
      if (failed) toast.error(`Sent ${sent}. ${failed} could not be delivered.`);
      else toast.success(`Sent to ${sent}.`);
      navigate(`/forms/${id}/responses`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send this form.");
    } finally {
      setSending(false);
    }
  }

  return (
    <FormsLayout title="Send form" activeSubItem="All Forms">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-3 py-4 font-app-sans sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => navigate(`/forms/${id}`)}
              className="mb-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-1 py-0.5 text-[13px] text-slate-500 transition-colors duration-150 hover:bg-white hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to form
            </button>
            <h1 className="truncate text-[22px] font-semibold tracking-tight text-slate-900">{title || "Send form"}</h1>
            <p className="mt-1 text-[13px] text-slate-500">Choose practices, people, or both. Anyone without an email cannot be selected.</p>
          </div>
          <div className="flex items-center gap-2">
            <GhostButton onClick={() => navigate("/forms")} disabled={sending}>Cancel</GhostButton>
            <PrimaryButton disabled={sending || total === 0} onClick={() => void send()}>
              {sending ? "Sending…" : total ? `Send to ${total}` : "Send"}
            </PrimaryButton>
          </div>
        </div>

        {total > 0 ? (
          <div className="flex max-h-24 shrink-0 flex-wrap items-center gap-2 overflow-y-auto">
            {selectedPractices.map((practice) => (
              <Chip key={practice.id} label={practice.label} onRemove={() => toggle(practiceIds, practice.id, setPracticeIds)} />
            ))}
            {selectedPeople.map((person) => (
              <Chip key={person.id} label={person.label} onRemove={() => toggle(personIds, person.id, setPersonIds)} />
            ))}
          </div>
        ) : null}

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Picker
            title="Practices"
            icon={<Building2 className="h-4 w-4" />}
            query={practiceQuery}
            onQuery={setPracticeQuery}
            placeholder="Search practices"
            rows={visiblePractices}
            selected={practiceIds}
            onToggle={(value) => {
              const practice = practices.find((item) => item.id === value);
              toggle(practiceIds, value, setPracticeIds, practice?.selectable !== false);
            }}
            onClear={() => setPracticeIds([])}
            empty="No practices match that search."
          />
          <Picker
            title="People"
            icon={<Users className="h-4 w-4" />}
            query={personQuery}
            onQuery={setPersonQuery}
            placeholder="Search people"
            rows={people}
            selected={personIds}
            onToggle={(value) => {
              const person = people.find((item) => item.id === value) || knownPeople.find((item) => item.id === value);
              toggle(personIds, value, setPersonIds, person?.selectable !== false);
            }}
            onClear={() => setPersonIds([])}
            loading={peopleLoading}
            empty="No people match that search."
            showAvatar
          />
        </div>
      </div>
    </FormsLayout>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#d9def8] bg-[#f4f6ff] py-1 pr-1 pl-2.5 text-[12px] font-medium text-[#3144c4]">
      <span className="max-w-40 truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="cursor-pointer rounded-full p-0.5 text-[#3144c4] transition-colors duration-150 hover:bg-[#e4e9ff]"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function Picker({
  title,
  icon,
  query,
  onQuery,
  placeholder,
  rows,
  selected,
  onToggle,
  onClear,
  empty,
  loading = false,
  showAvatar = false,
}: {
  title: string;
  icon: ReactNode;
  query: string;
  onQuery: (value: string) => void;
  placeholder: string;
  rows: Array<Choice & { selectable?: boolean }>;
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  empty: string;
  loading?: boolean;
  showAvatar?: boolean;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-[#ece8e1] bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#f0ece6] px-4 py-3">
        <div className="flex items-center gap-2 text-slate-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f4f6ff] text-[#4f63ea]">{icon}</span>
          <h2 className="text-[14px] font-semibold">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${selected.length ? "bg-[#eef2ff] text-[#3144c4]" : "bg-[#f3f0ea] text-slate-500"}`}>
            {selected.length} selected
          </span>
          {selected.length ? (
            <button type="button" onClick={onClear} className="cursor-pointer text-[12px] font-medium text-slate-500 transition-colors duration-150 hover:text-slate-800">
              Clear
            </button>
          ) : null}
        </div>
      </div>
      <div className="border-b border-[#f0ece6] px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-[#e4dfd6] bg-[#fbfaf8] py-2 pr-3 pl-9 text-[13px] text-slate-700 outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-[#9cb1f6] focus:bg-white focus:ring-2 focus:ring-[#4f63ea]/10"
          />
        </div>
      </div>
      <div className="h-80 space-y-1 overflow-y-auto overscroll-contain p-2">
        {rows.map((row) => {
          const checked = selected.includes(row.id);
          const disabled = row.selectable === false;
          return (
            <button
              key={row.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onToggle(row.id)}
              className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors duration-150 ${
                disabled
                  ? "cursor-not-allowed border-transparent opacity-50"
                  : checked
                    ? "cursor-pointer border-[#d9def8] bg-[#f7f8ff]"
                    : "cursor-pointer border-transparent hover:bg-[#fbfaf8]"
              }`}
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-150 ${checked ? "border-[#4f63ea] bg-[#4f63ea] text-white" : "border-[#d5cfc6] bg-white"}`}>
                {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
              </span>
              {showAvatar ? (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f3f0ea] text-[11px] font-semibold text-slate-600">
                  {initials(row.label)}
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-slate-800">{row.label}</span>
                {row.detail ? <span className="block truncate text-[12px] text-slate-400">{row.detail}</span> : null}
              </span>
            </button>
          );
        })}
        {!loading && rows.length === 0 ? <p className="px-3 py-10 text-center text-[13px] text-slate-400">{empty}</p> : null}
        {loading && rows.length === 0 ? <p className="px-3 py-10 text-center text-[13px] text-slate-400">Loading…</p> : null}
      </div>
    </section>
  );
}

function practiceEmails(practice: { emails?: string[] | null; company?: { email?: string | null } | null }) {
  const emails = [
    ...(Array.isArray(practice.emails) ? practice.emails : []),
    practice.company?.email || "",
  ].map((email) => email.trim()).filter(Boolean);
  return [...new Set(emails)].join(", ");
}

function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  return letters || "?";
}
