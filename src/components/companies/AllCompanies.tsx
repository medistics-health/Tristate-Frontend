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
  UserCircle2,
  Circle,
  Plus,
  Building2,
  Phone,
  Mail,
  Globe,
  DollarSign,
  Users,
  Tag,
  MapPin,
  X,
  Pencil,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import { AvatarPill, getStandardNavbarActions } from "../shared/PageComponents";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import type {
  CompanyCellValue,
  CompanyRow,
  CompanyUserValue,
  CompanyViewData,
} from "./types";
import {
  createCompanyApi,
  deleteCompanyApi,
  getCompaniesView,
  updateCompanyApi,
  type CompanyQueryParams,
} from "../../services/operations/companies";
import toast from "react-hot-toast";

function isUserValue(value: CompanyCellValue): value is CompanyUserValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "initials" in value
  );
}

function getCellDisplayValue(value: CompanyCellValue): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value.toLocaleString();
  if (isUserValue(value)) return value.name;
  return String(value);
}

type CompanyFormData = {
  name: string;
  domain: string;
  industry: string;
  size: string;
  revenue: string;
  phone: string;
  email: string;
  website: string;
  status: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

const initialFormData: CompanyFormData = {
  name: "",
  domain: "",
  industry: "",
  size: "",
  revenue: "",
  phone: "",
  email: "",
  website: "",
  status: "LEAD",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "",
};

export default function AllCompaniesPage() {
  const [viewData, setViewData] = useState<CompanyViewData | null>(null);
  const [rows, setRows] = useState<CompanyRow[]>([]);
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
  const [formData, setFormData] = useState<CompanyFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    industry: "",
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );
  const whenToSearch = filters.search.length > 3 || filters.search.length === 0;
  const whenToSearchIndustry =
    filters.industry.length > 3 || filters.industry.length === 0;

  const disableMe = !filters.search && !filters.status && !filters.industry;
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const params: CompanyQueryParams = {
          page: pagination.page,
          limit: pagination.limit,
          ...(filters.search && { search: filters.search }),
          ...(filters.status && { status: filters.status }),
          ...(filters.industry && { industry: filters.industry }),
          sortBy: sorting[0]?.id || "createdAt",
          sortOrder: sorting[0]?.desc ? "desc" : "asc",
        };
        const data = await getCompaniesView(params);
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
          err instanceof Error ? err.message : "Failed to load companies";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }
    if (whenToSearch && whenToSearchIndustry) {
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
        name: String(values.name || ""),
        domain: String(values.domain || ""),
        industry: String(values.industry || ""),
        size: String(values.size || ""),
        revenue: String(values.revenue || ""),
        phone: String(values.phone || ""),
        email: String(values.email || ""),
        website: String(values.website || ""),
        status: String(values.status || "LEAD"),
        street: String(values.street || ""),
        city: String(values.city || ""),
        state: String(values.state || ""),
        zip: String(values.zip || ""),
        country: String(values.country || ""),
      });
      setIsEditing(false);
    }
  }, [selectedRow, showCreateForm]);

  const visibleFields = useMemo(() => {
    if (!viewData) return [];
    return viewData.fields.filter((f) => columnVisibility[f.id] !== false);
  }, [viewData, columnVisibility]);

  const columns = useMemo<ColumnDef<CompanyRow>[]>(() => {
    const cols: ColumnDef<CompanyRow>[] = [
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
          name: <FileText className="h-3.5 w-3.5 text-slate-400" />,
          domain: <Globe className="h-3.5 w-3.5 text-slate-400" />,
          industry: <Tag className="h-3.5 w-3.5 text-slate-400" />,
          size: <Users className="h-3.5 w-3.5 text-slate-400" />,
          revenue: <DollarSign className="h-3.5 w-3.5 text-slate-400" />,
          phone: <Phone className="h-3.5 w-3.5 text-slate-400" />,
          email: <Mail className="h-3.5 w-3.5 text-slate-400" />,
          website: <Globe className="h-3.5 w-3.5 text-slate-400" />,
          status: <Circle className="h-3.5 w-3.5 text-slate-400" />,
          city: <MapPin className="h-3.5 w-3.5 text-slate-400" />,
          state: <MapPin className="h-3.5 w-3.5 text-slate-400" />,
          creationDate: <CalendarDays className="h-3.5 w-3.5 text-slate-400" />,
          lastUpdate: (
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
          ),
          updatedBy: <UserCircle2 className="h-3.5 w-3.5 text-slate-400" />,
          createdBy: <Circle className="h-3.5 w-3.5 text-slate-400" />,
          practicesCount: <Building2 className="h-3.5 w-3.5 text-slate-400" />,
        };

        return {
          id: field.id,
          accessorFn: (row: CompanyRow) =>
            getCellDisplayValue(row.values[field.id]),
          header: () => (
            <div className="flex items-center gap-2">
              {iconMap[field.id] || (
                <FileText className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span>{field.label}</span>
            </div>
          ),
          cell: ({ row }: { row: { original: CompanyRow } }) => {
            const value = row.original.values[field.id];
            if (isUserValue(value)) {
              return <AvatarPill name={value.name} />;
            }
            if (field.id === "status") {
              const statusColors: Record<string, string> = {
                ACTIVE: "bg-green-100 text-green-700",
                PROSPECT: "bg-blue-100 text-blue-700",
                LEAD: "bg-yellow-100 text-yellow-700",
                INACTIVE: "bg-gray-100 text-gray-700",
              };
              return (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[String(value)] || ""}`}
                >
                  {String(value)}
                </span>
              );
            }
            if (
              field.id === "size" ||
              field.id === "revenue" ||
              field.id === "practicesCount"
            ) {
              const numValue = Number(value);
              if (field.id === "revenue") {
                return `$${numValue.toLocaleString()}`;
              }
              return numValue.toLocaleString();
            }
            if (field.id === "website" && value) {
              return (
                <a
                  href={String(value)}
                  target="_blank"
                  rel="noopener noreferrer"
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
          size: field.id === "name" ? 220 : 160,
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

  function openCreateForm() {
    setFormData(initialFormData);
    setShowCreateForm(true);
    setShowDetailPanel(false);
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

  function handleFormChange(field: keyof CompanyFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const companyData = {
        name: formData.name.trim(),
        domain: formData.domain.trim() || undefined,
        industry: formData.industry.trim() || undefined,
        size: formData.size ? parseInt(formData.size, 10) : undefined,
        revenue: formData.revenue ? parseInt(formData.revenue, 10) : undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        website: formData.website.trim() || undefined,
        status: formData.status as "LEAD" | "PROSPECT" | "ACTIVE" | "INACTIVE",
        address: {
          street: formData.street.trim() || undefined,
          city: formData.city.trim() || undefined,
          state: formData.state.trim() || undefined,
          zip: formData.zip.trim() || undefined,
          country: formData.country.trim() || undefined,
        },
      };

      await createCompanyApi(companyData);
      const params: CompanyQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
      };
      const data = await getCompaniesView(params);
      setRows(data.rows);
      setPagination(data.pagination);
      closeCreateForm();
      toast.success("Company created successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create company";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRow || !formData.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const companyData = {
        name: formData.name.trim(),
        domain: formData.domain.trim() || undefined,
        industry: formData.industry.trim() || undefined,
        size: formData.size ? parseInt(formData.size, 10) : undefined,
        revenue: formData.revenue ? parseInt(formData.revenue, 10) : undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        website: formData.website.trim() || undefined,
        status: formData.status as "LEAD" | "PROSPECT" | "ACTIVE" | "INACTIVE",
        address: {
          street: formData.street.trim() || undefined,
          city: formData.city.trim() || undefined,
          state: formData.state.trim() || undefined,
          zip: formData.zip.trim() || undefined,
          country: formData.country.trim() || undefined,
        },
      };

      await updateCompanyApi(selectedRow.id, companyData);
      const params: CompanyQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
      };
      const data = await getCompaniesView(params);
      setRows(data.rows);
      setPagination(data.pagination);
      setIsEditing(false);
      toast.success("Company updated successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update company";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteCompany() {
    if (!selectedRow) return;

    if (!window.confirm("Are you sure you want to delete this company?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCompanyApi(selectedRow.id);
      const params: CompanyQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
      };
      const data = await getCompaniesView(params);
      setRows(data.rows);
      setPagination(data.pagination);
      closeDetailPanel();
      toast.success("Company deleted successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete company";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const views = [
    {
      id: "all",
      label: "All Companies",
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

  const renderDetailView = () => {
    if (!selectedRow) return null;
    const values = selectedRow.values;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-medium text-slate-700">
            Company Details
          </h3>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1 text-[13px] text-[#4f63ea] hover:text-[#3d4ed1]"
          >
            <Pencil className="h-3.5 w-3.5" />
            {isEditing ? "Cancel" : "Edit"}
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="w-24 text-slate-400">Name:</span>
            <span className="font-medium text-slate-700">
              {String(values.name || "-")}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[13px]">
            <span className="w-24 text-slate-400">Status:</span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                String(values.status) === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : String(values.status) === "PROSPECT"
                    ? "bg-blue-100 text-blue-700"
                    : String(values.status) === "LEAD"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-700"
              }`}
            >
              {String(values.status || "-")}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[13px]">
            <span className="w-24 text-slate-400">Domain:</span>
            <span className="text-slate-700">
              {String(values.domain || "-")}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[13px]">
            <span className="w-24 text-slate-400">Industry:</span>
            <span className="text-slate-700">
              {String(values.industry || "-")}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[13px]">
            <span className="w-24 text-slate-400">Size:</span>
            <span className="text-slate-700">
              {Number(values.size || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[13px]">
            <span className="w-24 text-slate-400">Revenue:</span>
            <span className="text-slate-700">
              ${Number(values.revenue || 0).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[13px]">
            <span className="w-24 text-slate-400">Email:</span>
            <span className="text-slate-700">
              {String(values.email || "-")}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[13px]">
            <span className="w-24 text-slate-400">Phone:</span>
            <span className="text-slate-700">
              {String(values.phone || "-")}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[13px]">
            <span className="w-24 text-slate-400">Website:</span>
            {values.website ? (
              <a
                href={String(values.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4f63ea] hover:underline"
              >
                {String(values.website)}
              </a>
            ) : (
              <span className="text-slate-700">-</span>
            )}
          </div>
        </div>

        <div className="border-t border-[#f0ece6] pt-4">
          <h4 className="mb-3 text-[13px] font-medium text-slate-700">
            Address
          </h4>
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-400">Street:</span>
              <span className="text-slate-700">
                {String(values.street || "-")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-400">City:</span>
              <span className="text-slate-700">
                {String(values.city || "-")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-400">State:</span>
              <span className="text-slate-700">
                {String(values.state || "-")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-400">ZIP:</span>
              <span className="text-slate-700">
                {String(values.zip || "-")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-24 text-slate-400">Country:</span>
              <span className="text-slate-700">
                {String(values.country || "-")}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-[#f0ece6] pt-4">
          <button
            type="button"
            onClick={handleDeleteCompany}
            disabled={isDeleting}
            className="flex items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete Company"}
          </button>
        </div>
      </div>
    );
  };

  const renderDetailEditForm = () => {
    if (!selectedRow) return null;

    return (
      <form onSubmit={handleUpdateCompany} className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="text-[13px] text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1 text-[13px] font-medium text-[#4f63ea] hover:text-[#3d4ed1] disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-600">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleFormChange("name", e.target.value)}
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Domain
            </label>
            <input
              type="text"
              value={formData.domain}
              onChange={(e) => handleFormChange("domain", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Industry
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => handleFormChange("industry", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Size
            </label>
            <input
              type="number"
              value={formData.size}
              onChange={(e) => handleFormChange("size", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Revenue
            </label>
            <input
              type="number"
              value={formData.revenue}
              onChange={(e) => handleFormChange("revenue", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>
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
            <option value="LEAD">Lead</option>
            <option value="PROSPECT">Prospect</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-600">
            Website
          </label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => handleFormChange("website", e.target.value)}
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
          />
        </div>

        <div className="border-t border-[#f0ece6] pt-4">
          <h4 className="mb-3 text-[12px] font-medium text-slate-600">
            Address
          </h4>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">
                Street
              </label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => handleFormChange("street", e.target.value)}
                className="app-control w-full rounded-md px-3 py-2 text-[13px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] text-slate-500">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleFormChange("city", e.target.value)}
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-500">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleFormChange("state", e.target.value)}
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] text-slate-500">
                  ZIP
                </label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => handleFormChange("zip", e.target.value)}
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-500">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleFormChange("country", e.target.value)}
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    );
  };

  if (isLoading) {
    return (
      <AppLayout
        title="Companies"
        activeModule="Companies"
        activeSubItem="All Companies"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading companies...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout
        title="Companies"
        activeModule="Companies"
        activeSubItem="All Companies"
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
      title="Companies"
      activeModule="Companies"
      activeSubItem="All Companies"
      navbarIcon={<Building2 className="h-4 w-4 text-slate-500" />}
      navbarActions={getStandardNavbarActions(openCreateForm)}
    >
      <div className="flex h-full gap-2">
        <div className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <div className="relative">
              <LayoutGrid className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <div className="min-w-56 appearance-none rounded-md bg-transparent py-1.5 pl-8 pr-10 text-[14px] font-medium text-slate-700 outline-none">
                All Companies
              </div>
            </div>

            <div className="flex items-center gap-6 text-[14px] text-slate-500">
              <button
                type="button"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                Filter
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
            </div>
          </div>

          {showFilterPanel && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] bg-[#faf9f7] px-4 py-2.5">
              <input
                type="text"
                placeholder="Search by name or domain..."
                value={filters.search}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, search: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              />
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, status: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Statuses</option>
                <option value="LEAD">Lead</option>
                <option value="CUSTOMER">CUSTOMER</option>
                <option value="PARTNER">PARTNER</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <input
                type="text"
                placeholder="Industry..."
                value={filters.industry}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, industry: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              />
              <button
                type="button"
                onClick={() => {
                  setFilters({ search: "", status: "", industry: "" });
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
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
                    Add your first Company
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    Use our API or add your first Company manually
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add a Company
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
                {String(selectedRow.values.name || "Company")}
              </h2>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {isEditing ? renderDetailEditForm() : renderDetailView()}
            </div>
          </aside>
        )}

        {showCreateForm && (
          <aside className="app-panel flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
              <h2 className="text-[15px] font-semibold text-slate-700">
                Create Company
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
              onSubmit={handleCreateCompany}
              className="flex-1 overflow-auto p-4"
            >
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    placeholder="Enter company name"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Domain
                    </label>
                    <input
                      type="text"
                      value={formData.domain}
                      onChange={(e) =>
                        handleFormChange("domain", e.target.value)
                      }
                      placeholder="example.com"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) =>
                        handleFormChange("industry", e.target.value)
                      }
                      placeholder="Technology"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Size
                    </label>
                    <input
                      type="number"
                      value={formData.size}
                      onChange={(e) => handleFormChange("size", e.target.value)}
                      placeholder="Employee count"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Revenue
                    </label>
                    <input
                      type="number"
                      value={formData.revenue}
                      onChange={(e) =>
                        handleFormChange("revenue", e.target.value)
                      }
                      placeholder="Annual revenue"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFormChange("status", e.target.value)}
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  >
                    <option value="LEAD">Lead</option>
                    <option value="PROSPECT">Prospect</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
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
                      placeholder="info@company.com"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      handleFormChange("website", e.target.value)
                    }
                    placeholder="https://company.com"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  />
                </div>

                <div className="border-t border-[#f0ece6] pt-4">
                  <h3 className="mb-3 text-[13px] font-medium text-slate-700">
                    Address
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-[12px] text-slate-500">
                        Street
                      </label>
                      <input
                        type="text"
                        value={formData.street}
                        onChange={(e) =>
                          handleFormChange("street", e.target.value)
                        }
                        placeholder="123 Main St"
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[12px] text-slate-500">
                          City
                        </label>
                        <input
                          type="text"
                          value={formData.city}
                          onChange={(e) =>
                            handleFormChange("city", e.target.value)
                          }
                          placeholder="San Francisco"
                          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[12px] text-slate-500">
                          State
                        </label>
                        <input
                          type="text"
                          value={formData.state}
                          onChange={(e) =>
                            handleFormChange("state", e.target.value)
                          }
                          placeholder="CA"
                          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[12px] text-slate-500">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          value={formData.zip}
                          onChange={(e) =>
                            handleFormChange("zip", e.target.value)
                          }
                          placeholder="94102"
                          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[12px] text-slate-500">
                          Country
                        </label>
                        <input
                          type="text"
                          value={formData.country}
                          onChange={(e) =>
                            handleFormChange("country", e.target.value)
                          }
                          placeholder="USA"
                          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        />
                      </div>
                    </div>
                  </div>
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
                  {isSubmitting ? "Creating..." : "Create Company"}
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </AppLayout>
  );
}
