import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FieldLabel, FormsLayout, GhostButton, Panel, PrimaryButton, RecipientPill, BufferedInput, BufferedTextArea, TextArea, TextInput, formatWhen } from "./chrome";
import { makeRecipient, publishForm, setRecipients, updateForm, updateRecipient, useFormStore } from "./store";
import type { FormRecipient, RecipientSource } from "./types";

const PRACTICES = [
  { name: "Riverside Family Medicine", email: "admin@riverside.example", people: ["Ava Chen", "Sofia Nguyen"] },
  { name: "Oak Street Pediatrics", email: "office@oakstreet.example", people: ["Noah Patel", "Ethan Cole"] },
  { name: "Harbor Dental Group", email: "hello@harbor.example", people: ["Mia Alvarez", "Priya Shah"] },
  { name: "Northwind Cardiology", email: "desk@northwind.example", people: ["Liam Brooks"] },
];

const PEOPLE = [
  { name: "Ava Chen", email: "ava.chen@riverside.example", practice: "Riverside Family Medicine" },
  { name: "Noah Patel", email: "noah.patel@oakstreet.example", practice: "Oak Street Pediatrics" },
  { name: "Mia Alvarez", email: "mia.alvarez@harbor.example", practice: "Harbor Dental Group" },
  { name: "Liam Brooks", email: "liam.brooks@northwind.example", practice: "Northwind Cardiology" },
  { name: "Jordan Hale", email: "", practice: "Riverside Family Medicine" },
];

const STEPS = ["Recipients", "Delivery", "Reminders", "Review", "Tracker"] as const;

export default function DistributionPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const form = useFormStore().forms.find((item) => item.id === id);
  const [step, setStep] = useState<(typeof STEPS)[number]>("Recipients");
  const [practiceQuery, setPracticeQuery] = useState("");
  const [selectedPractices, setSelectedPractices] = useState<string[]>([]);
  const [includePeople, setIncludePeople] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [manual, setManual] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const draftRecipients = useMemo(() => {
    if (!form) return [];
    const next: FormRecipient[] = [...form.recipients];
    selectedPractices.forEach((name) => {
      const practice = PRACTICES.find((item) => item.name === name);
      if (!practice) return;
      next.push(makeRecipient({
        source: "PRACTICE",
        practice: practice.name,
        name: practice.name,
        email: practice.email,
        status: "PENDING",
        delivery: "QUEUED",
        sentAt: null,
        openedAt: null,
        completedAt: null,
      }));
      if (includePeople) {
        PEOPLE.filter((person) => person.practice === practice.name && person.email).forEach((person) => {
          next.push(makeRecipient({
            source: "PERSON",
            practice: person.practice,
            name: person.name,
            email: person.email,
            status: "PENDING",
            delivery: "QUEUED",
            sentAt: null,
            openedAt: null,
            completedAt: null,
          }));
        });
      }
    });
    selectedPeople.forEach((email) => {
      const person = PEOPLE.find((item) => item.email === email);
      if (!person) return;
      next.push(makeRecipient({
        source: "PERSON",
        practice: person.practice,
        name: person.name,
        email: person.email,
        status: "PENDING",
        delivery: "QUEUED",
        sentAt: null,
        openedAt: null,
        completedAt: null,
      }));
    });
    manual.split(/[\n,]/).map((item) => item.trim()).filter(Boolean).forEach((email) => {
      next.push(makeRecipient({
        source: "NEW_EMAIL",
        practice: "",
        name: email,
        email,
        status: "PENDING",
        delivery: "QUEUED",
        sentAt: null,
        openedAt: null,
        completedAt: null,
      }));
    });
    return dedupe(next);
  }, [form, includePeople, manual, selectedPeople, selectedPractices]);

  if (!form) return null;

  const missingEmail = PEOPLE.filter((person) => selectedPeople.includes(person.name) && !person.email);
  const tracker = form.recipients.filter((recipient) => statusFilter === "ALL" || recipient.status === statusFilter);

  return (
    <FormsLayout title="Distribute" activeSubItem="All Forms">
      <div className="mx-auto max-w-5xl space-y-4 font-app-sans">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to={`/forms/${form.id}`} className="text-[13px] text-[#4f63ea]">{form.title}</Link>
            <h1 className="text-[20px] font-semibold text-slate-800">Distribution</h1>
          </div>
          <GhostButton onClick={() => navigate(`/forms/${form.id}`)}>Back to builder</GhostButton>
        </div>
        <div className="flex flex-wrap gap-2">
          {STEPS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStep(item)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${step === item ? "bg-[#4f63ea] text-white" : "bg-white text-slate-600 border border-[#ece8e1]"}`}
            >
              {item}
            </button>
          ))}
        </div>

        {step === "Recipients" ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel className="p-4">
              <h2 className="text-[14px] font-semibold">Practices</h2>
              <TextInput value={practiceQuery} onChange={(event) => setPracticeQuery(event.target.value)} placeholder="Search practices" className="mt-3" />
              <label className="mt-3 flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={selectedPractices.length === PRACTICES.length}
                  onChange={(event) => setSelectedPractices(event.target.checked ? PRACTICES.map((item) => item.name) : [])}
                />
                Select all ({PRACTICES.length})
              </label>
              <div className="mt-2 space-y-1">
                {PRACTICES.filter((item) => item.name.toLowerCase().includes(practiceQuery.toLowerCase())).map((practice) => (
                  <label key={practice.name} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] hover:bg-[#f7f5f1]">
                    <input
                      type="checkbox"
                      checked={selectedPractices.includes(practice.name)}
                      onChange={(event) => setSelectedPractices((current) => event.target.checked ? [...current, practice.name] : current.filter((item) => item !== practice.name))}
                    />
                    {practice.name}
                    <span className="text-slate-400">{practice.email}</span>
                  </label>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={includePeople} onChange={(event) => setIncludePeople(event.target.checked)} />
                Include all linked persons of the selected practices
              </label>
            </Panel>
            <Panel className="space-y-3 p-4">
              <h2 className="text-[14px] font-semibold">People and new emails</h2>
              {PEOPLE.map((person) => (
                <label key={person.name} className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    disabled={!person.email}
                    checked={selectedPeople.includes(person.email)}
                    onChange={(event) => setSelectedPeople((current) => event.target.checked ? [...current, person.email] : current.filter((item) => item !== person.email))}
                  />
                  <span>{person.name}</span>
                  <span className="text-slate-400">{person.email || "No email — excluded"}</span>
                </label>
              ))}
              <FieldLabel>Paste emails</FieldLabel>
              <TextArea value={manual} onChange={(event) => setManual(event.target.value)} placeholder="one@practice.com, two@practice.com" />
              {missingEmail.length ? <p className="text-[12px] text-[#b42318]">{missingEmail.length} contacts have no email and will be excluded.</p> : null}
              <p className="text-[13px] text-slate-500">{draftRecipients.removed} duplicates will be removed. {draftRecipients.list.length} recipients ready.</p>
              <PrimaryButton
                onClick={() => {
                  const removed = setRecipients(form.id, draftRecipients.list);
                  toast.success(removed ? `${removed} duplicates removed` : "Recipients saved");
                  setStep("Review");
                }}
              >
                Save recipient list
              </PrimaryButton>
            </Panel>
          </div>
        ) : null}

        {step === "Delivery" ? (
          <Panel className="space-y-3 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>Send</FieldLabel>
                <input
                  type="datetime-local"
                  value={toLocal(form.sendAt)}
                  onChange={(event) => updateForm(form.id, { sendAt: event.target.value ? new Date(event.target.value).toISOString() : null })}
                  className="h-10 w-full rounded-lg border border-[#e4dfd6] px-3 text-[13px]"
                />
              </div>
              <div>
                <FieldLabel>Closing date</FieldLabel>
                <input
                  type="datetime-local"
                  value={toLocal(form.closeAt)}
                  onChange={(event) => updateForm(form.id, { closeAt: event.target.value ? new Date(event.target.value).toISOString() : null })}
                  className="h-10 w-full rounded-lg border border-[#e4dfd6] px-3 text-[13px]"
                />
              </div>
            </div>
            <FieldLabel>Time zone</FieldLabel>
            <BufferedInput value={form.timezone} onCommit={(timezone) => updateForm(form.id, { timezone })} />
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={form.publicLinkEnabled} onChange={(event) => updateForm(form.id, { publicLinkEnabled: event.target.checked })} />
              Enable a general shareable link
            </label>
            {form.publicLinkEnabled ? (
              <div className="flex gap-2">
                <TextInput readOnly value={`${window.location.origin}/f/${form.publicToken}`} />
                <GhostButton onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/f/${form.publicToken}`); toast.success("Link copied"); }}>Copy</GhostButton>
                <GhostButton onClick={() => updateForm(form.id, { publicToken: `pub-${Date.now().toString(36)}` })}>Regenerate</GhostButton>
              </div>
            ) : null}
            <FieldLabel>Subject</FieldLabel>
            <BufferedInput value={form.email.subject} onCommit={(subject) => updateForm(form.id, { email: { ...form.email, subject } })} />
            <FieldLabel>Body</FieldLabel>
            <BufferedTextArea rows={6} value={form.email.body} onCommit={(body) => updateForm(form.id, { email: { ...form.email, body } })} />
            <p className="text-[12px] text-slate-400">Merge fields: {"{{recipient_name}} {{practice_name}} {{form_title}} {{form_link}} {{closing_date}} {{sender_name}}"}</p>
            <div className="grid gap-3 md:grid-cols-2">
              <BufferedInput value={form.email.senderName} onCommit={(senderName) => updateForm(form.id, { email: { ...form.email, senderName } })} />
              <BufferedInput value={form.email.replyTo} onCommit={(replyTo) => updateForm(form.id, { email: { ...form.email, replyTo } })} />
            </div>
            <GhostButton onClick={() => toast.success("Test email queued to you")}>Send test email to me</GhostButton>
          </Panel>
        ) : null}

        {step === "Reminders" ? (
          <Panel className="space-y-3 p-4">
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={form.reminder.enabled} onChange={(event) => updateForm(form.id, { reminder: { ...form.reminder, enabled: event.target.checked } })} />
              Send automatic reminders
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <NumberField label="First reminder after days" value={form.reminder.firstAfterDays} onChange={(firstAfterDays) => updateForm(form.id, { reminder: { ...form.reminder, firstAfterDays } })} />
              <NumberField label="Repeat every days" value={form.reminder.repeatEveryDays} onChange={(repeatEveryDays) => updateForm(form.id, { reminder: { ...form.reminder, repeatEveryDays } })} />
              <NumberField label="Maximum reminders" value={form.reminder.maxCount} onChange={(maxCount) => updateForm(form.id, { reminder: { ...form.reminder, maxCount: Math.min(5, maxCount) } })} />
            </div>
            <FieldLabel>Reminder subject</FieldLabel>
            <BufferedInput value={form.reminder.subject} onCommit={(subject) => updateForm(form.id, { reminder: { ...form.reminder, subject } })} />
            <FieldLabel>Reminder body</FieldLabel>
            <BufferedTextArea rows={5} value={form.reminder.body} onCommit={(body) => updateForm(form.id, { reminder: { ...form.reminder, body } })} />
          </Panel>
        ) : null}

        {step === "Review" ? (
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-[13px] text-slate-500">{form.recipients.length} recipients</p>
              <div className="flex gap-2">
                <GhostButton onClick={() => { const errors = publishForm(form.id, true); if (errors.length) toast.error(errors[0].message); else toast.success("Scheduled"); }}>Schedule send</GhostButton>
                <PrimaryButton onClick={() => { const errors = publishForm(form.id, false); if (errors.length) toast.error(errors[0].message); else toast.success("Published"); }}>Publish and send now</PrimaryButton>
              </div>
            </div>
            <RecipientTable
              recipients={form.recipients}
              onRemove={(recipientId) => updateRecipient(form.id, recipientId, { status: "REMOVED" })}
            />
          </Panel>
        ) : null}

        {step === "Tracker" ? (
          <Panel className="overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-[#e4dfd6] px-3 text-[13px]">
                <option value="ALL">All statuses</option>
                {["PENDING", "NOT_OPENED", "IN_PROGRESS", "COMPLETED", "BOUNCED", "EXPIRED", "REMOVED"].map((status) => (
                  <option key={status} value={status}>{status.replace("_", " ")}</option>
                ))}
              </select>
              <GhostButton onClick={() => toast.success("Reminder sent to pending recipients")}>Send reminder now</GhostButton>
            </div>
            <RecipientTable recipients={tracker} onRemove={(recipientId) => updateRecipient(form.id, recipientId, { status: "REMOVED" })} />
          </Panel>
        ) : null}
      </div>
    </FormsLayout>
  );
}

function RecipientTable({ recipients, onRemove }: { recipients: FormRecipient[]; onRemove: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[860px] w-full text-left text-[13px]">
        <thead className="bg-[#fbfaf8] text-[12px] uppercase text-slate-400">
          <tr>
            {["Name", "Email", "Practice", "Source", "Status", "Delivery", "Sent", "Reminders", ""].map((heading) => (
              <th key={heading} className="px-4 py-3 font-medium">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {recipients.map((recipient) => (
            <tr key={recipient.id} className="border-t border-[#f3f0ea]">
              <td className="px-4 py-3">{recipient.name}</td>
              <td className="px-4 py-3">{recipient.email}</td>
              <td className="px-4 py-3">{recipient.practice || "—"}</td>
              <td className="px-4 py-3">{sourceLabel(recipient.source)}</td>
              <td className="px-4 py-3"><RecipientPill status={recipient.status} /></td>
              <td className="px-4 py-3">{recipient.delivery}</td>
              <td className="px-4 py-3">{formatWhen(recipient.sentAt)}</td>
              <td className="px-4 py-3">{recipient.reminderCount}</td>
              <td className="px-4 py-3">
                {recipient.status !== "REMOVED" ? (
                  <button type="button" className="text-[12px] text-[#b42318]" onClick={() => onRemove(recipient.id)}>Remove</button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <TextInput type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function sourceLabel(source: RecipientSource) {
  if (source === "PRACTICE") return "Practice";
  if (source === "PERSON") return "Person";
  if (source === "PRACTICE_EMAIL") return "Practice email";
  return "New email";
}

function dedupe(recipients: FormRecipient[]) {
  const seen = new Set<string>();
  const list: FormRecipient[] = [];
  let removed = 0;
  recipients.forEach((recipient) => {
    const key = recipient.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key) || seen.has(key)) {
      removed += 1;
      return;
    }
    seen.add(key);
    list.push(recipient);
  });
  return { list, removed };
}

function toLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
