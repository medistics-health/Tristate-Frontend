import {
  ArrowDownUp,
  BadgeCheck,
  CalendarClock,
  CircleAlert,
  Clock3,
  Filter,
  FolderOpen,
  Gauge,
  LayoutGrid,
  Loader2,
  Percent,
  Plus,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layout/AppLayout";
import DatePicker from "../shared/DatePicker";
import Select from "../shared/Select";
import SearchSelect, { type SearchSelectOption } from "../shared/SearchSelect";
import CredentialingModal from "./CredentialingModal";
import { formatDateLabel, getDaysLeft } from "./credentialingStore";
import {
  contractTypeOptions,
  credentialingStatusOptions,
  type CredentialingFormState,
} from "./types";
import {
  createCredentialingRequestApi,
  getCredentialingRequestsView,
} from "../../services/operations/credentialing";
import { getAllUsers } from "../../services/operations/users";
import {
  formatPayerDisplayLabel,
  getClaimPayerOptionsApi,
} from "../../services/operations/insurance";

type DashboardFilters = {
  practice: string;
  provider: string;
  payer: string;
  payerLabel: string;
  status: string;
  contractType: string;
  assignedUser: string;
  dateFrom: string;
  dateTo: string;
};

const defaultFilters: DashboardFilters = {
  practice: "",
  provider: "",
  payer: "",
  payerLabel: "",
  status: "",
  contractType: "",
  assignedUser: "",
  dateFrom: "",
  dateTo: "",
};

function statusTone(status: string) {
  switch (status) {
    case "Not Started":
      return "bg-slate-100 text-slate-700";
    case "Application Submitted":
      return "bg-indigo-100 text-indigo-700";
    case "In Process - Payer Review":
      return "bg-amber-100 text-amber-800";
    case "Pending Additional Info":
      return "bg-amber-50 text-amber-700";
    case "Contracted - Direct":
      return "bg-emerald-100 text-emerald-700";
    case "Contracted - IPA/Delegated":
      return "bg-teal-100 text-teal-700";
    case "Out-of-Network (OON)":
      return "bg-slate-200 text-slate-700";
    case "Declined / Application Rejected":
      return "bg-rose-100 text-rose-700";
    case "Re-credentialing Due":
      return "bg-orange-100 text-orange-700";
    case "Terminated":
      return "bg-slate-300 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function isContracted(status: string) {
  return (
    status === "Contracted - Direct" || status === "Contracted - IPA/Delegated"
  );
}

function isOpenRequest(status: string) {
  return [
    "Not Started",
    "Application Submitted",
    "In Process - Payer Review",
    "Pending Additional Info",
  ].includes(status);
}

function getNearestDeadlineInfo(record: {
  expirationDate?: string | null;
  nextFollowUpDate?: string | null;
  reCredentialingDueDate?: string | null;
}) {
  const dates: { date: string; label: string; daysLeft: number }[] = [];

  const followUpDays = getDaysLeft(record.nextFollowUpDate);
  if (followUpDays !== null) {
    dates.push({
      date: record.nextFollowUpDate!,
      label: "Follow-up",
      daysLeft: followUpDays,
    });
  }

  const expDays = getDaysLeft(record.expirationDate);
  if (expDays !== null) {
    dates.push({
      date: record.expirationDate!,
      label: "Expiration",
      daysLeft: expDays,
    });
  }

  const reCredDays = getDaysLeft(record.reCredentialingDueDate);
  if (reCredDays !== null) {
    dates.push({
      date: record.reCredentialingDueDate!,
      label: "Re-credentialing Due",
      daysLeft: reCredDays,
    });
  }

  if (dates.length === 0) return null;

  dates.sort((a, b) => a.daysLeft - b.daysLeft);
  return dates[0];
}

function createLocalSearchOptions(options: string[]) {
  return async (query: string): Promise<SearchSelectOption[]> => {
    const normalized = query.trim().toLowerCase();
    return options
      .filter((option) =>
        normalized ? option.toLowerCase().includes(normalized) : true,
      )
      .map((option) => ({ label: option, value: option }));
  };
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-[#ece8e1] bg-white shadow-sm"
          >
            <div className="h-1 bg-gradient-to-r from-slate-200 to-slate-100" />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="mt-3 h-8 w-16" />
                </div>
                <SkeletonBlock className="h-10 w-10 rounded-xl" />
              </div>
              <SkeletonBlock className="mt-4 h-3 w-32" />
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-[#ece8e1] bg-white shadow-sm p-5">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-5 w-5 rounded-full" />
          <SkeletonBlock className="h-4 w-48" />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4">
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="mt-3 h-7 w-12" />
              <SkeletonBlock className="mt-4 h-2 w-full" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#ece8e1] bg-white shadow-sm p-5">
          <SkeletonBlock className="h-4 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4">
                <SkeletonBlock className="h-3 w-36" />
                <SkeletonBlock className="mt-2 h-3 w-24" />
                <SkeletonBlock className="mt-3 h-3 w-20" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#ece8e1] bg-white shadow-sm p-5">
          <SkeletonBlock className="h-4 w-40" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4">
                <SkeletonBlock className="h-3 w-32" />
                <SkeletonBlock className="mt-2 h-3 w-48" />
                <SkeletonBlock className="mt-2 h-3 w-20" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CredentialingDashboardPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [assignedUserOptions, setAssignedUserOptions] = useState<SearchSelectOption[]>([]);

  useEffect(() => {
    let active = true;
    async function loadRecords() {
      setIsLoading(true);
      try {
        const data = await getCredentialingRequestsView({ limit: 5000 });
        if (active) {
          setRecords(data.credentialingRequests);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadRecords();

    async function loadAssignedUsers() {
      try {
        const users = await getAllUsers();
        if (!active) return;
        setAssignedUserOptions(
          users
            .map((user: any) => {
              const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
              const label = fullName || user.userName || user.email || user.role || "";
              return {
                label: user.role ? `${label} (${user.role})` : label,
                value: user.id,
                subLabel: [user.userName, user.email, user.role].filter(Boolean).join(" · "),
              };
            })
            .filter((entry) => Boolean(entry.value && entry.label))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      } catch {
        if (active) {
          setAssignedUserOptions([]);
        }
      }
    }

    void loadAssignedUsers();

    return () => {
      active = false;
    };
  }, []);

  async function loadFilterOptions() {
    try {
      const users = await getAllUsers();
      setAssignedUserOptions(
        users
          .map((user: any) => {
            const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
            const label = fullName || user.userName || user.email || user.role || "";
            return {
              label: user.role ? `${label} (${user.role})` : label,
              value: user.id,
              subLabel: [user.userName, user.email, user.role].filter(Boolean).join(" · "),
            };
          })
          .filter((entry) => Boolean(entry.value && entry.label))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
    } catch {
      setAssignedUserOptions([]);
    }
  }

  const uniquePractices = useMemo(
    () => Array.from(new Set(records.map((record) => record.practice))).sort(),
    [records],
  );
  const uniqueProviders = useMemo(
    () => Array.from(new Set(records.map((record) => record.provider))).sort(),
    [records],
  );
  const searchPractices = useMemo(
    () => createLocalSearchOptions(uniquePractices),
    [uniquePractices],
  );
  const searchProviders = useMemo(
    () => createLocalSearchOptions(uniqueProviders),
    [uniqueProviders],
  );
  const searchPayers = useMemo(
    () => async (query: string) => {
      const options = await getClaimPayerOptionsApi(query.trim());
      return options.sort((a, b) => a.label.localeCompare(b.label));
    },
    [],
  );
  const searchAssignedUsers = useMemo(
    () => async (query: string) => {
      const normalized = query.trim().toLowerCase();
      return assignedUserOptions.filter((option) =>
        normalized
          ? option.label.toLowerCase().includes(normalized) ||
            option.subLabel?.toLowerCase().includes(normalized) ||
            option.value.toLowerCase().includes(normalized)
          : true,
      );
    },
    [assignedUserOptions],
  );
  const assignedUserFilterLabel = useMemo(
    () =>
      assignedUserOptions.find((option) => option.value === filters.assignedUser)?.label ||
      "",
    [assignedUserOptions, filters.assignedUser],
  );

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      if (
        filters.practice &&
        record.practice.toLowerCase() !== filters.practice.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.provider &&
        record.provider.toLowerCase() !== filters.provider.toLowerCase()
      ) {
        return false;
      }

      if (
        filters.payer &&
        record.payerProviderId !== filters.payer &&
        formatPayerDisplayLabel(
          record.insuranceCompany,
          record.payerProviderId,
        ).toLowerCase() !== filters.payerLabel.toLowerCase()
      ) {
        return false;
      }

      if (filters.status && record.status !== filters.status) return false;
      if (
        filters.contractType &&
        record.contractType !== filters.contractType
      ) {
        return false;
      }
      if (
        filters.assignedUser &&
        record.assignedUserId !== filters.assignedUser &&
        record.assignedUser.toLowerCase() !== filters.assignedUser.toLowerCase()
      ) {
        return false;
      }

      const recordDate = record.submissionDate;
      if (filters.dateFrom && recordDate < filters.dateFrom) return false;
      if (filters.dateTo && recordDate > filters.dateTo) return false;

      return true;
    });
  }, [filters, records]);

  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    const contracted = filteredRecords.filter((record) =>
      isContracted(record.status),
    ).length;
    const inProcess = filteredRecords.filter((record) =>
      [
        "Application Submitted",
        "In Process - Payer Review",
        "Pending Additional Info",
      ].includes(record.status),
    ).length;
    const pendingInfo = filteredRecords.filter(
      (record) => record.status === "Pending Additional Info",
    ).length;
    const oon = filteredRecords.filter(
      (record) => record.status === "Out-of-Network (OON)",
    ).length;
    const recredentialingDue = filteredRecords.filter(
      (record) => record.status === "Re-credentialing Due",
    ).length;
    const stale = filteredRecords.filter((record) => {
      const days = getDaysLeft(record.lastActivityDate);
      return days !== null ? days < -15 : false;
    }).length;

    const upcomingDeadlines = filteredRecords.filter((record) => {
      const nearest = getNearestDeadlineInfo(record);
      return nearest !== null && nearest.daysLeft <= 90;
    }).length;

    const turnaroundDays = filteredRecords
      .filter(
        (record) =>
          isContracted(record.status) &&
          record.submissionDate &&
          record.effectiveDate,
      )
      .map((record) => {
        const start = new Date(record.submissionDate).getTime();
        const end = new Date(record.effectiveDate).getTime();
        return Number.isFinite(start) && Number.isFinite(end)
          ? Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)))
          : null;
      })
      .filter((value): value is number => value !== null);

    const averageTurnaround =
      turnaroundDays.length > 0
        ? Math.round(
            turnaroundDays.reduce((totalDays, value) => totalDays + value, 0) /
              turnaroundDays.length,
          )
        : 0;

    const contractedRate =
      total > 0 ? Math.round((contracted / total) * 100) : 0;

    return {
      total,
      contracted,
      inProcess,
      pendingInfo,
      oon,
      recredentialingDue,
      stale,
      upcomingDeadlines,
      averageTurnaround,
      contractedRate,
    };
  }, [filteredRecords]);

  const statusOverview = useMemo(
    () =>
      credentialingStatusOptions.map((status) => ({
        status,
        count: filteredRecords.filter((record) => record.status === status)
          .length,
      })),
    [filteredRecords],
  );

  const practiceRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        total: number;
        contracted: number;
        inProcess: number;
        oon: number;
        lastActivityDate: string;
      }
    >();

    filteredRecords.forEach((record) => {
      const entry = grouped.get(record.practice) || {
        total: 0,
        contracted: 0,
        inProcess: 0,
        oon: 0,
        lastActivityDate: "",
      };

      entry.total += 1;
      if (isContracted(record.status)) entry.contracted += 1;
      if (isOpenRequest(record.status)) entry.inProcess += 1;
      if (record.status === "Out-of-Network (OON)") entry.oon += 1;
      entry.lastActivityDate =
        !entry.lastActivityDate ||
        record.lastActivityDate > entry.lastActivityDate
          ? record.lastActivityDate
          : entry.lastActivityDate;
      grouped.set(record.practice, entry);
    });

    return Array.from(grouped.entries())
      .map(([practice, value]) => ({
        practice,
        ...value,
        contractedRate:
          value.total > 0
            ? Math.round((value.contracted / value.total) * 100)
            : 0,
      }))
      .sort((a, b) => a.contractedRate - b.contractedRate);
  }, [filteredRecords]);

  const payerRows = useMemo(() => {
    const grouped = new Map<
      string,
      {
        total: number;
        contracted: number;
        inProcess: number;
        oon: number;
        turnaround: number[];
        payerLabel: string;
      }
    >();

    filteredRecords.forEach((record) => {
      const payerLabel = formatPayerDisplayLabel(
        record.insuranceCompany,
        record.payerProviderId,
      );
      const payerKey = record.payerProviderId || payerLabel;
      const entry = grouped.get(payerKey) || {
        total: 0,
        contracted: 0,
        inProcess: 0,
        oon: 0,
        turnaround: [],
        payerLabel,
      };

      entry.total += 1;
      if (isContracted(record.status)) entry.contracted += 1;
      if (isOpenRequest(record.status)) entry.inProcess += 1;
      if (record.status === "Out-of-Network (OON)") entry.oon += 1;

      if (
        record.submissionDate &&
        record.effectiveDate &&
        isContracted(record.status)
      ) {
        const start = new Date(record.submissionDate).getTime();
        const end = new Date(record.effectiveDate).getTime();
        if (Number.isFinite(start) && Number.isFinite(end)) {
          entry.turnaround.push(
            Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24))),
          );
        }
      }

      entry.payerLabel = payerLabel;
      grouped.set(payerKey, entry);
    });

    return Array.from(grouped.entries())
      .map(([payer, value]) => ({
        payer: value.payerLabel || payer,
        ...value,
        averageTurnaround:
          value.turnaround.length > 0
            ? Math.round(
                value.turnaround.reduce((sum, value) => sum + value, 0) /
                  value.turnaround.length,
              )
            : 0,
      }))
      .sort((a, b) => a.averageTurnaround - b.averageTurnaround);
  }, [filteredRecords]);

  const recentCredentialing = useMemo(
    () =>
      [...filteredRecords]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6),
    [filteredRecords],
  );

  const expiringSoon = useMemo(
    () =>
      [...filteredRecords]
        .map((record) => {
          const nearest = getNearestDeadlineInfo(record);
          return {
            record,
            daysLeft: nearest ? nearest.daysLeft : null,
            deadlineLabel: nearest ? nearest.label : null,
            deadlineDate: nearest ? nearest.date : null,
          };
        })
        .filter(({ daysLeft }) => daysLeft !== null && daysLeft <= 90)
        .sort((a, b) => (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999))
        .slice(0, 6),
    [filteredRecords],
  );

  const recentActivity = useMemo(
    () =>
      [...filteredRecords]
        .flatMap((record) =>
          record.activity.slice(0, 2).map((entry) => ({
            ...entry,
            practice: record.practice,
            provider: record.provider,
            payer: formatPayerDisplayLabel(
              record.insuranceCompany,
              record.payerProviderId,
            ),
          })),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8),
    [filteredRecords],
  );

  async function handleCreate(form: CredentialingFormState) {
    setIsSaving(true);
    try {
      await createCredentialingRequestApi({
        ...form,
        practiceId: form.practiceId || undefined,
        practiceName: form.practice,
        providerId: form.providerId || undefined,
        providerName: form.provider,
        insurancePayerName: form.insuranceCompany,
        payerProviderId: form.payerProviderId || undefined,
        assignedToUserId: form.assignedUserId || undefined,
        assignedToUserName: form.assignedUser,
        requestType: form.credentialingType,
        contractType: form.contractType,
        status: form.status,
      });
      const data = await getCredentialingRequestsView({ limit: 5000 });
      setRecords(data.credentialingRequests);
      await loadFilterOptions();
      setShowModal(false);
    } finally {
      setIsSaving(false);
    }
  }

  function resetFilters() {
    setFilters(defaultFilters);
  }

  const activeFilterCount = [
    filters.practice,
    filters.provider,
    filters.payer,
    filters.payerLabel,
    filters.status,
    filters.contractType,
    filters.assignedUser,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  return (
    <AppLayout
      title="Credentialing Dashboard"
      activeModule="Credentialing"
      activeSubItem="Dashboard"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
      navbarActions={[
        {
          label: "New record",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => setShowModal(true),
        },
      ]}
    >
      <div className="flex h-full gap-2 font-app-sans">
        <section className="app-panel min-h-0 min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-[#f0ece6]">
          <div className="border-b border-[#f0ece6] bg-[linear-gradient(135deg,#ffffff_0%,#fbfaf8_55%,#f5f1e8_100%)] px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Credentialing
                </div>
                <h1 className="mt-1 text-[22px] font-semibold text-slate-800">
                  Credentialing Dashboard
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(true)}
                disabled={isSaving}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#4f63ea] px-3.5 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-[#3d4ed1] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {isSaving ? "Saving..." : "Add New"}
              </button>
            </div>
          </div>

          <div className="border-b border-[#f0ece6] px-5 py-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <div className="text-[13px] font-medium text-slate-700">
                  Filters
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {activeFilterCount} active
                </span>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-lg border border-[#ece8e1] bg-white px-3 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            <div className="grid gap-3 xl:grid-cols-4 2xl:grid-cols-6">
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">
                  Practice
                </span>
                <SearchSelect
                  value={filters.practice}
                  onChange={(value) =>
                    setFilters((current) => ({ ...current, practice: value }))
                  }
                  onSearch={searchPractices}
                  clearable
                  toggleOnSelectSame
                  placeholder="Search practice"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">
                  Provider
                </span>
                <SearchSelect
                  value={filters.provider}
                  onChange={(value) =>
                    setFilters((current) => ({ ...current, provider: value }))
                  }
                  onSearch={searchProviders}
                  clearable
                  toggleOnSelectSame
                  placeholder="Search provider"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">
                  Payer Name (ID)
                </span>
                <SearchSelect
                  value={filters.payer}
                  displayLabel={filters.payerLabel}
                  onChange={(value, option) =>
                    setFilters((current) => ({
                      ...current,
                      payer: value,
                      payerLabel: formatPayerDisplayLabel(
                        option?.label || "",
                        value,
                      ),
                    }))
                  }
                  onSearch={searchPayers}
                  clearable
                  toggleOnSelectSame
                  placeholder="Search payer"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">
                  Status
                </span>
                <Select
                  value={filters.status}
                  onChange={(value) =>
                    setFilters((current) => ({ ...current, status: value }))
                  }
                  options={[
                    { label: "All Statuses", value: "" },
                    ...credentialingStatusOptions.map((status) => ({
                      label: status,
                      value: status,
                    })),
                  ]}
                  placeholder="All statuses"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">
                  Contract Type
                </span>
                <Select
                  value={filters.contractType}
                  onChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      contractType: value,
                    }))
                  }
                  options={[
                    { label: "All Types", value: "" },
                    ...contractTypeOptions.map((option) => ({
                      label: option,
                      value: option,
                    })),
                  ]}
                  placeholder="All types"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">
                  Assigned Specialist
                </span>
                <SearchSelect
                  value={filters.assignedUser}
                  displayLabel={assignedUserFilterLabel}
                  onChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      assignedUser: value,
                    }))
                  }
                  onSearch={searchAssignedUsers}
                  clearable
                  toggleOnSelectSame
                  placeholder="Search specialist"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">
                  Submitted Date From
                </span>
                <DatePicker
                  value={filters.dateFrom}
                  onChange={(value) =>
                    setFilters((current) => ({ ...current, dateFrom: value }))
                  }
                  placeholder="Submitted date from"
                  className="rounded-xl"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">
                  Submitted Date To
                </span>
                <DatePicker
                  value={filters.dateTo}
                  onChange={(value) =>
                    setFilters((current) => ({ ...current, dateTo: value }))
                  }
                  placeholder="Submitted date to"
                  className="rounded-xl"
                />
              </label>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 pr-3 custom-scrollbar">
            {isLoading ? (
              <DashboardSkeleton />
            ) : (
              <>
                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                  {[
                    {
                      label: "Total Active Requests",
                      value: metrics.total,
                      hint: "All filtered manual requests",
                      icon: <FolderOpen className="h-4 w-4" />,
                      tone: "from-slate-900 to-slate-700",
                    },
                    {
                      label: "% Contracted",
                      value: `${metrics.contractedRate}%`,
                      hint: `${metrics.contracted} contracted`,
                      icon: <Percent className="h-4 w-4" />,
                      tone: "from-emerald-500 to-teal-500",
                    },
                    {
                      label: "In Process",
                      value: metrics.inProcess,
                      hint: "Submitted or under payer review",
                      icon: <Clock3 className="h-4 w-4" />,
                      tone: "from-amber-500 to-orange-500",
                    },
                    {
                      label: "Stale Requests",
                      value: metrics.stale,
                      hint: "No activity in over 15 days",
                      icon: <ShieldAlert className="h-4 w-4" />,
                      tone: "from-rose-500 to-red-500",
                    },
                    {
                      label: "Upcoming Deadlines",
                      value: metrics.upcomingDeadlines,
                      hint: "Follow-up, expiration or re-cred due",
                      icon: <CalendarClock className="h-4 w-4" />,
                      tone: "from-indigo-500 to-blue-500",
                    },
                    {
                      label: "Pending Info",
                      value: metrics.pendingInfo,
                      hint: "Waiting on more documents",
                      icon: <CircleAlert className="h-4 w-4" />,
                      tone: "from-amber-400 to-yellow-500",
                    },
                    {
                      label: "Re-credentialing Due",
                      value: metrics.recredentialingDue,
                      hint: "Needs renewal attention",
                      icon: <TrendingUp className="h-4 w-4" />,
                      tone: "from-orange-500 to-amber-600",
                    },
                    {
                      label: "OON",
                      value: metrics.oon,
                      hint: "Out-of-network requests",
                      icon: <Gauge className="h-4 w-4" />,
                      tone: "from-slate-500 to-slate-700",
                    },
                    {
                      label: "Avg Turnaround",
                      value: `${metrics.averageTurnaround}d`,
                      hint: "Submission to contracted",
                      icon: <BadgeCheck className="h-4 w-4" />,
                      tone: "from-teal-500 to-cyan-500",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className="overflow-hidden rounded-2xl border border-[#ece8e1] bg-white shadow-sm"
                    >
                      <div className={`h-1 bg-gradient-to-r ${card.tone}`} />
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[12px] uppercase tracking-wide text-slate-400">
                              {card.label}
                            </div>
                            <div className="mt-2 text-[28px] font-semibold text-slate-800">
                              {card.value}
                            </div>
                          </div>
                          <div className="rounded-xl bg-[#fbfaf8] p-2.5 text-slate-500">
                            {card.icon}
                          </div>
                        </div>
                        <div className="mt-3 text-[12px] text-slate-400">
                          {card.hint}
                        </div>
                      </div>
                    </div>
                  ))}
                </section>

                <section className="rounded-2xl border border-[#ece8e1] bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#f0ece6] px-5 py-4">
                    <div className="flex items-center gap-2">
                      <ArrowDownUp className="h-4 w-4 text-slate-400" />
                      <div>
                        <div className="text-[15px] font-semibold text-slate-800">
                          Status Distribution
                        </div>
                        <div className="text-[12px] text-slate-400">
                          Roll-up counts for the current filter set.
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5">
                    {statusOverview.map((item) => (
                      <div
                        key={item.status}
                        className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${statusTone(item.status)}`}
                          >
                            {item.status}
                          </span>
                          <span className="text-[20px] font-semibold text-slate-800">
                            {item.count}
                          </span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-100">
                          <div
                            className="h-2 rounded-full bg-[#4f63ea]"
                            style={{
                              width: `${metrics.total > 0 ? Math.max(6, (item.count / metrics.total) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                  <section className="rounded-2xl border border-[#ece8e1] bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#f0ece6] px-5 py-4">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-slate-400" />
                        <div>
                          <div className="text-[15px] font-semibold text-slate-800">
                            Practice-wise View
                          </div>
                          <div className="text-[12px] text-slate-400">
                            Sorts practices by completion percentage.
                          </div>
                        </div>
                      </div>
                      <div className="text-[12px] text-slate-400">
                        {practiceRows.length} practices
                      </div>
                    </div>
                    <div className="overflow-hidden">
                      <table className="min-w-full border-separate border-spacing-0 text-left">
                        <thead className="bg-white text-[12px] uppercase tracking-wide text-slate-400">
                          <tr>
                            <th className="border-b border-[#f0ece6] px-5 py-3">
                              Practice
                            </th>
                            <th className="border-b border-[#f0ece6] px-5 py-3">
                              Total
                            </th>
                            <th className="border-b border-[#f0ece6] px-5 py-3">
                              Contracted
                            </th>
                            <th className="border-b border-[#f0ece6] px-5 py-3">
                              In Process
                            </th>
                            <th className="border-b border-[#f0ece6] px-5 py-3">
                              OON
                            </th>
                            <th className="border-b border-[#f0ece6] px-5 py-3">
                              Last Activity
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {practiceRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-5 py-10 text-center text-[13px] text-slate-400"
                              >
                                No practice records match the current filters.
                              </td>
                            </tr>
                          ) : (
                            practiceRows.map((row) => (
                              <tr
                                key={row.practice}
                                className="text-[13px] text-slate-600"
                              >
                                <td className="border-b border-[#f4f1ec] px-5 py-3 font-medium text-slate-700">
                                  {row.practice}
                                  <div className="mt-1 text-[11px] text-slate-400">
                                    {row.contractedRate}% contracted
                                  </div>
                                </td>
                                <td className="border-b border-[#f4f1ec] px-5 py-3">
                                  {row.total}
                                </td>
                                <td className="border-b border-[#f4f1ec] px-5 py-3">
                                  {row.contracted}
                                </td>
                                <td className="border-b border-[#f4f1ec] px-5 py-3">
                                  {row.inProcess}
                                </td>
                                <td className="border-b border-[#f4f1ec] px-5 py-3">
                                  {row.oon}
                                </td>
                                <td className="border-b border-[#f4f1ec] px-5 py-3">
                                  {formatDateLabel(row.lastActivityDate)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#ece8e1] bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#f0ece6] px-5 py-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-slate-400" />
                        <div>
                          <div className="text-[15px] font-semibold text-slate-800">
                            Insurance Plan View
                          </div>
                          <div className="text-[12px] text-slate-400">
                            Ranked by average turnaround time.
                          </div>
                        </div>
                      </div>
                      <div className="text-[12px] text-slate-400">
                        {payerRows.length} insurance plans
                      </div>
                    </div>
                    <div className="overflow-hidden">
                      <table className="min-w-full border-separate border-spacing-0 text-left">
                        <thead className="bg-white text-[12px] uppercase tracking-wide text-slate-400">
                          <tr>
                            <th className="border-b border-[#f0ece6] px-5 py-3">
                              Insurance Plan
                            </th>
                            <th className="border-b border-[#f0ece6] px-5 py-3">
                              Contracted
                            </th>
                            <th className="border-b border-[#f0ece6] px-5 py-3">
                              In Process
                            </th>
                            <th className="border-b border-[#f0ece6] px-5 py-3">
                              OON
                            </th>
                            <th className="border-b border-[#f0ece6] px-5 py-3">
                              Avg Days
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {payerRows.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-5 py-10 text-center text-[13px] text-slate-400"
                              >
                                No payer records match the current filters.
                              </td>
                            </tr>
                          ) : (
                            payerRows.map((row) => (
                              <tr
                                key={row.payer}
                                className="text-[13px] text-slate-600"
                              >
                                <td className="border-b border-[#f4f1ec] px-5 py-3 font-medium text-slate-700">
                                  {row.payer}
                                </td>
                                <td className="border-b border-[#f4f1ec] px-5 py-3">
                                  {row.contracted}
                                </td>
                                <td className="border-b border-[#f4f1ec] px-5 py-3">
                                  {row.inProcess}
                                </td>
                                <td className="border-b border-[#f4f1ec] px-5 py-3">
                                  {row.oon}
                                </td>
                                <td className="border-b border-[#f4f1ec] px-5 py-3">
                                  {row.averageTurnaround
                                    ? `${row.averageTurnaround} days`
                                    : "-"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <section className="rounded-2xl border border-[#ece8e1] bg-white shadow-sm">
                    <div className="border-b border-[#f0ece6] px-5 py-4">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-slate-400" />
                        <div>
                          <div className="text-[15px] font-semibold text-slate-800">
                            Upcoming Deadlines
                          </div>
                          <div className="text-[12px] text-slate-400">
                            Follow-up, expiration, and re-credentialing dates within 90 days.
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3 p-5">
                      {expiringSoon.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-[#ece8e1] bg-[#fbfaf8] px-4 py-6 text-center text-[13px] text-slate-400">
                          No upcoming deadlines in the current filter set.
                        </div>
                      ) : (
                        expiringSoon.map(
                          ({ record, daysLeft, deadlineLabel, deadlineDate }) => (
                            <div
                              key={record.id}
                              className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-[13px] font-medium text-slate-700">
                                    {record.practice}
                                  </div>
                                  <div className="mt-1 text-[12px] text-slate-500">
                                    {record.provider || "Practice-level"} ·{" "}
                                    {formatPayerDisplayLabel(
                                      record.insuranceCompany,
                                      record.payerProviderId,
                                    )}
                                  </div>
                                </div>
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${
                                    daysLeft !== null && daysLeft <= 30
                                      ? "bg-rose-100 text-rose-700"
                                      : daysLeft !== null && daysLeft <= 60
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {daysLeft === null
                                    ? "-"
                                    : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
                                </span>
                              </div>
                              <div className="mt-2 text-[12px] text-slate-500 font-medium">
                                Nearest Deadline: {deadlineLabel} ({formatDateLabel(deadlineDate)})
                              </div>
                              <div className="mt-1 text-[11px] text-slate-400 space-x-2">
                                {record.nextFollowUpDate ? (
                                  <span>Follow-up: {formatDateLabel(record.nextFollowUpDate)}</span>
                                ) : null}
                                {record.expirationDate ? (
                                  <span>Expiration: {formatDateLabel(record.expirationDate)}</span>
                                ) : null}
                                {record.reCredentialingDueDate ? (
                                  <span>Re-cred: {formatDateLabel(record.reCredentialingDueDate)}</span>
                                ) : null}
                              </div>
                            </div>
                          ),
                        )
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-[#ece8e1] bg-white shadow-sm">
                    <div className="border-b border-[#f0ece6] px-5 py-4">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-slate-400" />
                        <div>
                          <div className="text-[15px] font-semibold text-slate-800">
                            Recent Credentialing and Activity
                          </div>
                          <div className="text-[12px] text-slate-400">
                            Latest updates and audit trail from the manual tracker.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-5 p-5 xl:grid-cols-2">
                      <div>
                        <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-slate-700">
                          <FolderOpen className="h-4 w-4 text-slate-400" />
                          Recent Credentialing
                        </div>
                        <div className="space-y-2">
                          {recentCredentialing.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#ece8e1] bg-[#fbfaf8] px-4 py-6 text-center text-[13px] text-slate-400">
                              No credentialing records found.
                            </div>
                          ) : (
                            recentCredentialing.map((record) => (
                              <div
                                key={record.id}
                                className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-[13px] font-medium text-slate-700">
                                      {record.provider || record.practice}
                                    </div>
                                    <div className="mt-1 text-[12px] text-slate-500">
                                      {formatPayerDisplayLabel(
                                        record.insuranceCompany,
                                        record.payerProviderId,
                                      )}{" "}
                                      · {record.practice}
                                    </div>
                                  </div>
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${statusTone(record.status)}`}
                                  >
                                    {record.status}
                                  </span>
                                </div>
                                <div className="mt-2 text-[12px] text-slate-400">
                                  Updated {formatDateLabel(record.updatedAt)}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-slate-700">
                          <Clock3 className="h-4 w-4 text-slate-400" />
                          Recent Activity
                        </div>
                        <div className="space-y-2">
                          {recentActivity.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[#ece8e1] bg-[#fbfaf8] px-4 py-6 text-center text-[13px] text-slate-400">
                              No recent activity yet.
                            </div>
                          ) : (
                            recentActivity.map((entry) => (
                              <div
                                key={entry.id}
                                className="rounded-2xl border border-[#ece8e1] bg-[#fbfaf8] px-4 py-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="text-[13px] font-medium text-slate-700">
                                    {entry.action}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {formatDateLabel(entry.createdAt)}
                                  </div>
                                </div>
                                <div className="mt-1 text-[12px] text-slate-500">
                                  {entry.practice} ·{" "}
                                  {entry.provider || "Practice-level"} ·{" "}
                                  {entry.payer}
                                </div>
                                <div className="mt-1">
                                   {(() => {
                                     const cleanedDetails = (entry.details || "").replace(/\[reminderKey:[^\]]+\]\s*/g, "").trim();
                                     const items = cleanedDetails
                                       .split(";")
                                       .map((item) => item.trim())
                                       .filter(Boolean);

                                    if (items.length === 0) {
                                      return (
                                        <div className="text-[12px] text-slate-500">
                                          Activity recorded
                                        </div>
                                      );
                                    }

                                    return (
                                      <ul className="list-disc space-y-1 pl-5 text-[12px] text-slate-500">
                                        {items.map((item, index) => (
                                          <li key={`${entry.id}-${index}`}>{item}</li>
                                        ))}
                                      </ul>
                                    );
                                  })()}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </>
            )}
          </div>
        </section>

        <CredentialingModal
          isOpen={showModal}
          mode="create"
          onClose={() => setShowModal(false)}
          onSave={handleCreate}
          isSaving={isSaving}
        />
      </div>
    </AppLayout>
  );
}

export default CredentialingDashboardPage;
