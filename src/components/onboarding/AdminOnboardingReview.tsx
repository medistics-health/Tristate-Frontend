import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowRight,
  Building2,
  CheckCircle,
  ChevronDown,
  Clock,
  FileText,
  LayoutGrid,
  MapPin,
  Plus,
  Search,
  Target,
  User,
  Users,
  X,
  XCircle,
} from "lucide-react";
import AppLayout from "../layout/AppLayout";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import {
  getOnboardings,
  getOnboarding,
  updateOnboarding,
  type Onboarding,
  type OnboardingDocument,
  type OnboardingContact,
  type OnboardingPractice,
  type OnboardingLocation,
  type OnboardingProvider,
} from "../../services/operations/onboarding";

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type OnboardingRow = {
  id: string;
  companyName: string;
  submittedBy: string;
  type: string;
  status: string;
  priority: string;
  services: string[];
  submissionDate: string;
  contacts: number;
  practices: number;
  original: Onboarding;
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const onboardingTypeOptions = [
  { label: "Single Practice", value: "SINGLE_PRACTICE" },
  {
    label: "Multi Practice Organization",
    value: "MULTI_PRACTICE_ORGANIZATION",
  },
  {
    label: "Single Practice Organization",
    value: "SINGLE_PRACTICE_ORGANIZATION",
  },
];

const organizationTypeOptions = [
  { label: "Independent Practice", value: "INDEPENDENT_PRACTICE" },
  { label: "Medical Group", value: "MEDICAL_GROUP" },
  { label: "Multi-Specialty Group", value: "MULTI_SPECIALTY_GROUP" },
  { label: "MSO", value: "MSO" },
  { label: "IPA", value: "IPA" },
  { label: "DSO", value: "DSO" },
  { label: "FQHC", value: "FQHC" },
  { label: "Hospital-Affiliated Group", value: "HOSPITAL_AFFILIATED_GROUP" },
  { label: "Pharmacy Organization", value: "PHARMACY_ORGANIZATION" },
  { label: "Other", value: "OTHER" },
];

const ownershipTypeOptions = [
  { label: "Physician-Owned", value: "PHYSICIAN_OWNED" },
  { label: "Corporate-Owned", value: "CORPORATE_OWNED" },
  { label: "Private Equity Backed", value: "PRIVATE_EQUITY_BACKED" },
  { label: "Hospital-Affiliated", value: "HOSPITAL_AFFILIATED" },
  { label: "Family-Owned", value: "FAMILY_OWNED" },
  { label: "Partnership", value: "PARTNERSHIP" },
  { label: "Other", value: "OTHER" },
];

const contactRoleOptions = [
  { label: "Executive / Owner", value: "EXECUTIVE_OWNER" },
  { label: "Practice Manager", value: "PRACTICE_MANAGER" },
  { label: "Office Manager", value: "OFFICE_MANAGER" },
  { label: "Billing Contact", value: "BILLING_CONTACT" },
  { label: "Credentialing Contact", value: "CREDENTIALING_CONTACT" },
  { label: "Clinical Lead", value: "CLINICAL_LEAD" },
  { label: "IT / Technical Contact", value: "IT_TECHNICAL_CONTACT" },
  { label: "Compliance Contact", value: "COMPLIANCE_CONTACT" },
  { label: "Marketing Contact", value: "MARKETING_CONTACT" },
  { label: "Authorized Signer", value: "AUTHORIZED_SIGNER" },
  { label: "Other", value: "OTHER" },
];

const specialtyOptions = [
  { label: "Family Medicine", value: "FAMILY_MEDICINE" },
  { label: "Internal Medicine", value: "INTERNAL_MEDICINE" },
  { label: "Primary Care", value: "PRIMARY_CARE" },
  { label: "Pediatrics", value: "PEDIATRICS" },
  { label: "Cardiology", value: "CARDIOLOGY" },
  { label: "Gastroenterology", value: "GASTROENTEROLOGY" },
  { label: "Endocrinology", value: "ENDOCRINOLOGY" },
  { label: "Pulmonology", value: "PULMONOLOGY" },
  { label: "Nephrology", value: "NEPHROLOGY" },
  { label: "Neurology", value: "NEUROLOGY" },
  { label: "Psychiatry", value: "PSYCHIATRY_BEHAVIORAL_HEALTH" },
  { label: "Multi-Specialty", value: "MULTI_SPECIALTY" },
  { label: "Other", value: "OTHER" },
];

const priorityOptions = [
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

const centralizationOptions = [
  { label: "Yes", value: "YES" },
  { label: "No", value: "NO" },
  { label: "Partially", value: "PARTIALLY" },
];

const yesNoMaybeOptions = [
  { label: "Yes", value: "YES" },
  { label: "No", value: "NO" },
  { label: "Not Sure", value: "NOT_SURE" },
];

const minutesTrackerOptions = [
  { label: "EHR", value: "EHR" },
  { label: "Spreadsheet", value: "SPREADSHEET" },
  { label: "Vendor Platform", value: "VENDOR_PLATFORM" },
  { label: "Not Tracked", value: "NOT_TRACKED" },
  { label: "Other", value: "OTHER" },
];

const credentialingForOptions = [
  { label: "Group / Practice", value: "GROUP_PRACTICE" },
  { label: "Individual Providers", value: "INDIVIDUAL_PROVIDERS" },
  { label: "Both", value: "BOTH" },
];

const servicePracticeOptions = [
  { label: "All Practices", value: "ALL_PRACTICES" },
  { label: "Selected Practices", value: "SELECTED_PRACTICES" },
  { label: "Single Practice Only", value: "SINGLE_PRACTICE_ONLY" },
];

const complianceConcernOptions = [
  { label: "HIPAA", value: "HIPAA" },
  { label: "Audit Risk", value: "AUDIT_RISK" },
  { label: "Documentation", value: "DOCUMENTATION" },
  { label: "Consent", value: "CONSENT" },
  { label: "Billing Compliance", value: "BILLING_COMPLIANCE" },
  { label: "State-Specific Rules", value: "STATE_SPECIFIC_RULES" },
  { label: "None", value: "NONE" },
  { label: "Other", value: "OTHER" },
];

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  LOW: "bg-green-100 text-green-700",
};

const columnHelper = createColumnHelper<OnboardingRow>();

function BoolBadge({
  value,
  label,
}: {
  value: boolean | undefined;
  label: string;
}) {
  if (value === undefined || value === null) return null;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
        value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      }`}
    >
      {label}: {value ? "Yes" : "No"}
    </span>
  );
}

export default function AdminOnboardingReview() {
  const [rows, setRows] = useState<OnboardingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedOnboarding, setSelectedOnboarding] =
    useState<Onboarding | null>(null);
  const [isSelectedLoading, setIsSelectedLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdating, setIsUpdating] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Review Flow State
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewingData, setReviewingData] = useState<Onboarding | null>(null);
  const [reviewStep, setReviewStep] = useState(1);
  const [showEmptyFields, setShowEmptyFields] = useState(true);

  const parseNumericInput = (value: string) =>
    value.trim() === "" ? undefined : Number(value);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;

      const response = await getOnboardings(params);
      const mappedRows: OnboardingRow[] = (response.onboardings || []).map(
        (ob: Onboarding) => ({
          id: ob.id,
          companyName: ob.legalCompanyName || ob.dbaName || "N/A",
          submittedBy: ob.submittedByName || "Unknown",
          type: ob.onboardingType || "N/A",
          status: ob.status || "DRAFT",
          priority: ob.priorityLevel || "MEDIUM",
          services: ob.requestedServices || [],
          submissionDate: ob.submissionDate
            ? new Date(ob.submissionDate).toLocaleDateString()
            : "N/A",
          contacts: ob.contacts?.length || 0,
          practices: ob.practices?.length || 0,
          original: ob,
        }),
      );
      setRows(mappedRows);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination?.totalRecords || 0,
        totalPages: response.pagination?.totalPages || 0,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to fetch onboardings.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [pagination.page, filters.status, filters.search]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );
  const canonicalSelectedOnboarding =
    selectedOnboarding ?? selectedRow?.original ?? null;
  const detailData = canonicalSelectedOnboarding;

  const columns = useMemo<ColumnDef<OnboardingRow>[]>(
    () => [
      columnHelper.accessor("companyName", {
        header: () => (
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-slate-400" />
            <span>Company</span>
          </div>
        ),
        cell: (info) => (
          <div>
            <p className="font-medium text-slate-700">{info.getValue()}</p>
            <p className="text-[12px] text-slate-400">
              {info.row.original.submittedBy}
            </p>
          </div>
        ),
        size: 220,
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => {
          const v = info.getValue();
          const label =
            v === "SINGLE_PRACTICE"
              ? "Single Practice"
              : v === "MULTI_PRACTICE_ORGANIZATION"
                ? "Multi Practice"
                : v === "SINGLE_PRACTICE_ORGANIZATION"
                  ? "Single Practice Org"
                  : v;
          return <span className="text-slate-600">{label}</span>;
        },
        size: 160,
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const v = info.getValue();
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                statusColors[v] || "bg-gray-100 text-gray-700"
              }`}
            >
              {statusLabels[v] || v}
            </span>
          );
        },
        size: 120,
      }),
      columnHelper.accessor("priority", {
        header: "Priority",
        cell: (info) => {
          const v = info.getValue();
          return (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                priorityColors[v] || "bg-gray-100 text-gray-700"
              }`}
            >
              {v}
            </span>
          );
        },
        size: 100,
      }),
      columnHelper.accessor("services", {
        header: "Services",
        cell: (info) => (
          <div className="flex flex-wrap gap-1">
            {info
              .getValue()
              .slice(0, 2)
              .map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-600"
                >
                  {s}
                </span>
              ))}
            {info.getValue().length > 2 && (
              <span className="text-[11px] text-slate-400">
                +{info.getValue().length - 2}
              </span>
            )}
          </div>
        ),
        size: 180,
      }),
      columnHelper.accessor("submissionDate", {
        header: "Submitted",
        cell: (info) => (
          <span className="text-slate-500">{info.getValue()}</span>
        ),
        size: 120,
      }),
      columnHelper.accessor("contacts", {
        header: "Contacts",
        cell: (info) => (
          <span className="text-slate-500">{info.getValue()}</span>
        ),
        size: 90,
      }),
      columnHelper.accessor("practices", {
        header: "Practices",
        cell: (info) => (
          <span className="text-slate-500">{info.getValue()}</span>
        ),
        size: 100,
      }),
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
    enableSortingRemoval: false,
  });

  const handleRowClick = async (rowId: string) => {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setActiveTab("overview");
    setSelectedOnboarding(null);
    setIsSelectedLoading(true);

    try {
      const onboarding = await getOnboarding(rowId);
      setSelectedOnboarding(onboarding);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load onboarding.";
      toast.error(message);
    } finally {
      setIsSelectedLoading(false);
    }
  };

  const closeDetailPanel = () => {
    setShowDetailPanel(false);
    setSelectedRowId(null);
    setSelectedOnboarding(null);
  };

  const startReview = async () => {
    if (!selectedRow) return;
    setIsSelectedLoading(true);
    try {
      const onboarding =
        selectedOnboarding ?? (await getOnboarding(selectedRow.id));
      setSelectedOnboarding(onboarding);
      setReviewingData(onboarding);
      setIsReviewing(true);
      setReviewStep(1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load onboarding.";
      toast.error(message);
    } finally {
      setIsSelectedLoading(false);
    }
  };

  const closeReview = () => {
    setIsReviewing(false);
    setReviewingData(null);
  };

  const handleUpdateReviewField = (field: keyof Onboarding, value: any) => {
    if (!reviewingData) return;
    let finalValue = value;
    if (value === "true") finalValue = true;
    if (value === "false") finalValue = false;
    setReviewingData({ ...reviewingData, [field]: finalValue });
  };

  const handleSaveReview = async (finalStatus?: string) => {
    if (!reviewingData) return;
    setIsUpdating(true);
    try {
      const updateData: Partial<Onboarding> = { ...reviewingData };
      if (finalStatus) updateData.status = finalStatus;

      const updated = await updateOnboarding(reviewingData.id, updateData);
      toast.success("Onboarding updated successfully.");
      setSelectedOnboarding(updated);

      // Update local state
      setRows((prev) =>
        prev.map((r) =>
          r.id === reviewingData.id
            ? {
                ...r,
                status: updated.status || r.status,
                companyName:
                  updated.legalCompanyName || updated.dbaName || r.companyName,
                original: updated,
              }
            : r,
        ),
      );

      if (finalStatus) {
        closeReview();
        closeDetailPanel();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update onboarding.";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedRow) return;
    setIsUpdating(true);
    try {
      await updateOnboarding(selectedRow.id, { status: newStatus });
      toast.success(`Status updated to ${statusLabels[newStatus]}`);
      setSelectedOnboarding((prev) =>
        prev ? { ...prev, status: newStatus } : prev,
      );
      setRows((prev) =>
        prev.map((r) =>
          r.id === selectedRow.id
            ? {
                ...r,
                status: newStatus,
                original: { ...r.original, status: newStatus },
              }
            : r,
        ),
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to update status.";
      toast.error(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateNestedField = (
    section: string,
    field: string,
    value: any,
  ) => {
    if (!reviewingData) return;
    const currentSection = (reviewingData as any)[section] || {};
    let finalValue = value;
    if (value === "true") finalValue = true;
    if (value === "false") finalValue = false;

    setReviewingData({
      ...reviewingData,
      [section]: {
        ...currentSection,
        [field]: finalValue,
      },
    });
  };

  const toggleArrayValue = (field: keyof Onboarding, value: string) => {
    if (!reviewingData) return;
    const currentValues = ((reviewingData[field] as string[]) || []).slice();
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];
    setReviewingData({ ...reviewingData, [field]: nextValues });
  };

  const reviewSteps = [
    { id: 1, title: "Company & Structure" },
    { id: 2, title: "Contacts" },
    { id: 3, title: "Practices & Providers" },
    { id: 4, title: "Operational Details" },
    { id: 5, title: "Clinical & Outreach" },
    { id: 6, title: "Compliance & Marketing" },
    { id: 7, title: "Admin Decision" },
  ];

  const renderReviewFlow = () => {
    if (!reviewingData) return null;

    const requestedServices = reviewingData.requestedServices || [];
    const isMultiPracticeOrg =
      reviewingData.onboardingType === "MULTI_PRACTICE_ORGANIZATION";
    const isIndividualPractice =
      reviewingData.onboardingType === "SINGLE_PRACTICE";
    const hasBillingSelected = requestedServices.includes("BILLING_RCM");
    const hasCredentialingSelected =
      requestedServices.includes("CREDENTIALING");
    const hasMarketingSelected =
      requestedServices.includes("PATIENT_ACQUISITION") ||
      requestedServices.includes("BRAND_GROWTH");
    const hasCareProgramsSelected =
      requestedServices.some((service) =>
        ["APCM", "CCM", "RPM"].includes(service),
      ) || !!reviewingData.careProgram?.programsPlanned?.length;
    const lockedTopLevelFields = new Set<keyof Onboarding>([
      "onboardingType",
      "isAuthorizedPerson",
      "requestedServices",
      "servicesForAllPractices",
      "replacingExistingVendor",
    ]);
    const lockedNestedFields = new Set([
      "credentialing.credentialingNeeded",
    ]);
    const completedSectionCount = [
      reviewingData.legalCompanyName || reviewingData.dbaName,
      reviewingData.contacts?.length,
      reviewingData.practices?.length,
      reviewingData.billing,
      reviewingData.credentialing,
      reviewingData.technology,
      reviewingData.outreach,
      reviewingData.compliance,
      reviewingData.documents?.length,
    ].filter(Boolean).length;
    const statusTone =
      statusColors[reviewingData.status || ""] || "bg-slate-100 text-slate-700";

    const renderField = (
      label: string,
      field: keyof Onboarding,
      type: string = "text",
      options?: { label: string; value: string }[],
    ) => {
      const val = reviewingData[field];
      const isEmpty = val === undefined || val === null || val === "";
      const isLocked = lockedTopLevelFields.has(field);
      const displayValue =
        val === true
          ? "true"
          : val === false
            ? "false"
            : (val as string | number) || "";

      if (!showEmptyFields && isEmpty) return null;

      return (
        <div
          className={`space-y-2 rounded-2xl border px-4 py-3 transition-all ${
            isLocked
              ? "border-amber-200 bg-amber-50/70"
              : isEmpty
                ? "border-slate-200 bg-slate-50/70"
                : "border-slate-200 bg-white shadow-sm"
          } ${isEmpty ? "opacity-70" : "opacity-100"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {label}
            </label>
            {isLocked && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Locked
              </span>
            )}
          </div>
          {isLocked && (
            <p className="text-[11px] text-amber-700">
              Locked to avoid changing the review structure.
            </p>
          )}
          {type === "select" ? (
            <select
              value={displayValue.toString()}
              onChange={(e) => handleUpdateReviewField(field, e.target.value)}
              disabled={isLocked}
              className={`app-control w-full rounded-xl px-4 py-2.5 text-[13px] border-transparent transition-all ${
                isLocked
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-slate-50 focus:bg-white focus:border-indigo-500"
              }`}
            >
              <option value="">Select...</option>
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : type === "textarea" ? (
            <textarea
              value={displayValue.toString()}
              onChange={(e) => handleUpdateReviewField(field, e.target.value)}
              rows={3}
              disabled={isLocked}
              className={`app-control w-full rounded-xl px-4 py-2.5 text-[13px] border-transparent transition-all ${
                isLocked
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-slate-50 focus:bg-white focus:border-indigo-500"
              }`}
            />
          ) : (
            <input
              type={type}
              value={displayValue.toString()}
              disabled={isLocked}
              onChange={(e) =>
                handleUpdateReviewField(
                  field,
                  type === "number"
                    ? parseNumericInput(e.target.value)
                    : e.target.value,
                )
              }
              className={`app-control w-full rounded-xl px-4 py-2.5 text-[13px] border-transparent transition-all ${
                isLocked
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-slate-50 focus:bg-white focus:border-indigo-500"
              }`}
            />
          )}
        </div>
      );
    };

    const renderNestedField = (
      section: string,
      label: string,
      field: string,
      type: string = "text",
      options?: { label: string; value: string }[],
    ) => {
      const sectData = (reviewingData as any)[section] || {};
      const val = sectData[field];
      const isEmpty = val === undefined || val === null || val === "";
      const isLocked = lockedNestedFields.has(`${section}.${field}`);
      const displayValue =
        val === true
          ? "true"
          : val === false
            ? "false"
            : (val as string | number) || "";

      if (!showEmptyFields && isEmpty) return null;

      return (
        <div
          className={`space-y-2 rounded-2xl border px-4 py-3 transition-all ${
            isLocked
              ? "border-amber-200 bg-amber-50/70"
              : isEmpty
                ? "border-slate-200 bg-slate-50/70"
                : "border-slate-200 bg-white shadow-sm"
          } ${isEmpty ? "opacity-70" : "opacity-100"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {label}
            </label>
            {isLocked && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Locked
              </span>
            )}
          </div>
          {isLocked && (
            <p className="text-[11px] text-amber-700">
              Locked to avoid opening dependent fields.
            </p>
          )}
          {type === "select" ? (
            <select
              value={displayValue.toString()}
              disabled={isLocked}
              onChange={(e) =>
                handleUpdateNestedField(section, field, e.target.value)
              }
              className={`app-control w-full rounded-xl px-4 py-2.5 text-[13px] border-transparent transition-all ${
                isLocked
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-slate-50 focus:bg-white focus:border-indigo-500"
              }`}
            >
              <option value="">Select...</option>
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : type === "textarea" ? (
            <textarea
              value={displayValue.toString()}
              disabled={isLocked}
              onChange={(e) =>
                handleUpdateNestedField(section, field, e.target.value)
              }
              rows={3}
              className={`app-control w-full rounded-xl px-4 py-2.5 text-[13px] border-transparent transition-all ${
                isLocked
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-slate-50 focus:bg-white focus:border-indigo-500"
              }`}
            />
          ) : (
            <input
              type={type}
              value={displayValue.toString()}
              disabled={isLocked}
              onChange={(e) =>
                handleUpdateNestedField(
                  section,
                  field,
                  type === "number"
                    ? parseNumericInput(e.target.value)
                    : e.target.value,
                )
              }
              className={`app-control w-full rounded-xl px-4 py-2.5 text-[13px] border-transparent transition-all ${
                isLocked
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-slate-50 focus:bg-white focus:border-indigo-500"
              }`}
            />
          )}
        </div>
      );
    };

    const renderMultiSelect = (
      label: string,
      field: keyof Onboarding,
      options: { label: string; value: string }[],
    ) => {
      const values = (reviewingData[field] as string[]) || [];
      const isEmpty = values.length === 0;
      const isLocked = lockedTopLevelFields.has(field);

      if (!showEmptyFields && isEmpty) return null;

      return (
        <div
          className={`space-y-3 rounded-2xl border px-4 py-3 transition-all ${
            isLocked
              ? "border-amber-200 bg-amber-50/70"
              : isEmpty
                ? "border-slate-200 bg-slate-50/70"
                : "border-slate-200 bg-white shadow-sm"
          } ${isEmpty ? "opacity-70" : "opacity-100"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {label}
            </label>
            {isLocked && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Locked
              </span>
            )}
          </div>
          {isLocked && (
            <p className="text-[11px] text-amber-700">
              Locked to avoid changing the review structure.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {options.map((opt) => {
              const isSelected = values.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isLocked}
                  onClick={() => toggleArrayValue(field, opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-medium transition-all ${
                    isSelected
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                      : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                  } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <div
                    className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}
                  >
                    {isSelected && (
                      <CheckCircle className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    };

    const renderSingleSelect = (
      label: string,
      field: keyof Onboarding,
      options: { label: string; value: string }[],
    ) => {
      const values = (reviewingData[field] as string[]) || [];
      const value = values[0] || "";
      const isEmpty = !value;
      const isLocked = lockedTopLevelFields.has(field);

      if (!showEmptyFields && isEmpty) return null;

      return (
        <div
          className={`space-y-2 rounded-2xl border px-4 py-3 transition-all ${
            isLocked
              ? "border-amber-200 bg-amber-50/70"
              : isEmpty
                ? "border-slate-200 bg-slate-50/70"
                : "border-slate-200 bg-white shadow-sm"
          } ${isEmpty ? "opacity-70" : "opacity-100"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {label}
            </label>
            {isLocked && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Locked
              </span>
            )}
          </div>
          {isLocked && (
            <p className="text-[11px] text-amber-700">
              Locked to avoid changing the review structure.
            </p>
          )}
          <select
            value={value}
            disabled={isLocked}
            onChange={(e) =>
              setReviewingData({
                ...(reviewingData as Onboarding),
                [field]: e.target.value ? [e.target.value] : [],
              })
            }
            className={`app-control w-full rounded-xl px-4 py-2.5 text-[13px] border-transparent transition-all ${
              isLocked
                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                : "bg-slate-50 focus:bg-white focus:border-indigo-500"
            }`}
          >
            <option value="">Select...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    };

    const renderNestedMultiSelect = (
      section: string,
      label: string,
      field: string,
      options: { label: string; value: string }[],
    ) => {
      const values = (((reviewingData as any)[section] || {})[field] ||
        []) as string[];
      const isEmpty = values.length === 0;
      const isLocked = lockedNestedFields.has(`${section}.${field}`);

      if (!showEmptyFields && isEmpty) return null;

      return (
        <div
          className={`space-y-3 rounded-2xl border px-4 py-3 transition-all ${
            isLocked
              ? "border-amber-200 bg-amber-50/70"
              : isEmpty
                ? "border-slate-200 bg-slate-50/70"
                : "border-slate-200 bg-white shadow-sm"
          } ${isEmpty ? "opacity-70" : "opacity-100"}`}
        >
          <div className="flex items-start justify-between gap-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {label}
            </label>
            {isLocked && (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Locked
              </span>
            )}
          </div>
          {isLocked && (
            <p className="text-[11px] text-amber-700">
              Locked to avoid opening dependent fields.
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {options.map((opt) => {
              const isSelected = values.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    const currentValues = [
                      ...((((reviewingData as any)[section] || {})[field] ||
                        []) as string[]),
                    ];
                    const nextValues = currentValues.includes(opt.value)
                      ? currentValues.filter((value) => value !== opt.value)
                      : [...currentValues, opt.value];
                    handleUpdateNestedField(section, field, nextValues);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-medium transition-all ${
                    isSelected
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                      : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
                  } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <div
                    className={`h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    };

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 backdrop-blur-md p-4">
        <div className="flex h-full max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(79,99,234,0.16),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${statusTone}`}
                  >
                    {statusLabels[reviewingData.status || ""] ||
                      reviewingData.status ||
                      "Draft"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    Step {reviewStep} of {reviewSteps.length}
                  </span>
                </div>
                <h2 className="text-[18px] font-bold tracking-tight text-slate-900">
                  Review Onboarding:{" "}
                  {reviewingData.legalCompanyName || reviewingData.dbaName}
                </h2>
                <div className="mt-1 flex items-center gap-3">
                  <p className="text-[12px] text-slate-500">
                    Admin Review and Data Verification
                  </p>
                  <div className="h-3 w-px bg-slate-200" />
                  <button
                    type="button"
                    onClick={() => setShowEmptyFields(!showEmptyFields)}
                    className={`text-[11px] font-bold transition-colors ${showEmptyFields ? "text-indigo-600" : "text-slate-400"}`}
                  >
                    {showEmptyFields
                      ? "Showing All Fields"
                      : "Showing Filled Only"}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={closeReview}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 shadow-sm hover:bg-slate-50 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Stepper */}
          <div className="border-b border-slate-200 bg-white/80 px-6 py-4">
            <div className="flex items-center justify-between">
              {reviewSteps.map((step, idx) => {
                const isActive = reviewStep === step.id;
                const isPast = reviewStep > step.id;
                return (
                  <div key={step.id} className="flex flex-1 items-center">
                    <button
                      type="button"
                      onClick={() => setReviewStep(step.id)}
                      className={`flex flex-col items-center gap-1.5 focus:outline-none ${isActive ? "text-indigo-600" : isPast ? "text-slate-600" : "text-slate-400"}`}
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold transition-all ${
                          isActive
                            ? "bg-indigo-600 text-white ring-4 ring-indigo-100"
                            : isPast
                              ? "bg-indigo-100 text-indigo-600"
                              : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {isPast ? <CheckCircle className="h-4 w-4" /> : step.id}
                      </div>
                      <span className="hidden text-[11px] font-semibold md:block">
                        {step.title}
                      </span>
                    </button>
                    {idx < reviewSteps.length - 1 && (
                      <div
                        className={`h-[2px] flex-1 mx-2 ${reviewStep > step.id + 1 ? "bg-indigo-200" : "bg-slate-100"}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 border-b border-slate-200 bg-slate-50/80 px-6 py-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Submitted By
              </p>
              <p className="mt-1 text-[14px] font-semibold text-slate-800">
                {reviewingData.submittedByName || "Unknown"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Requested Services
              </p>
              <p className="mt-1 text-[14px] font-semibold text-slate-800">
                {requestedServices.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Contacts / Practices
              </p>
              <p className="mt-1 text-[14px] font-semibold text-slate-800">
                {reviewingData.contacts?.length || 0} /{" "}
                {reviewingData.practices?.length || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Sections With Data
              </p>
              <p className="mt-1 text-[14px] font-semibold text-slate-800">
                {completedSectionCount}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.9)_0%,rgba(255,255,255,1)_20%)] p-8 custom-scrollbar">
            {reviewStep === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section>
                  <h3 className="mb-6 text-[15px] font-bold text-slate-800 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Building2 className="h-4.5 w-4.5" />
                    </div>
                    Company Foundation
                  </h3>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {renderField("Legal Company Name", "legalCompanyName")}
                    {renderField("DBA Name", "dbaName")}
                    {renderField("Tax ID / EIN", "taxIdEin")}
                    {renderField(
                      "Organization Type",
                      "organizationType",
                      "select",
                      organizationTypeOptions,
                    )}
                    {renderField(
                      "Ownership Type",
                      "ownershipType",
                      "select",
                      ownershipTypeOptions,
                    )}
                    {renderField(
                      "Onboarding Type",
                      "onboardingType",
                      "select",
                      onboardingTypeOptions,
                    )}
                  </div>
                </section>
                <section>
                  <h3 className="mb-6 text-[15px] font-bold text-slate-800 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <MapPin className="h-4.5 w-4.5" />
                    </div>
                    Primary Headquarters
                  </h3>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {renderField("Address Line 1", "companyAddressLine1")}
                    {renderField("Address Line 2", "companyAddressLine2")}
                    {renderField("City", "companyCity")}
                    {renderField("State", "companyState")}
                    {renderField("ZIP Code", "companyZip")}
                    {renderField("Main Phone", "mainCompanyPhone")}
                    {renderField("Main Email", "mainCompanyEmail", "email")}
                    {renderField("Website", "companyWebsite")}
                  </div>
                </section>
                <section>
                  <h3 className="mb-6 text-[15px] font-bold text-slate-800 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <CheckCircle className="h-4.5 w-4.5" />
                    </div>
                    Authorization & Entity Roles
                  </h3>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {renderField(
                      "Authorized Person?",
                      "isAuthorizedPerson",
                      "select",
                      [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                      ],
                    )}
                    {!reviewingData.isAuthorizedPerson &&
                      renderField("Role In Onboarding", "nonAuthorizedRole")}
                    {isMultiPracticeOrg &&
                      renderField(
                        "Practices Being Onboarded",
                        "numberOfPractices",
                        "number",
                      )}
                    {renderField(
                      "Total Locations Being Onboarded",
                      "numberOfLocations",
                      "number",
                    )}
                    {renderField(
                      "Is Legal Contracting Entity?",
                      "isLegalContractingEntity",
                      "select",
                      [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                      ],
                    )}
                    {renderField(
                      "Is Billing Entity?",
                      "isBillingEntity",
                      "select",
                      [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                      ],
                    )}
                    {renderField(
                      "Is Credentialing Entity?",
                      "isCredentialingEntity",
                      "select",
                      [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                      ],
                    )}
                    {!isIndividualPractice &&
                      renderField(
                        "Billing Managed Centrally?",
                        "billingManagedCentrally",
                        "select",
                        centralizationOptions,
                      )}
                    {!isIndividualPractice &&
                      renderField(
                        "Credentialing Managed Centrally?",
                        "credentialingManagedCentrally",
                        "select",
                        centralizationOptions,
                      )}
                    {!isIndividualPractice &&
                      renderField(
                        "Contracting Managed Centrally?",
                        "contractingManagedCentrally",
                        "select",
                        centralizationOptions,
                      )}
                    {!isIndividualPractice &&
                      renderField(
                        "One Main Contact For All Practices?",
                        "oneMainContact",
                        "select",
                        [
                          { label: "Yes", value: "true" },
                          { label: "No", value: "false" },
                        ],
                      )}
                  </div>
                </section>
              </div>
            )}

            {reviewStep === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <User className="h-4.5 w-4.5" />
                  </div>
                  Onboarding Contacts
                </h3>
                <div className="grid gap-6">
                  {reviewingData.contacts?.map((contact, idx) => (
                    <div
                      key={idx}
                      className="rounded-3xl border border-slate-100 bg-slate-50/30 p-6"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-[12px] font-bold text-indigo-600 uppercase tracking-widest">
                          Contact {idx + 1}
                        </span>
                        {contact.isPrimaryDecisionMaker && (
                          <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                            Primary Decision Maker
                          </span>
                        )}
                      </div>
                      <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Full Name
                          </label>
                          <input
                            className="app-control w-full rounded-xl px-4 py-2 text-[13px] bg-white border-transparent focus:border-indigo-500"
                            value={contact.fullName || ""}
                            onChange={(e) => {
                              const next = [...(reviewingData.contacts || [])];
                              next[idx] = {
                                ...next[idx],
                                fullName: e.target.value,
                              };
                              handleUpdateReviewField("contacts", next);
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Email Address
                          </label>
                          <input
                            className="app-control w-full rounded-xl px-4 py-2 text-[13px] bg-white border-transparent focus:border-indigo-500"
                            value={contact.email || ""}
                            onChange={(e) => {
                              const next = [...(reviewingData.contacts || [])];
                              next[idx] = {
                                ...next[idx],
                                email: e.target.value,
                              };
                              handleUpdateReviewField("contacts", next);
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Contact Role
                          </label>
                          <select
                            className="app-control w-full rounded-xl px-4 py-2 text-[13px] bg-white border-transparent focus:border-indigo-500"
                            value={contact.contactRole || ""}
                            onChange={(e) => {
                              const next = [...(reviewingData.contacts || [])];
                              next[idx] = {
                                ...next[idx],
                                contactRole: e.target.value,
                              };
                              handleUpdateReviewField("contacts", next);
                            }}
                          >
                            <option value="">Select Role...</option>
                            {contactRoleOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewStep === 3 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <h3 className="text-[15px] font-bold text-slate-800 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <LayoutGrid className="h-4.5 w-4.5" />
                  </div>
                  Practices & Scope
                </h3>
                <div className="grid gap-10">
                  {reviewingData.practices?.map((practice, idx) => (
                    <div
                      key={idx}
                      className="rounded-3xl border-2 border-slate-100 p-8 space-y-8 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                      <div className="flex items-center justify-between">
                        <h4 className="text-indigo-600 font-bold text-sm tracking-widest uppercase">
                          Practice {idx + 1}: {practice.practiceName}
                        </h4>
                        <span className="text-[11px] font-bold text-slate-400">
                          {practice.locations?.length || 0} Locations •{" "}
                          {practice.providers?.length || 0} Providers
                        </span>
                      </div>
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Practice Name
                          </label>
                          <input
                            className="app-control w-full rounded-xl px-4 py-2.5 text-[13px] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500"
                            value={practice.practiceName || ""}
                            onChange={(e) => {
                              const next = [...(reviewingData.practices || [])];
                              next[idx] = {
                                ...next[idx],
                                practiceName: e.target.value,
                              };
                              handleUpdateReviewField("practices", next);
                            }}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Primary Specialty
                          </label>
                          <select
                            className="app-control w-full rounded-xl px-4 py-2.5 text-[13px] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500"
                            value={practice.practiceType || ""}
                            onChange={(e) => {
                              const next = [...(reviewingData.practices || [])];
                              next[idx] = {
                                ...next[idx],
                                practiceType: e.target.value,
                              };
                              handleUpdateReviewField("practices", next);
                            }}
                          >
                            <option value="">Select Specialty...</option>
                            {specialtyOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Group NPI
                          </label>
                          <input
                            className="app-control w-full rounded-xl px-4 py-2.5 text-[13px] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500"
                            value={practice.groupNpi || ""}
                            onChange={(e) => {
                              const next = [...(reviewingData.practices || [])];
                              next[idx] = {
                                ...next[idx],
                                groupNpi: e.target.value,
                              };
                              handleUpdateReviewField("practices", next);
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-3 pt-4 border-t border-slate-100">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Volume & Demographics
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            {
                              label: "Providers",
                              field: "approximateNumberOfProviders",
                            },
                            {
                              label: "Locations",
                              field: "approximateNumberOfLocations",
                            },
                            {
                              label: "Monthly Patient Vol",
                              field: "approximateMonthlyPatientVolume",
                            },
                            {
                              label: "Medicare Vol %",
                              field: "approximateMedicarePatientVolume",
                            },
                          ].map((f) => (
                            <div key={f.field} className="space-y-1">
                              <label className="text-[10px] font-medium text-slate-400">
                                {f.label}
                              </label>
                              <input
                                type="number"
                                className="app-control w-full rounded-lg px-3 py-1.5 text-[12px] bg-slate-50"
                                value={(practice as any)[f.field] || 0}
                                onChange={(e) => {
                                  const next = [
                                    ...(reviewingData.practices || []),
                                  ];
                                  (next[idx] as any)[f.field] = Number(
                                    e.target.value,
                                  );
                                  handleUpdateReviewField("practices", next);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reviewStep === 4 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section>
                  <h3 className="mb-6 text-[15px] font-bold text-slate-800 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Clock className="h-4.5 w-4.5" />
                    </div>
                    Technology & Operations
                  </h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderNestedField("technology", "EHR System", "ehrSystem")}
                    {renderNestedField(
                      "technology",
                      "Practice Management System",
                      "practiceManagementSystem",
                    )}
                    {renderNestedField(
                      "technology",
                      "Clearinghouse",
                      "clearinghouse",
                    )}
                    {renderNestedField(
                      "technology",
                      "Fax Platform",
                      "faxPlatform",
                    )}
                    {renderNestedField(
                      "technology",
                      "Phone Platform",
                      "phonePlatform",
                    )}
                    {renderNestedField(
                      "technology",
                      "IT Contact Name",
                      "itContactName",
                    )}
                    {renderNestedField(
                      "technology",
                      "IT Contact Email",
                      "itContactEmail",
                      "email",
                    )}
                  </div>
                </section>
                <section>
                  <h3 className="mb-6 text-[15px] font-bold text-slate-800 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Target className="h-4.5 w-4.5" />
                    </div>
                    Service Scope & Strategy
                  </h3>
                  <div className="space-y-8">
                    {renderMultiSelect(
                      "Requested Services",
                      "requestedServices",
                      [
                        { label: "Credentialing", value: "CREDENTIALING" },
                        { label: "Billing / RCM", value: "BILLING_RCM" },
                        { label: "APCM", value: "APCM" },
                        { label: "CCM", value: "CCM" },
                        { label: "RPM", value: "RPM" },
                        {
                          label: "Patient Acquisition",
                          value: "PATIENT_ACQUISITION",
                        },
                        { label: "Brand Growth", value: "BRAND_GROWTH" },
                      ],
                    )}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {renderField(
                        "Priority Level",
                        "priorityLevel",
                        "select",
                        priorityOptions,
                      )}
                      {renderField("Primary Service", "primaryServiceToLaunch")}
                      {renderField(
                        "Requested Go-Live",
                        "requestedGoLiveDate",
                        "date",
                      )}
                      {renderField(
                        "Services For Practices",
                        "servicesForAllPractices",
                        "select",
                        servicePracticeOptions,
                      )}
                      {reviewingData.servicesForAllPractices ===
                        "SELECTED_PRACTICES" &&
                        renderMultiSelect(
                          "Selected Practices",
                          "selectedPractices",
                          (reviewingData.practices || []).map((practice) => ({
                            label:
                              practice.practiceName ||
                              practice.practiceDbaName ||
                              "Unnamed Practice",
                            value:
                              practice.practiceName ||
                              practice.practiceDbaName ||
                              "Unnamed Practice",
                          })),
                        )}
                      {reviewingData.servicesForAllPractices ===
                        "SINGLE_PRACTICE_ONLY" &&
                        renderSingleSelect(
                          "Which single practice?",
                          "selectedPractices",
                          (reviewingData.practices || []).map((practice) => ({
                            label:
                              practice.practiceName ||
                              practice.practiceDbaName ||
                              "Unnamed Practice",
                            value:
                              practice.practiceName ||
                              practice.practiceDbaName ||
                              "Unnamed Practice",
                          })),
                        )}
                      {renderField(
                        "Replacing Existing Vendor?",
                        "replacingExistingVendor",
                        "select",
                        [
                          { label: "Yes", value: "true" },
                          { label: "No", value: "false" },
                        ],
                      )}
                      {reviewingData.replacingExistingVendor &&
                        renderField("Current Vendor Name", "currentVendorName")}
                      {reviewingData.replacingExistingVendor &&
                        renderField(
                          "Current Vendor End Date",
                          "currentVendorEndDate",
                          "date",
                        )}
                    </div>
                    {renderField(
                      "Engagement Goals",
                      "engagementGoals",
                      "textarea",
                    )}
                  </div>
                </section>
              </div>
            )}

            {reviewStep === 5 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {hasCareProgramsSelected && (
                <section>
                  <h3 className="mb-6 text-[15px] font-bold text-slate-800 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Plus className="h-4.5 w-4.5" />
                    </div>
                    Care Programs & Outreach
                  </h3>
                  <div className="grid gap-6 md:grid-cols-2">
                    {renderNestedMultiSelect("careProgram", "Programs Planned", "programsPlanned", [
                      { label: "APCM", value: "APCM" },
                      { label: "CCM", value: "CCM" },
                      { label: "RPM", value: "RPM" },
                    ])}
                    {renderNestedField(
                      "careProgram",
                      "Eligible Patients",
                      "estimatedEligiblePatients",
                      "number",
                    )}
                    {renderNestedField(
                      "careProgram",
                      "Current Enrolled",
                      "currentEnrolledPatients",
                      "number",
                    )}
                    {renderNestedField(
                      "careProgram",
                      "Minutes Tracker",
                      "patientMinutesTracker",
                      "select",
                      minutesTrackerOptions,
                    )}
                    {renderNestedField(
                      "careProgram",
                      "Enrollment Handler",
                      "patientEnrollmentHandler",
                      "select",
                      [
                        { label: "Practice Staff", value: "PRACTICE_STAFF" },
                        { label: "Vendor", value: "VENDOR" },
                        { label: "Provider", value: "PROVIDER" },
                        { label: "Nobody Currently", value: "NOBODY_CURRENTLY" },
                        { label: "Other", value: "OTHER" },
                      ],
                    )}
                    {renderNestedField(
                      "careProgram",
                      "Monthly Follow-up Handler",
                      "monthlyFollowUpHandler",
                      "select",
                      [
                        { label: "Practice Staff", value: "PRACTICE_STAFF" },
                        { label: "Vendor", value: "VENDOR" },
                        { label: "Provider", value: "PROVIDER" },
                        { label: "Nobody Currently", value: "NOBODY_CURRENTLY" },
                        { label: "Other", value: "OTHER" },
                      ],
                    )}
                    {renderNestedField(
                      "careProgram",
                      "Consent Forms In Place",
                      "consentFormsInPlace",
                      "select",
                      [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                      ],
                    )}
                    {renderNestedField(
                      "careProgram",
                      "Existing Care Plan Workflow",
                      "existingCarePlanWorkflow",
                      "select",
                      [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                      ],
                    )}
                    {renderNestedField(
                      "careProgram",
                      "Compliance Concerns",
                      "complianceConcerns",
                      "textarea",
                    )}
                    {renderNestedField(
                      "outreach",
                      "Approved Outreach Hours",
                      "approvedOutreachHours",
                    )}
                    {renderNestedField(
                      "outreach",
                      "Patient Text Consent",
                      "patientTextConsent",
                      "select",
                      [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                      ],
                    )}
                    {renderNestedField(
                      "outreach",
                      "Interpreter Services",
                      "interpreterServices",
                      "select",
                      [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                      ],
                    )}
                    {renderNestedField(
                      "outreach",
                      "Outreach From Practice",
                      "outreachFromPractice",
                      "select",
                      [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                      ],
                    )}
                    {renderNestedField(
                      "outreach",
                      "Messaging Requirements",
                      "messagingRequirements",
                      "textarea",
                    )}
                  </div>
                </section>
                )}
                <section>
                  <h3 className="mb-6 text-[15px] font-bold text-slate-800 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Building2 className="h-4.5 w-4.5" />
                    </div>
                    Lab & Pharmacy Relations
                  </h3>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {renderNestedField(
                      "labPharmacy",
                      "Preferred Lab",
                      "preferredLab",
                    )}
                    {renderNestedField(
                      "labPharmacy",
                      "Lab Interface Status",
                      "labInterfaceStatus",
                    )}
                    {renderNestedField(
                      "labPharmacy",
                      "Pharmacy Partner",
                      "pharmacyPartnerName",
                    )}
                    {renderNestedField(
                      "labPharmacy",
                      "Lab Contact Name",
                      "labContactName",
                    )}
                    {renderNestedField(
                      "labPharmacy",
                      "Lab Contact Email",
                      "labContactEmail",
                      "email",
                    )}
                    {renderNestedField(
                      "labPharmacy",
                      "Existing Lab Relationship",
                      "existingLabRelationship",
                      "select",
                      [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                      ],
                    )}
                    {renderNestedField(
                      "labPharmacy",
                      "Pharmacy Partner Involved",
                      "pharmacyPartnerInvolved",
                      "select",
                      [
                        { label: "Yes", value: "true" },
                        { label: "No", value: "false" },
                      ],
                    )}
                    {renderNestedField(
                      "labPharmacy",
                      "Additional Notes",
                      "additionalNotes",
                      "textarea",
                    )}
                  </div>
                </section>
              </div>
            )}

            {reviewStep === 6 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {hasBillingSelected && (
                  <section>
                    <h3 className="mb-6 text-[15px] font-bold text-slate-800">
                      Billing Setup
                    </h3>
                    <div className="grid gap-6 md:grid-cols-2">
                      {renderNestedField(
                        "billing",
                        "Current Billing Model",
                        "currentBillingModel",
                        "select",
                        [
                          { label: "In-House", value: "IN_HOUSE" },
                          { label: "Outsourced", value: "OUTSOURCED" },
                          { label: "Hybrid", value: "HYBRID" },
                        ],
                      )}
                      {renderNestedField(
                        "billing",
                        "Billing Company Name",
                        "billingCompanyName",
                      )}
                      {renderNestedField(
                        "billing",
                        "Main Billing Contact Name",
                        "mainBillingContactName",
                      )}
                      {renderNestedField(
                        "billing",
                        "Main Billing Contact Email",
                        "mainBillingContactEmail",
                        "email",
                      )}
                      {renderNestedField(
                        "billing",
                        "Main Billing Contact Phone",
                        "mainBillingContactPhone",
                      )}
                      {renderNestedField(
                        "billing",
                        "Active Payers",
                        "activePayers",
                        "textarea",
                      )}
                      {renderNestedField(
                        "billing",
                        "EFT / ERA Setup",
                        "eftEraSetup",
                        "select",
                        yesNoMaybeOptions,
                      )}
                      {renderNestedField(
                        "billing",
                        "Invoice Recipient",
                        "invoiceRecipient",
                      )}
                      {renderNestedField(
                        "billing",
                        "Invoice Email",
                        "invoiceEmail",
                        "email",
                      )}
                      {renderNestedField(
                        "billing",
                        "Preferred Reporting Cadence",
                        "preferredReportingCadence",
                        "select",
                        [
                          { label: "Weekly", value: "WEEKLY" },
                          { label: "Biweekly", value: "BIWEEKLY" },
                          { label: "Monthly", value: "MONTHLY" },
                          { label: "Custom", value: "CUSTOM" },
                        ],
                      )}
                      {renderNestedField(
                        "billing",
                        "Additional Billing Notes",
                        "additionalNotes",
                        "textarea",
                      )}
                    </div>
                  </section>
                )}

                {hasCredentialingSelected && (
                  <section>
                    <h3 className="mb-6 text-[15px] font-bold text-slate-800">
                      Credentialing / Payer Enrollment
                    </h3>
                    <div className="grid gap-6 md:grid-cols-2">
                      {renderNestedField(
                        "credentialing",
                        "Credentialing Needed",
                        "credentialingNeeded",
                        "select",
                        [
                          { label: "Yes", value: "true" },
                          { label: "No", value: "false" },
                        ],
                      )}
                      {reviewingData.credentialing?.credentialingNeeded &&
                        renderNestedMultiSelect(
                          "credentialing",
                          "Credentialing Needed For",
                          "credentialingFor",
                          credentialingForOptions,
                        )}
                      {renderNestedField(
                        "credentialing",
                        "Payers To Enroll / Update",
                        "payersToEnroll",
                        "textarea",
                      )}
                      {renderNestedField(
                        "credentialing",
                        "Medicare PTAN Available",
                        "medicarePtanAvailable",
                        "select",
                        yesNoMaybeOptions,
                      )}
                      {renderNestedField(
                        "credentialing",
                        "Medicaid Enrollment Active",
                        "medicaidEnrollmentActive",
                        "select",
                        yesNoMaybeOptions,
                      )}
                      {renderNestedField(
                        "credentialing",
                        "CAQH Maintained",
                        "caqhMaintained",
                        "select",
                        [
                          { label: "Yes", value: "true" },
                          { label: "No", value: "false" },
                        ],
                      )}
                      {renderNestedField(
                        "credentialing",
                        "Additional Credentialing Notes",
                        "additionalNotes",
                        "textarea",
                      )}
                    </div>
                  </section>
                )}

                <section>
                  <h3 className="mb-6 text-[15px] font-bold text-slate-800 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <CheckCircle className="h-4.5 w-4.5" />
                    </div>
                    Compliance & Marketing
                  </h3>
                  <div className="space-y-8">
                    <div className="grid gap-6 md:grid-cols-2">
                      {renderNestedField(
                        "compliance",
                        "HIPAA Contact Name",
                        "hipaaContactName",
                      )}
                      {renderNestedField(
                        "compliance",
                        "HIPAA Contact Email",
                        "hipaaContactEmail",
                        "email",
                      )}
                      {renderNestedField(
                        "compliance",
                        "BAA Required",
                        "baaRequired",
                        "select",
                        [
                          { label: "Yes", value: "true" },
                          { label: "No", value: "false" },
                        ],
                      )}
                      {renderNestedField(
                        "compliance",
                        "Security Questionnaire",
                        "securityQuestionnaire",
                        "select",
                        [
                          { label: "Yes", value: "true" },
                          { label: "No", value: "false" },
                        ],
                      )}
                    </div>
                    {renderNestedMultiSelect(
                      "compliance",
                      "Current Concerns",
                      "currentConcerns",
                      complianceConcernOptions,
                    )}
                    {renderNestedField(
                      "compliance",
                      "Additional Notes",
                      "additionalNotes",
                      "textarea",
                    )}
                    {hasMarketingSelected &&
                      renderNestedField(
                        "marketing",
                        "Website URL",
                        "websiteUrl",
                      )}
                    {hasMarketingSelected &&
                      renderNestedField(
                        "marketing",
                        "Monthly Budget",
                        "monthlyMarketingBudget",
                      )}
                    {hasMarketingSelected &&
                      renderNestedField(
                        "marketing",
                        "Google Business Profile Claimed",
                        "googleBusinessProfileClaimed",
                        "select",
                        [
                          { label: "Yes", value: "true" },
                          { label: "No", value: "false" },
                        ],
                      )}
                    {hasMarketingSelected &&
                    renderNestedField(
                      "marketing",
                      "Patient Acquisition Goals",
                      "patientAcquisitionGoals",
                      "textarea",
                    )}
                    {hasMarketingSelected &&
                      renderNestedField(
                        "marketing",
                        "Target Patient Demographics",
                        "targetPatientDemographics",
                        "textarea",
                      )}
                    {hasMarketingSelected &&
                      renderNestedField(
                        "marketing",
                        "Existing Brand Assets",
                        "existingBrandAssets",
                        "textarea",
                      )}
                    {hasMarketingSelected &&
                      renderNestedField(
                        "marketing",
                        "AI Tools Used",
                        "aiToolsUsed",
                        "textarea",
                      )}
                    {hasMarketingSelected &&
                      renderNestedField(
                        "marketing",
                        "Additional Marketing Notes",
                        "additionalMarketingNotes",
                        "textarea",
                      )}
                  </div>
                </section>
                <section>
                  <h3 className="mb-6 text-[15px] font-bold text-slate-800 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    Documents Verification
                  </h3>
                  <div className="grid gap-4">
                    {reviewingData.documents?.map((doc: any, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/30"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                            <FileText className="h-5 w-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-slate-700">
                              {doc.fileName || "Unnamed Doc"}
                            </p>
                            <p className="text-[11px] text-slate-400 font-medium">
                              {Array.isArray(doc.documentType)
                                ? doc.documentType.join(", ")
                                : doc.documentType}
                            </p>
                          </div>
                        </div>
                        <select
                          className="app-control rounded-xl px-3 py-1.5 text-[11px] font-bold bg-white border-slate-200"
                          value={doc.status || ""}
                          onChange={(e) => {
                            const next = [...(reviewingData.documents || [])];
                            next[idx] = {
                              ...next[idx],
                              status: e.target.value,
                            };
                            handleUpdateReviewField("documents", next);
                          }}
                        >
                          <option value="NOT_REQUESTED">Not Requested</option>
                          <option value="REQUESTED">Requested</option>
                          <option value="RECEIVED">Received</option>
                          <option value="UNDER_REVIEW">Under Review</option>
                          <option value="APPROVED">Approved</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {reviewStep === 7 && (
              <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in zoom-in-95 duration-500">
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 mb-4">
                    <Target className="h-8 w-8" />
                  </div>
                  <h3 className="text-[20px] font-bold text-slate-800">
                    Finalize Admin Review
                  </h3>
                  <p className="text-[14px] text-slate-500 max-w-md mx-auto">
                    Please select the final status for this onboarding. This
                    will conclude the review process and notify relevant
                    stakeholders.
                  </p>
                </div>

                <div className="grid gap-4 w-full max-w-lg">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleSaveReview("IN_PROGRESS")}
                    className="flex items-center justify-between p-5 rounded-2xl border-2 border-transparent bg-blue-50 text-blue-700 hover:border-blue-400 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <Clock className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-[15px]">
                          Set to In-Progress
                        </p>
                        <p className="text-[12px] opacity-70">
                          Marks the onboarding as currently being handled.
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleSaveReview("COMPLETED")}
                    className="flex items-center justify-between p-5 rounded-2xl border-2 border-transparent bg-green-50 text-green-700 hover:border-green-400 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-[15px]">
                          Approve & Complete
                        </p>
                        <p className="text-[12px] opacity-70">
                          Finalizes the onboarding process successfully.
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleSaveReview("CANCELLED")}
                    className="flex items-center justify-between p-5 rounded-2xl border-2 border-transparent bg-red-50 text-red-700 hover:border-red-400 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                        <XCircle className="h-6 w-6" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-[15px]">Reject / Cancel</p>
                        <p className="text-[12px] opacity-70">
                          Stops the onboarding and marks it as cancelled.
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#f0ece6] bg-slate-50/30 px-6 py-4">
            <button
              type="button"
              onClick={() => setReviewStep(Math.max(1, reviewStep - 1))}
              disabled={reviewStep === 1 || isUpdating}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              Back
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSaveReview()}
                disabled={isUpdating || reviewStep === 7}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2 text-[13px] font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-40"
              >
                Save Changes
              </button>
              {reviewStep < 7 && (
                <button
                  type="button"
                  onClick={() => setReviewStep(Math.min(7, reviewStep + 1))}
                  disabled={isUpdating}
                  className="flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-2 text-[13px] font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                >
                  Next Step
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "contacts", label: "Contacts" },
    { key: "practices", label: "Practices" },
    { key: "billing", label: "Billing" },
    { key: "credentialing", label: "Credentialing" },
    { key: "technology", label: "Technology" },
    { key: "outreach", label: "Outreach" },
    { key: "care-program", label: "Care Program" },
    { key: "lab-pharmacy", label: "Lab & Pharmacy" },
    { key: "compliance", label: "Compliance" },
    { key: "marketing", label: "Marketing" },
    { key: "documents", label: "Documents" },
  ];

  const renderDetailField = (
    label: string,
    value: string | number | undefined | null,
  ) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex items-center gap-2">
        <span className="w-28 shrink-0 text-[12px] text-slate-400">
          {label}:
        </span>
        <span className="text-[13px] text-slate-700">{value}</span>
      </div>
    );
  };

  const renderDetailArray = (label: string, values: string[] | undefined) => {
    if (!values || values.length === 0) return null;
    return (
      <div>
        <span className="text-[12px] text-slate-400">{label}:</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {values.map((v) => (
            <span
              key={v}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
            >
              {v}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderOverviewTab = (ob: Onboarding) => (
    <div className="space-y-4">
      <div>
        <h4 className="mb-3 text-[12px] font-medium text-slate-600">
          Company Information
        </h4>
        <div className="space-y-2">
          {renderDetailField("Legal Name", ob.legalCompanyName)}
          {renderDetailField("DBA Name", ob.dbaName)}
          {renderDetailField("Organization", ob.organizationType)}
          {renderDetailField("Ownership", ob.ownershipType)}
          {renderDetailField("Tax ID / EIN", ob.taxIdEin)}
          {renderDetailField("Website", ob.companyWebsite)}
          {renderDetailField("Phone", ob.mainCompanyPhone)}
          {renderDetailField("Email", ob.mainCompanyEmail)}
          {renderDetailField("Fax", ob.mainCompanyFax)}
          {renderDetailField(
            "Address",
            `${ob.companyAddressLine1 || ""} ${ob.companyAddressLine2 || ""}, ${ob.companyCity || ""} ${ob.companyState || ""} ${ob.companyZip || ""}`.trim()
              ? `${ob.companyAddressLine1 || ""} ${ob.companyAddressLine2 || ""}, ${ob.companyCity || ""} ${ob.companyState || ""} ${ob.companyZip || ""}`.trim()
              : undefined,
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <BoolBadge
            value={ob.isLegalContractingEntity}
            label="Legal Contracting"
          />
          <BoolBadge value={ob.isBillingEntity} label="Billing Entity" />
          <BoolBadge
            value={ob.isCredentialingEntity}
            label="Credentialing Entity"
          />
          <BoolBadge value={ob.oneMainContact} label="One Main Contact" />
        </div>
      </div>

      <div className="border-t border-[#f0ece6] pt-4">
        <h4 className="mb-3 text-[12px] font-medium text-slate-600">
          Service Scope
        </h4>
        <div className="space-y-2">
          {renderDetailArray("Requested Services", ob.requestedServices)}
          {renderDetailField("Primary Service", ob.primaryServiceToLaunch)}
          {renderDetailField("Priority", ob.priorityLevel)}
          {renderDetailField(
            "Go-Live Date",
            ob.requestedGoLiveDate,
          )}
          {renderDetailField("Services For", ob.servicesForAllPractices)}
          {(ob.servicesForAllPractices === "SELECTED_PRACTICES" ||
            ob.servicesForAllPractices === "SINGLE_PRACTICE_ONLY") &&
            renderDetailArray(
              ob.servicesForAllPractices === "SINGLE_PRACTICE_ONLY"
                ? "Selected Practice"
                : "Selected Practices",
              ob.selectedPractices,
            )}
          {renderDetailField(
            "Replacing Vendor",
            ob.replacingExistingVendor ? ob.currentVendorName : undefined,
          )}
          {renderDetailArray("States", ob.statesOfOperation)}
          {renderDetailArray("Specialties", ob.additionalSpecialties)}
          {renderDetailField("Engagement Goals", ob.engagementGoals)}
        </div>
      </div>

      <div className="border-t border-[#f0ece6] pt-4">
        <h4 className="mb-3 text-[12px] font-medium text-slate-600">
          Centralization
        </h4>
        <div className="space-y-2">
          {renderDetailField("Billing", ob.billingManagedCentrally)}
          {renderDetailField("Credentialing", ob.credentialingManagedCentrally)}
          {renderDetailField("Contracting", ob.contractingManagedCentrally)}
        </div>
      </div>

      <div className="border-t border-[#f0ece6] pt-4">
        <h4 className="mb-3 text-[12px] font-medium text-slate-600">
          Submission Info
        </h4>
        <div className="space-y-2">
          {renderDetailField("Submitted By", ob.submittedByName)}
          {renderDetailField("Title", ob.submittedByTitle)}
          {renderDetailField(
            "Date",
            ob.submissionDate,
          )}
          {renderDetailField("Type", ob.onboardingType)}
        </div>
        <div className="mt-2 flex gap-2">
          <BoolBadge value={ob.informationAccurate} label="Info Accurate" />
          <BoolBadge value={ob.authorizeUse} label="Authorized Use" />
        </div>
      </div>
    </div>
  );

  const renderContactsTab = (ob: Onboarding) => {
    const contacts = ob.contacts || [];
    if (!contacts.length)
      return <p className="text-[13px] text-slate-400">No contacts added.</p>;
    return (
      <div className="space-y-3">
        {contacts.map((c: OnboardingContact, i: number) => (
          <div
            key={c.id || i}
            className="rounded-lg border border-[#e8e4dc] bg-[#faf9f7] p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[13px] font-medium text-slate-700">
                {c.fullName || "Unnamed Contact"}
              </span>
              {c.isPrimaryDecisionMaker && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                  Decision Maker
                </span>
              )}
              {c.canSignAgreements && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                  Can Sign
                </span>
              )}
            </div>
            <div className="space-y-1.5 text-[13px]">
              {renderDetailField("Job Title", c.jobTitle)}
              {renderDetailField("Role", c.contactRole)}
              {renderDetailField("Email", c.email)}
              {renderDetailField("Phone", c.phone)}
              {renderDetailField("Extension", c.extension)}
              {renderDetailField("Preferred Contact", c.preferredContactMethod)}
              {renderDetailField("Best Time", c.bestTimeToReach)}
            </div>
            {c.additionalResponsibilities &&
              c.additionalResponsibilities.length > 0 && (
                <div className="mt-2">
                  {renderDetailArray(
                    "Responsibilities",
                    c.additionalResponsibilities,
                  )}
                </div>
              )}
          </div>
        ))}
      </div>
    );
  };

  const renderPracticesTab = (ob: Onboarding) => {
    const practices = ob.practices || [];
    if (!practices.length)
      return <p className="text-[13px] text-slate-400">No practices added.</p>;
    return (
      <div className="space-y-4">
        {practices.map((p: OnboardingPractice, pi: number) => (
          <div
            key={p.id || pi}
            className="rounded-lg border border-[#e8e4dc] bg-[#faf9f7] p-3"
          >
            <div className="mb-2 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[13px] font-medium text-slate-700">
                {p.practiceName || "Unnamed Practice"}
              </span>
            </div>
            <div className="space-y-1.5 text-[13px]">
              {renderDetailField("DBA Name", p.practiceDbaName)}
              {renderDetailField("Type", p.practiceType)}
              {renderDetailField("Group NPI", p.groupNpi)}
              {renderDetailField("Tax ID / EIN", p.taxIdEin)}
              {renderDetailField("Providers", p.approximateNumberOfProviders)}
              {renderDetailField("Locations", p.approximateNumberOfLocations)}
              {renderDetailField(
                "Monthly Patient Volume",
                p.approximateMonthlyPatientVolume,
              )}
              {renderDetailField(
                "Medicare Volume %",
                p.approximateMedicarePatientVolume,
              )}
              {renderDetailField(
                "Medicaid Volume %",
                p.approximateMedicaidPatientVolume,
              )}
              {renderDetailField(
                "Commercial Volume %",
                p.approximateCommercialPatientVolume,
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <BoolBadge
                value={p.isPartOfParentCompany}
                label="Part of Parent Company"
              />
              <BoolBadge
                value={p.offersCareManagementServices}
                label="Care Management"
              />
            </div>
            <div className="mt-2">
              {renderDetailArray("Specialty Areas", p.additionalSpecialtyAreas)}
              {renderDetailArray("Services Offered", p.currentServicesOffered)}
              {renderDetailArray("Pain Points", p.operationalPainPoints)}
            </div>
            {renderDetailField("Notes", p.additionalNotes)}

            {p.locations && p.locations.length > 0 && (
              <div className="mt-3 border-t border-[#e8e4dc] pt-3">
                <p className="mb-2 text-[11px] font-medium text-slate-500">
                  Locations ({p.locations.length})
                </p>
                <div className="space-y-2">
                  {p.locations.map((l: OnboardingLocation, li: number) => (
                    <div
                      key={l.id || li}
                      className="rounded-md border border-[#e8e4dc] bg-white p-2.5 text-[12px]"
                    >
                      <div className="mb-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {l.locationName || "Unnamed Location"}
                        </span>
                        {l.isPrimaryLocation && (
                          <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-[12px] text-slate-600">
                        <span>
                          {l.addressLine1} {l.addressLine2}
                        </span>
                        <span>
                          {l.city}, {l.state} {l.zipCode}
                        </span>
                        <span>Phone: {l.mainPhoneNumber}</span>
                        <span>Fax: {l.mainFaxNumber}</span>
                        <span>Email: {l.officeEmail}</span>
                        <span>Manager: {l.officeManagerName}</span>
                        <span>Hours: {l.hoursOfOperation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {p.providers && p.providers.length > 0 && (
              <div className="mt-3 border-t border-[#e8e4dc] pt-3">
                <p className="mb-2 text-[11px] font-medium text-slate-500">
                  Providers ({p.providers.length})
                </p>
                <div className="space-y-2">
                  {p.providers.map((pr: OnboardingProvider, pri: number) => (
                    <div
                      key={pr.id || pri}
                      className="rounded-md border border-[#e8e4dc] bg-white p-2.5 text-[12px]"
                    >
                      <div className="mb-1 flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        <span className="font-medium text-slate-700">
                          {pr.firstName} {pr.lastName} {pr.credentials}
                        </span>
                      </div>
                      <div className="space-y-1 text-[12px] text-slate-600">
                        <span>Type: {pr.providerType}</span>
                        <span>Specialty: {pr.specialty}</span>
                        <span>NPI: {pr.npi}</span>
                        <span>CAQH: {pr.caqhId}</span>
                        <span>License: {pr.stateLicenseNumber}</span>
                        <span>DEA: {pr.deaNumber}</span>
                        <span>Status: {pr.employmentStatus}</span>
                      </div>
                      <div className="mt-1">
                        <BoolBadge
                          value={pr.boardCertified}
                          label="Board Certified"
                        />
                      </div>
                      {renderDetailField("Notes", pr.notes)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderBillingTab = (ob: Onboarding) => {
    const b = ob.billing as any;
    if (!b)
      return (
        <p className="text-[13px] text-slate-400">No billing information.</p>
      );
    return (
      <div className="space-y-3 text-[13px]">
        {renderDetailField("Billing Model", b.currentBillingModel)}
        {renderDetailField("Company Name", b.billingCompanyName)}
        {renderDetailField("Contact Name", b.mainBillingContactName)}
        {renderDetailField("Contact Email", b.mainBillingContactEmail)}
        {renderDetailField("Contact Phone", b.mainBillingContactPhone)}
        {renderDetailField("Active Payers", b.activePayers)}
        {renderDetailField("EFT/ERA Setup", b.eftEraSetup)}
        {renderDetailField("Invoice Recipient", b.invoiceRecipient)}
        {renderDetailField("Invoice Email", b.invoiceEmail)}
        {renderDetailField("Reporting Cadence", b.preferredReportingCadence)}
        {renderDetailArray("Billed Services", b.currentlyBilledServices)}
        {renderDetailArray("Pain Points", b.billingPainPoints)}
        {renderDetailField("Notes", b.additionalNotes)}
      </div>
    );
  };

  const renderCredentialingTab = (ob: Onboarding) => {
    const c = ob.credentialing as any;
    if (!c)
      return (
        <p className="text-[13px] text-slate-400">
          No credentialing information.
        </p>
      );
    return (
      <div className="space-y-3 text-[13px]">
        {renderDetailField(
          "Credentialing Needed",
          c.credentialingNeeded ? "Yes" : "No",
        )}
        {renderDetailArray("Credentialing For", c.credentialingFor)}
        {renderDetailField("Payers to Enroll", c.payersToEnroll)}
        <BoolBadge value={c.caqhMaintained} label="CAQH Maintained" />
        {renderDetailArray("Current Issues", c.currentCredentialingIssues)}
        {renderDetailField("Medicare PTAN", c.medicarePtanAvailable)}
        {renderDetailField("Medicaid Enrollment", c.medicaidEnrollmentActive)}
        {renderDetailField("Notes", c.additionalNotes)}
      </div>
    );
  };

  const renderTechnologyTab = (ob: Onboarding) => {
    const t = ob.technology as any;
    if (!t)
      return (
        <p className="text-[13px] text-slate-400">No technology information.</p>
      );
    return (
      <div className="space-y-3 text-[13px]">
        {renderDetailField("EHR System", t.ehrSystem)}
        {renderDetailField("Practice Management", t.practiceManagementSystem)}
        {renderDetailField("Clearinghouse", t.clearinghouse)}
        {renderDetailField("Fax Platform", t.faxPlatform)}
        {renderDetailField("Phone Platform", t.phonePlatform)}
        {renderDetailField(
          "Care Management Platform",
          t.currentCareManagementPlatform,
        )}
        {renderDetailField("IT Contact Name", t.itContactName)}
        {renderDetailField("IT Contact Email", t.itContactEmail)}
        <div className="flex flex-wrap gap-2">
          <BoolBadge value={t.patientPortalAvailable} label="Patient Portal" />
          <BoolBadge
            value={t.patientListExportable}
            label="Patient List Export"
          />
          <BoolBadge
            value={t.appointmentListExportable}
            label="Appointment List Export"
          />
          <BoolBadge value={t.apiAccessAvailable} label="API Access" />
        </div>
        {renderDetailField("Technical Notes", t.additionalTechnicalNotes)}
      </div>
    );
  };

  const renderOutreachTab = (ob: Onboarding) => {
    const o = ob.outreach as any;
    if (!o)
      return (
        <p className="text-[13px] text-slate-400">No outreach information.</p>
      );
    return (
      <div className="space-y-3 text-[13px]">
        {renderDetailArray("Preferred Channels", o.preferredChannels)}
        <BoolBadge value={o.patientTextConsent} label="Patient Text Consent" />
        {renderDetailArray("Preferred Languages", o.preferredLanguages)}
        <BoolBadge value={o.interpreterServices} label="Interpreter Services" />
        <BoolBadge
          value={o.outreachFromPractice}
          label="Outreach From Practice"
        />
        {renderDetailField("Approved Hours", o.approvedOutreachHours)}
        {renderDetailField("Messaging Requirements", o.messagingRequirements)}
      </div>
    );
  };

  const renderCareProgramTab = (ob: Onboarding) => {
    const cp = ob.careProgram as any;
    if (!cp)
      return (
        <p className="text-[13px] text-slate-400">
          No care program information.
        </p>
      );
    return (
      <div className="space-y-3 text-[13px]">
        {renderDetailArray("Programs Planned", cp.programsPlanned)}
        {renderDetailField(
          "Estimated Eligible Patients",
          cp.estimatedEligiblePatients,
        )}
        {renderDetailField(
          "Current Enrolled Patients",
          cp.currentEnrolledPatients,
        )}
        {renderDetailField(
          "Patient Enrollment Handler",
          cp.patientEnrollmentHandler,
        )}
        {renderDetailField(
          "Monthly Follow-up Handler",
          cp.monthlyFollowUpHandler,
        )}
        <div className="flex flex-wrap gap-2">
          <BoolBadge
            value={cp.consentFormsInPlace}
            label="Consent Forms In Place"
          />
          <BoolBadge
            value={cp.existingCarePlanWorkflow}
            label="Care Plan Workflow"
          />
        </div>
        {renderDetailField("Minutes Tracker", cp.patientMinutesTracker)}
        {renderDetailField("Compliance Concerns", cp.complianceConcerns)}
      </div>
    );
  };

  const renderLabPharmacyTab = (ob: Onboarding) => {
    const lp = ob.labPharmacy as any;
    if (!lp)
      return (
        <p className="text-[13px] text-slate-400">
          No lab or pharmacy information.
        </p>
      );
    return (
      <div className="space-y-3 text-[13px]">
        {renderDetailField("Preferred Lab", lp.preferredLab)}
        <BoolBadge
          value={lp.existingLabRelationship}
          label="Existing Lab Relationship"
        />
        {renderDetailField("Lab Interface Status", lp.labInterfaceStatus)}
        {renderDetailField("Lab Contact Name", lp.labContactName)}
        {renderDetailField("Lab Contact Email", lp.labContactEmail)}
        {renderDetailField("Pharmacy Partner", lp.pharmacyPartnerName)}
        <BoolBadge
          value={lp.pharmacyPartnerInvolved}
          label="Pharmacy Partner Involved"
        />
        {renderDetailField("Notes", lp.additionalNotes)}
      </div>
    );
  };

  const renderComplianceTab = (ob: Onboarding) => {
    const c = ob.compliance as any;
    if (!c)
      return (
        <p className="text-[13px] text-slate-400">No compliance information.</p>
      );
    return (
      <div className="space-y-3 text-[13px]">
        {renderDetailField("HIPAA Contact", c.hipaaContactName)}
        {renderDetailField("HIPAA Email", c.hipaaContactEmail)}
        <BoolBadge value={c.baaRequired} label="BAA Required" />
        <BoolBadge
          value={c.securityQuestionnaire}
          label="Security Questionnaire"
        />
        {renderDetailArray("Concerns", c.currentConcerns)}
        {renderDetailField("Notes", c.additionalNotes)}
      </div>
    );
  };

  const renderMarketingTab = (ob: Onboarding) => {
    const m = ob.marketing as any;
    if (!m)
      return (
        <p className="text-[13px] text-slate-400">No marketing information.</p>
      );
    return (
      <div className="space-y-3 text-[13px]">
        {renderDetailField("Website URL", m.websiteUrl)}
        {renderDetailArray("Social Media Channels", m.socialMediaChannels)}
        {renderDetailArray(
          "Current Marketing Channels",
          m.currentMarketingChannels,
        )}
        {renderDetailField(
          "Target Patient Demographics",
          m.targetPatientDemographics,
        )}
        {renderDetailField("Monthly Budget", m.monthlyMarketingBudget)}
        {renderDetailField("Existing Brand Assets", m.existingBrandAssets)}
        <BoolBadge
          value={m.googleBusinessProfileClaimed}
          label="Google Business Profile"
        />
        {renderDetailField(
          "Patient Acquisition Goals",
          m.patientAcquisitionGoals,
        )}
        {renderDetailField("AI Tools Used", m.aiToolsUsed)}
        {renderDetailField("Notes", m.additionalMarketingNotes)}
      </div>
    );
  };

  const renderDocumentsTab = (ob: Onboarding) => {
    const docs = ob.documents as OnboardingDocument[] | undefined;
    if (!docs || docs.length === 0)
      return (
        <p className="text-[13px] text-slate-400">No documents uploaded.</p>
      );
    return (
      <div className="space-y-3">
        {docs.map((d, i: number) => (
          <div
            key={d.id || i}
            className="rounded-lg border border-[#e8e4dc] bg-[#faf9f7] p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <div>
                  <p className="text-[13px] font-medium text-slate-700">
                    {d.fileName || "Unnamed Document"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {Array.isArray(d.documentType)
                      ? d.documentType.join(", ")
                      : d.documentType}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  d.status === "APPROVED"
                    ? "bg-green-100 text-green-700"
                    : d.status === "REJECTED"
                      ? "bg-red-100 text-red-700"
                      : d.status === "RECEIVED"
                        ? "bg-blue-100 text-blue-700"
                        : d.status === "UNDER_REVIEW"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-600"
                }`}
              >
                {d.status || "Not Requested"}
              </span>
            </div>
            <div className="grid gap-2 text-[13px]">
              {renderDetailField("Date Requested", d.dateRequested)}
              {renderDetailField("Date Received", d.dateReceived)}
              {renderDetailField("Required", d.required ? "Yes" : "No")}
              {renderDetailField("Notes", d.notes)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTabContent = (ob: Onboarding) => {
    switch (activeTab) {
      case "overview":
        return renderOverviewTab(ob);
      case "contacts":
        return renderContactsTab(ob);
      case "practices":
        return renderPracticesTab(ob);
      case "billing":
        return renderBillingTab(ob);
      case "credentialing":
        return renderCredentialingTab(ob);
      case "technology":
        return renderTechnologyTab(ob);
      case "outreach":
        return renderOutreachTab(ob);
      case "care-program":
        return renderCareProgramTab(ob);
      case "lab-pharmacy":
        return renderLabPharmacyTab(ob);
      case "compliance":
        return renderComplianceTab(ob);
      case "marketing":
        return renderMarketingTab(ob);
      case "documents":
        return renderDocumentsTab(ob);
      default:
        return null;
    }
  };

  return (
    <AppLayout
      title="Onboarding Review"
      activeModule="Onboarding"
      activeSubItem="Review Submissions"
      navbarIcon={<FileText className="h-4 w-4 text-slate-500" />}
    >
      <div className="flex h-full gap-2">
        <div className="app-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search onboardings..."
                className="min-w-56 appearance-none rounded-md bg-transparent py-1.5 pl-8 pr-10 text-[14px] font-medium text-slate-700 outline-none"
                value={filters.search}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, search: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
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
                    current[0]?.id === "submissionDate"
                      ? [{ id: "submissionDate", desc: !current[0].desc }]
                      : [{ id: "submissionDate", desc: true }],
                  )
                }
              >
                Sort
              </button>
            </div>
          </div>

          {showFilterPanel && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] bg-[#faf9f7] px-4 py-2.5">
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, status: e.target.value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="app-control rounded-md px-3 py-1.5 text-[13px]"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  setFilters({ search: "", status: "" });
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                disabled={!filters.search && !filters.status}
                className="text-[13px] text-[#4f63ea] hover:underline disabled:opacity-40"
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
                            className="flex w-full items-center gap-2"
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {header.column.getIsSorted() === "asc" && (
                              <ChevronDown className="h-3 w-3 rotate-180" />
                            )}
                            {header.column.getIsSorted() === "desc" && (
                              <ChevronDown className="h-3 w-3" />
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
                    className={`cursor-pointer ${
                      selectedRowId === row.original.id
                        ? "bg-[#fcfbf9]"
                        : "bg-white hover:bg-[#faf9f7]"
                    }`}
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

            {rows.length === 0 && !isLoading && (
              <div className="relative flex min-h-[520px] items-center justify-center">
                <div className="flex max-w-md flex-col items-center px-6 text-center">
                  <EmptyStateIllustration />
                  <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                    No onboardings found
                  </h2>
                  <p className="mt-2 text-[14px] text-slate-400">
                    {filters.search || filters.status
                      ? "Try adjusting your filters"
                      : "No onboarding submissions yet"}
                  </p>
                </div>
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
                  { length: Math.min(pagination.totalPages, 5) },
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
          <aside className="app-panel flex w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
              <button
                type="button"
                onClick={closeDetailPanel}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
              <FileText className="h-4 w-4 text-slate-300" />
              <h2 className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
                {detailData?.legalCompanyName || detailData?.dbaName || selectedRow.companyName}
              </h2>
            </div>

            <div className="flex flex-wrap gap-1 border-b border-[#f0ece6] px-3 pt-2 pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-md px-2.5 py-1.5 text-[12px] font-medium transition ${
                    activeTab === tab.key
                      ? "bg-[#4f63ea] text-white"
                      : "text-slate-500 hover:bg-[#f7f5f1]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {isSelectedLoading && !selectedOnboarding ? (
                <p className="text-[13px] text-slate-400">
                  Loading onboarding details...
                </p>
              ) : (
                renderTabContent(detailData ?? selectedRow.original)
              )}
            </div>

            <div className="border-t border-[#f0ece6] px-4 py-3 bg-slate-50/50">
              <button
                type="button"
                onClick={startReview}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 mb-4"
              >
                <Target className="h-4 w-4" />
                Full Admin Review
              </button>

              <p className="mb-2 text-[11px] font-medium text-slate-500">
                Quick Status Update
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                disabled={
                  isUpdating ||
                  (detailData?.status ?? selectedRow.status) === "IN_PROGRESS"
                }
                onClick={() => handleStatusUpdate("IN_PROGRESS")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium transition ${
                    (detailData?.status ?? selectedRow.status) === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-700"
                      : "border border-[#ece8e1] text-blue-600 hover:bg-blue-50"
                  } disabled:opacity-40`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  In Progress
                </button>
                <button
                  type="button"
                disabled={
                  isUpdating ||
                  (detailData?.status ?? selectedRow.status) === "COMPLETED"
                }
                onClick={() => handleStatusUpdate("COMPLETED")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium transition ${
                    (detailData?.status ?? selectedRow.status) === "COMPLETED"
                      ? "bg-green-100 text-green-700"
                      : "border border-[#ece8e1] text-green-600 hover:bg-green-50"
                  } disabled:opacity-40`}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Completed
                </button>
                <button
                  type="button"
                disabled={
                  isUpdating ||
                  (detailData?.status ?? selectedRow.status) === "CANCELLED"
                }
                onClick={() => handleStatusUpdate("CANCELLED")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium transition ${
                    (detailData?.status ?? selectedRow.status) === "CANCELLED"
                      ? "bg-red-100 text-red-700"
                      : "border border-[#ece8e1] text-red-600 hover:bg-red-50"
                  } disabled:opacity-40`}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancelled
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
      {isReviewing && renderReviewFlow()}
    </AppLayout>
  );
}
