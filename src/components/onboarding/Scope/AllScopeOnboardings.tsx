import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Calendar, FileText, Search, Target } from "lucide-react";
import AppLayout from "../../layout/AppLayout";
import { EmptyStateIllustration } from "../../shared/tablePageUtils";
import {
  getOnboardings,
  type Onboarding,
} from "../../../services/operations/onboarding";
import { getPractice } from "../../../services/operations/practices";

type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type ScopeRow = {
  id: string;
  practiceName: string;
  type: string;
  status: string;
  services: string[];
  createdAt: string;
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

const careProgramServiceValues = [
  "CARE_MANAGEMENT",
  "APCM",
  "CCM",
  "RPM",
  "PCM",
  "RTM",
  "BHI",
  "TCM",
];

const subCareProgramValues = careProgramServiceValues.filter(
  (v) => v !== "CARE_MANAGEMENT",
);

const serviceLabelMap: Record<string, string> = {
  CREDENTIALING: "Credentialing",
  BILLING_RCM: "Billing / RCM",
  CARE_MANAGEMENT: "Care Management",
  APCM: "APCM",
  CCM: "CCM",
  RPM: "RPM",
  PCM: "PCM",
  RTM: "RTM",
  BHI: "BHI",
  TCM: "TCM",
  LAB_RELATIONSHIP_SUPPORT: "Lab Support",
  PHARMACY_PROGRAM_SUPPORT: "Pharmacy Support",
  PATIENT_ACQUISITION: "Patient Acquisition",
  BRAND_GROWTH: "Brand Growth",
  AI_VISIBILITY: "AI Visibility",
  OTHER: "Other",
};

export default function AllScopeOnboardings() {
  const [rows, setRows] = useState<ScopeRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [practiceNamesById, setPracticeNamesById] = useState<
    Record<string, string>
  >({});
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const response = await getOnboardings({
          page: pagination.page,
          limit: pagination.limit,
          search: search || undefined,
          status: "DRAFT",
        });

        if (!active) return;

        const onboardings = response.onboardings || [];

        const practiceIds = Array.from(
          new Set(
            onboardings
              .map((ob) => ob.practiceId)
              .filter((practiceId): practiceId is string => !!practiceId),
          ),
        );

        const missingPracticeIds = practiceIds.filter(
          (practiceId) => !practiceNamesById[practiceId],
        );

        let nextPracticeNamesById = practiceNamesById;
        if (missingPracticeIds.length > 0) {
          const practiceResults = await Promise.allSettled(
            missingPracticeIds.map(async (practiceId) => {
              const practice = await getPractice(practiceId);
              return [practiceId, practice.name] as const;
            }),
          );

          nextPracticeNamesById = {
            ...practiceNamesById,
            ...Object.fromEntries(
              practiceResults
                .filter(
                  (
                    result,
                  ): result is PromiseFulfilledResult<
                    readonly [string, string]
                  > => result.status === "fulfilled",
                )
                .map((result) => result.value),
            ),
          };
          setPracticeNamesById(nextPracticeNamesById);
        }

        const mappedRows: ScopeRow[] = onboardings.map((ob: Onboarding) => ({
          id: ob.id,
          practiceName:
            (ob.practiceId && nextPracticeNamesById[ob.practiceId]) ||
            ob.practices?.[0]?.practiceName ||
            ob.legalCompanyName ||
            "N/A",
          type: ob.onboardingType || "N/A",
          status: ob.status || "DRAFT",
          services: ob.requestedServices || [],
          createdAt: ob.createdAt
            ? new Date(ob.createdAt).toLocaleDateString()
            : "N/A",
          original: ob,
        }));

        setRows(mappedRows);
        setPagination((prev) => ({
          ...prev,
          total: (response.pagination?.totalRecords as number) || 0,
          totalPages: (response.pagination?.totalPages as number) || 0,
        }));
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Unable to fetch onboardings.";
        toast.error(message);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [pagination.page, pagination.limit, search]);

  function handleSearch(value: string) {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  return (
    <AppLayout
      title="Pending Submissions"
      activeModule="Onboarding"
      activeSubItem="Pending Submissions"
    >
      <div className="flex h-full flex-col p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Pending Submissions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Onboarding records sent to practices that haven't been submitted yet
            </p>
          </div>
        </div>

        {/*<div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by practice name..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-slate-950"
            />
          </div>
        </div>*/}

        <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Practice</span>
                  </div>
                </th>
                <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                  Type
                </th>
                <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5" />
                    <span>Services</span>
                  </div>
                </th>
                <th className="border-b border-slate-100 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Created</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-20 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                      <span className="text-sm">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="bg-white hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-4 py-3 text-sm">
                      <span className="font-medium text-slate-800">
                        {row.practiceName}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                      {row.type === "MULTI_PRACTICE_ORGANIZATION"
                        ? "Multi Practice"
                        : row.type === "SINGLE_PRACTICE_ORGANIZATION"
                          ? "Single Practice Org"
                          : row.type === "SINGLE_PRACTICE"
                            ? "Single Practice"
                            : row.type}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusColors[row.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabels[row.status] || row.status}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm">
                      {(() => {
                        const raw = row.services;
                        const hasSubProgram = raw.some((s) =>
                          subCareProgramValues.includes(s),
                        );
                        const displayServices = hasSubProgram
                          ? [
                              "CARE_MANAGEMENT",
                              ...raw.filter(
                                (s) => !careProgramServiceValues.includes(s),
                              ),
                            ]
                          : raw;
                        return (
                          <div className="flex flex-wrap gap-1">
                            {displayServices.slice(0, 2).map((s) => (
                              <span
                                key={s}
                                className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-600"
                              >
                                {serviceLabelMap[s] || s}
                              </span>
                            ))}
                            {displayServices.length > 2 && (
                              <span className="text-[11px] text-slate-400">
                                +{displayServices.length - 2}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500">
                      {row.createdAt}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!isLoading && rows.length === 0 && (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="flex max-w-md flex-col items-center px-6 text-center">
                <EmptyStateIllustration />
                <h2 className="mt-4 text-[15px] font-semibold text-slate-700">
                  No pending submissions found
                </h2>
                <p className="mt-2 text-[14px] text-slate-400">
                  {search
                    ? "Try adjusting your search"
                    : "No sent onboardings pending submission"}
                </p>
              </div>
            </div>
          )}
        </div>

        {rows.length > 0 && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
            <span>
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: prev.page - 1,
                  }))
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: prev.page + 1,
                  }))
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
