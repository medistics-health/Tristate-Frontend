import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Calendar, FileText, Target } from "lucide-react";
import AppLayout from "../../layout/AppLayout";
import DataTableToolbar from "../../shared/DataTableToolbar";
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
  PATIENT_ACQUISITION_BRAND_GROWTH: "Patient Acquisition / Brand Growth",
  MSP_TECH_SUPPORT: "MSP / Tech Support",
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

  const loadData = async (isCancelled?: () => boolean) => {
    setIsLoading(true);
    try {
      const response = await getOnboardings({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
        status: "DRAFT",
      });

      if (isCancelled?.()) return;

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
      if (isCancelled?.()) return;
      const message =
        err instanceof Error ? err.message : "Unable to fetch onboardings.";
      toast.error(message);
    } finally {
      if (!isCancelled?.()) setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    void loadData(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [pagination.page, pagination.limit, search]);

  return (
    <AppLayout
      title="Pending Submissions"
      activeModule="Onboarding"
      activeSubItem="Pending Submissions"
    >
      <div className="app-split">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <DataTableToolbar
            title="Pending Submissions"
            subtitle="Onboarding"
            searchPlaceholder="Search by practice name..."
            // searchValue={search}
            // onSearchChange={(value) => {
            //   setSearch(value);
            //   setPagination((prev) => ({ ...prev, page: 1 }));
            // }}
            activeFilterCount={0}
            // onResetFilters={() => {
            //   setSearch("");
            //   setPagination((prev) => ({ ...prev, page: 1 }));
            // }}
            onRefresh={loadData}
            isLoading={isLoading}
            page={pagination.page}
            pageSize={pagination.limit}
            totalRecords={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={(page) =>
              setPagination((prev) => ({ ...prev, page }))
            }
            onPageSizeChange={(newSize) =>
              setPagination((prev) => ({ ...prev, limit: newSize, page: 1 }))
            }
          >
            <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead className="sticky top-0 z-10 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="border-b border-[#eeebe5] border-r border-[#f2eee8] px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        <span>Practice</span>
                      </div>
                    </th>
                    <th className="border-b border-[#eeebe5] border-r border-[#f2eee8] px-4 py-3 font-medium">
                      Status
                    </th>
                    <th className="border-b border-[#eeebe5] border-r border-[#f2eee8] px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Target className="h-3.5 w-3.5" />
                        <span>Services</span>
                      </div>
                    </th>
                    <th className="border-b border-[#eeebe5] px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Created</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[14px] text-slate-600">
                  {rows.map((row) => (
                    <tr key={row.id} className="bg-white hover:bg-[#faf9f7]">
                      <td className="border-b border-[#f4f1ec] border-r border-[#f5f2ed] px-4 py-3">
                        <span className="font-medium text-slate-800">
                          {row.practiceName}
                        </span>
                      </td>
                      <td className="border-b border-[#f4f1ec] border-r border-[#f5f2ed] px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColors[row.status] ||
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {statusLabels[row.status] || row.status}
                        </span>
                      </td>
                      <td className="border-b border-[#f4f1ec] border-r border-[#f5f2ed] px-4 py-3">
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
                      <td className="border-b border-[#f4f1ec] px-4 py-3 text-slate-500">
                        {row.createdAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!isLoading && rows.length === 0 && (
                <div className="relative flex min-h-[520px] items-center justify-center">
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
          </DataTableToolbar>
        </section>
      </div>
    </AppLayout>
  );
}
