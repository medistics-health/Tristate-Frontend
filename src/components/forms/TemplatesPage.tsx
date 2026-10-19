import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormsLayout, GhostButton, Panel, TextInput, formatDay } from "./chrome";
import { createFromTemplate, deleteTemplate, useFormStore } from "./store";

export default function TemplatesPage() {
  const navigate = useNavigate();
  const { templates } = useFormStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const categories = ["ALL", ...Array.from(new Set(templates.map((item) => item.category)))];
  const rows = templates.filter((template) => {
    if (category !== "ALL" && template.category !== category) return false;
    return `${template.name} ${template.description}`.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <FormsLayout title="Form templates" activeSubItem="Templates">
      <div className="space-y-4 font-app-sans">
        <div className="flex flex-wrap gap-2">
          <TextInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates" className="max-w-xs" />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-lg border border-[#e4dfd6] bg-white px-3 text-[13px]">
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((template) => (
            <Panel key={template.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold text-slate-800">{template.name}</p>
                  <p className="mt-1 text-[13px] text-slate-500">{template.description}</p>
                </div>
                <span className="rounded-full bg-[#f3f0ea] px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {template.visibility === "SYSTEM" ? "System" : template.visibility === "SHARED" ? "Shared" : "Private"}
                </span>
              </div>
              <p className="mt-3 text-[12px] text-slate-400">
                {template.category} · {template.owner} · used {template.usageCount} times
                {template.lastUsedAt ? ` · last ${formatDay(template.lastUsedAt)}` : ""}
              </p>
              <div className="mt-4 flex gap-2">
                <GhostButton
                  onClick={() => {
                    const form = createFromTemplate(template.id);
                    if (form) navigate(`/forms/${form.id}`);
                  }}
                >
                  Use this template
                </GhostButton>
                {template.visibility !== "SYSTEM" ? (
                  <button type="button" className="text-[13px] text-[#b42318]" onClick={() => deleteTemplate(template.id)}>
                    Delete
                  </button>
                ) : null}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </FormsLayout>
  );
}
