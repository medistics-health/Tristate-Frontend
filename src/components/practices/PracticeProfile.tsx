import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  ChevronDown,
  DollarSign,
  FileSignature,
  FileText,
  RefreshCw,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import {
  getAgreementApprovalStatus,
  getAgreementVersions,
  getAgreementsByPractice,
  getSubmissionApprovalStatus,
  type Agreement,
  type AgreementServiceTerm,
  type AgreementVersion,
} from "../../services/operations/agreements";
import {
  getBillingRun,
  getBillingRunsView,
  type BillingRunDetail,
  type BillingRunRow,
} from "../../services/operations/billings";
import {
  getInvoicesView,
  type InvoiceRow,
} from "../../services/operations/invoices";
import {
  getExternalOnboardingByPracticeId,
  type Onboarding,
} from "../../services/operations/onboarding";
import { getCompany, type Company } from "../../services/operations/companies";
import {
  getPractice,
  type Practice,
} from "../../services/operations/practices";
import { getDealsByPractice, type Deal } from "../../services/operations/deals";
import { getPricingTerms } from "../../services/operations/pricingEngine";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatMoney(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  return numeric.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatLabel(value?: string | null) {
  if (!value) return "-";
  return value.replace(/_/g, " ");
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getSigningSummary(agreement: Agreement) {
  const submissions = agreement.docusealSubmissions || [];
  if (!submissions.length) return "No signing request";

  const completed = submissions.filter(
    (submission) => submission.status === "completed",
  ).length;

  if (completed === submissions.length) {
    return `Signed (${completed}/${submissions.length})`;
  }

  return `Pending signature (${submissions.length - completed}/${submissions.length})`;
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
    // Some backend responses store signed URLs as a plain string.
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

function getAgreementSignedDocuments(agreement: Agreement) {
  return (agreement.docusealSubmissions || [])
    .filter(
      (submission) =>
        submission.status === "completed" || submission.status === "signed",
    )
    .flatMap((submission) => {
      const signedUrls = getSignedDocumentUrls(submission).map(
        (url, index) => ({
          id: `${submission.id}-signed-${index}`,
          url,
          label: getDocumentLabel(url, `Signed document ${index + 1}`),
          kind: "Signed PDF",
          updatedAt: submission.updatedAt,
        }),
      );

      // const auditUrl = submission.auditLogUrl
      //   ? [
      //       {
      //         id: `${submission.id}-audit`,
      //         url: submission.auditLogUrl,
      //         label: "Audit log",
      //         kind: "Audit Log",
      //         updatedAt: submission.updatedAt,
      //       },
      //     ]
      //   : [];

      // return [...signedUrls, ...auditUrl];
      return [...signedUrls];
    });
}

function getStatusClass(status?: string | null) {
  const normalized = status || "";
  if (
    ["ACTIVE", "SIGNED", "APPROVED", "COMPLETED", "POSTED"].includes(normalized)
  ) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (["SENT", "IN_PROGRESS", "CALCULATED", "RUNNING"].includes(normalized)) {
    return "bg-blue-100 text-blue-700";
  }
  if (
    ["DRAFT", "PENDING", "PENDING_SIGNATURE", "REVIEW_REQUIRED"].includes(
      normalized,
    )
  ) {
    return "bg-amber-100 text-amber-700";
  }
  if (
    ["FAILED", "EXPIRED", "TERMINATED", "REJECTED", "CLOSED"].includes(
      normalized,
    )
  ) {
    return "bg-red-100 text-red-700";
  }
  return "bg-slate-100 text-slate-600";
}

function getBillingRunTotal(run?: BillingRunDetail) {
  if (!run?.items?.length) return 0;
  return run.items.reduce(
    (total, item) => total + Number(item.clientAmount || 0),
    0,
  );
}

function formatCompanyAddress(company: Company) {
  const parts = [
    company.street,
    company.city,
    company.state,
    company.zip,
    company.country,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "-";
}

function formatCompanyTaxIds(company: Company) {
  return company.taxIds?.length
    ? company.taxIds.map((taxId) => taxId.taxIdNumber).join(", ")
    : "-";
}

function isGeneratedOnboardingPdf(document: {
  fileName?: string | null;
  notes?: string | null;
  fileUrl?: string | null;
}) {
  const fileName = document.fileName?.toLowerCase() || "";
  const notes = document.notes?.toLowerCase() || "";
  const fileUrl = document.fileUrl?.toLowerCase() || "";

  return (
    notes.includes("auto-generated onboarding submission pdf") ||
    (fileName.startsWith("onboarding-submission-") &&
      fileName.endsWith(".pdf")) ||
    fileUrl.includes("/onboarding-submission/")
  );
}

function Card({
  title,
  description,
  children,
  action,
  scrollable = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  scrollable?: boolean;
}) {
  return (
    <section
      className={`rounded-3xl border border-[#e8e2d8] bg-white p-5 shadow-sm ${
        scrollable ? "flex max-h-[640px] flex-col overflow-hidden" : ""
      }`}
    >
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-[13px] text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div
        className={
          scrollable ? "min-h-0 flex-1 overflow-y-auto pr-1" : undefined
        }
      >
        {children}
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4">
      <div className="mb-3 inline-flex rounded-xl bg-white p-2 text-slate-500 shadow-sm">
        {icon}
      </div>
      <p className="text-[12px] uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#ece8e1] bg-white px-4 py-3">
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <div className="mt-1 break-words text-[14px] font-medium text-slate-800">
        {value || "-"}
      </div>
    </div>
  );
}

export default function PracticeProfilePage() {
  const { id } = useParams();
  const [practice, setPractice] = useState<Practice | null>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [onboarding, setOnboarding] = useState<Onboarding | null>(null);
  const [associatedCompanies, setAssociatedCompanies] = useState<Company[]>([]);
  const [billingRuns, setBillingRuns] = useState<BillingRunRow[]>([]);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [billingRunDetails, setBillingRunDetails] = useState<
    Record<string, BillingRunDetail>
  >({});
  const [versions, setVersions] = useState<AgreementVersion[]>([]);
  const [terms, setTerms] = useState<AgreementServiceTerm[]>([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [drawerAgreementId, setDrawerAgreementId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  const practiceId = id ?? "";

  const selectedAgreement = useMemo(
    () =>
      agreements.find((agreement) => agreement.id === selectedAgreementId) ??
      null,
    [agreements, selectedAgreementId],
  );

  const pendingAgreementApprovals = useMemo(
    () =>
      agreements.filter(
        (agreement) =>
          agreement.status !== "ACTIVE" &&
          agreement.status !== "SIGNED" &&
          getAgreementApprovalStatus(agreement) === "PENDING_APPROVAL",
      ),
    [agreements],
  );

  const pendingSubmissionApprovals = useMemo(
    () =>
      agreements.filter(
        (agreement) =>
          getSubmissionApprovalStatus(agreement) === "PENDING_APPROVAL",
      ),
    [agreements],
  );

  const activeAgreements = useMemo(
    () =>
      agreements.filter((agreement) =>
        ["ACTIVE", "SIGNED"].includes(agreement.status),
      ),
    [agreements],
  );

  const selectedPracticeServices = useMemo(() => {
    const serviceMap = new Map<string, string>();
    const addService = (id: string | undefined, name: string | undefined) => {
      const serviceName = name?.trim();
      const serviceKey = id || serviceName;
      if (!serviceKey || !serviceName) return;

      serviceMap.set(serviceKey, serviceName);
    };

    const addTermService = (term: AgreementServiceTerm) => {
      if (term.isActive === false) return;

      addService(term.service?.id || term.serviceId, term.service?.name);
    };

    deals.forEach((deal) => {
      deal.selectedServices?.forEach((selectedService) =>
        addService(
          selectedService.serviceId || selectedService.service?.id,
          selectedService.service?.name,
        ),
      );
      deal.selectedServiceNames?.forEach((serviceName, index) =>
        addService(deal.selectedServiceIds?.[index], serviceName),
      );
    });
    agreements.forEach((agreement) => {
      agreement.serviceTerms?.forEach(addTermService);
      agreement.versions?.forEach((version) =>
        version.serviceTerms?.forEach(addTermService),
      );
    });
    terms.forEach(addTermService);

    return Array.from(serviceMap, ([id, name]) => ({ id, name }));
  }, [agreements, deals, terms]);

  const isPracticeActive = practice?.status === "ACTIVE";
  const hasActiveAgreement = activeAgreements.length > 0;
  const canUsePricingAndBilling = isPracticeActive && hasActiveAgreement;
  const generatedOnboardingPdfs = useMemo(
    () => onboarding?.documents?.filter(isGeneratedOnboardingPdf) || [],
    [onboarding?.documents],
  );

  const pricingEngineUrl = useMemo(() => {
    const params = new URLSearchParams({
      practiceId,
      action: "create",
    });
    if (selectedAgreementId) params.set("agreementId", selectedAgreementId);
    if (selectedVersionId) params.set("versionId", selectedVersionId);
    return `/pricing-engine/rate-finalization?${params.toString()}`;
  }, [practiceId, selectedAgreementId, selectedVersionId]);

  function toggleAgreementDetails(agreementId: string) {
    setDrawerAgreementId((current) =>
      current === agreementId ? null : agreementId,
    );
  }

  async function loadProfile() {
    if (!practiceId) return;
    setIsLoading(true);
    try {
      const [
        practiceData,
        agreementData,
        dealData,
        onboardingData,
        billingData,
        invoiceData,
      ] = await Promise.all([
        getPractice(practiceId),
        getAgreementsByPractice(practiceId).catch(() => [] as Agreement[]),
        getDealsByPractice(practiceId).catch(() => [] as Deal[]),
        getExternalOnboardingByPracticeId(practiceId).catch(() => null),
        getBillingRunsView({ practiceId, limit: 5 }).catch(() => ({
          rows: [] as BillingRunRow[],
          pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
        })),
        getInvoicesView({ practiceId, limit: 10 }).catch(() => ({
          viewId: "practice-invoices",
          title: "Practice Invoices",
          totalCount: 0,
          rows: [] as InvoiceRow[],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
        })),
      ]);

      setPractice(practiceData);
      setAgreements(agreementData);
      setDeals(dealData);
      setOnboarding(onboardingData);
      setInvoices(
        invoiceData.rows.filter(
          (invoice) => invoice.values.practiceId === practiceId,
        ),
      );
      const companyIds = Array.from(
        new Set(
          [practiceData.companyId, practiceData.company?.id].filter(
            (companyId): companyId is string => Boolean(companyId),
          ),
        ),
      );
      const companies = await Promise.all(
        companyIds.map((companyId) => getCompany(companyId).catch(() => null)),
      );
      setAssociatedCompanies(
        companies.filter((company): company is Company => Boolean(company)),
      );
      setBillingRuns(billingData.rows);
      const billingDetails = await Promise.all(
        billingData.rows.map((run) => getBillingRun(run.id).catch(() => null)),
      );
      setBillingRunDetails(
        Object.fromEntries(
          billingDetails
            .filter((run): run is BillingRunDetail => Boolean(run))
            .map((run) => [run.id, run]),
        ),
      );

      const firstAgreement =
        agreementData.find((agreement) =>
          ["ACTIVE", "SIGNED"].includes(agreement.status),
        ) ?? agreementData[0];
      setSelectedAgreementId((current) =>
        current && agreementData.some((agreement) => agreement.id === current)
          ? current
          : (firstAgreement?.id ?? ""),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load practice profile",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAgreementPricing(agreementId: string) {
    if (!agreementId) {
      setVersions([]);
      setSelectedVersionId("");
      setTerms([]);
      return;
    }

    try {
      const versionData = await getAgreementVersions({
        agreementId,
        limit: 50,
      });
      setVersions(versionData.versions);
      const currentVersion =
        versionData.versions.find((version) => version.isCurrent) ??
        versionData.versions[0];
      setSelectedVersionId(currentVersion?.id ?? "");
    } catch (error) {
      setVersions([]);
      setSelectedVersionId("");
      setTerms([]);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load agreement versions",
      );
    }
  }

  async function loadPricingTerms(
    agreementId: string,
    agreementVersionId: string,
  ) {
    if (!agreementId || !agreementVersionId) {
      setTerms([]);
      return;
    }

    try {
      const termData = await getPricingTerms({
        agreementId,
        agreementVersionId,
        limit: 100,
      });
      setTerms(termData.terms ?? []);
    } catch (error) {
      setTerms([]);
      toast.error(
        error instanceof Error ? error.message : "Unable to load pricing terms",
      );
    }
  }

  useEffect(() => {
    loadProfile();
  }, [practiceId]);

  useEffect(() => {
    loadAgreementPricing(selectedAgreementId);
  }, [selectedAgreementId]);

  useEffect(() => {
    loadPricingTerms(selectedAgreementId, selectedVersionId);
  }, [selectedAgreementId, selectedVersionId]);

  if (isLoading) {
    return (
      <AppLayout title="Practice Profile" activeModule="Practices">
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Loading practice profile...
        </div>
      </AppLayout>
    );
  }

  if (!practice) {
    return (
      <AppLayout title="Practice Profile" activeModule="Practices">
        <div className="rounded-3xl border border-[#e8e2d8] bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">
            Practice not found
          </p>
          <Link
            to="/practice/all-practices"
            className="mt-4 inline-flex rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white"
          >
            Back to Practices
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Practice Profile"
      activeModule="Practices"
      navbarIcon={<Building2 className="h-4 w-4 text-slate-500" />}
      navbarActions={[
        {
          label: "Refresh",
          icon: <RefreshCw className="h-4 w-4" />,
          onClick: loadProfile,
        },
      ]}
    >
      <div className="space-y-4">
        <section className="overflow-hidden rounded-[28px] rounded-2xl border border-[#eadfcd] bg-gradient-to-br from-[#f9f4ec] via-white to-[#f4f7fb] text-slate-900 shadow-sm">
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="text-[12px] uppercase tracking-[0.24em] text-[#4f63ea]">
                Practice Command Center
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-[-0.04em]">
                  {practice.name}
                </h1>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(practice.status)}`}
                >
                  {formatLabel(practice.status)}
                </span>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Centralized practice workspace for agreements, onboarding,
                associated people, companies, pricing terms, and billing runs.
              </p>
              {/*<div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href="#pricing"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Create Pricing Term <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#billing"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white"
                >
                  Generate Billing Run
                </a>
              </div>*/}
            </div>
            <div className="rounded-3xl border border-[#ece8e1] bg-white/70 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">NPI</p>
                  <p className="mt-1 font-semibold">{practice.npi || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Region</p>
                  <p className="mt-1 font-semibold">{practice.region || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Source</p>
                  <p className="mt-1 font-semibold">
                    {formatLabel(practice.source)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Company</p>
                  <p className="mt-1 font-semibold break-words">
                    {practice.company?.name || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Agreements"
            value={agreements.length}
            icon={<FileSignature className="h-5 w-5" />}
          />
          <StatCard
            label="Associated Persons"
            value={practice.persons?.length ?? 0}
            icon={<Users className="h-5 w-5" />}
          />
          {canUsePricingAndBilling ? (
            <>
              <StatCard
                label="Pricing Terms"
                value={terms.length}
                icon={<DollarSign className="h-5 w-5" />}
              />
              <StatCard
                label="Billing Runs"
                value={billingRuns.length}
                icon={<CalendarClock className="h-5 w-5" />}
              />
            </>
          ) : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card
            title="Practice Summary"
            description="Core practice identifiers and ownership details."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <InfoRow label="Practice Name" value={practice.name} />
              <InfoRow
                label="Practice Status"
                value={formatLabel(practice.status)}
              />
              <InfoRow label="NPI" value={practice.npi} />
              <InfoRow label="Tax ID" value={practice.taxId?.taxIdNumber} />
              <InfoRow
                label="Legal Entity"
                value={practice.taxId?.legalEntityName}
              />
              <InfoRow
                label="Practice Group"
                value={practice.practiceGroup?.name}
              />
              <InfoRow
                label="Selected Services"
                value={
                  selectedPracticeServices.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedPracticeServices.map((service) => (
                        <span
                          key={service.id}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          {service.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )
                }
              />
              <InfoRow label="Bucket" value={practice.bucket?.join(", ")} />
              <InfoRow
                label="Created"
                value={formatDateTime(practice.createdAt)}
              />
            </div>
          </Card>

          <Card
            title="Associated Persons"
            description="People connected to this practice."
          >
            <div className="space-y-3">
              {practice.persons?.length ? (
                practice.persons.map((person) => (
                  <div
                    key={person.id}
                    className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {[person.firstName, person.lastName]
                        .filter(Boolean)
                        .join(" ") || "Unnamed contact"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {person.email || "No email"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">
                      {formatLabel(person.role)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#fbfaf8] p-4 text-sm text-slate-500">
                  No people linked to this practice.
                </p>
              )}
            </div>
          </Card>
        </div>

        <Card
          title="Associated Companies"
          description="Companies linked to this practice."
          scrollable
          // action={
          //   <Link
          //     to="/company/all-companies?action=create"
          //     className="text-sm font-semibold text-slate-600 hover:text-slate-950"
          //   >
          //     Add Company
          //   </Link>
          // }
        >
          {associatedCompanies.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {associatedCompanies.map((company) => (
                <div
                  key={company.id}
                  className="rounded-2xl border border-[#ece8e1] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {company.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatCompanyAddress(company)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                        company.status,
                      )}`}
                    >
                      {formatLabel(company.status)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <InfoRow label="Industry" value={company.industry} />
                    <InfoRow
                      label="Tax IDs"
                      value={formatCompanyTaxIds(company)}
                    />
                    <InfoRow label="Phone" value={company.phone} />
                    <InfoRow label="Email" value={company.email} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      to={`/company/all-companies?companyId=${company.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#ded8cf] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      View Company Details
                    </Link>
                    <Link
                      to={`/company/all-companies?companyId=${company.id}&action=edit`}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Edit Company
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#ded8cf] bg-[#fbfaf8] p-5">
              <p className="text-sm font-semibold text-slate-900">
                No company linked to this practice.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add or edit company details from the Companies module.
              </p>
            </div>
          )}
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card
            title="Agreements"
            description="Review all agreements connected to this practice, including versions and signing status."
            scrollable
            action={
              // <Link
              //   to={`/agreements/all-agreements?practiceId=${practice.id}`}
              //   className="text-sm font-semibold text-slate-600 hover:text-slate-950"
              // >
              //   Full module
              // </Link>
              <Link
                to={`/agreements/all-agreements?practiceId=${practice.id}&action=create`}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Create New Agreements
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          >
            <div className="space-y-3">
              {agreements.length ? (
                agreements.map((agreement) => (
                  <div
                    key={agreement.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleAgreementDetails(agreement.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleAgreementDetails(agreement.id);
                      }
                    }}
                    className="cursor-pointer rounded-2xl border border-[#ece8e1] p-4 transition hover:border-slate-300 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {agreement.type}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Effective {formatDate(agreement.effectiveDate)} •{" "}
                          {formatMoney(agreement.value)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(agreement.status)}`}
                        >
                          {formatLabel(agreement.status)}
                        </span>
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#ded8cf] bg-white text-slate-500"
                          aria-hidden="true"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform duration-300 ${
                              drawerAgreementId === agreement.id
                                ? "rotate-180"
                                : ""
                            }`}
                          />
                        </span>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-500">
                      Created Date: {formatDate(agreement.createdAt)}
                    </p>
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${
                        drawerAgreementId === agreement.id
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-3">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Versions
                            </p>
                            {agreement.versions?.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {agreement.versions.map((version) => (
                                  <span
                                    key={version.id}
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                      version.isCurrent
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-white text-slate-600"
                                    }`}
                                  >
                                    v{version.versionNumber}
                                    {version.isCurrent ? " Current" : ""}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-slate-500">
                                No version history available.
                              </p>
                            )}
                          </div>

                          <div className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-3">
                            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              Current Version
                            </p>
                            {agreement.versions?.find(
                              (version) => version.isCurrent,
                            ) ? (
                              <p className="mt-2 text-sm font-semibold text-slate-800">
                                Version{" "}
                                {
                                  agreement.versions.find(
                                    (version) => version.isCurrent,
                                  )?.versionNumber
                                }
                              </p>
                            ) : (
                              <p className="mt-2 text-sm text-slate-500">
                                {agreement.versions?.length
                                  ? "No current version marked"
                                  : "-"}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                              agreement.docusealSubmissions?.length
                                ? getSigningSummary(agreement).startsWith(
                                    "Signed",
                                  )
                                  ? "COMPLETED"
                                  : "PENDING_SIGNATURE"
                                : "DRAFT",
                            )}`}
                          >
                            {getSigningSummary(agreement)}
                          </span>
                          <Link
                            to={`/agreements/all-agreements?practiceId=${practice.id}&agreementId=${agreement.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#ded8cf] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                          >
                            View Agreement Details
                          </Link>
                          <Link
                            to={`/agreements/all-agreements?practiceId=${practice.id}&agreementId=${agreement.id}&tab=versions`}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#ded8cf] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                          >
                            View Agreement Version History
                          </Link>
                          <Link
                            to={`/agreements/pending-signatures?agreementId=${agreement.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center gap-2 rounded-xl border border-[#ded8cf] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                          >
                            View Signing Status
                          </Link>
                        </div>

                        {(() => {
                          const signedDocuments =
                            getAgreementSignedDocuments(agreement);

                          return (
                            <div className="mt-4 rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                  Signed Documents
                                </p>
                                <span className="text-xs font-semibold text-slate-400">
                                  {signedDocuments.length} file
                                  {signedDocuments.length === 1 ? "" : "s"}
                                </span>
                              </div>

                              {signedDocuments.length ? (
                                <div className="mt-3 space-y-2">
                                  {signedDocuments.map((document) => (
                                    <a
                                      key={document.id}
                                      href={document.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                      className="flex items-center justify-between gap-3 rounded-xl border border-[#ece8e1] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:shadow-sm"
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                                          <FileText className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0">
                                          <span className="block truncate">
                                            {document.label}
                                          </span>
                                          <span className="text-xs text-slate-400">
                                            {document.kind} | Updated{" "}
                                            {formatDate(document.updatedAt)}
                                          </span>
                                        </span>
                                      </span>
                                      <span className="shrink-0 text-xs font-semibold text-blue-600">
                                        View
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 rounded-xl border border-dashed border-[#ded8cf] bg-white px-3 py-2 text-sm text-slate-500">
                                  No signed documents available yet.
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#fbfaf8] p-4 text-sm text-slate-500">
                  No agreements have been created for this practice.
                </p>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[#ece8e1] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Approval Queue
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Track pending agreement approval and submission change
                    review for this practice.
                  </p>
                </div>
                {!pendingAgreementApprovals.length &&
                !pendingSubmissionApprovals.length ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    No pending approval
                  </span>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4">
                  <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">
                    Agreement Approval
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {pluralize(pendingAgreementApprovals.length, "request")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Waiting for admin agreement approval.
                  </p>
                  {pendingAgreementApprovals[0] ? (
                    <Link
                      to={`/agreements/pending-approval?agreementId=${pendingAgreementApprovals[0].id}`}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
                    >
                      Review approval
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4">
                  <p className="text-[12px] uppercase tracking-[0.14em] text-slate-400">
                    Submission Changes
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {pluralize(pendingSubmissionApprovals.length, "request")}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Waiting for approval before resending submission changes.
                  </p>
                  {pendingSubmissionApprovals[0] ? (
                    <Link
                      to={`/agreements/pending-submission-changes?agreementId=${pendingSubmissionApprovals[0].id}`}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
                    >
                      Review changes
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>

            {/*
            <form
              onSubmit={handleSendAgreement}
              className="mt-4 rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4"
            >
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Send className="h-4 w-4" /> Send Agreement
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={selectedSendAgreementId}
                  onChange={(event) =>
                    setSelectedSendAgreementId(event.target.value)
                  }
                  className="rounded-xl border border-[#ded8cf] bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select agreement</option>
                  {agreements.map((agreement) => (
                    <option key={agreement.id} value={agreement.id}>
                      {agreement.type} • {formatLabel(agreement.status)}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedSignerId}
                  onChange={(event) => setSelectedSignerId(event.target.value)}
                  className="rounded-xl border border-[#ded8cf] bg-white px-3 py-2 text-sm"
                >
                  <option value="">Select signer</option>
                  {practice.persons?.map((person) => (
                    <option key={person.id} value={person.id}>
                      {[person.firstName, person.lastName]
                        .filter(Boolean)
                        .join(" ") ||
                        person.email ||
                        "Contact"}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={
                    isSendingAgreement ||
                    !agreements.length ||
                    !practice.persons?.length ||
                    agreements.filter((init: any) => init.status !== "Draft")
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2"
                >
                  <Mail className="h-4 w-4" />
                  {isSendingAgreement ? "Sending..." : "Send Agreement Email"}
                </button>
              </div>
            </form>
            */}
          </Card>

          <Card
            title="Onboarding"
            description="Existing onboarding record, submitted PDF, and uploaded documents."
            scrollable
          >
            <div className="rounded-3xl border border-[#ece8e1] bg-gradient-to-br from-[#fbfaf8] via-white to-[#f6f8fb] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                      <FileText className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {onboarding
                          ? "Submitted onboarding"
                          : "No onboarding submitted"}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {onboarding?.submissionDate
                          ? `Submitted ${formatDate(onboarding.submissionDate)}`
                          : "No completed onboarding record is available yet."}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(onboarding?.status)}`}
                  >
                    {onboarding?.status
                      ? formatLabel(onboarding.status)
                      : "Not Started"}
                  </span>
                  <Link
                    to={
                      onboarding?.id
                        ? `/onboarding/review?onboardingId=${encodeURIComponent(
                            onboarding.id,
                          )}&review=true`
                        : "/onboarding/review"
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[#ded8cf] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                  >
                    Admin Review
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoRow
                label="Submitted By"
                value={
                  onboarding?.submittedByName ||
                  onboarding?.contacts?.[0]?.fullName ||
                  "-"
                }
              />
              <InfoRow
                label="Requested Services"
                value={
                  onboarding?.requestedServices?.length
                    ? onboarding.requestedServices.join(", ")
                    : "-"
                }
              />
              <InfoRow
                label="Providers"
                value={
                  onboarding?.practices?.reduce(
                    (total, item) => total + (item.providers?.length || 0),
                    0,
                  ) || 0
                }
              />
              <InfoRow
                label="Locations"
                value={
                  onboarding?.practices?.reduce(
                    (total, item) => total + (item.locations?.length || 0),
                    0,
                  ) ||
                  onboarding?.numberOfLocations ||
                  0
                }
              />
              <InfoRow
                label="Contacts"
                value={onboarding?.contacts?.length || 0}
              />
              <InfoRow
                label="Generated PDFs"
                value={generatedOnboardingPdfs.length}
              />
            </div>

            {!onboarding ? (
              <div className="mt-5 rounded-3xl border border-dashed border-[#ded8cf] bg-[#fbfaf8] p-6">
                <p className="text-sm font-semibold text-slate-900">
                  Onboarding has not been submitted yet
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Once the client submits the onboarding form, this area will
                  show the record summary and generated PDF.
                </p>
              </div>
            ) : null}

            {generatedOnboardingPdfs.length ? (
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    Generated PDF
                  </p>
                  <p className="text-xs text-slate-400">
                    {generatedOnboardingPdfs.length} file
                    {generatedOnboardingPdfs.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="space-y-2">
                  {generatedOnboardingPdfs.map((document) => (
                    <a
                      key={document.id || document.fileUrl}
                      href={document.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[#ece8e1] bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:shadow-sm"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
                          <FileText className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 truncate">
                          {document.fileName ||
                            document.documentType?.join(", ") ||
                            "Document"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-slate-400">
                        View
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : onboarding ? (
              <p className="mt-5 rounded-2xl border border-dashed border-[#ded8cf] bg-[#fbfaf8] p-4 text-sm text-slate-500">
                No generated onboarding PDF found for this onboarding record.
              </p>
            ) : null}
          </Card>
        </div>

        {canUsePricingAndBilling ? (
          <>
            <Card
              title="Pricing Terms"
              description="Available once the practice and agreement are active."
              scrollable
              action={
                <span id="pricing" className="sr-only">
                  Pricing
                </span>
              }
            >
              {!canUsePricingAndBilling ? (
                <div className="rounded-2xl border border-dashed border-[#ded8cf] bg-[#fbfaf8] p-5 text-sm text-slate-500">
                  Pricing terms become available once the practice status is
                  Active and at least one agreement is Active.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                    <select
                      value={selectedAgreementId}
                      onChange={(event) =>
                        setSelectedAgreementId(event.target.value)
                      }
                      className="rounded-xl border border-[#ded8cf] bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select active agreement</option>
                      {activeAgreements.map((agreement) => (
                        <option key={agreement.id} value={agreement.id}>
                          {agreement.type} • {formatLabel(agreement.status)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedVersionId}
                      onChange={(event) =>
                        setSelectedVersionId(event.target.value)
                      }
                      className="rounded-xl border border-[#ded8cf] bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select version</option>
                      {versions.map((version) => (
                        <option key={version.id} value={version.id}>
                          Version {version.versionNumber}
                          {version.isCurrent ? " • Current" : ""}
                        </option>
                      ))}
                    </select>
                    <Link
                      to={pricingEngineUrl}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Create Pricing Term
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-[#ece8e1]">
                    {terms.length ? (
                      <div className="divide-y divide-[#ece8e1]">
                        {terms.map((term) => (
                          <div
                            key={term.id}
                            className="grid gap-3 bg-white p-4 md:grid-cols-[1fr_160px_160px]"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">
                                {term.service?.name || "Service"}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {formatLabel(term.pricingModel)} •{" "}
                                {term.vendor?.name || "No vendor"}
                              </p>
                            </div>
                            <div className="text-sm">
                              <p className="text-slate-400">Effective</p>
                              <p className="font-medium text-slate-700">
                                {formatDate(term.effectiveDate)}
                              </p>
                            </div>
                            <div className="text-sm">
                              <p className="text-slate-400">Status</p>
                              <p className="font-medium text-slate-700">
                                {term.isActive ? "Active" : "Inactive"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="bg-[#fbfaf8] p-5 text-sm text-slate-500">
                        {selectedAgreement
                          ? "No pricing terms yet for this agreement version."
                          : "Select an agreement to manage pricing terms."}
                      </p>
                    )}
                  </div>
                </>
              )}
            </Card>

            <Card
              title="Billing Runs"
              description="Available once the practice and agreement are active."
              scrollable
              action={
                <span id="billing" className="sr-only">
                  Billing
                </span>
              }
            >
              {!canUsePricingAndBilling ? (
                <div className="rounded-2xl border border-dashed border-[#ded8cf] bg-[#fbfaf8] p-5 text-sm text-slate-500">
                  Billing runs become available once the practice status is
                  Active and at least one agreement is Active.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-dashed border-[#ded8cf] bg-[#fbfaf8] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Generate a billing run
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Use the Billing Runs module so billing period,
                          calculation, approval, and posting stay in the
                          dedicated workflow.
                        </p>
                      </div>
                      <Link
                        to={`/billing/runs?practiceId=${practice.id}&action=create`}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                      >
                        Generate Billing Run
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  {/*{false ? (
            <div>
              <p>
                Active service terms: {0} • Billable terms: {0}
              </p>
              {false ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {(
                    [] as Array<{
                      code: string;
                      message: string;
                      severity: string;
                    }>
                  ).map((issue) => (
                    <li key={`${issue.code}-${issue.message}`}>
                      {issue.severity}: {issue.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}*/}

                  <div className="mt-5 overflow-hidden rounded-2xl border border-[#ece8e1]">
                    {billingRuns.length ? (
                      <div className="divide-y divide-[#ece8e1]">
                        {billingRuns.map((run) => (
                          <div
                            key={run.id}
                            className="grid gap-3 bg-white p-4 md:grid-cols-[1fr_140px_140px_140px_auto]"
                          >
                            <div>
                              <p className="font-semibold text-slate-900">
                                {run.values.period}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                Created {run.values.createdAt}
                              </p>
                            </div>
                            <span
                              className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(run.values.status)}`}
                            >
                              {formatLabel(run.values.status)}
                            </span>
                            <p className="text-sm text-slate-500">
                              {run.values.itemCount} items •{" "}
                              {run.values.snapshotCount} snapshots
                            </p>
                            <div className="text-sm">
                              <p className="text-slate-400">Total Amount</p>
                              <p className="font-semibold text-slate-900">
                                {formatMoney(
                                  getBillingRunTotal(billingRunDetails[run.id]),
                                )}
                              </p>
                            </div>
                            <Link
                              to={`/billing/runs?practiceId=${practice.id}&runId=${run.id}`}
                              className="inline-flex items-center justify-center rounded-xl border border-[#ded8cf] bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                            >
                              Details
                            </Link>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="bg-[#fbfaf8] p-5 text-sm text-slate-500">
                        No billing runs generated for this practice yet.
                      </p>
                    )}
                  </div>
                </>
              )}
            </Card>
          </>
        ) : null}

        {hasActiveAgreement ? (
          <Card
            title="Practice Invoices"
            description="Invoices associated with this practice."
            scrollable
          >
            <div className="overflow-hidden rounded-2xl border border-[#ece8e1]">
              {invoices.length ? (
                <div className="divide-y divide-[#ece8e1]">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="grid gap-3 bg-white p-4 md:grid-cols-[1fr_150px_130px_130px]"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {invoice.values.invoiceNumber}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {invoice.values.agreementLabel}
                        </p>
                      </div>
                      <div className="text-sm">
                        <p className="text-slate-400">Amount</p>
                        <p className="font-semibold text-slate-900">
                          {invoice.values.totalAmount}
                        </p>
                      </div>
                      <div className="text-sm">
                        <p className="text-slate-400">Due Date</p>
                        <p className="font-medium text-slate-700">
                          {invoice.values.dueDate}
                        </p>
                      </div>
                      <div className="text-sm">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            invoice.values.status,
                          )}`}
                        >
                          {formatLabel(invoice.values.status)}
                        </span>
                        <p className="mt-2 text-xs text-slate-400">
                          Created {invoice.values.creationDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="bg-[#fbfaf8] p-5 text-sm text-slate-500">
                  No invoices found for this practice.
                </p>
              )}
            </div>
          </Card>
        ) : null}
      </div>
    </AppLayout>
  );
}
