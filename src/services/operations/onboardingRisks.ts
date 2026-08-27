import axios from "axios";
import { apiConnector } from "../apiConnector";
import { onboardingRiskEndpoints } from "../apis";
import { formatPracticeServiceLine } from "../../components/practices/serviceLines";

const { LIST, CREATE, GET, UPDATE, DELETE } = onboardingRiskEndpoints;

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = (
      error.response?.data as { message?: string } | undefined
    )?.message;
    return apiMessage ?? fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

export const RISK_LEVEL_OPTIONS = [
  { value: "LOW", label: "Low", className: "bg-emerald-100 text-emerald-800" },
  { value: "MEDIUM", label: "Medium", className: "bg-amber-100 text-amber-800" },
  { value: "HIGH", label: "High", className: "bg-red-100 text-red-800" },
] as const;

export const RISK_RATING_OPTIONS = [
  { value: "LOW", label: "Low", className: "bg-emerald-100 text-emerald-800" },
  { value: "MEDIUM", label: "Medium", className: "bg-amber-100 text-amber-800" },
  { value: "HIGH", label: "High", className: "bg-orange-100 text-orange-800" },
  { value: "CRITICAL", label: "Critical", className: "bg-red-100 text-red-800" },
] as const;

export const RISK_STATUS_OPTIONS = [
  { value: "OPEN", label: "Open", className: "bg-sky-100 text-sky-800" },
  {
    value: "MITIGATED",
    label: "Mitigated",
    className: "bg-violet-100 text-violet-800",
  },
  { value: "CLOSED", label: "Closed", className: "bg-slate-100 text-slate-700" },
] as const;

export type RiskLevel = (typeof RISK_LEVEL_OPTIONS)[number]["value"];
export type RiskRating = (typeof RISK_RATING_OPTIONS)[number]["value"];
export type RiskStatus = (typeof RISK_STATUS_OPTIONS)[number]["value"];

export type RiskOwner = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type OnboardingRisk = {
  id: string;
  onboardingProjectId: string;
  workstreamId?: string | null;
  practiceId: string;
  riskNumber: number;
  description: string;
  impact: RiskLevel | string;
  probability: RiskLevel | string;
  rating: RiskRating | string;
  mitigation?: string | null;
  ownerUserId?: string | null;
  status: RiskStatus | string;
  createdAt: string;
  updatedAt: string;
  practice?: { id: string; name: string };
  workstream?: { id: string; serviceLine: string; status: string } | null;
  owner?: RiskOwner | null;
};

export type RiskBody = {
  practiceId?: string;
  onboardingProjectId?: string;
  workstreamId?: string | null;
  description: string;
  impact: string;
  probability: string;
  mitigation?: string | null;
  ownerUserId?: string | null;
  status?: string;
};

export type RiskRow = {
  id: string;
  values: Record<string, string | number | null>;
};

export type RiskQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  practiceId?: string;
  workstreamId?: string;
  status?: string;
  rating?: string;
  impact?: string;
  probability?: string;
  ownerUserId?: string;
  sortOrder?: "asc" | "desc";
};

const LEVEL_SCORE: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

export function computeRiskRating(impact: string, probability: string): RiskRating {
  const product = (LEVEL_SCORE[impact] ?? 0) * (LEVEL_SCORE[probability] ?? 0);
  if (product >= 9) return "CRITICAL";
  if (product >= 6) return "HIGH";
  if (product >= 3) return "MEDIUM";
  return "LOW";
}

export function formatRiskLevel(value: string) {
  return RISK_LEVEL_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatRiskRating(value: string) {
  return RISK_RATING_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatRiskStatus(value: string) {
  return RISK_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function riskLevelClass(value: string) {
  return (
    RISK_LEVEL_OPTIONS.find((option) => option.value === value)?.className ??
    "bg-slate-100 text-slate-700"
  );
}

export function riskRatingClass(value: string) {
  return (
    RISK_RATING_OPTIONS.find((option) => option.value === value)?.className ??
    "bg-slate-100 text-slate-700"
  );
}

export function riskStatusClass(value: string) {
  return (
    RISK_STATUS_OPTIONS.find((option) => option.value === value)?.className ??
    "bg-slate-100 text-slate-700"
  );
}

function ownerName(owner?: RiskOwner | null) {
  if (!owner) return "";
  return [owner.firstName, owner.lastName].filter(Boolean).join(" ").trim();
}

function riskToRow(risk: OnboardingRisk): RiskRow {
  return {
    id: risk.id,
    values: {
      riskId: `R-${risk.riskNumber}`,
      practiceName: risk.practice?.name || "",
      workstream: risk.workstream
        ? formatPracticeServiceLine(String(risk.workstream.serviceLine))
        : "Practice-wide",
      description: risk.description,
      impact: String(risk.impact),
      probability: String(risk.probability),
      rating: String(risk.rating),
      status: String(risk.status),
      owner: ownerName(risk.owner) || "-",
    },
  };
}

export async function getRisksView(params?: RiskQueryParams) {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.practiceId) queryString.set("practiceId", params.practiceId);
    if (params?.workstreamId) queryString.set("workstreamId", params.workstreamId);
    if (params?.status) queryString.set("status", params.status);
    if (params?.rating) queryString.set("rating", params.rating);
    if (params?.impact) queryString.set("impact", params.impact);
    if (params?.probability) queryString.set("probability", params.probability);
    if (params?.ownerUserId) queryString.set("ownerUserId", params.ownerUserId);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString() ? `${LIST}?${queryString}` : LIST;
    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    const { risks, pagination } = response.data as {
      risks: OnboardingRisk[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };

    return {
      rows: risks.map(riskToRow),
      records: risks,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch risks."));
  }
}

export async function getRisk(id: string): Promise<OnboardingRisk> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { risk: OnboardingRisk }).risk;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch risk."));
  }
}

export async function createRiskApi(data: RiskBody): Promise<OnboardingRisk> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    return (response.data as { risk: OnboardingRisk }).risk;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create risk."));
  }
}

export async function updateRiskApi(
  id: string,
  data: Partial<RiskBody>,
): Promise<OnboardingRisk> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    return (response.data as { risk: OnboardingRisk }).risk;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update risk."));
  }
}

export async function deleteRiskApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete risk."));
  }
}
