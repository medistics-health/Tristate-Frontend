import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LayoutGrid } from "lucide-react";
import AppLayout from "../layout/AppLayout";
import DataTableToolbar from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import { createForm, listForms } from "./api";
import { StatusPill, formatDay } from "./chrome";
import type { FormRecord, FormStatus } from "./types";

const PAGE_SIZE = 25;

export default function FormsHome() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  function load() {
    setLoading(true);
    listForms()
      .then(setForms)
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return forms.filter((form) => {
      const matchesQuery = `${form.title} ${form.refCode} ${form.owner}`.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = !status || form.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [forms, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <AppLayout
      title="All Forms"
      activeModule="Forms"
      activeSubItem="All Forms"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="All Forms"
            subtitle="Forms"
            searchPlaceholder="Search forms..."
            searchValue={query}
            onSearchChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            activeFilterCount={status ? 1 : 0}
            activeChips={
              status
                ? [{
                    key: "status",
                    label: "Status",
                    displayValue: status.charAt(0) + status.slice(1).toLowerCase(),
                    onClear: () => setStatus(""),
                  }]
                : []
            }
            onResetFilters={() => {
              setStatus("");
              setPage(1);
            }}
            filterModalTitle="Filter Forms"
            filterFields={
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Status</span>
                <Select
                  value={status}
                  onChange={(value) => {
                    setStatus(value);
                    setPage(1);
                  }}
                  options={[
                    { label: "All statuses", value: "" },
                    { label: "Draft", value: "DRAFT" },
                    { label: "Published", value: "PUBLISHED" },
                    { label: "Closed", value: "CLOSED" },
                    { label: "Archived", value: "ARCHIVED" },
                  ]}
                  placeholder="All statuses"
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
                    {["Form", "Reference", "Status", "Owner", "Created", "Sent", "Responses", ""].map((heading) => (
                      <th key={heading} className="border-b border-r border-[#f0ece6] px-3 py-2 text-[13px] font-medium text-slate-400 last:border-r-0">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((form) => (
                    <tr key={form.id} className="hover:bg-[#fbfaf8]">
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5 font-medium text-slate-800">{form.title}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5 text-slate-500">{form.refCode}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5">
                        <StatusPill status={form.status as FormStatus} scheduled={form.scheduled} />
                      </td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5">{form.owner || "—"}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5 text-slate-500">{formatDay(form.createdAt)}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5">{form.recipientCount || 0}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5">{form.responseCount || 0}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5 text-right whitespace-nowrap">
                        {form.status === "DRAFT" ? (
                          <button type="button" className="mr-3 font-medium text-[#4f63ea]" onClick={() => navigate(`/forms/${form.id}`)}>
                            Edit
                          </button>
                        ) : null}
                        <button type="button" className="mr-3 font-medium text-[#4f63ea]" onClick={() => navigate(`/forms/${form.id}/responses`)}>
                          Responses
                        </button>
                        {form.status === "DRAFT" || form.status === "PUBLISHED" ? (
                          <button type="button" className="font-medium text-slate-600" onClick={() => navigate(`/forms/${form.id}/send`)}>
                            Send
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {!loading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-14 text-center text-[13px] text-slate-400">
                        No forms match the current filters.
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
