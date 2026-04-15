import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  Circle,
  Clock3,
  LayoutList,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../../layout/AppLayout";
import {
  deleteAgreementApi,
  getAgreement,
  getAgreementsView,
  updateAgreementApi,
  type Agreement,
  type AgreementBody,
  type AgreementsViewData,
} from "../../../services/operations/agreements";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-green-100 text-green-700",
  PENDING_SIGNATURE: "bg-amber-100 text-amber-700",
  SIGNED: "bg-blue-100 text-blue-700",
  EXPIRED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-zinc-100 text-zinc-600",
  TERMINATED: "bg-zinc-100 text-zinc-600",
};

const agreementStatusOptions = [
  "DRAFT",
  "ACTIVE",
  "PENDING_SIGNATURE",
  "SIGNED",
  "EXPIRED",
  "TERMINATED",
  "ARCHIVED",
];

const agreementTypeOptions = ["MSA", "SOW", "RENEWAL", "ADDENDUM"];

type AgreementFormState = {
  type: string;
  status: string;
  value: string;
  effectiveDate: string;
  renewalDate: string;
  terminationDate: string;
};

type AgreementRow = {
  id: string;
  values: Record<string, string | number | null>;
};

const initialFormState: AgreementFormState = {
  type: "MSA",
  status: "PENDING_SIGNATURE",
  value: "",
  effectiveDate: "",
  renewalDate: "",
  terminationDate: "",
};

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatDateForInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildFormState(agreement?: Agreement | null): AgreementFormState {
  if (!agreement) return initialFormState;
  return {
    type: agreement.type,
    status: agreement.status,
    value: String(agreement.value || ""),
    effectiveDate: formatDateForInput(agreement.effectiveDate),
    renewalDate: formatDateForInput(agreement.renewalDate),
    terminationDate: formatDateForInput(agreement.terminationDate),
  };
}

function AgreementPendingSignaturesPage() {
  const [viewData, setViewData] = useState<AgreementsViewData | null>(null);
  const [rows, setRows] = useState<AgreementRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(
    null,
  );
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editForm, setEditForm] =
    useState<AgreementFormState>(initialFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const columns = useMemo<ColumnDef<AgreementRow>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row: AgreementRow) => row.values.name,
        header: () => "Name",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.name || "-"),
      },
      {
        id: "type",
        accessorFn: (row: AgreementRow) => row.values.type,
        header: () => "Type",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.type || "-"),
      },
      {
        id: "practiceName",
        accessorFn: (row: AgreementRow) => row.values.practiceName,
        header: () => "Practice",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.practiceName || "-"),
      },
      {
        id: "value",
        accessorFn: (row: AgreementRow) => row.values.value,
        header: () => "Value",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.value || "-"),
      },
      {
        id: "status",
        accessorFn: (row: AgreementRow) => row.values.status,
        header: () => "Status",
        cell: ({ row }: { row: { original: AgreementRow } }) => {
          const status = String(row.original.values.status || "");
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[status] || statusStyles.PENDING_SIGNATURE}`}
            >
              {formatStatusLabel(status)}
            </span>
          );
        },
      },
      {
        id: "creationDate",
        accessorFn: (row: AgreementRow) => row.values.creationDate,
        header: () => "Created",
        cell: ({ row }: { row: { original: AgreementRow } }) =>
          String(row.original.values.creationDate || "-"),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      async function loadData() {
        try {
          setIsLoading(true);
          const data = await getAgreementsView({
            page: pagination.page,
            limit: pagination.limit,
            // status: "PENDING_SIGNATURE",
            status: "ACTIVE",
            search: search || undefined,
          });
          setViewData(data);
          setRows(data.rows);
          setPagination(data.pagination);
          setSelectedRowId((current) => {
            if (current && data.rows.some((row) => row.id === current)) {
              return current;
            }
            return data.rows[0]?.id || null;
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load pending signatures";
          toast.error(message);
        } finally {
          setIsLoading(false);
        }
      }

      if (search.length === 0 || search.length > 2) {
        loadData();
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [pagination.page, pagination.limit, search, sorting]);

  useEffect(() => {
    if (!selectedRowId) {
      setSelectedAgreement(null);
      setEditForm(initialFormState);
      return;
    }

    const agreementId = selectedRowId;

    async function loadAgreement() {
      try {
        setIsDetailLoading(true);
        const agreement = await getAgreement(agreementId);
        setSelectedAgreement(agreement);
        setEditForm(buildFormState(agreement));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch agreement";
        toast.error(message);
      } finally {
        setIsDetailLoading(false);
      }
    }

    loadAgreement();
  }, [selectedRowId]);

  function buildPayload(form: AgreementFormState): Partial<AgreementBody> {
    return {
      type: form.type,
      status: form.status,
      value: Number.parseFloat(form.value) || undefined,
      effectiveDate: form.effectiveDate
        ? new Date(form.effectiveDate).toISOString()
        : undefined,
      renewalDate: form.renewalDate
        ? new Date(form.renewalDate).toISOString()
        : undefined,
      terminationDate: form.terminationDate
        ? new Date(form.terminationDate).toISOString()
        : undefined,
    };
  }

  async function refreshPendingSignatures() {
    const data = await getAgreementsView({
      page: pagination.page,
      limit: pagination.limit,
      // status: "PENDING_SIGNATURE",
      status: "ACTIVE",
      search: search || undefined,
    });
    setRows(data.rows);
    setViewData(data);
    setPagination(data.pagination);
    if (!data.rows.some((row) => row.id === selectedRowId)) {
      setSelectedRowId(data.rows[0]?.id || null);
    }
  }

  async function handleUpdateAgreement(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRowId) return;

    setIsSaving(true);
    try {
      await updateAgreementApi(selectedRowId, buildPayload(editForm));
      await refreshPendingSignatures();
      const agreement = await getAgreement(selectedRowId);
      setSelectedAgreement(agreement);
      setEditForm(buildFormState(agreement));
      toast.success("Agreement updated successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update agreement";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAgreement() {
    if (!selectedRowId) return;
    if (!window.confirm("Are you sure you want to delete this agreement?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAgreementApi(selectedRowId);
      await refreshPendingSignatures();
      toast.success("Agreement deleted successfully");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete agreement";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const selectedRow = rows.find((row) => row.id === selectedRowId) || null;

  return (
    <AppLayout
      title="Agreements"
      activeModule="Agreements"
      activeSubItem="Pending Signatures"
    >
      <div className="flex h-full gap-2 font-app-sans">
        <section className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#e8e3db] bg-white">
          <div className="border-b border-[#eeebe5] px-4 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[15px] font-medium text-slate-700">
                  <LayoutList className="h-4 w-4 text-slate-500" />
                  <span>Pending Signatures</span>
                  <span className="text-slate-400">
                    . {viewData?.totalCount ?? rows.length}
                  </span>
                </div>
                <p className="mt-1 text-[13px] text-slate-400">
                  Agreements currently waiting for signature.
                </p>
              </div>

              <label className="flex w-full items-center gap-2 rounded-xl border border-[#ece8e1] bg-[#fcfbf9] px-3 py-2 lg:max-w-[320px]">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setPagination((prev) => ({ ...prev, page: 1 }));
                    setSearch(event.target.value);
                  }}
                  placeholder="Search agreements"
                  className="w-full bg-transparent text-[14px] text-slate-700 outline-none placeholder:text-slate-400"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] px-4 py-3">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">
                  Queue
                </p>
                <p className="mt-2 text-[22px] font-semibold text-slate-700">
                  {viewData?.totalCount ?? rows.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] px-4 py-3">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">
                  Visible Rows
                </p>
                <p className="mt-2 text-[22px] font-semibold text-slate-700">
                  {rows.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] px-4 py-3">
                <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">
                  Status
                </p>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[13px] font-medium text-amber-700">
                  <Clock3 className="h-3.5 w-3.5" />
                  Pending Signature
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-[14px] text-slate-400">
                Loading pending signatures...
              </div>
            ) : table.getRowModel().rows.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-[14px] text-slate-400">
                No pending signature agreements match the current search.
              </div>
            ) : (
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="sticky top-0 z-10 bg-white text-[13px] font-medium text-slate-400">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header, index) => (
                        <th
                          key={header.id}
                          className={`border-b border-[#eeebe5] px-4 py-3 ${
                            index < headerGroup.headers.length - 1
                              ? "border-r border-[#f2eee8]"
                              : ""
                          }`}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>

                <tbody className="text-[14px] text-slate-600">
                  {table.getRowModel().rows.map((row) => {
                    const isSelected = selectedRowId === row.original.id;

                    return (
                      <tr
                        key={row.id}
                        className={isSelected ? "bg-[#fcfbf9]" : "bg-white"}
                      >
                        {row.getVisibleCells().map((cell, index) => (
                          <td
                            key={cell.id}
                            className={`border-b border-[#f4f1ec] px-4 py-3 ${
                              index < row.getVisibleCells().length - 1
                                ? "border-r border-[#f5f2ed]"
                                : ""
                            }`}
                          >
                            {cell.column.id === "name" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedRowId(row.original.id)
                                }
                                className="hover:text-[#4f63ea]"
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </button>
                            ) : (
                              flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <aside className="app-panel relative flex w-[380px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
            <button
              type="button"
              onClick={() => setSelectedRowId(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <Circle className="h-4 w-4 text-slate-300" />
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
              {selectedRow
                ? String(selectedRow.values.name || "Agreement")
                : "Agreement"}
            </span>
          </div>

          {!selectedRowId ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-slate-400">
              Select an agreement to review the signature-ready details.
            </div>
          ) : isDetailLoading || !selectedAgreement ? (
            <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
              Loading agreement...
            </div>
          ) : (
            <form
              onSubmit={handleUpdateAgreement}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-auto p-4">
                <div className="mb-5 space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Practice</span>
                    <span className="text-right text-slate-700">
                      {selectedAgreement.practice?.name || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Deal</span>
                    <span className="text-right text-slate-700">
                      {selectedAgreement.deal?.name || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Created</span>
                    <span className="text-right text-slate-700">
                      {formatDateTime(selectedAgreement.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-400">Last Update</span>
                    <span className="text-right text-slate-700">
                      {formatDateTime(selectedAgreement.updatedAt)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Type
                    </label>
                    <select
                      value={editForm.type}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          type: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      {agreementTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          status: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      {agreementStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Value
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.value}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          value: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Effective Date
                    </label>
                    <input
                      type="date"
                      value={editForm.effectiveDate}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          effectiveDate: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Renewal Date
                    </label>
                    <input
                      type="date"
                      value={editForm.renewalDate}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          renewalDate: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Termination Date
                    </label>
                    <input
                      type="date"
                      value={editForm.terminationDate}
                      onChange={(event) =>
                        setEditForm((prev) => ({
                          ...prev,
                          terminationDate: event.target.value,
                        }))
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                <button
                  type="button"
                  onClick={handleDeleteAgreement}
                  disabled={isDeleting}
                  className="flex cursor-pointer items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="app-control inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#4f63ea] hover:text-white disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </AppLayout>
  );
}

export default AgreementPendingSignaturesPage;
