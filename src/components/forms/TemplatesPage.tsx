import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LayoutGrid } from "lucide-react";
import AppLayout from "../layout/AppLayout";
import DataTableToolbar from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import { createForm, createFromTemplate, listTemplates } from "./api";
import { formatDay } from "./chrome";
import type { FormTemplate } from "./types";

const PAGE_SIZE = 25;

export default function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [page, setPage] = useState(1);

  function load() {
    setLoading(true);
    listTemplates()
      .then(setTemplates)
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(templates.map((template) => template.category).filter(Boolean))),
    [templates],
  );

  const filtered = useMemo(() => {
    return templates.filter((template) => {
      const matchesQuery = `${template.name} ${template.category} ${template.description}`.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !category || template.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [templates, query, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function useTemplate(template: FormTemplate) {
    setBusyId(template.id);
    try {
      const form = await createFromTemplate(template.id);
      navigate(`/forms/${form.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to use this template.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <AppLayout
      title="Templates"
      activeModule="Forms"
      activeSubItem="Templates"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="Templates"
            subtitle="Forms"
            searchPlaceholder="Search templates..."
            searchValue={query}
            onSearchChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            activeFilterCount={category ? 1 : 0}
            activeChips={
              category
                ? [{ key: "category", label: "Category", displayValue: category, onClear: () => setCategory("") }]
                : []
            }
            onResetFilters={() => {
              setCategory("");
              setPage(1);
            }}
            filterModalTitle="Filter Templates"
            filterFields={
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Category</span>
                <Select
                  value={category}
                  onChange={(value) => {
                    setCategory(value);
                    setPage(1);
                  }}
                  options={[{ label: "All categories", value: "" }, ...categories.map((item) => ({ label: item, value: item }))]}
                  placeholder="All categories"
                />
              </label>
            }
            addNewLabel="New template"
            onAddNew={() => {
              void createForm("Untitled form")
                .then((form) => navigate(`/forms/${form.id}`))
                .catch((error: Error) => toast.error(error.message));
            }}
            onRefresh={load}
            isLoading={loading}
            page={currentPage}
            pageSize={PAGE_SIZE}
            totalRecords={filtered.length}
            totalPages={totalPages}
            onPageChange={setPage}
          >
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left text-[13px]">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr>
                    {["Name", "Category", "Visibility", "Description", "Last used", ""].map((heading) => (
                      <th key={heading} className="border-b border-r border-[#f0ece6] px-3 py-2 text-[13px] font-medium text-slate-400 last:border-r-0">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((template) => (
                    <tr key={template.id} className="hover:bg-[#fbfaf8]">
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5 font-medium text-slate-800">{template.name}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5">{template.category || "—"}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5 text-slate-500">
                        {template.visibility === "SYSTEM" ? "System" : template.visibility === "SHARED" ? "Shared" : "Private"}
                      </td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5 text-slate-500">{template.description || "—"}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5 text-slate-500">{formatDay(template.lastUsedAt)}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5 text-right">
                        <button
                          type="button"
                          disabled={busyId === template.id}
                          className="font-medium text-[#4f63ea] disabled:opacity-50"
                          onClick={() => useTemplate(template)}
                        >
                          Use template
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-14 text-center text-[13px] text-slate-400">
                        No templates match the current filters.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </DataTableToolbar>
        </section>
      </div>
    </AppLayout>
  );
}
