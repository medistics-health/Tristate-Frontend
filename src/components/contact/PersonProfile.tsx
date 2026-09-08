import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  FileSignature,
  Mail,
  Phone,
  RefreshCw,
  Stethoscope,
  UserCircle,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import {
  getAgreementsByPractice,
  type Agreement,
} from "../../services/operations/agreements";
import { getCompany, type Company } from "../../services/operations/companies";
import {
  getEmailHistoryByPersonId,
  type SentEmail,
} from "../../services/operations/communication";
import { getPerson } from "../../services/operations/persons";
import { getPractice, type Practice } from "../../services/operations/practices";
import { getCredentialingRequestsView } from "../../services/operations/credentialing";
import { formatPayerDisplayLabel } from "../../services/operations/insurance";
import CredentialingModal from "../credentialing/CredentialingModal";
import { formatDateLabel } from "../credentialing/credentialingStore";
import type { CredentialingRecord } from "../credentialing/types";
import type { Person } from "./types";

const designationOptions = [
  { label: "Owner", value: "Owner" },
  { label: "Doctor (Dr.)", value: "Dr." },
  { label: "Practice Manager", value: "Practice Manager" },
  { label: "Office Manager", value: "Office Manager" },
];

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function formatLabel(value?: string | null) {
  if (!value) return "-";
  return value.replace(/_/g, " ");
}

function getDesignationLabel(value?: string | null) {
  if (!value) return "-";
  return designationOptions.find((option) => option.value === value)?.label || value;
}

function normalizePhoneInput(value?: string | null) {
  if (!value) return "-";
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (!digits) return "-";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function getStatusClass(status?: string | null) {
  const normalized = status || "";
  if (["ACTIVE", "SIGNED", "APPROVED", "COMPLETED", "POSTED"].includes(normalized)) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (["SENT", "IN_PROGRESS", "CALCULATED", "RUNNING"].includes(normalized)) {
    return "bg-blue-100 text-blue-700";
  }
  if (["DRAFT", "PENDING", "PENDING_SIGNATURE", "REVIEW_REQUIRED"].includes(normalized)) {
    return "bg-amber-100 text-amber-700";
  }
  if (["FAILED", "EXPIRED", "TERMINATED", "REJECTED", "CLOSED", "INACTIVE"].includes(normalized)) {
    return "bg-red-100 text-red-700";
  }
  return "bg-slate-100 text-slate-600";
}

function credentialingStatusClass(status?: string | null) {
  switch (status) {
    case "Application Submitted":
      return "bg-[#f0f2fe] text-[#4f63ea]";
    case "In Process - Payer Review":
      return "bg-amber-50 text-amber-800";
    case "Pending Additional Info":
      return "bg-amber-100/70 text-amber-900";
    case "Contracted - Direct":
      return "bg-emerald-50 text-emerald-700";
    case "Contracted - IPA/Delegated":
      return "bg-teal-50 text-teal-700";
    case "Declined / Application Rejected":
      return "bg-rose-50 text-rose-700";
    case "Re-credentialing Due":
      return "bg-orange-50 text-orange-700";
    case "Terminated":
    case "Out-of-Network (OON)":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function personFullName(person: {
  firstName?: string;
  lastName?: string;
  email?: string | null;
}) {
  return (
    [person.firstName, person.lastName].filter(Boolean).join(" ").trim() ||
    person.email ||
    ""
  );
}

function credentialingBelongsToPerson(
  record: CredentialingRecord,
  personId: string,
  name: string,
) {
  if (record.providerId && record.providerId === personId) return true;
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return false;
  return record.provider?.trim().toLowerCase() === normalizedName;
}

async function loadPersonCredentialing(personId: string, name: string) {
  const empty = { credentialingRequests: [] as CredentialingRecord[] };
  const [byProviderId, byProviderName] = await Promise.all([
    getCredentialingRequestsView({
      providerId: personId,
      limit: 1000,
      sortBy: "updatedAt",
      sortOrder: "desc",
    }).catch(() => empty),
    name
      ? getCredentialingRequestsView({
          provider: name,
          limit: 1000,
          sortBy: "updatedAt",
          sortOrder: "desc",
        }).catch(() => empty)
      : Promise.resolve(empty),
  ]);

  const unique = new Map<string, CredentialingRecord>();
  [...byProviderId.credentialingRequests, ...byProviderName.credentialingRequests].forEach(
    (record) => unique.set(record.id, record),
  );

  return Array.from(unique.values())
    .filter((record) => credentialingBelongsToPerson(record, personId, name))
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });
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

function stripHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type LinkedRef = { id: string; name: string };

function extractLinked(
  items: unknown[] | undefined,
  nestedKey: "practice" | "company",
): LinkedRef[] {
  if (!items?.length) return [];

  const seen = new Set<string>();
  const result: LinkedRef[] = [];

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const nested = record[nestedKey];
    const source =
      nested && typeof nested === "object"
        ? (nested as { id?: string; name?: string })
        : record;
    const id = typeof source.id === "string" ? source.id : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push({
      id,
      name: typeof source.name === "string" ? source.name : "",
    });
  }

  return result;
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
  children: ReactNode;
  action?: ReactNode;
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
      <div className={scrollable ? "min-h-0 flex-1 overflow-y-auto pr-1" : undefined}>
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
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4">
      <div className="mb-3 inline-flex rounded-xl bg-white p-2 text-slate-500 shadow-sm">
        {icon}
      </div>
      <p className="text-[12px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: ReactNode }) {
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

export default function PersonProfilePage() {
  const { id } = useParams();
  const personId = id ?? "";

  const [person, setPerson] = useState<Person | null>(null);
  const [practices, setPractices] = useState<Practice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [credentialingRecords, setCredentialingRecords] = useState<
    CredentialingRecord[]
  >([]);
  const [selectedCredentialing, setSelectedCredentialing] =
    useState<CredentialingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailsLoading, setIsEmailsLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);

  const personName = useMemo(() => {
    if (!person) return "Person";
    return (
      [person.firstName, person.lastName].filter(Boolean).join(" ").trim() ||
      person.email ||
      "Unnamed contact"
    );
  }, [person]);

  const signedDocuments = useMemo(() => {
    const fromPerson = (person?.docusealSubmissions || [])
      .filter(
        (submission) =>
          submission.status === "completed" || submission.status === "signed",
      )
      .flatMap((submission) =>
        getSignedDocumentUrls(submission).map((url, index) => ({
          id: `${submission.id}-signed-${index}`,
          url,
          label: getDocumentLabel(url, `Signed document ${index + 1}`),
          status: submission.status,
          agreementId: submission.agreementId,
          updatedAt: submission.updatedAt,
        })),
      );

    const fromAgreements = agreements.flatMap((agreement) =>
      (agreement.docusealSubmissions || [])
        .filter(
          (submission) =>
            submission.personId === personId &&
            (submission.status === "completed" || submission.status === "signed"),
        )
        .flatMap((submission) =>
          getSignedDocumentUrls(submission).map((url, index) => ({
            id: `${submission.id}-signed-${index}`,
            url,
            label: getDocumentLabel(url, `Signed document ${index + 1}`),
            status: submission.status,
            agreementId: agreement.id,
            updatedAt: submission.updatedAt,
          })),
        ),
    );

    const seen = new Set<string>();
    return [...fromPerson, ...fromAgreements].filter((document) => {
      if (seen.has(document.id)) return false;
      seen.add(document.id);
      return true;
    });
  }, [agreements, person?.docusealSubmissions, personId]);

  const personAgreements = useMemo(() => {
    return agreements.filter((agreement) =>
      (agreement.docusealSubmissions || []).some(
        (submission) => submission.personId === personId,
      ),
    );
  }, [agreements, personId]);

  async function loadProfile() {
    if (!personId) return;
    setIsLoading(true);
    try {
      const personData = await getPerson(personId);
      setPerson(personData);

      const linkedPractices = extractLinked(
        personData.practices as unknown[] | undefined,
        "practice",
      );
      const linkedCompanies = extractLinked(
        personData.companies as unknown[] | undefined,
        "company",
      );

      const personNameValue = personFullName(personData);

      const [practiceResults, companyResults, emailHistory, credentialingData] =
        await Promise.all([
        Promise.all(
          linkedPractices.map((item) =>
            getPractice(item.id).catch(
              () =>
                ({
                  id: item.id,
                  name: item.name,
                }) as Practice,
            ),
          ),
        ),
        Promise.all(
          linkedCompanies.map((item) =>
            getCompany(item.id).catch(
              () =>
                ({
                  id: item.id,
                  name: item.name,
                  status: "LEAD",
                  ownerId: "",
                  createdAt: "",
                  updatedAt: "",
                }) as Company,
            ),
          ),
        ),
        getEmailHistoryByPersonId(personId).catch(() => [] as SentEmail[]),
        loadPersonCredentialing(personId, personNameValue).catch(
          () => [] as CredentialingRecord[],
        ),
      ]);

      setPractices(practiceResults.filter((practice) => Boolean(practice?.id)));
      setCompanies(companyResults.filter((company) => Boolean(company?.id)));
      setEmails(emailHistory);
      setCredentialingRecords(credentialingData);

      const agreementLists = await Promise.all(
        practiceResults.map((practice) =>
          practice.id
            ? getAgreementsByPractice(practice.id).catch(() => [] as Agreement[])
            : Promise.resolve([] as Agreement[]),
        ),
      );
      const uniqueAgreements = new Map<string, Agreement>();
      agreementLists.flat().forEach((agreement) => {
        uniqueAgreements.set(agreement.id, agreement);
      });
      setAgreements(Array.from(uniqueAgreements.values()));
    } catch (error) {
      setPerson(null);
      toast.error(
        error instanceof Error ? error.message : "Unable to load person profile",
      );
    } finally {
      setIsLoading(false);
      setIsEmailsLoading(false);
    }
  }

  useEffect(() => {
    setIsEmailsLoading(true);
    loadProfile();
  }, [personId]);

  if (isLoading) {
    return (
      <AppLayout title="Person Profile" activeModule="People">
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Loading person profile...
        </div>
      </AppLayout>
    );
  }

  if (!person) {
    return (
      <AppLayout title="Person Profile" activeModule="People">
        <div className="rounded-3xl border border-[#e8e2d8] bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-900">Person not found</p>
          <Link
            to="/people/all-peoples"
            className="mt-4 inline-flex rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white"
          >
            Back to People
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Person Profile"
      activeModule="People"
      navbarIcon={<UserCircle className="h-4 w-4 text-slate-500" />}
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
                Person Command Center
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-[-0.04em]">
                  {personName}
                </h1>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(person.status)}`}
                >
                  {formatLabel(person.status)}
                </span>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
                Centralized person workspace for contact details, associated
                practices, companies, agreements, and communication history.
              </p>
            </div>
            <div className="rounded-3xl border border-[#ece8e1] bg-white/70 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400">Role</p>
                  <p className="mt-1 font-semibold">{formatLabel(person.role)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Influence</p>
                  <p className="mt-1 font-semibold">
                    {formatLabel(person.influence)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Title</p>
                  <p className="mt-1 font-semibold break-words">
                    {getDesignationLabel(person.designation)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Email</p>
                  <p className="mt-1 font-semibold break-words">
                    {person.email || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Associated Practices"
            value={practices.length}
            icon={<Stethoscope className="h-5 w-5" />}
          />
          <StatCard
            label="Associated Companies"
            value={companies.length}
            icon={<Building2 className="h-5 w-5" />}
          />
          <StatCard
            label="Agreements"
            value={personAgreements.length}
            icon={<FileSignature className="h-5 w-5" />}
          />
          <StatCard
            label="Emails"
            value={emails.length}
            icon={<Mail className="h-5 w-5" />}
          />
          <StatCard
            label="Credentialing"
            value={credentialingRecords.length}
            icon={<ClipboardCheck className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card
            title="Person Summary"
            description="Core contact identifiers and relationship details."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <InfoRow label="First Name" value={person.firstName} />
              <InfoRow label="Last Name" value={person.lastName} />
              <InfoRow label="Role" value={formatLabel(person.role)} />
              <InfoRow label="Status" value={formatLabel(person.status)} />
              <InfoRow label="Title" value={getDesignationLabel(person.designation)} />
              <InfoRow label="Influence" value={formatLabel(person.influence)} />
              <InfoRow label="Email" value={person.email} />
              <InfoRow
                label="Phone"
                value={
                  person.phone ? (
                    <span className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {normalizePhoneInput(person.phone)}
                    </span>
                  ) : (
                    "-"
                  )
                }
              />
              <InfoRow label="Created" value={formatDateTime(person.createdAt)} />
              <InfoRow label="Last Updated" value={formatDateTime(person.updatedAt)} />
            </div>
          </Card>

          <Card
            title="Associated Practices"
            description="Practices connected to this person."
            scrollable
          >
            <div className="space-y-3">
              {practices.length ? (
                practices.map((practice) => (
                  <div
                    key={practice.id}
                    className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {practice.name || "Unnamed practice"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          NPI: {practice.npi || "-"}
                        </p>
                      </div>
                      {practice.status ? (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(practice.status)}`}
                        >
                          {formatLabel(practice.status)}
                        </span>
                      ) : null}
                    </div>
                    <Link
                      to={`/practice/${practice.id}/profile`}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900"
                    >
                      View Practice Profile
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#fbfaf8] p-4 text-sm text-slate-500">
                  No practices linked to this person.
                </p>
              )}
            </div>
          </Card>
        </div>

        <Card
          title="Associated Companies"
          description="Companies linked to this person."
          scrollable
        >
          {companies.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {companies.map((company) => (
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
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(company.status)}`}
                    >
                      {formatLabel(company.status)}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <InfoRow label="Industry" value={company.industry} />
                    <InfoRow label="Tax IDs" value={formatCompanyTaxIds(company)} />
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
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#ded8cf] bg-[#fbfaf8] p-5">
              <p className="text-sm font-semibold text-slate-900">
                No company linked to this person.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Add or edit company links from the People module.
              </p>
            </div>
          )}
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card
            title="Agreements"
            description="Agreements this person is connected to through associated practices."
            scrollable
            action={
              practices[0]?.id ? (
                <Link
                  to={`/agreements/all-agreements?practiceId=${practices[0].id}`}
                  className="text-sm font-semibold text-slate-600 hover:text-slate-950"
                >
                  Open agreements
                </Link>
              ) : undefined
            }
          >
            <div className="space-y-3">
              {personAgreements.length ? (
                personAgreements.map((agreement) => {
                  const personSubmissions = (agreement.docusealSubmissions || []).filter(
                    (submission) => submission.personId === personId,
                  );
                  const latestStatus = personSubmissions[0]?.status || agreement.status;
                  return (
                    <div
                      key={agreement.id}
                      className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {formatLabel(agreement.type)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {agreement.practice?.name || "Practice"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(latestStatus)}`}
                        >
                          {formatLabel(latestStatus)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="rounded-2xl bg-[#fbfaf8] p-4 text-sm text-slate-500">
                  No agreements found for this person.
                </p>
              )}
            </div>
          </Card>

          <Card
            title="Signed Documents"
            description="Completed signing documents associated with this person."
            scrollable
          >
            <div className="space-y-3">
              {signedDocuments.length ? (
                signedDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold break-words text-slate-900">
                        {document.label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatLabel(document.status)} • {formatDateTime(document.updatedAt)}
                      </p>
                    </div>
                    <a
                      href={document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-sm font-semibold text-[#4f63ea] hover:underline"
                    >
                      View PDF
                    </a>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-[#fbfaf8] p-4 text-sm text-slate-500">
                  No signed documents found for this person.
                </p>
              )}
            </div>
          </Card>
        </div>

        <Card
          title="Credentialing"
          description="Credentialing requests where this person is the provider."
          scrollable
          action={
            <Link
              to="/credentialing/list"
              className="text-sm font-semibold text-slate-600 hover:text-slate-950"
            >
              Open credentialing
            </Link>
          }
        >
          {credentialingRecords.length ? (
            <div className="space-y-3">
              {credentialingRecords.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedCredentialing(record)}
                  className="w-full rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4 text-left transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {record.credentialingId || "Credentialing request"}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatPayerDisplayLabel(
                          record.insuranceCompany,
                          record.payerProviderId,
                        ) || "No payer"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${credentialingStatusClass(record.status)}`}
                    >
                      {record.status || "-"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <InfoRow label="Practice" value={record.practice} />
                    <InfoRow label="Type" value={record.credentialingType} />
                    <InfoRow label="Contract" value={record.contractType} />
                    <InfoRow
                      label="Assigned"
                      value={record.assignedUser || "-"}
                    />
                    <InfoRow
                      label="Submitted"
                      value={formatDateLabel(record.submissionDate)}
                    />
                    <InfoRow
                      label="Effective"
                      value={formatDateLabel(record.effectiveDate)}
                    />
                    <InfoRow
                      label="Expires"
                      value={formatDateLabel(record.expirationDate)}
                    />
                    <InfoRow
                      label="Re-credentialing Due"
                      value={formatDateLabel(record.reCredentialingDueDate)}
                    />
                  </div>
                  {record.documents?.length ? (
                    <p className="mt-3 text-xs font-semibold text-slate-500">
                      {record.documents.length} document
                      {record.documents.length === 1 ? "" : "s"} attached
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-[#fbfaf8] p-4 text-sm text-slate-500">
              No credentialing records found for this person.
            </p>
          )}
        </Card>

        <Card
          title="Person Communication"
          description="Email history sent to this person."
          scrollable
          action={
            person.email ? (
              <Link
                to={`/communication/all-emails?toEmail=${encodeURIComponent(person.email)}`}
                className="text-sm font-semibold text-slate-600 hover:text-slate-950"
              >
                View All
              </Link>
            ) : undefined
          }
        >
          {isEmailsLoading ? (
            <p className="rounded-2xl bg-[#fbfaf8] p-4 text-sm text-slate-500">
              Loading email history...
            </p>
          ) : emails.length ? (
            <div className="space-y-2">
              {emails.map((mail) => {
                const preview = mail.bodyPreview || stripHtml(mail.bodyHtml);
                return (
                  <button
                    key={mail.id}
                    type="button"
                    onClick={() => setSelectedEmail(mail)}
                    className="w-full rounded-xl border border-[#ece8e1] bg-[#fbfaf8] px-3 py-2 text-left transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3 pb-2">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {mail.subject}
                      </p>
                      <p className="shrink-0 text-xs text-slate-500">
                        {formatDateTime(mail.sentDateTime)}
                      </p>
                    </div>
                    <p className="line-clamp-2 text-xs text-slate-500">
                      {preview || "-"}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl bg-[#fbfaf8] p-4 text-sm text-slate-500">
              No emails found for this person.
            </p>
          )}
        </Card>
      </div>

      {selectedEmail ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setSelectedEmail(null)}
        >
          <div
            className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#f0ece6] px-5 py-4">
              <div className="min-w-0">
                <h2 className="truncate text-[18px] font-semibold text-slate-800">
                  {selectedEmail.subject}
                </h2>
                <p className="mt-1 text-[12px] text-slate-500">Contact: {personName}</p>
                <p className="mt-1 text-[12px] text-slate-500">
                  From: {selectedEmail.from || "noreply@tristatemso.com"}
                </p>
                <p className="mt-1 text-[12px] text-slate-500">
                  To: {selectedEmail.to.length ? selectedEmail.to.join(", ") : "-"}
                </p>
                {selectedEmail.cc.length ? (
                  <p className="mt-1 text-[12px] text-slate-500">
                    Cc: {selectedEmail.cc.join(", ")}
                  </p>
                ) : null}
                <p className="mt-1 text-[12px] text-slate-500">
                  Sent: {formatDateTime(selectedEmail.sentDateTime)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setSelectedEmail(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-[#fbfaf8] p-5">
              {selectedEmail.bodyHtml ? (
                <div
                  className="rounded-xl border border-[#ece8e1] bg-white p-4 text-[13px] text-slate-700"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                />
              ) : (
                <div className="rounded-xl border border-[#ece8e1] bg-white p-4 text-[13px] text-slate-500">
                  {selectedEmail.bodyPreview || "No body content available."}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <CredentialingModal
        isOpen={Boolean(selectedCredentialing)}
        mode="view"
        record={selectedCredentialing}
        onClose={() => setSelectedCredentialing(null)}
        onSave={async () => {}}
      />
    </AppLayout>
  );
}
