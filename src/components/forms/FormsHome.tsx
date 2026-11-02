import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LayoutGrid } from "lucide-react";
import AppLayout from "../layout/AppLayout";
import DataTableToolbar from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import { listForms, renameForm } from "./api";
import { FieldLabel, GhostButton, Panel, PrimaryButton, StatusPill, TextInput, formatDay } from "./chrome";
import { setFormTitle } from "./store";
import type { FormRecord, FormStatus } from "./types";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function FormsHome() {
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [refreshKey, setRefreshKey] = useState(0);
  const [rename, setRename] = useState<{ id: string; name: string } | null>(null);
  const [renameError, setRenameError] = useState("");
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listForms({ page, pageSize, search: debouncedQuery, status })
      .then((data) => {
        if (cancelled) return;
        setForms(data.forms);
        setTotalRecords(data.total);
        setTotalPages(Math.max(1, data.totalPages));
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
  }, [page, pageSize, debouncedQuery, status, refreshKey]);

  const currentPage = Math.min(page, totalPages);

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
                    onClear: () => {
                      setStatus("");
                      setPage(1);
                    },
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
            addNewLabel="New form"
            onAddNew={() => navigate("/forms/new")}
            onRefresh={() => setRefreshKey((value) => value + 1)}
            isLoading={loading}
            page={currentPage}
            pageSize={pageSize}
            totalRecords={totalRecords}
            totalPages={totalPages}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={(nextSize) => {
              setPageSize(nextSize);
              setPage(1);
            }}
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
                  {forms.map((form) => (
                    <tr key={form.id} className="hover:bg-[#fbfaf8]">
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5">
                        <button
                          type="button"
                          className="cursor-pointer text-left font-medium text-slate-800 transition-colors duration-150 hover:text-[#3144c4]"
                          onClick={() => navigate(`/forms/${form.id}`)}
                        >
                          {form.title}
                        </button>
                      </td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5 text-slate-500">{form.refCode}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5">
                        <StatusPill status={form.status as FormStatus} scheduled={form.scheduled} />
                      </td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5">{form.owner || "—"}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5 text-slate-500">{formatDay(form.createdAt)}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5">{form.recipientCount || 0}</td>
                      <td className="border-b border-[#f4f1ec] px-3 py-2.5">{form.responseCount || 0}</td>
                      <td className="border-b border-[#f4f1ec] px-2 py-1.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="cursor-pointer rounded-lg px-2 py-1 text-[12px] font-medium text-slate-500 transition-colors duration-150 hover:bg-[#f7f5f1] hover:text-slate-800"
                            onClick={() => {
                              setRenameError("");
                              setRename({ id: form.id, name: form.title });
                            }}
                          >
                            Rename
                          </button>
                          {form.status === "DRAFT" ? (
                            <button type="button" className="cursor-pointer rounded-lg px-2 py-1 text-[12px] font-medium text-slate-500 transition-colors duration-150 hover:bg-[#f7f5f1] hover:text-slate-800" onClick={() => navigate(`/forms/${form.id}`)}>
                              Edit
                            </button>
                          ) : null}
                          <button type="button" className="cursor-pointer rounded-lg px-2 py-1 text-[12px] font-medium text-slate-500 transition-colors duration-150 hover:bg-[#f4f2fe] hover:text-[#3144c4]" onClick={() => navigate(`/forms/${form.id}/responses`)}>
                            Responses
                          </button>
                          {form.status === "DRAFT" || form.status === "PUBLISHED" ? (
                            <button type="button" className="cursor-pointer rounded-lg bg-[#f4f6ff] px-2.5 py-1 text-[12px] font-medium text-[#3144c4] transition-colors duration-150 hover:bg-[#e7ebff]" onClick={() => navigate(`/forms/${form.id}/send`)}>
                              Send
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && forms.length === 0 ? (
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
      {rename ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <Panel className="w-full max-w-md space-y-3 p-5">
            <h2 className="text-[16px] font-semibold">Rename form</h2>
            <div>
              <FieldLabel>Form name</FieldLabel>
              <TextInput
                autoFocus
                value={rename.name}
                onChange={(event) => {
                  setRename({ ...rename, name: event.target.value });
                  setRenameError("");
                }}
              />
              {renameError ? <p className="mt-1 text-[12px] text-[#b42318]">{renameError}</p> : null}
            </div>
            <div className="flex justify-end gap-2">
              <GhostButton onClick={() => setRename(null)} disabled={renaming}>Cancel</GhostButton>
              <PrimaryButton
                disabled={!rename.name.trim() || renaming}
                onClick={() => {
                  const title = rename.name.trim();
                  setRenaming(true);
                  void renameForm(rename.id, title)
                    .then((updated) => {
                      setForms((current) => current.map((item) => (item.id === rename.id ? { ...item, title: updated.title || title } : item)));
                      setFormTitle(rename.id, updated.title || title, updated.lockVersion);
                      setRename(null);
                      toast.success("Form renamed");
                    })
                    .catch((error: Error) => setRenameError(error.message || "Unable to rename this form."))
                    .finally(() => setRenaming(false));
                }}
              >
                {renaming ? "Saving…" : "Rename"}
              </PrimaryButton>
            </div>
          </Panel>
        </div>
      ) : null}
    </AppLayout>
  );
}
