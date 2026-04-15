import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  CalendarDays,
  ChevronDown,
  FileText,
  LayoutGrid,
  SlidersHorizontal,
  Circle,
  Plus,
  Building2,
  X,
  Pencil,
  Save,
  Mail,
  Phone,
  UserCircle,
  Shield,
  Star,
  Trash2,
} from "lucide-react";
import type { PersonBody } from "../../components/contact/types";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import { getStandardNavbarActions } from "../shared/PageComponents";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import type { PersonCellValue, PersonRow, PersonViewData } from "./types";
import {
  createPersonApi,
  deletePersonApi,
  getPersonsView,
  updatePersonApi,
  type PersonQueryParams,
} from "../../services/operations/persons";
import { getAllPractices } from "../../services/operations/practices";
import type { Practice } from "../practices/types";
import toast from "react-hot-toast";

function getCellDisplayValue(value: PersonCellValue): string {
  if (value === null || value === undefined) return "-";
  return String(value);
}

type PersonFormData = {
  firstName: string;
  lastName: string;
  role: string;
  influence: string;
  email: string;
  phone: string;
  practiceId: string;
};

const initialFormData: PersonFormData = {
  firstName: "",
  lastName: "",
  role: "ADMIN",
  influence: "MEDIUM",
  email: "",
  phone: "",
  practiceId: "",
};

const roleOptions = [
  "OWNER",
  "ADMIN",
  "FINANCE",
  "OPERATIONS",
  "CLINICAL",
  "PROCUREMENT",
  "OTHER",
];
const influenceOptions = ["LOW", "MEDIUM", "HIGH", "DECISION_MAKER"];

export default function PersonsPage() {
  const [viewData, setViewData] = useState<PersonViewData | null>(null);
  const [rows, setRows] = useState<PersonRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewId, setViewId] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "creationDate", desc: true },
  ]);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [columnVisibility, setColumnVisibility] = useState<
    Record<string, boolean>
  >({});
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<PersonFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [practicesLoading, setPracticesLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    influence: "",
    practiceId: "",
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  const whenToSearch = filters.search.length > 3 || filters.search.length === 0;

  const disableMe =
    !filters.search &&
    !filters.role &&
    !filters.influence &&
    !filters.practiceId;

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const params: PersonQueryParams = {
          page: pagination.page,
          limit: pagination.limit,
          ...(filters.search && { search: filters.search }),
          ...(filters.role && { role: filters.role }),
          ...(filters.influence && { influence: filters.influence }),
          ...(filters.practiceId && { practiceId: filters.practiceId }),
          sortBy: sorting[0]?.id || "createdAt",
          sortOrder: sorting[0]?.desc ? "desc" : "asc",
        };
        const data = await getPersonsView(params);
        setViewData(data);
        setRows(data.rows);
        setPagination(data.pagination);
        const visibility: Record<string, boolean> = {};
        data.fields.forEach((field) => {
          visibility[field.id] = field.visible;
        });
        setColumnVisibility(visibility);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load persons";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }
    if (whenToSearch) {
      loadData();
    }
  }, [pagination.page, pagination.limit, sorting, filters]);

  // useEffect(() => {
  //   setPagination((prev) => ({ ...prev, page: 1 }));
  // }, [filters]);

  useEffect(() => {
    if (selectedRow && !showCreateForm) {
      const values = selectedRow.values;
      setFormData({
        firstName: String(values.firstName || ""),
        lastName: String(values.lastName || ""),
        role: String(values.role || "ADMIN"),
        influence: String(values.influence || "MEDIUM"),
        email: String(values.email || ""),
        phone: String(values.phone || ""),
        practiceId: String(values.practiceId || ""),
      });
      setIsEditing(false);
    }
  }, [selectedRow, showCreateForm]);

  const visibleFields = useMemo(() => {
    if (!viewData) return [];
    return viewData.fields.filter((f) => columnVisibility[f.id] !== false);
  }, [viewData, columnVisibility]);

  const columns = useMemo<ColumnDef<PersonRow>[]>(() => {
    const cols: ColumnDef<PersonRow>[] = [
      {
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={
              rows.length > 0 && rows.every((row) => selectedIds[row.id])
            }
            onChange={(event) =>
              setSelectedIds(
                event.target.checked
                  ? Object.fromEntries(rows.map((row) => [row.id, true]))
                  : {},
              )
            }
            className="h-4 w-4 rounded border border-[#cec8bf]"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={Boolean(selectedIds[row.original.id])}
            onChange={(event) =>
              setSelectedIds((current) => ({
                ...current,
                [row.original.id]: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border border-[#cec8bf]"
          />
        ),
        enableSorting: false,
        size: 42,
      },
      ...visibleFields.map((field) => {
        const iconMap: Record<string, React.ReactNode> = {
          fullName: <UserCircle className="h-3.5 w-3.5 text-slate-400" />,
          role: <Shield className="h-3.5 w-3.5 text-slate-400" />,
          influence: <Star className="h-3.5 w-3.5 text-slate-400" />,
          email: <Mail className="h-3.5 w-3.5 text-slate-400" />,
          phone: <Phone className="h-3.5 w-3.5 text-slate-400" />,
          practiceName: <Building2 className="h-3.5 w-3.5 text-slate-400" />,
          creationDate: <CalendarDays className="h-3.5 w-3.5 text-slate-400" />,
          lastUpdate: (
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
          ),
        };

        return {
          id: field.id,
          accessorFn: (row: PersonRow) =>
            getCellDisplayValue(row.values[field.id]),
          header: () => (
            <div className="flex items-center gap-2">
              {iconMap[field.id] || (
                <FileText className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span>{field.label}</span>
            </div>
          ),
          cell: ({ row }: { row: { original: PersonRow } }) => {
            const value = row.original.values[field.id];
            if (field.id === "role") {
              const roleColors: Record<string, string> = {
                OWNER: "bg-purple-100 text-purple-700",
                ADMIN: "bg-blue-100 text-blue-700",
                FINANCE: "bg-green-100 text-green-700",
                OPERATIONS: "bg-orange-100 text-orange-700",
                CLINICAL: "bg-cyan-100 text-cyan-700",
                PROCUREMENT: "bg-yellow-100 text-yellow-700",
                OTHER: "bg-gray-100 text-gray-700",
              };
              return (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[String(value)] || ""}`}
                >
                  {String(value)}
                </span>
              );
            }
            if (field.id === "influence") {
              const influenceColors: Record<string, string> = {
                LOW: "bg-gray-100 text-gray-700",
                MEDIUM: "bg-blue-100 text-blue-700",
                HIGH: "bg-green-100 text-green-700",
                DECISION_MAKER: "bg-purple-100 text-purple-700",
              };
              const displayValue = String(value).replace("_", " ");
              return (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${influenceColors[String(value)] || ""}`}
                >
                  {displayValue}
                </span>
              );
            }
            if (field.id === "email" && value) {
              return (
                <a
                  href={`mailto:${value}`}
                  className="text-[#4f63ea] hover:underline"
                >
                  {String(value)}
                </a>
              );
            }
            return (
              <span className="truncate">{getCellDisplayValue(value)}</span>
            );
          },
          size: field.id === "fullName" ? 200 : 150,
        };
      }),
      {
        id: "add",
        header: () => <span />,
        cell: () => null,
        enableSorting: false,
        size: 44,
      },
    ];
    return cols;
  }, [visibleFields, rows, selectedIds]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
  });

  async function openCreateForm() {
    setFormData(initialFormData);
    setShowCreateForm(true);
    setShowDetailPanel(false);

    if (practices.length === 0) {
      setPracticesLoading(true);
      try {
        const practiceList = await getAllPractices();
        setPractices(practiceList);
      } catch (err) {
        console.error("Failed to load practices:", err);
      } finally {
        setPracticesLoading(false);
      }
    }
  }

  function closeCreateForm() {
    setShowCreateForm(false);
    setFormData(initialFormData);
  }

  function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setShowCreateForm(false);
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setIsEditing(false);
    setFormData(initialFormData);
  }

  function handleFormChange(field: keyof PersonFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    if (isEditing && practices.length === 0) {
      setPracticesLoading(true);
      getAllPractices()
        .then(setPractices)
        .catch((err) => console.error("Failed to load practices:", err))
        .finally(() => setPracticesLoading(false));
    }
  }, [isEditing]);

  useEffect(() => {
    if (showFilterPanel && practices.length === 0) {
      setPracticesLoading(true);
      getAllPractices()
        .then(setPractices)
        .catch((err) => console.error("Failed to load practices:", err))
        .finally(() => setPracticesLoading(false));
    }
  }, [showFilterPanel]);

  async function handleCreatePerson(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    if (!formData.practiceId) {
      toast.error("Please select a practice");
      return;
    }

    setIsSubmitting(true);
    try {
      const personData: PersonBody = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role as PersonBody["role"],
        influence: formData.influence as PersonBody["influence"],
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        practiceId: formData.practiceId,
      };

      await createPersonApi(personData);
      const params: PersonQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
      };
      const allPersonsAfterCreate = await getPersonsView(params);

      setRows(allPersonsAfterCreate.rows);
      setPagination(allPersonsAfterCreate.pagination);
      closeCreateForm();
      toast.success("Person created successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create person";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdatePerson(e: React.FormEvent) {
    e.preventDefault();
    if (
      !selectedRow ||
      !formData.firstName.trim() ||
      !formData.lastName.trim()
    ) {
      toast.error("First name and last name are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const personData: Partial<PersonBody> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role as PersonBody["role"],
        influence: formData.influence as PersonBody["influence"],
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
      };

      await updatePersonApi(selectedRow.id, personData);
      const params: PersonQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
      };
      const allPersonsAfterUpdate = await getPersonsView(params);
      setRows(allPersonsAfterUpdate.rows);
      setPagination(allPersonsAfterUpdate.pagination);
      setIsEditing(false);
      toast.success("Person updated successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update person";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePerson() {
    if (!selectedRow) return;

    if (!window.confirm("Are you sure you want to delete this person?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePersonApi(selectedRow.id);
      const params: PersonQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
      };
      const data = await getPersonsView(params);
      setRows(data.rows);
      setPagination(data.pagination);
      closeDetailPanel();
      toast.success("Person deleted successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete person";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const views = [
    {
      id: "all",
      label: "All Persons",
      sort: [{ id: "creationDate", desc: true }] as SortingState,
    },
    {
      id: "recent",
      label: "Recently Updated",
      sort: [{ id: "lastUpdate", desc: true }] as SortingState,
    },
  ];

  function changeView(nextViewId: string) {
    setViewId(nextViewId);
    const nextView = views.find((v) => v.id === nextViewId) ?? views[0];
    setSorting(nextView.sort);
  }

  // const renderDetailView = () => {
  //   if (!selectedRow) return null;
  //   const values = selectedRow.values;

  //   return (
  //     <div className="space-y-4">
  //       <div className="flex items-center justify-between">
  //         <h3 className="text-[13px] font-medium text-slate-700">
  //           Person Details
  //         </h3>
  //         <button
  //           type="button"
  //           onClick={() => setIsEditing(!isEditing)}
  //           className="flex items-center gap-1 text-[13px] text-[#4f63ea] hover:text-[#3d4ed1]"
  //         >
  //           <Pencil className="h-3.5 w-3.5" />
  //           {isEditing ? "Cancel" : "Edit"}
  //         </button>
  //       </div>

  //       <div className="space-y-3">
  //         <div className="flex items-center gap-2 text-[13px]">
  //           <span className="w-24 text-slate-400">Name:</span>
  //           <span className="font-medium text-slate-700">
  //             {String(values.firstName || "")} {String(values.lastName || "")}
  //           </span>
  //         </div>

  //         <div className="flex items-center gap-2 text-[13px]">
  //           <span className="w-24 text-slate-400">Role:</span>
  //           <span
  //             className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
  //               String(values.role) === "OWNER"
  //                 ? "bg-purple-100 text-purple-700"
  //                 : String(values.role) === "ADMIN"
  //                   ? "bg-blue-100 text-blue-700"
  //                   : String(values.role) === "FINANCE"
  //                     ? "bg-green-100 text-green-700"
  //                     : String(values.role) === "OPERATIONS"
  //                       ? "bg-orange-100 text-orange-700"
  //                       : String(values.role) === "CLINICAL"
  //                         ? "bg-cyan-100 text-cyan-700"
  //                         : String(values.role) === "PROCUREMENT"
  //                           ? "bg-yellow-100 text-yellow-700"
  //                           : "bg-gray-100 text-gray-700"
  //             }`}
  //           >
  //             {String(values.role || "-")}
  //           </span>
  //         </div>

  //         <div className="flex items-center gap-2 text-[13px]">
  //           <span className="w-24 text-slate-400">Influence:</span>
  //           <span
  //             className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
  //               String(values.influence) === "LOW"
  //                 ? "bg-gray-100 text-gray-700"
  //                 : String(values.influence) === "MEDIUM"
  //                   ? "bg-blue-100 text-blue-700"
  //                   : String(values.influence) === "HIGH"
  //                     ? "bg-green-100 text-green-700"
  //                     : "bg-purple-100 text-purple-700"
  //             }`}
  //           >
  //             {String(values.influence || "-").replace("_", " ")}
  //           </span>
  //         </div>

  //         <div className="flex items-center gap-2 text-[13px]">
  //           <span className="w-24 text-slate-400">Email:</span>
  //           {values.email ? (
  //             <a
  //               href={`mailto:${values.email}`}
  //               className="text-[#4f63ea] hover:underline"
  //             >
  //               {String(values.email)}
  //             </a>
  //           ) : (
  //             <span className="text-slate-700">-</span>
  //           )}
  //         </div>

  //         <div className="flex items-center gap-2 text-[13px]">
  //           <span className="w-24 text-slate-400">Phone:</span>
  //           <span className="text-slate-700">
  //             {String(values.phone || "-")}
  //           </span>
  //         </div>

  //         <div className="flex items-center gap-2 text-[13px]">
  //           <span className="w-24 text-slate-400">Practice:</span>
  //           <span className="text-slate-700">
  //             {String(values.practiceName || "-")}
  //           </span>
  //         </div>
  //       </div>

  //       <div className="border-t border-[#f0ece6] pt-4">
  //         <button
  //           type="button"
  //           onClick={handleDeletePerson}
  //           disabled={isDeleting}
  //           className="flex items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
  //         >
  //           {isDeleting ? "Deleting..." : "Delete Person"}
  //         </button>
  //       </div>
  //     </div>
  //   );
  // };

  const renderDetailEditForm = () => {
    if (!selectedRow) return null;

    return (
      <form onSubmit={handleUpdatePerson} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleFormChange("firstName", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleFormChange("lastName", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleFormChange("role", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Influence
            </label>
            <select
              value={formData.influence}
              onChange={(e) => handleFormChange("influence", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            >
              {influenceOptions.map((influence) => (
                <option key={influence} value={influence}>
                  {influence.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Phone
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => handleFormChange("phone", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
          <button
            type="button"
            onClick={handleDeletePerson}
            disabled={isDeleting}
            className="flex items-center cursor-pointer gap-2 text-[13px] text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="app-control inline-flex items-center gap-2 cursor-pointer rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#4f63ea] hover:text-white disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    );
  };

  if (isLoading) {
    return (
      <AppLayout
        title="Persons"
        activeModule="Persons"
        activeSubItem="All Persons"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading persons...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout
        title="Persons"
        activeModule="Persons"
        activeSubItem="All Persons"
      >
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="text-red-500">{error}</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="app-control rounded-md px-4 py-2 text-[14px] font-medium"
          >
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Persons"
      activeModule="Persons"
      activeSubItem="All Persons"
      navbarIcon={<UserCircle className="h-4 w-4 text-slate-500" />}
      navbarActions={getStandardNavbarActions(openCreateForm)}
    >
      <div className="flex h-full gap-2">
        <div className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <div className="relative">
              <LayoutGrid className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              {/*<ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />*/}
              <div className="min-w-56 appearance-none rounded-md bg-transparent py-1.5 pl-8 pr-10 text-[14px] font-medium text-slate-700 outline-none">
                All Persons
              </div>
              {/*<select
                value={viewId}
                onChange={(e) => changeView(e.target.value)}
                className="min-w-56 appearance-none rounded-md bg-transparent py-1.5 pl-8 pr-10 text-[14px] font-medium text-slate-700 outline-none"
              >
                {views.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.label}
                  </option>
                ))}
              </select>*/}
            </div>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                Filters
              </button>
              <button
                type="button"
                onClick={() =>
                  setSorting((current) =>
                    current[0]?.id === "creationDate"
                      ? [{ id: "creationDate", desc: !current[0].desc }]
                      : [{ id: "creationDate", desc: true }],
                  )
                }
              >
                Sort
              </button>
              {/*<button type="button">Columns</button>*/}
            </div>
          </div>

          {showFilterPanel && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] bg-[#faf9f7] px-4 py-2.5">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.search}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, search: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              />
              <select
                value={filters.role}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, role: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Roles</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <select
                value={filters.influence}
                onChange={(e) => {
                  setFilters((prev) => ({
                    ...prev,
                    influence: e.target.value,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Influence</option>
                {influenceOptions.map((influence) => (
                  <option key={influence} value={influence}>
                    {influence.replace("_", " ")}
                  </option>
                ))}
              </select>
              {practices.length > 0 && (
                <select
                  value={filters.practiceId}
                  onChange={(e) => {
                    setFilters((prev) => ({
                      ...prev,
                      practiceId: e.target.value,
                    }));
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="app-control rounded-md px-3 py-1.5 text-[13px]"
                >
                  <option value="">All Practices</option>
                  {practices.map((practice) => (
                    <option key={practice.id} value={practice.id}>
                      {practice.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    search: "",
                    role: "",
                    influence: "",
                    practiceId: "",
                  })
                }
                disabled={disableMe}
                className="text-[13px] text-[#4f63ea] hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-white">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-3 py-2 text-left text-[13px] font-medium text-slate-400 last:border-r-0"
                        style={{
                          width: header.getSize()
                            ? `${header.getSize()}px`
                            : undefined,
                        }}
                      >
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            onClick={
                              header.column.getCanSort()
                                ? header.column.getToggleSortingHandler()
                                : undefined
                            }
                            className={`flex w-full items-center gap-2 ${header.id === "select" ? "justify-center" : ""}`}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </button>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => handleRowClick(row.original.id)}
                    className={`cursor-pointer ${selectedRowId === row.original.id ? "bg-[#fcfbf9]" : "bg-white hover:bg-[#faf9f7]"}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-3 py-2 text-[13px] text-slate-600 last:border-r-0"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {rows.length === 0 ? (
              <div className="relative flex min-h-[520px] items-center justify-center">
                <div className="absolute inset-y-0 left-[42px] w-px bg-[#f7f2ec]" />
                <div className="flex max-w-md flex-col items-center px-6 text-center">
                  <EmptyStateIllustration />
                  <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                    Add your first Person
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    Use our API or add your first Person manually
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add a Person
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-b border-[#f4f1ec] px-4 py-2 text-[13px] text-slate-400">
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New
                </button>
              </div>
            )}
          </div>

          {rows.length > 0 && (
            <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-2.5">
              <div className="flex items-center gap-2 text-[13px] text-slate-500">
                <span>
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total,
                  )}{" "}
                  of {pagination.total}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Previous
                </button>
                {Array.from(
                  { length: pagination.totalPages },
                  (_, i) => i + 1,
                ).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setPagination((prev) => ({ ...prev, page }))}
                    className={`rounded px-2 py-1 text-[13px] ${
                      pagination.page === page
                        ? "bg-[#4f63ea] text-white"
                        : "text-slate-500 hover:bg-[#f0ece6]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                  className="rounded px-2 py-1 text-[13px] text-slate-500 hover:bg-[#f0ece6] disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {showDetailPanel && selectedRow && (
          <aside className="app-panel flex w-[380px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
              <button
                type="button"
                onClick={closeDetailPanel}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
              <Circle className="h-4 w-4 text-slate-300" />
              <h2 className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
                {String(selectedRow.values.firstName || "")}{" "}
                {String(selectedRow.values.lastName || "")}
              </h2>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {/*{isEditing ? renderDetailEditForm() : renderDetailView()}*/}
              {renderDetailEditForm()}
            </div>
          </aside>
        )}

        {showCreateForm && (
          <aside className="app-panel flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
              <h2 className="text-[15px] font-semibold text-slate-700">
                Create Person
              </h2>
              <button
                type="button"
                onClick={closeCreateForm}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreatePerson}
              className="flex-1 overflow-auto p-4"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleFormChange("firstName", e.target.value)
                      }
                      placeholder="John"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleFormChange("lastName", e.target.value)
                      }
                      placeholder="Doe"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Role
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleFormChange("role", e.target.value)}
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Influence
                    </label>
                    <select
                      value={formData.influence}
                      onChange={(e) =>
                        handleFormChange("influence", e.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      {influenceOptions.map((influence) => (
                        <option key={influence} value={influence}>
                          {influence.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleFormChange("email", e.target.value)
                      }
                      placeholder="john@example.com"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) =>
                        handleFormChange("phone", e.target.value)
                      }
                      placeholder="+1 (555) 123-4567"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Practice <span className="text-red-500">*</span>
                  </label>
                  {practicesLoading ? (
                    <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                      Loading practices...
                    </div>
                  ) : (
                    <select
                      value={formData.practiceId}
                      onChange={(e) =>
                        handleFormChange("practiceId", e.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    >
                      <option value="">-- Select a Practice --</option>
                      {practices.map((practice) => (
                        <option key={practice.id} value={practice.id}>
                          {practice.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="app-control rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Person"}
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </AppLayout>
  );
}
