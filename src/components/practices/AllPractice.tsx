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
  LayoutGrid,
  SlidersHorizontal,
  UserCircle2,
  Circle,
  Plus,
  Building2,
  MapPin,
  Tag,
  X,
  Save,
  Users,
  Backpack,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import { AvatarPill, getStandardNavbarActions } from "../shared/PageComponents";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import type {
  PracticeCellValue,
  PracticeRow,
  PracticeUserValue,
  PracticeViewData,
} from "./types";
import {
  createPracticeApi,
  deletePracticeApi,
  getPracticesView,
  getPractice,
  updatePracticeApi,
  type PracticeQueryParams,
} from "../../services/operations/practices";
import { getAllCompanies } from "../../services/operations/companies";
import {
  getAgreementsByPractice,
  sendAgreementEmail,
} from "../../services/operations/agreements";
import type { Company } from "../companies/types";
import toast from "react-hot-toast";

function isUserValue(value: PracticeCellValue): value is PracticeUserValue {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "initials" in value
  );
}

function getCellDisplayValue(value: PracticeCellValue): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value.toLocaleString();
  if (isUserValue(value)) return value.name;
  return String(value);
}

type TaxIdOption = {
  id: string;
  taxIdNumber: string;
  legalEntityName: string;
};

type PracticeFormData = {
  name: string;
  npi: string;
  status: string;
  region: string;
  source: string;
  bucket: string;
  companyId: string;
  taxIdId: string;
  groupNpis: {
    groupNpiNumber: string;
    groupName: string;
    status: string;
    notes: string;
  }[];
};

const initialFormData: PracticeFormData = {
  name: "",
  npi: "",
  status: "LEAD",
  region: "",
  source: "DIRECT",
  bucket: "",
  taxIdId: "",
  groupNpis: [],
};

const statusOptions = ["LEAD", "ACTIVE", "INACTIVE", "CLOSED"];
const sourceOptions = [
  "DIRECT",
  "REFERRAL",
  "CHANNEL_PARTNER",
  "OUTBOUND",
  "INBOUND",
];

export default function AllPracticePage() {
  const [viewData, setViewData] = useState<PracticeViewData | null>(null);
  const [rows, setRows] = useState<PracticeRow[]>([]);
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
  const [groupedView, setGroupedView] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [formData, setFormData] = useState<PracticeFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyTaxIds, setCompanyTaxIds] = useState<TaxIdOption[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    region: "",
    source: "",
    companyId: "",
  });
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [groupNpiEntries, setGroupNpiEntries] = useState<
    {
      groupNpiNumber: string;
      groupName: string;
      status: string;
      notes: string;
    }[]
  >([]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  const whenToSearch = filters.search.length > 3 || filters.search.length === 0;
  const whenToSearchRegion =
    filters.region.length >= 2 || filters.region.length === 0;

  const disableMe =
    !filters.search &&
    !filters.status &&
    !filters.region &&
    !filters.source &&
    !filters.companyId;

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        const params: PracticeQueryParams = {
          page: pagination.page,
          limit: pagination.limit,
          ...(filters.search && { search: filters.search }),
          ...(filters.status && { status: filters.status }),
          ...(filters.region && { region: filters.region }),
          ...(filters.source && { source: filters.source }),
          ...(filters.companyId && { companyId: filters.companyId }),
          sortBy: sorting[0]?.id || "createdAt",
          sortOrder: sorting[0]?.desc ? "desc" : "asc",
        };
        const data = await getPracticesView(params);
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
          err instanceof Error ? err.message : "Failed to load practices";
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }
    if (whenToSearch && whenToSearchRegion) {
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
        npi: String(values.npi || ""),
        status: String(values.status || "LEAD"),
        region: String(values.region || ""),
        source: String(values.source || "DIRECT"),
        bucket: String(values.bucket || ""),
        companyId: String(values.companyId || ""),
        taxIdId: String(values.taxIdId || ""),
        groupNpis:
          (values.groupNpis as {
            groupNpiNumber: string;
            groupName: string;
          }[]) || [],
      });

      const companyId = String(values.companyId || "");
      if (companyId) {
        const company = companies.find((c) => c.id === companyId);
        if (company && company.taxIds) {
          setCompanyTaxIds(
            company.taxIds.map((t) => ({
              id: t.id,
              taxIdNumber: t.taxIdNumber,
              legalEntityName: t.legalEntityName,
            })),
          );
        }
      } else {
        setCompanyTaxIds([]);
      }

      const existingGroupNpis =
        (values.groupNpis as { groupNpiNumber: string; groupName: string }[]) ||
        [];
      setGroupNpiEntries(
        existingGroupNpis.map((g) => ({
          groupNpiNumber: g.groupNpiNumber,
          groupName: g.groupName || "",
          status: "ACTIVE",
          notes: "",
        })),
      );

      setIsEditing(false);
    }
  }, [selectedRow, showCreateForm, companies]);

  const visibleFields = useMemo(() => {
    if (!viewData) return [];
    return viewData.fields.filter((f) => columnVisibility[f.id] !== false);
  }, [viewData, columnVisibility]);

  type GroupedRow = {
    type: "group";
    groupKey: string;
    groupName: string;
    practices: PracticeRow[];
    isExpanded: boolean;
  };
  type DisplayRow = GroupedRow | PracticeRow;

  const groupedRows = useMemo((): DisplayRow[] => {
    if (!groupedView) return rows;

    const groups: Record<string, PracticeRow[]> = {};
    const ungrouped: PracticeRow[] = [];

    rows.forEach((row) => {
      const groupNpis = row.values.groupNpis as
        | { groupNpiNumber: string; groupName: string }[]
        | undefined;
      if (groupNpis && groupNpis.length > 0) {
        const key = groupNpis[0].groupNpiNumber;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(row);
      } else {
        ungrouped.push(row);
      }
    });

    const result: DisplayRow[] = [];
    Object.entries(groups).forEach(([key, practices]) => {
      result.push({
        type: "group",
        groupKey: key,
        groupName: practices[0]?.values.groupNpis?.[0]?.groupName || key,
        practices,
        isExpanded: expandedGroups[key] !== false,
      });
    });
    if (ungrouped.length > 0) {
      result.push({
        type: "group",
        groupKey: "ungrouped",
        groupName: "No Group NPI",
        practices: ungrouped,
        isExpanded: expandedGroups["ungrouped"] !== false,
      });
    }
    return result;
  }, [rows, groupedView, expandedGroups]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const columns = useMemo<ColumnDef<PracticeRow>[]>(() => {
    const cols: ColumnDef<PracticeRow>[] = [
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
          npi: <FileText className="h-3.5 w-3.5 text-slate-400" />,
          status: <Circle className="h-3.5 w-3.5 text-slate-400" />,
          region: <MapPin className="h-3.5 w-3.5 text-slate-400" />,
          source: <Tag className="h-3.5 w-3.5 text-slate-400" />,
          bucket: <Tag className="h-3.5 w-3.5 text-slate-400" />,
          companyName: <Building2 className="h-3.5 w-3.5 text-slate-400" />,
          taxIdNumber: <FileText className="h-3.5 w-3.5 text-slate-400" />,
          practiceGroupName: <Users className="h-3.5 w-3.5 text-slate-400" />,
          groupNpiNumbers: <FileText className="h-3.5 w-3.5 text-slate-400" />,
          personsCount: <Users className="h-3.5 w-3.5 text-slate-400" />,
          dealsCount: <Backpack className="h-3.5 w-3.5 text-slate-400" />,
          creationDate: <CalendarDays className="h-3.5 w-3.5 text-slate-400" />,
          lastUpdate: (
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
          ),
          createdBy: <Circle className="h-3.5 w-3.5 text-slate-400" />,
          updatedBy: <UserCircle2 className="h-3.5 w-3.5 text-slate-400" />,
        };

        return {
          id: field.id,
          accessorFn: (row: PracticeRow) =>
            getCellDisplayValue(row.values[field.id]),
          header: () => (
            <div className="flex items-center gap-2">
              {iconMap[field.id] || (
                <FileText className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span>{field.label}</span>
            </div>
          ),
          cell: ({ row }: { row: { original: PracticeRow } }) => {
            const value = row.original.values[field.id];
            if (isUserValue(value)) {
              return <AvatarPill name={value.name} />;
            }
            if (field.id === "status") {
              const statusColors: Record<string, string> = {
                LEAD: "bg-yellow-100 text-yellow-700",
                ACTIVE: "bg-green-100 text-green-700",
                INACTIVE: "bg-gray-100 text-gray-700",
                CLOSED: "bg-red-100 text-red-700",
              };
              return (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[String(value)] || ""}`}
                >
                  {String(value)}
                </span>
              );
            }
            if (field.id === "source") {
              const sourceColors: Record<string, string> = {
                DIRECT: "bg-blue-100 text-blue-700",
                REFERRAL: "bg-purple-100 text-purple-700",
                CHANNEL_PARTNER: "bg-orange-100 text-orange-700",
                OUTBOUND: "bg-cyan-100 text-cyan-700",
                INBOUND: "bg-pink-100 text-pink-700",
              };
              const displayValue = String(value).replace("_", " ");
              return (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sourceColors[String(value)] || ""}`}
                >
                  {displayValue}
                </span>
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

  const renderCell = (row: PracticeRow, columnId: string) => {
    if (columnId === "select") {
      return (
        <input
          type="checkbox"
          checked={Boolean(selectedIds[row.id])}
          onChange={(event) =>
            setSelectedIds((current) => ({
              ...current,
              [row.id]: event.target.checked,
            }))
          }
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border border-[#cec8bf]"
        />
      );
    }
    if (columnId === "add") return null;
    const value = row.values[columnId];
    const field = visibleFields.find((f) => f.id === columnId);
    if (field?.id === "status") {
      const statusColors: Record<string, string> = {
        LEAD: "bg-yellow-100 text-yellow-700",
        ACTIVE: "bg-green-100 text-green-700",
        INACTIVE: "bg-gray-100 text-gray-700",
        CLOSED: "bg-red-100 text-red-700",
      };
      return (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[String(value)] || ""}`}
        >
          {String(value)}
        </span>
      );
    }
    if (field?.id === "source") {
      const sourceColors: Record<string, string> = {
        DIRECT: "bg-blue-100 text-blue-700",
        REFERRAL: "bg-purple-100 text-purple-700",
        CHANNEL_PARTNER: "bg-orange-100 text-orange-700",
        OUTBOUND: "bg-cyan-100 text-cyan-700",
        INBOUND: "bg-pink-100 text-pink-700",
      };
      const displayValue = String(value).replace("_", " ");
      return (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sourceColors[String(value)] || ""}`}
        >
          {displayValue}
        </span>
      );
    }
    return <span className="truncate">{getCellDisplayValue(value)}</span>;
  };

  async function openCreateForm() {
    setFormData(initialFormData);
    setGroupNpiEntries([]);
    setShowCreateForm(true);
    setShowDetailPanel(false);

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
    setGroupNpiEntries([]);
  }

  async function handleRowClick(rowId: string) {
    setSelectedRowId(rowId);
    try {
      const companyList = await getAllCompanies();
      setCompanies(companyList);
    } catch (err) {
      console.error("Failed to load companies:", err);
    } finally {
      setCompaniesLoading(false);
    }
    setShowDetailPanel(true);
    setShowCreateForm(false);
  }

  function closeDetailPanel() {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setIsEditing(false);
    setFormData(initialFormData);
    setGroupNpiEntries([]);
  }

  useEffect(() => {
    if (isEditing && companies.length === 0) {
      setCompaniesLoading(true);
      getAllCompanies()
        .then(setCompanies)
        .catch((err) => console.error("Failed to load companies:", err))
        .finally(() => setCompaniesLoading(false));
    }
  }, [isEditing]);

  useEffect(() => {
    if (showFilterPanel && companies.length === 0) {
      setCompaniesLoading(true);
      getAllCompanies()
        .then(setCompanies)
        .catch((err) => console.error("Failed to load companies:", err))
        .finally(() => setCompaniesLoading(false));
    }
  }, [showFilterPanel]);

  function handleFormChange(field: keyof PracticeFormData, value: string) {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      if (field === "companyId") {
        if (value) {
          const company = companies.find((c) => c.id === value);
          if (company && company.taxIds) {
            setCompanyTaxIds(
              company.taxIds.map((t) => ({
                id: t.id,
                taxIdNumber: t.taxIdNumber,
                legalEntityName: t.legalEntityName,
              })),
            );
          } else {
            setCompanyTaxIds([]);
          }
          newData.taxIdId = "";
        } else {
          setCompanyTaxIds([]);
          newData.taxIdId = "";
        }
      }
      return newData;
    });
  }

  async function handleCreatePractice(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Practice name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const practiceData = {
        name: formData.name.trim(),
        npi: formData.npi.trim() || undefined,
        status: formData.status as "LEAD" | "ACTIVE" | "INACTIVE" | "CLOSED",
        region: formData.region.trim(),
        groupNpis: groupNpiEntries.map((entry) => ({
          ...entry,
          taxId: formData.taxIdId,
        })),
        source: formData.source as
          | "DIRECT"
          | "REFERRAL"
          | "CHANNEL_PARTNER"
          | "OUTBOUND"
          | "INBOUND",
        bucket: formData.bucket
          ? formData.bucket
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        companyId: formData.companyId?.trim() || undefined,
        taxIdId: formData.taxIdId?.trim() || undefined,
      };

      const result = await createPracticeApi(practiceData);

      const params: PracticeQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
      };
      const data = await getPracticesView(params);
      setRows(data.rows);
      setPagination(data.pagination);
      closeCreateForm();
      toast.success("Practice created successfully");

      if (practiceData.status === "ACTIVE") {
        const newPractice = data.rows.find(
          (row) => row.values.name === practiceData.name,
        );
        if (newPractice) {
          const fullPractice = await getPractice(newPractice.id);
          const hasAdminWithEmail = fullPractice.persons?.some(
            (person) => person.role === "ADMIN" && person.email,
          );

          if (!hasAdminWithEmail) {
            toast.error(
              "Practice must have at least one ADMIN person with email to set status to ACTIVE",
            );
            return;
          }

          const agreements = await getAgreementsByPractice(newPractice.id);
          if (agreements.length > 0) {
            await sendAgreementEmail({
              agreementId: agreements[0].id,
              personId: newPractice.id,
            });
            toast.success("Agreement email sent successfully");
          }
        }
      }

      if (practiceData.status === "ACTIVE") {
        const newPractice = data.rows.find(
          (row) => row.values.name === practiceData.name,
        );
        if (newPractice) {
          const agreements = await getAgreementsByPractice(newPractice.id);
          if (agreements.length > 0) {
            await sendAgreementEmail({
              agreementId: agreements[0].id,
              personId: newPractice.id,
            });
            toast.success("Agreement email sent successfully");
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create practice";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdatePractice(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRow || !formData.name.trim()) {
      toast.error("Practice name is required");
      return;
    }

    const wasActive = String(selectedRow.values.status) === "ACTIVE";
    const willBecomeActive = formData.status === "ACTIVE" && !wasActive;

    const fullPractice = await getPractice(selectedRow.id);
    if (willBecomeActive) {
      const hasAdminWithEmail = fullPractice.persons?.some(
        (person) => person.role === "ADMIN" && person.email,
      );

      if (!hasAdminWithEmail) {
        toast.error(
          "Practice must have at least one ADMIN person with email to set status to ACTIVE",
        );
        return;
      }

      const agreements = await getAgreementsByPractice(selectedRow.id);
      if (agreements.length === 0) {
        toast.error("This practice has no agreement, please create agreement");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const practiceData = {
        name: formData.name.trim(),
        npi: formData.npi.trim() || undefined,
        status: formData.status as "LEAD" | "ACTIVE" | "INACTIVE" | "CLOSED",
        region: formData.region.trim(),
        groupNpis: groupNpiEntries.map((entry) => ({
          ...entry,
          taxId: formData.taxIdId,
        })),
        source: formData.source as
          | "DIRECT"
          | "REFERRAL"
          | "CHANNEL_PARTNER"
          | "OUTBOUND"
          | "INBOUND",
        bucket: formData.bucket
          ? formData.bucket
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        companyId: formData.companyId?.trim() || undefined,
        taxIdId: formData.taxIdId?.trim() || undefined,
      };

      await updatePracticeApi(selectedRow.id, practiceData);

      const params: PracticeQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
      };
      const data = await getPracticesView(params);
      setRows(data.rows);
      setPagination(data.pagination);
      setIsEditing(false);
      toast.success("Practice updated successfully");

      if (willBecomeActive) {
        const agreements = await getAgreementsByPractice(selectedRow.id);
        const person = fullPractice.persons?.find(
          (person) => person.role === "ADMIN" && person.email,
        );

        if (agreements.length > 0) {
          await sendAgreementEmail({
            agreementId: agreements[0].id,
            personId: person?.id ?? "",
          });
          toast.success("Agreement email sent successfully");
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update practice";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePractice() {
    if (!selectedRow) return;

    if (!window.confirm("Are you sure you want to delete this practice?")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePracticeApi(selectedRow.id);
      const params: PracticeQueryParams = {
        page: pagination.page,
        limit: pagination.limit,
      };
      const data = await getPracticesView(params);
      setRows(data.rows);
      setPagination(data.pagination);
      closeDetailPanel();
      toast.success("Practice deleted successfully");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete practice";
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const views = [
    {
      id: "all",
      label: "All Practices",
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

  const getDetailMetadata = () => {
    if (!selectedRow) return [];
    const values = selectedRow.values;
    const metadata: { label: React.ReactNode; value: React.ReactNode }[] = [];

    if (isUserValue(values.createdBy)) {
      metadata.push({
        label: (
          <>
            <Circle className="h-3.5 w-3.5" />
            <span>Created by</span>
          </>
        ),
        value: <AvatarPill name={values.createdBy.name} />,
      });
    }

    metadata.push({
      label: (
        <>
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Creation date</span>
        </>
      ),
      value: getCellDisplayValue(values.creationDate),
    });

    metadata.push({
      label: (
        <>
          <CalendarDays className="h-3.5 w-3.5" />
          <span>Last update</span>
        </>
      ),
      value: getCellDisplayValue(values.lastUpdate),
    });

    if (isUserValue(values.updatedBy)) {
      metadata.push({
        label: (
          <>
            <UserCircle2 className="h-3.5 w-3.5" />
            <span>Updated by</span>
          </>
        ),
        value: <AvatarPill name={values.updatedBy.name} />,
      });
    }

    return metadata;
  };

  // const renderDetailView = () => {
  //   if (!selectedRow) return null;
  //   const values = selectedRow.values;

  //   return (
  //     <div className="space-y-4">
  //       <div className="flex items-center justify-between">
  //         <h3 className="text-[13px] font-medium text-slate-700">
  //           Practice Details
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
  //             {String(values.name || "-")}
  //           </span>
  //         </div>

  //         <div className="flex items-center gap-2 text-[13px]">
  //           <span className="w-24 text-slate-400">Status:</span>
  //           <span
  //             className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
  //               String(values.status) === "ACTIVE"
  //                 ? "bg-green-100 text-green-700"
  //                 : String(values.status) === "LEAD"
  //                   ? "bg-yellow-100 text-yellow-700"
  //                   : String(values.status) === "INACTIVE"
  //                     ? "bg-gray-100 text-gray-700"
  //                     : "bg-red-100 text-red-700"
  //             }`}
  //           >
  //             {String(values.status || "-")}
  //           </span>
  //         </div>

  //         <div className="flex items-center gap-2 text-[13px]">
  //           <span className="w-24 text-slate-400">Region:</span>
  //           <span className="text-slate-700">
  //             {String(values.region || "-")}
  //           </span>
  //         </div>

  //         <div className="flex items-center gap-2 text-[13px]">
  //           <span className="w-24 text-slate-400">Source:</span>
  //           <span
  //             className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
  //               String(values.source) === "DIRECT"
  //                 ? "bg-blue-100 text-blue-700"
  //                 : String(values.source) === "REFERRAL"
  //                   ? "bg-purple-100 text-purple-700"
  //                   : String(values.source) === "CHANNEL_PARTNER"
  //                     ? "bg-orange-100 text-orange-700"
  //                     : String(values.source) === "OUTBOUND"
  //                       ? "bg-cyan-100 text-cyan-700"
  //                       : "bg-pink-100 text-pink-700"
  //             }`}
  //           >
  //             {String(values.source || "-").replace("_", " ")}
  //           </span>
  //         </div>

  //         <div className="flex items-center gap-2 text-[13px]">
  //           <span className="w-24 text-slate-400">Bucket:</span>
  //           <span className="text-slate-700">
  //             {String(values.bucket || "-")}
  //           </span>
  //         </div>

  //         <div className="flex items-center gap-2 text-[13px]">
  //           <span className="w-24 text-slate-400">Company:</span>
  //           <span className="text-slate-700">
  //             {String(values.companyName || "-")}
  //           </span>
  //         </div>
  //       </div>

  //       <div className="border-t border-[#f0ece6] pt-4">
  //         <button
  //           type="button"
  //           onClick={handleDeletePractice}
  //           disabled={isDeleting}
  //           className="flex items-center gap-2 text-[13px] text-red-500 hover:text-red-700"
  //         >
  //           {isDeleting ? "Deleting..." : "Delete Practice"}
  //         </button>
  //       </div>
  //     </div>
  //   );
  // };

  const renderDetailEditForm = () => {
    if (!selectedRow) return null;

    return (
      <form onSubmit={handleUpdatePractice} className="space-y-4">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-600">
            Practice Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleFormChange("name", e.target.value)}
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-600">
            NPI
          </label>
          <input
            type="text"
            value={formData.npi}
            onChange={(e) => handleFormChange("npi", e.target.value)}
            placeholder="National Provider Identifier"
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
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
                <option
                  key={status}
                  value={status}
                  // disabled={status === "ACTIVE"}
                  disabled={formData.status === status}
                >
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Region
            </label>
            <input
              type="text"
              value={formData.region}
              onChange={(e) => handleFormChange("region", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Source
            </label>
            <select
              value={formData.source}
              onChange={(e) => handleFormChange("source", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            >
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Bucket
            </label>
            <input
              type="text"
              value={formData.bucket}
              onChange={(e) => handleFormChange("bucket", e.target.value)}
              placeholder="Comma-separated"
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-600">
            Company
          </label>
          {companiesLoading ? (
            <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[12px] text-slate-400">
              Loading...
            </div>
          ) : (
            <select
              value={formData.companyId}
              onChange={(e) => handleFormChange("companyId", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            >
              <option value="">-- Select a Company --</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {formData.companyId && (
          <div>
            <label className="mb-1 block text-[12px] font-medium text-slate-600">
              Tax ID
            </label>
            <select
              value={formData.taxIdId}
              onChange={(e) => handleFormChange("taxIdId", e.target.value)}
              className="app-control w-full rounded-md px-3 py-2 text-[13px]"
            >
              <option value="">-- Select a Tax ID --</option>
              {companyTaxIds.map((taxId) => (
                <option key={taxId.id} value={taxId.id}>
                  {taxId.taxIdNumber} - {taxId.legalEntityName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-[12px] font-medium text-slate-600">
            Group NPIs
          </label>
          <div className="space-y-2">
            {groupNpiEntries.map((entry, index) => (
              <div key={index} className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  value={entry.groupNpiNumber}
                  onChange={(e) => {
                    const updated = [...groupNpiEntries];
                    updated[index].groupNpiNumber = e.target.value;
                    setGroupNpiEntries(updated);
                  }}
                  placeholder="Group NPI Number"
                  className="app-control rounded-md px-3 py-2 text-[13px]"
                />
                <input
                  type="text"
                  required
                  value={entry.groupName}
                  onChange={(e) => {
                    const updated = [...groupNpiEntries];
                    updated[index].groupName = e.target.value;
                    setGroupNpiEntries(updated);
                  }}
                  placeholder="Group Name"
                  className="app-control rounded-md px-3 py-2 text-[13px]"
                />
                <select
                  value={entry.status}
                  onChange={(e) => {
                    const updated = [...groupNpiEntries];
                    updated[index].status = e.target.value;
                    setGroupNpiEntries(updated);
                  }}
                  className="app-control rounded-md px-2 py-2 text-[13px]"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setGroupNpiEntries(
                      groupNpiEntries.filter((_, i) => i !== index),
                    )
                  }
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setGroupNpiEntries([
                  ...groupNpiEntries,
                  {
                    groupNpiNumber: "",
                    groupName: "",
                    status: "ACTIVE",
                    notes: "",
                  },
                ])
              }
              className="flex items-center gap-1 text-[13px] text-[#4f63ea] hover:text-[#4f63ea]"
            >
              <Plus className="h-4 w-4" /> Add Group NPI
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
          <button
            type="button"
            onClick={handleDeletePractice}
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
        title="Practices"
        activeModule="Practices"
        activeSubItem="All Practices"
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-slate-400">Loading practices...</div>
        </div>
      </AppLayout>
    );
  }

  if (error && rows.length === 0) {
    return (
      <AppLayout
        title="Practices"
        activeModule="Practices"
        activeSubItem="All Practices"
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
      title="Practices"
      activeModule="Practices"
      activeSubItem="All Practices"
      navbarIcon={<Building2 className="h-4 w-4 text-slate-500" />}
      navbarActions={getStandardNavbarActions(openCreateForm)}
    >
      <div className="flex h-full gap-2">
        <div className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <div className="relative">
              <LayoutGrid className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <div className="min-w-56 appearance-none rounded-md bg-transparent py-1.5 pl-8 pr-10 text-[14px] font-medium text-slate-700 outline-none">
                All Practices
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
                placeholder="Search by name..."
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
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Region..."
                value={filters.region}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, region: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              />
              <select
                value={filters.source}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, source: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Sources</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
              {companies.length > 0 && (
                <select
                  value={filters.companyId}
                  onChange={(e) => {
                    setFilters((prev) => ({
                      ...prev,
                      companyId: e.target.value,
                    }));
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="app-control rounded-md px-3 py-1.5 text-[13px]"
                >
                  <option value="">All Companies</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    search: "",
                    status: "",
                    region: "",
                    source: "",
                    companyId: "",
                  })
                }
                disabled={disableMe}
                className="text-[13px] text-[#4f63ea] hover:underline"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => setGroupedView(!groupedView)}
                className={`text-[13px] px-2 py-1 rounded ${
                  groupedView
                    ? "bg-[#4f63ea] text-white"
                    : "text-slate-500 hover:bg-[#f0ece6]"
                }`}
              >
                {groupedView ? "Grouped" : "Group"}
              </button>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-auto">
            {groupedView ? (
              <div className="divide-y divide-[#f4f1ec]">
                {groupedRows.map((item: any, idx) => {
                  if (item.type === "group") {
                    return (
                      <div key={item.groupKey} className="bg-white">
                        <button
                          type="button"
                          onClick={() => toggleGroup(item.groupKey)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#faf9f7]"
                        >
                          <div className="flex items-center gap-3">
                            <ChevronRight
                              className={`h-4 w-4 text-slate-400 transition-transform ${
                                item.isExpanded ? "rotate-90" : ""
                              }`}
                            />
                            <span className="text-[14px] font-medium text-slate-700">
                              {item.groupName}
                            </span>
                            <span className="text-xs text-slate-400">
                              ({item.practices.length} practices)
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {item.groupKey !== "ungrouped" && item.groupKey}
                          </span>
                        </button>
                        {item.isExpanded && (
                          <div className="border-t border-[#f4f1ec]">
                            <table className="min-w-full border-separate border-spacing-0">
                              <thead className="sticky top-0 z-10 bg-[#faf9f7]">
                                {table.getHeaderGroups().map((headerGroup) => (
                                  <tr key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                      <th
                                        key={header.id}
                                        className="border-b border-[#f0ece6] border-r border-[#f4f1ec] px-3 py-2 text-left text-[13px] font-medium text-slate-400 last:border-r-0"
                                      >
                                        {header.isPlaceholder ? null : (
                                          <div
                                            className={`flex w-full items-center gap-2 ${header.id === "select" ? "justify-center" : ""}`}
                                          >
                                            {flexRender(
                                              header.column.columnDef.header,
                                              header.getContext(),
                                            )}
                                          </div>
                                        )}
                                      </th>
                                    ))}
                                  </tr>
                                ))}
                              </thead>
                              <tbody>
                                {item.practices.map((row) => (
                                  <tr
                                    key={row.id}
                                    onClick={() => handleRowClick(row.id)}
                                    className={`cursor-pointer ${selectedRowId === row.id ? "bg-[#fcfbf9]" : "bg-white hover:bg-[#faf9f7]"}`}
                                  >
                                    {table.getAllColumns().map((col) => (
                                      <td
                                        key={col.id}
                                        className="border-b border-[#f4f1ec] border-r border-[#f6f2ec] px-3 py-2 text-[13px] text-slate-600 last:border-r-0"
                                      >
                                        {renderCell(row, col.id)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
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
            )}

            {rows.length === 0 ? (
              <div className="relative flex min-h-[520px] items-center justify-center">
                <div className="absolute inset-y-0 left-[42px] w-px bg-[#f7f2ec]" />
                <div className="flex max-w-md flex-col items-center px-6 text-center">
                  <EmptyStateIllustration />
                  <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                    Add your first Practice
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    Use our API or add your first Practice manually
                  </p>
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="app-control mt-5 inline-flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add a Practice
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
                {String(selectedRow.values.name || "Practice")}
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
                Create Practice
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
              onSubmit={handleCreatePractice}
              className="flex-1 overflow-auto p-4"
            >
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Practice Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    placeholder="Enter practice name"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    NPI <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.npi}
                    onChange={(e) => handleFormChange("npi", e.target.value)}
                    placeholder="National Provider Identifier"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        handleFormChange("status", e.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      {statusOptions.map((status) => (
                        <option
                          key={status}
                          value={status}
                          disabled={status === "ACTIVE"}
                        >
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Region <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.region}
                      onChange={(e) =>
                        handleFormChange("region", e.target.value)
                      }
                      placeholder="e.g. Northeast"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Source <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.source}
                      onChange={(e) =>
                        handleFormChange("source", e.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      {sourceOptions.map((source) => (
                        <option key={source} value={source}>
                          {source.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Bucket
                    </label>
                    <input
                      type="text"
                      value={formData.bucket}
                      onChange={(e) =>
                        handleFormChange("bucket", e.target.value)
                      }
                      placeholder="Comma-separated"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Company
                  </label>
                  {companiesLoading ? (
                    <div className="app-control flex items-center justify-center rounded-md px-3 py-2 text-[13px] text-slate-400">
                      Loading companies...
                    </div>
                  ) : (
                    <select
                      value={formData.companyId}
                      onChange={(e) =>
                        handleFormChange("companyId", e.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      <option value="">-- Select a Company --</option>
                      {companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {formData.companyId && (
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-700">
                      Tax ID
                    </label>
                    <select
                      value={formData.taxIdId}
                      onChange={(e) =>
                        handleFormChange("taxIdId", e.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      <option value="">-- Select a Tax ID --</option>
                      {companyTaxIds.map((taxId) => (
                        <option key={taxId.id} value={taxId.id}>
                          {taxId.taxIdNumber} - {taxId.legalEntityName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-700">
                    Group NPIs
                  </label>
                  <div className="space-y-2">
                    {groupNpiEntries.map((entry, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={entry.groupNpiNumber}
                          onChange={(e) => {
                            const updated = [...groupNpiEntries];
                            updated[index].groupNpiNumber = e.target.value;
                            setGroupNpiEntries(updated);
                          }}
                          placeholder="Group NPI Number"
                          className="app-control rounded-md px-3 py-2 text-[13px]"
                        />
                        <input
                          type="text"
                          value={entry.groupName}
                          onChange={(e) => {
                            const updated = [...groupNpiEntries];
                            updated[index].groupName = e.target.value;
                            setGroupNpiEntries(updated);
                          }}
                          placeholder="Group Name"
                          className="app-control rounded-md px-3 py-2 text-[13px]"
                        />
                        <select
                          value={entry.status}
                          onChange={(e) => {
                            const updated = [...groupNpiEntries];
                            updated[index].status = e.target.value;
                            setGroupNpiEntries(updated);
                          }}
                          className="app-control rounded-md px-2 py-2 text-[13px]"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setGroupNpiEntries(
                              groupNpiEntries.filter((_, i) => i !== index),
                            )
                          }
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        setGroupNpiEntries([
                          ...groupNpiEntries,
                          {
                            groupNpiNumber: "",
                            groupName: "",
                            status: "ACTIVE",
                            notes: "",
                          },
                        ])
                      }
                      className="flex items-center gap-1 text-[13px] text-[#4f63ea] hover:text-[#4f63ea]"
                    >
                      <Plus className="h-4 w-4" /> Add Group NPI
                    </button>
                  </div>
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
                  {isSubmitting ? "Creating..." : "Create Practice"}
                </button>
              </div>
            </form>
          </aside>
        )}
      </div>
    </AppLayout>
  );
}
