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
  FileText,
  SlidersHorizontal,
  Circle,
  Plus,
  Building2,
  X,
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
import { DetailCard, EmptyStateIllustration } from "../shared/tablePageUtils";
import DataTableToolbar, {
  SortableHeaderCell,
  type ActiveFilterChip,
} from "../shared/DataTableToolbar";
import Select from "../shared/Select";
import { getResponsivePageSize } from "../shared/TablePagination";
import type { PersonCellValue, PersonRow, PersonViewData } from "./types";
import {
  createPersonApi,
  getPersonsView,
  getPerson,
  updatePersonApi,
  type PersonQueryParams,
  deletePersonApi,
} from "../../services/operations/persons";
import { getAllPractices } from "../../services/operations/practices";
import { getAllCompanies } from "../../services/operations/companies";
import type { Practice } from "../practices/types";
import toast from "react-hot-toast";
import { canBusinessWrite, readStoredUser } from "../../utils/auth";

function getCellDisplayValue(value: PersonCellValue): string {
  if (value === null || value === undefined) return "-";
  return String(value);
}

function normalizePhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function stripPhone(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidPersonPhone(value: string): boolean {
  return /^\d{10}$/.test(stripPhone(value));
}

function getSignedDocumentUrls(submission: {
  signedDocUrl?: string | null;
  signedDocUrls?: string | null;
}) {
  const rawValue = submission.signedDocUrl || submission.signedDocUrls;
  if (!rawValue) return [];

  const trimmed = rawValue.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (url): url is string => typeof url === "string" && Boolean(url),
      );
    }
  } catch {
    // Support plain string and comma-separated URL formats.
  }

  return trimmed
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

function getDocumentLabel(url: string, fallback: string) {
  try {
    const pathname = new URL(url).pathname;
    const filename = decodeURIComponent(pathname.split("/").pop() || "");
    return filename.replace(/\.pdf$/i, "") || fallback;
  } catch {
    return fallback;
  }
}

type Company = {
  id: string;
  name: string;
};

type PersonFormData = {
  firstName: string;
  lastName: string;
  role: string;
  influence: string;
  email: string;
  phone: string;
  practiceIds: string[];
  companyIds: string[];
  designation: string;
  status: string;
};

const initialFormData: PersonFormData = {
  firstName: "",
  lastName: "",
  role: "ADMIN",
  influence: "MEDIUM",
  email: "",
  phone: "",
  practiceIds: [],
  companyIds: [],
  designation: "",
  status: "ACTIVE",
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
const statusOptions = ["ACTIVE", "INACTIVE"];

export default function PersonsPage() {
  const currentRole = readStoredUser()?.role as string | undefined;
  const canWritePersons = canBusinessWrite(currentRole);
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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: getResponsivePageSize(),
    total: 0,
    totalPages: 0,
  });
  const [userSelectedPageSize, setUserSelectedPageSize] = useState(false);

  type PersonFilters = {
    search: string;
    role: string;
    influence: string;
    practiceId: string;
    practiceIds: string[];
  };

  const defaultFilters: PersonFilters = {
    search: "",
    role: "",
    influence: "",
    practiceId: "",
    practiceIds: [],
  };

  const [filters, setFilters] = useState<PersonFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<PersonFilters>(defaultFilters);
  const [searchInput, setSearchInput] = useState("");
  const [selectedPersonData, setSelectedPersonData] = useState<any>(null);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  const whenToSearch = searchInput.length > 3 || searchInput.length === 0;

  useEffect(() => {
    function handleResize() {
      if (!userSelectedPageSize) {
        const newSize = getResponsivePageSize();
        setPagination((prev) => ({ ...prev, limit: newSize }));
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [userSelectedPageSize]);

  const handleOpenFilterModal = () => {
    setDraftFilters(filters);
    if (practices.length === 0) {
      setPracticesLoading(true);
      getAllPractices()
        .then(setPractices)
        .catch((err) => console.error("Failed to load practices:", err))
        .finally(() => setPracticesLoading(false));
    }
  };

  const handleApplyFilters = () => {
    setFilters(draftFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setDraftFilters(defaultFilters);
    setSearchInput("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const activeFilterCount = [
    filters.role,
    filters.influence,
    filters.practiceId,
  ].filter(Boolean).length;

  const activeFilterChips = useMemo(() => {
    const chips: ActiveFilterChip[] = [];
    if (filters.role) {
      chips.push({
        key: "role",
        label: "Role",
        displayValue: filters.role,
        onClear: () => {
          setFilters((curr) => ({ ...curr, role: "" }));
          setDraftFilters((curr) => ({ ...curr, role: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.influence) {
      chips.push({
        key: "influence",
        label: "Influence",
        displayValue: filters.influence.replace("_", " "),
        onClear: () => {
          setFilters((curr) => ({ ...curr, influence: "" }));
          setDraftFilters((curr) => ({ ...curr, influence: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    if (filters.practiceId) {
      const practiceName =
        practices.find((practice) => practice.id === filters.practiceId)?.name ||
        filters.practiceId;
      chips.push({
        key: "practiceId",
        label: "Practice",
        displayValue: practiceName,
        onClear: () => {
          setFilters((curr) => ({ ...curr, practiceId: "" }));
          setDraftFilters((curr) => ({ ...curr, practiceId: "" }));
          setPagination((prev) => ({ ...prev, page: 1 }));
        },
      });
    }
    return chips;
  }, [filters, practices]);

  const refreshPersonRecords = async () => {
    if (!whenToSearch) return;

    try {
      setIsLoading(true);
      setError(null);
      const params: PersonQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
        ...(searchInput.trim() && { search: searchInput.trim() }),
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
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshPersonRecords();
    }, 400);

    return () => clearTimeout(timer);
  }, [
    pagination.page,
    pagination.limit,
    sorting,
    filters,
    searchInput,
    whenToSearch,
  ]);

  // useEffect(() => {
  //   setPagination((prev) => ({ ...prev, page: 1 }));
  // }, [filters]);

  useEffect(() => {
    if (selectedRow && !showCreateForm) {
      const values = selectedRow.values;
      const practiceIdsArray = Array.isArray(values.practiceIds)
        ? values.practiceIds
        : String(values.practiceIds || "")
            .split(",")
            .filter(Boolean);
      const companyIdsArray = Array.isArray(values.companyIds)
        ? values.companyIds
        : String(values.companyIds || "")
            .split(",")
            .filter(Boolean);
      setFormData({
        firstName: String(values.firstName || ""),
        lastName: String(values.lastName || ""),
        role: String(values.role || "ADMIN"),
        influence: String(values.influence || "MEDIUM"),
        email: String(values.email || ""),
        phone: normalizePhoneInput(String(values.phone || "")),
        practiceIds: practiceIdsArray,
        companyIds: companyIdsArray,
        designation: String(values.designation || ""),
        status: String(values.status || "ACTIVE"),
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
          status: <Circle className="h-3.5 w-3.5 text-slate-400" />,
          designation: <FileText className="h-3.5 w-3.5 text-slate-400" />,
          practiceNames: <Building2 className="h-3.5 w-3.5 text-slate-400" />,
          companyNames: <Building2 className="h-3.5 w-3.5 text-slate-400" />,
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
            if (field.id === "status") {
              const normalizedStatus = String(value || "ACTIVE").toUpperCase();
              const statusColors: Record<string, string> = {
                ACTIVE: "bg-green-100 text-green-700",
                INACTIVE: "bg-red-100 text-red-700",
              };
              return (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusColors[normalizedStatus] ||
                    "bg-gray-100 text-gray-700"
                  }`}
                >
                  {normalizedStatus}
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
            if (field.id === "practiceNames" && value) {
              const names = String(value).split(", ").filter(Boolean);
              return (
                <div className="flex flex-wrap gap-1">
                  {names.map((name, idx) => (
                    <span
                      key={idx}
                      className="inline-flex rounded-full bg-[#e8e5f9] px-2 py-0.5 text-xs text-[#4f63ea]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              );
            }
            if (field.id === "companyNames" && value) {
              const names = String(value).split(", ").filter(Boolean);
              return (
                <div className="flex flex-wrap gap-1">
                  {names.map((name, idx) => (
                    <span
                      key={idx}
                      className="inline-flex rounded-full bg-[#e8f5e9] px-2 py-0.5 text-xs text-[#2e7d32]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
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
    if (!canWritePersons) {
      toast.error("You do not have permission to create persons.");
      return;
    }
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

    if (companies.length === 0) {
      setCompaniesLoading(true);
      try {
        const companyList = await getAllCompanies();
        setCompanies(companyList);
      } catch (err) {
        console.error("Failed to load companies:", err);
      } finally {
        setCompaniesLoading(false);
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
    loadPersonDetails(rowId);
  }

  async function loadPersonDetails(id: string) {
    try {
      const person = await getPerson(id);
      setSelectedPersonData(person);
    } catch (err) {
      console.error("Failed to load person details:", err);
    }
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setIsEditing(false);
    setFormData(initialFormData);
  }

  function handleFormChange(
    field: keyof PersonFormData,
    value: string | string[],
  ) {
    setFormData((prev) => ({
      ...prev,
      [field]:
        field === "phone" && typeof value === "string"
          ? normalizePhoneInput(value)
          : value,
    }));
  }

  function handlePracticeToggle(practiceId: string) {
    setFormData((prev) => {
      const current = prev.practiceIds;
      if (current.includes(practiceId)) {
        return {
          ...prev,
          practiceIds: current.filter((id) => id !== practiceId),
        };
      } else {
        return { ...prev, practiceIds: [...current, practiceId] };
      }
    });
  }

  function handleCompanyToggle(companyId: string) {
    setFormData((prev) => {
      const current = prev.companyIds;
      if (current.includes(companyId)) {
        return {
          ...prev,
          companyIds: current.filter((id) => id !== companyId),
        };
      } else {
        return { ...prev, companyIds: [...current, companyId] };
      }
    });
  }

  useEffect(() => {
    if ((showDetailPanel || isEditing) && practices.length === 0) {
      setPracticesLoading(true);
      getAllPractices()
        .then(setPractices)
        .catch((err) => console.error("Failed to load practices:", err))
        .finally(() => setPracticesLoading(false));
    }
  }, [showDetailPanel, isEditing]);

  useEffect(() => {
    if ((showDetailPanel || isEditing) && companies.length === 0) {
      setCompaniesLoading(true);
      getAllCompanies()
        .then(setCompanies)
        .catch((err) => console.error("Failed to load companies:", err))
        .finally(() => setCompaniesLoading(false));
    }
  }, [showDetailPanel, isEditing]);

  async function handleCreatePerson(e: React.FormEvent) {
    e.preventDefault();
    if (!canWritePersons) {
      toast.error("You do not have permission to create persons.");
      return;
    }
    const trimmedPhone = stripPhone(formData.phone.trim());

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error("First name and last name are required");
      return;
    }
    // if (formData.practiceIds.length === 0) {
    //   toast.error("Please select at least one practice");
    //   return;
    // }
    if (trimmedPhone && !isValidPersonPhone(trimmedPhone)) {
      toast.error("Person phone must be exactly 10 digits.");
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
        phone: trimmedPhone || undefined,
        practiceIds: formData.practiceIds,
        companyIds: formData.companyIds,
        designation: formData.designation.trim() || undefined,
        status: formData.status,
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
    if (!canWritePersons) {
      toast.error("You do not have permission to update persons.");
      return;
    }
    const trimmedPhone = stripPhone(formData.phone.trim());

    if (
      !selectedRow ||
      !formData.firstName.trim() ||
      !formData.lastName.trim()
    ) {
      toast.error("First name and last name are required");
      return;
    }
    if (trimmedPhone && !isValidPersonPhone(trimmedPhone)) {
      toast.error("Person phone must be exactly 10 digits.");
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
        phone: trimmedPhone || "",
        designation: formData.designation.trim() || undefined,
        practiceIds: formData.practiceIds,
        companyIds: formData.companyIds,
        status: formData.status,
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
    if (!canWritePersons) {
      toast.error("You do not have permission to inactivate persons.");
      return;
    }

    if (formData.status === "INACTIVE") {
      toast.error("Person is Already Inactive");
      return;
    }

    if (!window.confirm("Are you sure you want to Inactivate this person?")) {
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
      toast.success("Person Inactivated successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to inactivate person";
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
  //             <span className="w-24 text-slate-400">Practices:</span>
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
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleFormChange("status", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              pattern="^[^\s@]+@[^\s@]+\.(com)$"
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
              type="tel"
              value={formData.phone}
              onChange={(e) => handleFormChange("phone", e.target.value)}
              inputMode="numeric"
              maxLength={12}
              pattern="\d{3}-?\d{3}-?\d{4}"
              title="Phone number must be exactly 10 digits"
              placeholder="XXX-XXX-XXXX"
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-600">
            Title
          </label>
          <input
            type="text"
            value={formData.designation}
            onChange={(e) => handleFormChange("designation", e.target.value)}
            placeholder="e.g. CEO, Manager, Director"
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
          />
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-600">
            Practices
          </label>
          {practicesLoading ? (
            <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
              Loading...
            </div>
          ) : (
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-[#e5e2d9] bg-white p-2">
              {practices.map((practice) => (
                <label
                  key={practice.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-[#f7f5f1]"
                >
                  <input
                    type="checkbox"
                    checked={formData.practiceIds.includes(practice.id)}
                    onChange={() => handlePracticeToggle(practice.id)}
                    className="h-4 w-4 rounded border border-[#cec8bf] text-[#4f63ea]"
                  />
                  <span className="text-[13px] text-slate-600">
                    {practice.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-600">
            Companies
          </label>
          {companiesLoading ? (
            <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
              Loading...
            </div>
          ) : (
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-[#e5e2d9] bg-white p-2">
              {companies.map((company) => (
                <label
                  key={company.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-[#f7f5f1]"
                >
                  <input
                    type="checkbox"
                    checked={formData.companyIds.includes(company.id)}
                    onChange={() => handleCompanyToggle(company.id)}
                    className="h-4 w-4 rounded border border-[#cec8bf] text-[#2e7d32]"
                  />
                  <span className="text-[13px] text-slate-600">
                    {company.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {selectedPersonData?.docusealSubmissions?.length > 0 &&
          (selectedPersonData.role === "OWNER" ||
            selectedPersonData.role === "ADMIN") && (
            <div>
              <label className="mb-1 block text-[12px] font-medium text-slate-600">
                Signed Agreements
              </label>
              <div className="space-y-2 rounded-md border border-[#e5e2d9] bg-white p-2">
                {selectedPersonData.docusealSubmissions
                  .filter(
                    (sub: any) =>
                      sub.status === "completed" || sub.status === "signed",
                  )
                  .flatMap((sub: any) =>
                    getSignedDocumentUrls(sub).map((url, index) => ({
                      id: `${sub.id}-signed-${index}`,
                      url,
                      label: getDocumentLabel(
                        url,
                        `Signed document ${index + 1}`,
                      ),
                      status: sub.status,
                      updatedAt: sub.updatedAt,
                    })),
                  )
                  .map(
                    (document: {
                      id: string;
                      url: string;
                      label: string;
                      status: string;
                      updatedAt: string;
                    }) => (
                      <div
                        key={document.id}
                        className="flex items-start justify-between gap-3 rounded px-2 py-2 hover:bg-[#f7f5f1]"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium text-slate-700 break-words">
                            {document.label}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {document.status} •{" "}
                            {new Date(document.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 whitespace-nowrap text-[11px] text-blue-600 hover:underline"
                        >
                          View PDF
                        </a>
                      </div>
                    ),
                  )}
              </div>
            </div>
          )}

        {canWritePersons && (
          <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
            <button
              type="button"
              onClick={handleDeletePerson}
              disabled={isDeleting}
              className="flex items-center cursor-pointer gap-2 text-[13px] text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Inactivating..." : "Inactive"}
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
        )}
      </form>
    );
  };

  const filterFieldsModal = (
    <>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Role
        </span>
        <Select
          value={draftFilters.role}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, role: val }))
          }
          options={[
            { label: "All Roles", value: "" },
            ...roleOptions.map((role) => ({ label: role, value: role })),
          ]}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Influence
        </span>
        <Select
          value={draftFilters.influence}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, influence: val }))
          }
          options={[
            { label: "All Influence", value: "" },
            ...influenceOptions.map((influence) => ({
              label: influence.replace("_", " "),
              value: influence,
            })),
          ]}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">
          Practice
        </span>
        <Select
          value={draftFilters.practiceId}
          onChange={(val) =>
            setDraftFilters((prev) => ({ ...prev, practiceId: val }))
          }
          disabled={practicesLoading}
          options={[
            {
              label: practicesLoading ? "Loading practices..." : "All Practices",
              value: "",
            },
            ...practices.map((practice) => ({
              label: practice.name,
              value: practice.id,
            })),
          ]}
        />
      </label>
    </>
  );

  const renderTableHeader = (header: any) => {
    if (header.isPlaceholder) return null;
    if (header.id === "select" || header.id === "add") {
      return (
        <div
          className={`flex w-full items-center gap-2 ${header.id === "select" ? "justify-center" : ""}`}
        >
          {flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      );
    }
    return <SortableHeaderCell header={header} />;
  };

  return (
    <AppLayout
      title="Peoples"
      activeModule="Persons"
      activeSubItem="All Persons"
      navbarIcon={<UserCircle className="h-4 w-4 text-slate-500" />}
      // navbarActions={
      //   canWritePersons ? getStandardNavbarActions(openCreateForm) : []
      // }
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="All Peoples"
            subtitle="Persons"
            searchPlaceholder="Search by name or email..."
            searchValue={searchInput}
            onSearchChange={(value) => {
              setSearchInput(value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            activeFilterCount={activeFilterCount}
            activeChips={activeFilterChips}
            onResetFilters={resetFilters}
            onApplyFilters={handleApplyFilters}
            onOpenFilterModal={handleOpenFilterModal}
            filterModalTitle="Filter Persons"
            filterFields={filterFieldsModal}
            addNewLabel={canWritePersons ? "Add Person" : undefined}
            onAddNew={canWritePersons ? openCreateForm : undefined}
            onRefresh={refreshPersonRecords}
            isLoading={isLoading}
            isSaving={isSubmitting}
            isDeleting={isDeleting}
            extraActions={
              <button
                type="button"
                onClick={() =>
                  setSorting((current) =>
                    current[0]?.id === "creationDate"
                      ? [{ id: "creationDate", desc: !current[0].desc }]
                      : [{ id: "creationDate", desc: true }],
                  )
                }
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 hover:bg-[#f7f5f1] hover:border-[#dcd6cb] transition-colors"
              >
                Sort
              </button>
            }
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
              {error && rows.length === 0 ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
                  <div className="text-red-500">{error}</div>
                  <button
                    type="button"
                    onClick={refreshPersonRecords}
                    className="app-control rounded-md px-4 py-2 text-[14px] font-medium"
                  >
                    Retry
                  </button>
                </div>
              ) : rows.length === 0 ? (
                <div className="relative flex min-h-[400px] items-center justify-center">
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
                      className="app-control mt-5 inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add a Person
                    </button>
                  </div>
                </div>
              ) : (
                <>
                <table className="min-w-full border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-4 py-3 text-left font-medium last:border-r-0"
                            style={{
                              width: header.getSize()
                                ? `${header.getSize()}px`
                                : undefined,
                            }}
                          >
                            {renderTableHeader(header)}
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
                            className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-4 py-3 text-[13px] text-slate-600 last:border-r-0"
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
                  {/* <div className="border-b border-[#f4f1ec] px-4 py-2 text-[13px] text-slate-400">
                    <button
                      type="button"
                      onClick={openCreateForm}
                      className="inline-flex items-center gap-2"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add New
                    </button>
                  </div> */}
                </>
              )}
            </div>
          </DataTableToolbar>
        </section>

        {showDetailPanel && selectedRow && (
          <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[380px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
              {(() => {
                const rColors: Record<string, string> = {
                  OWNER: "bg-purple-100 text-purple-700",
                  ADMIN: "bg-blue-100 text-blue-700",
                  FINANCE: "bg-green-100 text-green-700",
                  OPERATIONS: "bg-orange-100 text-orange-700",
                  CLINICAL: "bg-cyan-100 text-cyan-700",
                  PROCUREMENT: "bg-yellow-100 text-yellow-700",
                  OTHER: "bg-gray-100 text-gray-700",
                };
                const role = String(selectedRow.values.role || "");
                return (
                  <DetailCard
                    title={`${String(selectedRow.values.firstName || "")} ${String(selectedRow.values.lastName || "")}`}
                    badge={
                      role
                        ? {
                            label: role,
                            className:
                              rColors[role] || "bg-gray-100 text-gray-700",
                          }
                        : null
                    }
                    infoRows={[
                      ...(selectedRow.values.email
                        ? [
                            {
                              label: "Email",
                              value: String(selectedRow.values.email),
                            },
                          ]
                        : []),
                      ...(selectedRow.values.phone
                        ? [
                            {
                              label: "Phone",
                              value: normalizePhoneInput(String(selectedRow.values.phone)),
                            },
                          ]
                        : []),
                      ...(selectedRow.values.designation
                        ? [
                            {
                              label: "Designation",
                              value: String(selectedRow.values.designation),
                            },
                          ]
                        : []),
                    ]}
                  />
                );
              })()}
              {/*{isEditing ? renderDetailEditForm() : renderDetailView()}*/}
              {renderDetailEditForm()}
            </div>
          </aside>
        )}

        {showCreateForm && (
          <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
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
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        handleFormChange("status", e.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      pattern="^[^\s@]+@[^\s@]+\.(com)$"
                      required
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
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        handleFormChange("phone", e.target.value)
                      }
                      inputMode="numeric"
                      maxLength={12}
                      pattern="\d{3}-?\d{3}-?\d{4}"
                      title="Phone number must be exactly 10 digits"
                      placeholder="XXX-XXX-XXXX"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) =>
                      handleFormChange("designation", e.target.value)
                    }
                    placeholder="e.g. CEO, Manager, Director"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Practices
                  </label>
                  {practicesLoading ? (
                    <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                      Loading practices...
                    </div>
                  ) : (
                    <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-[#e5e2d9] bg-white p-2">
                      {practices.length === 0 ? (
                        <div className="py-2 text-center text-[13px] text-slate-400">
                          No practices available
                        </div>
                      ) : (
                        practices.map((practice) => (
                          <label
                            key={practice.id}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-[#f7f5f1]"
                          >
                            <input
                              type="checkbox"
                              checked={formData.practiceIds.includes(
                                practice.id,
                              )}
                              onChange={() => handlePracticeToggle(practice.id)}
                              className="h-4 w-4 rounded border border-[#cec8bf] text-[#4f63ea]"
                            />
                            <span className="text-[13px] text-slate-600">
                              {practice.name}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                  {formData.practiceIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {formData.practiceIds.map((id) => {
                        const practice = practices.find((p) => p.id === id);
                        return practice ? (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full bg-[#e8e5f9] px-2 py-0.5 text-xs text-[#4f63ea]"
                          >
                            {practice.name}
                            <button
                              type="button"
                              onClick={() => handlePracticeToggle(id)}
                              className="ml-0.5 text-[#4f63ea] hover:text-[#3d4ed1]"
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Companies
                  </label>
                  {companiesLoading ? (
                    <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                      Loading companies...
                    </div>
                  ) : (
                    <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-md border border-[#e5e2d9] bg-white p-2">
                      {companies.length === 0 ? (
                        <div className="py-2 text-center text-[13px] text-slate-400">
                          No companies available
                        </div>
                      ) : (
                        companies.map((company) => (
                          <label
                            key={company.id}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-[#f7f5f1]"
                          >
                            <input
                              type="checkbox"
                              checked={formData.companyIds.includes(company.id)}
                              onChange={() => handleCompanyToggle(company.id)}
                              className="h-4 w-4 rounded border border-[#cec8bf] text-[#4f63ea]"
                            />
                            <span className="text-[13px] text-slate-600">
                              {company.name}
                            </span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                  {formData.companyIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {formData.companyIds.map((id) => {
                        const company = companies.find((c) => c.id === id);
                        return company ? (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full bg-[#e8f5e9] px-2 py-0.5 text-xs text-[#2e7d32]"
                          >
                            {company.name}
                            <button
                              type="button"
                              onClick={() => handleCompanyToggle(id)}
                              className="ml-0.5 text-[#2e7d32] hover:text-[#1b5e20]"
                            >
                              ×
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#f0ece6] pt-4">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] cursor-pointer font-medium text-slate-600 hover:bg-[#f7f5f1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="app-control rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#f7f5f1] cursor-pointer disabled:opacity-50"
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
