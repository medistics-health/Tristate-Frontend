import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Copy,
  Eye,
  MoreHorizontal,
  Plus,
  Send,
  Trash2,
  BarChart3,
  Archive,
} from "lucide-react";
import { FormsLayout, GhostButton, Panel, PrimaryButton, StatusPill, TextInput, formatDay } from "./chrome";
import {
  archiveForm,
  createForm,
  createFromTemplate,
  deleteDraft,
  duplicateForm,
  useFormStore,
} from "./store";
import type { FormStatus } from "./types";

export default function FormListPage() {
  const navigate = useNavigate();
  const { forms, templates } = useFormStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FormStatus | "ALL" | "ARCHIVED">("ALL");
  const [showArchived, setShowArchived] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    return forms.filter((form) => {
      if (!showArchived && form.status === "ARCHIVED" && status !== "ARCHIVED") return false;
      if (status === "ARCHIVED" && form.status !== "ARCHIVED") return false;
      if (status !== "ALL" && status !== "ARCHIVED" && form.status !== status) return false;
      if (query && !`${form.title} ${form.refCode} ${form.owner}`.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [forms, query, showArchived, status]);

  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rows = filtered.slice(page * pageSize, page * pageSize + pageSize);

  const kpis = [
    { label: "Forms", value: forms.filter((form) => form.status !== "ARCHIVED").length },
    { label: "Published", value: forms.filter((form) => form.status === "PUBLISHED").length },
    { label: "Responses", value: forms.reduce((sum, form) => sum + form.responses.length, 0) },
    {
      label: "Completion",
      value: `${completion(forms)}%`,
    },
  ];

  return (
    <FormsLayout
      title="Forms"
      activeSubItem="All Forms"
      actions={[{ label: "New form", icon: <Plus className="h-4 w-4" />, onClick: () => setCreating(true) }]}
    >
      <div className="space-y-3 font-app-sans">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((item) => (
            <Panel key={item.label} className="px-4 py-3">
              <p className="text-[12px] font-medium text-slate-400">{item.label}</p>
              <p className="mt-1 text-[22px] font-semibold text-slate-800">{item.value}</p>
            </Panel>
          ))}
        </div>
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
            <TextInput
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Search by title or reference"
              className="max-w-xs"
            />
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as FormStatus | "ALL" | "ARCHIVED");
                setPage(0);
              }}
              className="h-10 rounded-lg border border-[#e4dfd6] bg-white px-3 text-[13px]"
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="CLOSED">Closed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <label className="ml-auto flex items-center gap-2 text-[13px] text-slate-500">
              <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
              Show archived
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-[13px]">
              <thead className="bg-[#fbfaf8] text-[12px] uppercase tracking-wide text-slate-400">
                <tr>
                  {["Title", "Reference", "Status", "Owner", "Created", "Modified", "Recipients", "Responses", "Closes", ""].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-medium">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((form) => (
                  <tr key={form.id} className="border-t border-[#f3f0ea] hover:bg-[#fbfaf8]">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => navigate(`/forms/${form.id}`)} className="font-medium text-slate-800 hover:text-[#4f63ea]">
                        {form.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{form.refCode}</td>
                    <td className="px-4 py-3"><StatusPill status={form.status} scheduled={form.scheduled} /></td>
                    <td className="px-4 py-3">{form.owner}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDay(form.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDay(form.updatedAt)}</td>
                    <td className="px-4 py-3">{form.recipients.filter((item) => item.status !== "REMOVED").length}</td>
                    <td className="px-4 py-3">{form.responses.length}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDay(form.closeAt)}</td>
                    <td className="relative px-4 py-3 text-right">
                      <button type="button" onClick={() => setMenuId(menuId === form.id ? null : form.id)} className="rounded-md p-1 hover:bg-[#f3f0ea]">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menuId === form.id ? (
                        <div className="absolute right-4 z-10 w-44 rounded-xl border border-[#ece8e1] bg-white py-1 text-left shadow-lg">
                          <MenuItem icon={<Eye className="h-3.5 w-3.5" />} label="Edit" onClick={() => navigate(`/forms/${form.id}`)} />
                          <MenuItem icon={<Eye className="h-3.5 w-3.5" />} label="Preview" onClick={() => navigate(`/forms/${form.id}/preview`)} />
                          <MenuItem icon={<Copy className="h-3.5 w-3.5" />} label="Duplicate" onClick={() => { const copy = duplicateForm(form.id); if (copy) navigate(`/forms/${copy.id}`); }} />
                          <MenuItem icon={<Send className="h-3.5 w-3.5" />} label="Distribute" onClick={() => navigate(`/forms/${form.id}/distribute`)} />
                          <MenuItem icon={<BarChart3 className="h-3.5 w-3.5" />} label="Results" onClick={() => navigate(`/forms/${form.id}/results`)} />
                          {form.status === "CLOSED" ? (
                            <MenuItem icon={<Archive className="h-3.5 w-3.5" />} label="Archive" onClick={() => archiveForm(form.id)} />
                          ) : null}
                          {form.status === "DRAFT" ? (
                            <MenuItem icon={<Trash2 className="h-3.5 w-3.5" />} label="Delete" onClick={() => { deleteDraft(form.id); toast.success("Draft deleted"); }} />
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-slate-400">
                      No forms match this view.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3 text-[13px] text-slate-500">
            <span>{filtered.length} forms</span>
            <div className="flex items-center gap-2">
              <GhostButton disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</GhostButton>
              <span>{page + 1} / {pageCount}</span>
              <GhostButton disabled={page + 1 >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</GhostButton>
            </div>
          </div>
        </Panel>
      </div>

      {creating ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <Panel className="w-full max-w-lg p-5">
            <h2 className="text-[16px] font-semibold text-slate-800">New form</h2>
            <p className="mt-1 text-[13px] text-slate-500">Start blank or use a template. A draft reference code is assigned automatically.</p>
            <TextInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Form title" className="mt-4" />
            <div className="mt-4 grid gap-2">
              {templates.slice(0, 3).map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    const form = createFromTemplate(template.id);
                    if (form) navigate(`/forms/${form.id}`);
                  }}
                  className="rounded-xl border border-[#ece8e1] px-3 py-2 text-left hover:bg-[#fbfaf8]"
                >
                  <span className="block text-[13px] font-medium text-slate-800">{template.name}</span>
                  <span className="text-[12px] text-slate-500">{template.category} · {template.visibility === "SYSTEM" ? "System template" : template.visibility}</span>
                </button>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <GhostButton onClick={() => setCreating(false)}>Cancel</GhostButton>
              <PrimaryButton
                onClick={() => {
                  const form = createForm(title || "Untitled form");
                  navigate(`/forms/${form.id}`);
                }}
              >
                Create blank form
              </PrimaryButton>
            </div>
          </Panel>
        </div>
      ) : null}
    </FormsLayout>
  );
}

function completion(forms: { recipients: { status: string }[]; responses: unknown[] }[]) {
  const sent = forms.reduce(
    (sum, form) => sum + form.recipients.filter((item) => !["BOUNCED", "REMOVED", "PENDING"].includes(item.status)).length,
    0,
  );
  const done = forms.reduce((sum, form) => sum + form.responses.length, 0);
  if (!sent) return 0;
  return Math.round((done / sent) * 100);
}

function MenuItem({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-[#f7f5f1]">
      {icon}
      {label}
    </button>
  );
}
