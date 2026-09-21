import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  Circle,
  Copy,
  Download,
  FolderOpen,
  Link2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { DetailCard, EmptyStateIllustration } from "../shared/tablePageUtils";
import DataTableToolbar, {
  SortableHeaderCell,
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import MultiSelect from "../shared/MultiSelect";
import { getResponsivePageSize } from "../shared/TablePagination";
import {
  canDocumentHubContent,
  canDocumentHubShare,
  readStoredUser,
} from "../../utils/auth";
import { getAllPractices } from "../../services/operations/practices";
import { getAllDeals } from "../../services/operations/deals";
import {
  archiveHubDocument,
  createPublicLinkApi,
  downloadHubDocument,
  getDocumentsView,
  getHubDocument,
  hardDeleteHubDocument,
  listHubCategories,
  listPersonOptions,
  listPublicLinks,
  revokePublicLinkApi,
  updateHubDocument,
  uploadHubDocument,
  uploadHubDocumentVersion,
  type DocumentHubQueryParams,
} from "../../services/operations/documentHub";
import type {
  HubCategory,
  HubDocument,
  HubDocumentRow,
  HubDocumentVersion,
  HubPublicLink,
} from "./types";

const emptyForm = {
  title: "",
  description: "",
  categoryIds: [] as string[],
  tags: "",
  personIds: [] as string[],
  practiceIds: [] as string[],
  dealIds: [] as string[],
  isPublicShareable: false,
};

function DocumentHubPage() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canManage = canDocumentHubContent(currentRole);
  const canShare = canDocumentHubShare(currentRole);

  const [rows, setRows] = useState<HubDocumentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<HubDocument | null>(null);
  const [versionHistory, setVersionHistory] = useState<HubDocumentVersion[]>([]);
  const [publicLinks, setPublicLinks] = useState<HubPublicLink[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [categories, setCategories] = useState<HubCategory[]>([]);
  const [personOptions, setPersonOptions] = useState<{ label: string; value: string }[]>([]);
  const [practiceOptions, setPracticeOptions] = useState<{ label: string; value: string }[]>([]);
  const [dealOptions, setDealOptions] = useState<{ label: string; value: string }[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [linkExpiresAt, setLinkExpiresAt] = useState("");
  const [editForm, setEditForm] = useState(emptyForm);

  const columns = useMemo(
    () =>
      [
        {
          id: "title",
          accessorFn: (row: HubDocumentRow) => row.values.title,
          header: () => "Title",
          cell: ({ row }: { row: { original: HubDocumentRow } }) =>
            String(row.original.values.title || "-"),
        },
        {
          id: "categories",
          accessorFn: (row: HubDocumentRow) => row.values.categories,
          header: () => "Categories",
        },
        {
          id: "fileType",
          accessorFn: (row: HubDocumentRow) => row.values.fileType,
          header: () => "Type",
        },
        {
          id: "version",
          accessorFn: (row: HubDocumentRow) => row.values.version,
          header: () => "Ver",
        },
        {
          id: "downloads",
          accessorFn: (row: HubDocumentRow) => row.values.downloads,
          header: () => "Downloads",
        },
        {
          id: "uploadedBy",
          accessorFn: (row: HubDocumentRow) => row.values.uploadedBy,
          header: () => "Uploaded by",
        },
        {
          id: "createdAt",
          accessorFn: (row: HubDocumentRow) => row.values.createdAt,
          header: () => "Created",
        },
      ] as ColumnDef<HubDocumentRow>[],
    [],
  );

  const [pagination, setPagination] = useState({
    page: 1,
    limit: getResponsivePageSize(),
    total: 0,
    totalPages: 0,
  });
  const [userSelectedPageSize, setUserSelectedPageSize] = useState(false);

  type HubFilters = {
    search: string;
    categoryId: string;
    fileType: string;
    status: string;
  };
  const defaultFilters: HubFilters = {
    search: "",
    categoryId: "",
    fileType: "",
    status: "ACTIVE",
  };
  const [filters, setFilters] = useState<HubFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<HubFilters>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const activeSort = sorting[0];

  useEffect(() => {
    function handleResize() {
      if (!userSelectedPageSize) {
        setPagination((prev) => ({ ...prev, limit: getResponsivePageSize() }));
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [userSelectedPageSize]);

  useEffect(() => {
    Promise.all([
      listHubCategories(),
      listPersonOptions(),
      getAllPractices(),
      getAllDeals(),
    ])
      .then(([nextCategories, persons, practices, deals]) => {
        setCategories(nextCategories);
        setPersonOptions(persons);
        setPracticeOptions(
          practices.map((practice) => ({ value: practice.id, label: practice.name })),
        );
        setDealOptions(
          deals.map((deal) => ({
            value: deal.id,
            label: `${deal.practice?.name || "Deal"} · ${deal.stage}`,
          })),
        );
      })
      .catch(() => undefined);
  }, []);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  function mapSort() {
    if (activeSort?.id === "title") return "alphabetical";
    if (activeSort?.id === "downloads") return "mostDownloaded";
    if (activeSort?.id === "createdAt" && !activeSort.desc) return "oldest";
    return "newest";
  }

  const refreshRecords = async () => {
    try {
      setIsLoading(true);
      const params: DocumentHubQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
        sort: mapSort(),
        status: filters.status || "ACTIVE",
        ...(searchInput.trim() && { search: searchInput.trim() }),
        ...(filters.categoryId && { categoryId: filters.categoryId }),
        ...(filters.fileType && { fileType: filters.fileType }),
      };
      const data = await getDocumentsView(params);
      setRows(data.rows);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshRecords();
    }, 400);
    return () => clearTimeout(timer);
  }, [
    pagination.page,
    pagination.limit,
    searchInput,
    filters.categoryId,
    filters.fileType,
    filters.status,
    activeSort?.id,
    activeSort?.desc,
  ]);

  async function loadDetail(id: string) {
    setIsDetailLoading(true);
    try {
      const { document, versionHistory: history } = await getHubDocument(id);
      setSelectedDocument(document);
      setVersionHistory(history);
      setEditForm({
        title: document.title,
        description: document.description || "",
        categoryIds: document.categories.map((item) => item.id),
        tags: document.tags.map((item) => item.name).join(", "),
        personIds: document.persons.map((item) => item.id),
        practiceIds: document.practices.map((item) => item.id),
        dealIds: document.deals.map((item) => item.id),
        isPublicShareable: document.isPublicShareable,
      });
      const links = await listPublicLinks(id);
      setPublicLinks(links);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch document");
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
    await loadDetail(rowId);
  }

  function openCreateForm() {
    setShowCreateForm(true);
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setFormData(emptyForm);
    setUploadFile(null);
  }

  function buildFormPayload(source: typeof emptyForm, file: File) {
    const payload = new FormData();
    payload.append("file", file);
    payload.append("title", source.title.trim());
    payload.append("description", source.description.trim());
    payload.append("categoryIds", JSON.stringify(source.categoryIds));
    payload.append(
      "tags",
      JSON.stringify(
        source.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    );
    payload.append("personIds", JSON.stringify(source.personIds));
    payload.append("practiceIds", JSON.stringify(source.practiceIds));
    payload.append("dealIds", JSON.stringify(source.dealIds));
    payload.append("isPublicShareable", String(source.isPublicShareable));
    return payload;
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!uploadFile) {
      toast.error("A file is required.");
      return;
    }
    if (!formData.title.trim() || formData.categoryIds.length === 0) {
      toast.error("Title and at least one category are required.");
      return;
    }
    try {
      setIsSubmitting(true);
      const result = await uploadHubDocument(buildFormPayload(formData, uploadFile));
      if (result.duplicateOf?.length) {
        toast(
          `Uploaded. Similar file already exists: ${result.duplicateOf[0].title}`,
          { icon: "⚠️" },
        );
      } else {
        toast.success("Document uploaded.");
      }
      setShowCreateForm(false);
      await refreshRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedDocument) return;
    try {
      setIsSaving(true);
      await updateHubDocument(selectedDocument.id, {
        title: editForm.title.trim(),
        description: editForm.description,
        categoryIds: editForm.categoryIds,
        tags: editForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        personIds: editForm.personIds,
        practiceIds: editForm.practiceIds,
        dealIds: editForm.dealIds,
        isPublicShareable: editForm.isPublicShareable,
      });
      toast.success("Document updated.");
      await loadDetail(selectedDocument.id);
      await refreshRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDownload(id: string) {
    try {
      const result = await downloadHubDocument(id);
      window.open(result.sasUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function handleCreateLink() {
    if (!selectedDocument) return;
    try {
      const link = await createPublicLinkApi(selectedDocument.id, {
        expiresAt: linkExpiresAt || null,
        allowDownload: true,
      });
      await navigator.clipboard.writeText(link.url);
      toast.success("Public link created and copied.");
      setPublicLinks(await listPublicLinks(selectedDocument.id));
      setLinkExpiresAt("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create link");
    }
  }

  async function handleArchive() {
    if (!selectedDocument) return;
    if (!window.confirm("Archive this document? It will be hidden from the default list.")) return;
    try {
      setIsDeleting(true);
      await archiveHubDocument(selectedDocument.id);
      toast.success("Document archived.");
      setShowDetailPanel(false);
      await refreshRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Archive failed");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleHardDelete() {
    if (!selectedDocument) return;
    if (!window.confirm("Permanently delete this document and all versions? This cannot be undone.")) {
      return;
    }
    try {
      setIsDeleting(true);
      await hardDeleteHubDocument(selectedDocument.id);
      toast.success("Document deleted.");
      setShowDetailPanel(false);
      await refreshRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleVersionUpload() {
    if (!selectedDocument || !versionFile) {
      toast.error("Choose a file for the new version.");
      return;
    }
    try {
      setIsSaving(true);
      await uploadHubDocumentVersion(selectedDocument.id, (() => {
        const payload = new FormData();
        payload.append("file", versionFile);
        return payload;
      })());
      toast.success("New version uploaded.");
      setVersionFile(null);
      await refreshRecords();
      const latest = await getDocumentsView({ search: selectedDocument.title, limit: 1 });
      if (latest.documents[0]) {
        await loadDetail(latest.documents[0].id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Version upload failed");
    } finally {
      setIsSaving(false);
    }
  }

  const activeFilterCount = [filters.categoryId, filters.fileType, filters.status !== "ACTIVE" ? filters.status : ""]
    .filter(Boolean).length;

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.categoryId) {
      const name = categories.find((item) => item.id === filters.categoryId)?.name || "Category";
      chips.push({
        key: "categoryId",
        label: "Category",
        displayValue: name,
        onClear: () => {
          setFilters((curr) => ({ ...curr, categoryId: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.fileType) {
      chips.push({
        key: "fileType",
        label: "Type",
        displayValue: filters.fileType.toUpperCase(),
        onClear: () => {
          setFilters((curr) => ({ ...curr, fileType: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.status && filters.status !== "ACTIVE") {
      chips.push({
        key: "status",
        label: "Status",
        displayValue: filters.status,
        onClear: () => {
          setFilters((curr) => ({ ...curr, status: "ACTIVE" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    return chips;
  }, [filters, categories]);

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Category</span>
        <Select
          value={draftFilters.categoryId}
          onChange={(val) => setDraftFilters((prev) => ({ ...prev, categoryId: val }))}
          options={[
            { label: "All categories", value: "" },
            ...categories.map((item) => ({ label: item.name, value: item.id })),
          ]}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">File type</span>
        <Select
          value={draftFilters.fileType}
          onChange={(val) => setDraftFilters((prev) => ({ ...prev, fileType: val }))}
          options={[
            { label: "All types", value: "" },
            { label: "PDF", value: "pdf" },
            { label: "DOCX", value: "docx" },
            { label: "XLSX", value: "xlsx" },
            { label: "PPTX", value: "pptx" },
            { label: "PNG", value: "png" },
            { label: "JPG", value: "jpg" },
          ]}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Status</span>
        <Select
          value={draftFilters.status}
          onChange={(val) => setDraftFilters((prev) => ({ ...prev, status: val }))}
          options={[
            { label: "Active", value: "ACTIVE" },
            { label: "Archived", value: "ARCHIVED" },
            { label: "All", value: "ALL" },
          ]}
        />
      </label>
    </>
  );

  function metadataFields(
    source: typeof emptyForm,
    setSource: (next: typeof emptyForm) => void,
    disabled: boolean,
  ) {
    return (
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={source.title}
            onChange={(event) => setSource({ ...source, title: event.target.value })}
            readOnly={disabled}
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">Description</label>
          <textarea
            value={source.description}
            onChange={(event) => setSource({ ...source, description: event.target.value })}
            readOnly={disabled}
            rows={3}
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Categories <span className="text-red-500">*</span>
          </label>
          <MultiSelect
            value={source.categoryIds}
            onChange={(value) => setSource({ ...source, categoryIds: value })}
            options={categories.map((item) => ({ label: item.name, value: item.id }))}
            disabled={disabled}
            placeholder="Select categories"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">Tags</label>
          <input
            type="text"
            value={source.tags}
            onChange={(event) => setSource({ ...source, tags: event.target.value })}
            readOnly={disabled}
            placeholder="spanish, rcm, 2026"
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-slate-700">
          <input
            type="checkbox"
            checked={source.isPublicShareable}
            disabled={disabled}
            onChange={(event) =>
              setSource({ ...source, isPublicShareable: event.target.checked })
            }
          />
          Allow public sharing
        </label>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">People</label>
          <MultiSelect
            value={source.personIds}
            onChange={(value) => setSource({ ...source, personIds: value })}
            options={personOptions}
            disabled={disabled}
            placeholder="Link people"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">Practices</label>
          <MultiSelect
            value={source.practiceIds}
            onChange={(value) => setSource({ ...source, practiceIds: value })}
            options={practiceOptions}
            disabled={disabled}
            placeholder="Link practices"
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">Deals</label>
          <MultiSelect
            value={source.dealIds}
            onChange={(value) => setSource({ ...source, dealIds: value })}
            options={dealOptions}
            disabled={disabled}
            placeholder="Link deals"
          />
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      title="Document Hub"
      activeModule="Document Hub"
      activeSubItem="Library"
      navbarIcon={<FolderOpen className="h-4 w-4 text-slate-500" />}
      navbarActions={
        canManage
          ? [{ label: "Upload", icon: <Plus className="h-4 w-4" />, onClick: openCreateForm }]
          : []
      }
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="Document Hub"
            subtitle="Organization collateral"
            searchPlaceholder="Search title, description, tags, filename..."
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={() => {
              setFilters(defaultFilters);
              setDraftFilters(defaultFilters);
              setSearchInput("");
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            onApplyFilters={() => {
              setFilters(draftFilters);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            onOpenFilterModal={() => setDraftFilters(filters)}
            filterModalTitle="Filter documents"
            filterFields={filterFieldsModal}
            addNewLabel={canManage ? "Upload document" : undefined}
            onAddNew={canManage ? openCreateForm : undefined}
            onRefresh={refreshRecords}
            isLoading={isLoading}
            isSaving={isSaving}
            isDeleting={isDeleting}
            page={pagination.page}
            pageSize={pagination.limit}
            totalRecords={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
            onPageSizeChange={(newSize) => {
              setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }));
              setUserSelectedPageSize(true);
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              {rows.length === 0 ? (
                <div className="relative flex min-h-[400px] items-center justify-center">
                  <div className="flex max-w-md flex-col items-center px-6 text-center">
                    <EmptyStateIllustration />
                    <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                      No documents found
                    </h2>
                    <p className="mt-2 text-[14px] text-slate-400">
                      Upload collateral so the team can find and share it.
                    </p>
                    {canManage && (
                      <button
                        type="button"
                        onClick={openCreateForm}
                        className="app-control mt-5 inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Upload document
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <table className="min-w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-4 py-3 text-left font-medium last:border-r-0"
                          >
                            <SortableHeaderCell header={header} />
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => {
                      const isSelected = row.original.id === selectedRowId;
                      return (
                        <tr
                          key={row.id}
                          onClick={() => handleRowClick(row.original.id)}
                          className={`cursor-pointer ${isSelected ? "bg-[#fcfbf9]" : "bg-white hover:bg-[#faf9f7]"}`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-4 py-3 text-[13px] text-slate-600 last:border-r-0"
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </DataTableToolbar>
        </section>

        {showDetailPanel && selectedRowId && (
          <aside className="app-panel app-detail-panel relative flex w-full max-w-full lg:w-[420px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
              <button
                type="button"
                onClick={() => setShowDetailPanel(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <Circle className="h-4 w-4 text-slate-300" />
              <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
                {selectedDocument?.title || "Document"}
              </span>
            </div>
            {isDetailLoading || !selectedDocument ? (
              <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
                Loading document...
              </div>
            ) : (
              <form onSubmit={handleSave} className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-auto p-4 space-y-4">
                  <DetailCard
                    title={selectedDocument.title}
                    badge={{
                      label: `v${selectedDocument.version}`,
                      className: "bg-blue-100 text-blue-700",
                    }}
                    infoRows={[
                      { label: "File", value: selectedDocument.originalFilename },
                      { label: "Downloads", value: String(selectedDocument.downloadCount) },
                    ]}
                  />
                  <button
                    type="button"
                    onClick={() => handleDownload(selectedDocument.id)}
                    className="app-control inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#ece8e1] px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-[#f7f5f1]"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  {metadataFields(editForm, setEditForm, !canManage)}

                  {canShare && selectedDocument.isPublicShareable && (
                    <div className="rounded-xl border border-[#eadfcd] p-3 space-y-2">
                      <p className="text-[13px] font-semibold text-slate-700">Public link</p>
                      <input
                        type="datetime-local"
                        value={linkExpiresAt}
                        onChange={(event) => setLinkExpiresAt(event.target.value)}
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                      <button
                        type="button"
                        onClick={handleCreateLink}
                        className="app-control inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#4f63ea] px-3 py-2 text-[13px] font-medium text-white"
                      >
                        <Link2 className="h-4 w-4" />
                        Create & copy link
                      </button>
                      {publicLinks.map((link) => (
                        <div
                          key={link.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-[#fbfaf8] px-2 py-1.5 text-[12px] text-slate-600"
                        >
                          <span className="truncate">
                            {link.revokedAt ? "Revoked" : link.url} · {link.viewCount} views
                          </span>
                          <span className="flex shrink-0 gap-1">
                            {!link.revokedAt && (
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(link.url).then(() => toast.success("Copied"))}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {canManage && !link.revokedAt && (
                              <button
                                type="button"
                                onClick={async () => {
                                  await revokePublicLinkApi(link.id);
                                  setPublicLinks(await listPublicLinks(selectedDocument.id));
                                  toast.success("Link revoked");
                                }}
                              >
                                <X className="h-3.5 w-3.5 text-red-500" />
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-[13px] font-semibold text-slate-700">Version history</p>
                    <div className="space-y-1.5">
                      {versionHistory.map((version) => (
                        <div
                          key={version.id}
                          className="rounded-lg border border-[#f0ece6] px-3 py-2 text-[12px] text-slate-600"
                        >
                          v{version.version} · {version.originalFilename} ·{" "}
                          {new Date(version.createdAt).toLocaleString()}
                        </div>
                      ))}
                    </div>
                    {canManage && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="file"
                          accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg"
                          onChange={(event) => setVersionFile(event.target.files?.[0] || null)}
                          className="text-[12px]"
                        />
                        <button
                          type="button"
                          onClick={handleVersionUpload}
                          className="rounded-md border border-[#ece8e1] px-2 py-1 text-[12px]"
                        >
                          <Upload className="inline h-3.5 w-3.5" /> New version
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleArchive}
                        disabled={isDeleting}
                        className="flex items-center gap-1 text-[13px] text-amber-600"
                      >
                        Archive
                      </button>
                      <button
                        type="button"
                        onClick={handleHardDelete}
                        disabled={isDeleting}
                        className="flex items-center gap-1 text-[13px] text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="app-control inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </form>
            )}
          </aside>
        )}

        {showCreateForm && canManage && (
          <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[420px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
              <h2 className="text-[15px] font-semibold text-slate-700">Upload document</h2>
              <button type="button" onClick={() => setShowCreateForm(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-auto p-4">
              <label className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#eadfcd] bg-[#fbfaf8] px-4 py-6 text-center">
                <Upload className="mb-2 h-5 w-5 text-slate-400" />
                <span className="text-[13px] text-slate-600">
                  {uploadFile ? uploadFile.name : "Drop or click to choose a file"}
                </span>
                <span className="mt-1 text-[11px] text-slate-400">PDF, DOCX, XLSX, PPTX, PNG, JPG · 25MB</span>
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
                />
              </label>
              {metadataFields(formData, setFormData, false)}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="app-control rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
                >
                  {isSubmitting ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </AppLayout>
  );
}

export default DocumentHubPage;
