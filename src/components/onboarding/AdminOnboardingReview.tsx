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
  CheckCircle,
  ChevronDown,
  Clock,
  FileText,
  MapPin,
  Plus,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";
import AppLayout from "../layout/AppLayout";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import {
  getOnboardings,
  updateOnboarding,
  type Onboarding,
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
  const [activeTab, setActiveTab] = useState("overview");
  const [isUpdating, setIsUpdating] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);

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
  }, [pagination.page, filters.status]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

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
            {info.getValue().slice(0, 2).map((s) => (
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

  const handleRowClick = (rowId: string) => {
    setSelectedRowId(rowId);
    setShowDetailPanel(true);
    setActiveTab("overview");
  };

  const closeDetailPanel = () => {
    setShowDetailPanel(false);
    setSelectedRowId(null);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!selectedRow) return;
    setIsUpdating(true);
    try {
      await updateOnboarding(selectedRow.id, { status: newStatus });
      toast.success(`Status updated to ${statusLabels[newStatus]}`);
      setRows((prev) =>
        prev.map((r) =>
          r.id === selectedRow.id
            ? { ...r, status: newStatus, original: { ...r.original, status: newStatus } }
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

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "contacts", label: "Contacts" },
    { key: "practices", label: "Practices" },
    { key: "billing", label: "Billing" },
    { key: "credentialing", label: "Credentialing" },
    { key: "technology", label: "Technology" },
    { key: "outreach", label: "Outreach" },
    { key: "compliance", label: "Compliance" },
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

  const renderDetailArray = (
    label: string,
    values: string[] | undefined,
  ) => {
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
            `${ob.companyAddressLine1 || ""} ${ob.companyAddressLine2 || ""}, ${ob.companyCity || ""} ${ob.companyState || ""} ${ob.companyZip || ""}`.trim() || undefined,
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <BoolBadge value={ob.isLegalContractingEntity} label="Legal Contracting" />
          <BoolBadge value={ob.isBillingEntity} label="Billing Entity" />
          <BoolBadge value={ob.isCredentialingEntity} label="Credentialing Entity" />
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
            ob.requestedGoLiveDate
              ? new Date(ob.requestedGoLiveDate).toLocaleDateString()
              : undefined,
          )}
          {renderDetailField("Services For", ob.servicesForAllPractices)}
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
            ob.submissionDate
              ? new Date(ob.submissionDate).toLocaleDateString()
              : undefined,
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
              {renderDetailArray(
                "Specialty Areas",
                p.additionalSpecialtyAreas,
              )}
              {renderDetailArray(
                "Services Offered",
                p.currentServicesOffered,
              )}
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
                        <BoolBadge value={pr.boardCertified} label="Board Certified" />
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
      return <p className="text-[13px] text-slate-400">No billing information.</p>;
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
          <BoolBadge value={t.patientListExportable} label="Patient List Export" />
          <BoolBadge value={t.appointmentListExportable} label="Appointment List Export" />
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
        <BoolBadge value={o.outreachFromPractice} label="Outreach From Practice" />
        {renderDetailField("Approved Hours", o.approvedOutreachHours)}
        {renderDetailField("Messaging Requirements", o.messagingRequirements)}
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
        <BoolBadge value={c.securityQuestionnaire} label="Security Questionnaire" />
        {renderDetailArray("Concerns", c.currentConcerns)}
        {renderDetailField("Notes", c.additionalNotes)}
      </div>
    );
  };

  const renderDocumentsTab = (ob: Onboarding) => {
    const docs = ob.documents as any[] | undefined;
    if (!docs || docs.length === 0)
      return (
        <p className="text-[13px] text-slate-400">No documents uploaded.</p>
      );
    return (
      <div className="space-y-2">
        {docs.map((d: any, i: number) => (
          <div
            key={d.id || i}
            className="flex items-center justify-between rounded-lg border border-[#e8e4dc] bg-[#faf9f7] p-2.5"
          >
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
      case "compliance":
        return renderComplianceTab(ob);
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
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page }))
                    }
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
                {selectedRow.companyName}
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
              {renderTabContent(selectedRow.original)}
            </div>

            <div className="border-t border-[#f0ece6] px-4 py-3">
              <p className="mb-2 text-[11px] font-medium text-slate-500">
                Update Status
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isUpdating || selectedRow.status === "IN_PROGRESS"}
                  onClick={() => handleStatusUpdate("IN_PROGRESS")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium transition ${
                    selectedRow.status === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-700"
                      : "border border-[#ece8e1] text-blue-600 hover:bg-blue-50"
                  } disabled:opacity-40`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  In Progress
                </button>
                <button
                  type="button"
                  disabled={isUpdating || selectedRow.status === "COMPLETED"}
                  onClick={() => handleStatusUpdate("COMPLETED")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium transition ${
                    selectedRow.status === "COMPLETED"
                      ? "bg-green-100 text-green-700"
                      : "border border-[#ece8e1] text-green-600 hover:bg-green-50"
                  } disabled:opacity-40`}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Completed
                </button>
                <button
                  type="button"
                  disabled={isUpdating || selectedRow.status === "CANCELLED"}
                  onClick={() => handleStatusUpdate("CANCELLED")}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium transition ${
                    selectedRow.status === "CANCELLED"
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
    </AppLayout>
  );
}
