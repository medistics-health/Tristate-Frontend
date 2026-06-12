import axios from "axios";
import { apiConnector } from "../apiConnector";
import { dealEndpoints } from "../apis";

const { LIST, CREATE, GET, UPDATE, DELETE } = dealEndpoints;

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

function getErrorDetails(error: unknown) {
  if (!axios.isAxiosError(error)) return undefined;
  const data = error.response?.data as
    | { missingRequirements?: string[] }
    | undefined;
  return data?.missingRequirements;
}

export type DealStage =
  | "PROSPECTING"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "AGREEMENT_SENT"
  | "ONBOARDING"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type DealPrimaryContact = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  influence: string;
};

export type DealService = {
  id: string;
  name: string;
  code?: string | null;
  category?: string | null;
  isActive?: boolean;
};

export type DealSelectedService = {
  id: string;
  dealId: string;
  serviceId: string;
  service: DealService;
};

export type DealSigner = {
  id: string;
  role: string;
  name: string;
  email: string;
  status: string;
};

export type DealDocusealSubmission = {
  id: string;
  personId?: string | null;
  status?: string | null;
  templateId?: number | null;
  signers: DealSigner[];
};

export type DealAgreementServiceTerm = {
  id: string;
  isActive: boolean;
};

export type DealAgreement = {
  id: string;
  status: string;
  docusealSubmissions: DealDocusealSubmission[];
  serviceTerms: DealAgreementServiceTerm[];
};

export type DealStageRequirementState = {
  complete: boolean;
  missing: string[];
};

export type DealStageReadiness = {
  PROPOSAL: DealStageRequirementState;
  AGREEMENT_SENT: DealStageRequirementState;
  ONBOARDING: DealStageRequirementState;
};

export type DealCardData = {
  practiceName: string;
  servicesLabel: string;
  valueLabel: string;
  lastActivityAt?: string | null;
  activityCount: number;
  nextTaskTitle?: string | null;
  nextTaskDueAt?: string | null;
};

export type Deal = {
  id: string;
  practiceId: string;
  companyId?: string | null;
  primaryContactId?: string | null;
  stage: DealStage;
  value: number;
  probability: number;
  expectedCloseDate?: string | null;
  nextTaskTitle?: string | null;
  nextTaskDueAt?: string | null;
  lastActivityAt?: string | null;
  activityCount: number;
  selectedServiceIds: string[];
  selectedServiceNames: string[];
  primaryContactName?: string | null;
  createdAt: string;
  updatedAt: string;
  practice?: {
    id: string;
    name: string;
    company?: { id: string; name: string } | null;
  };
  company?: { id: string; name: string } | null;
  primaryContact?: DealPrimaryContact | null;
  selectedServices?: DealSelectedService[];
  agreements?: DealAgreement[];
  audits?: Array<{ id: string }>;
  card: DealCardData;
  stageReadiness: DealStageReadiness;
};

export type DealBody = {
  practiceId: string;
  companyId?: string | null;
  primaryContactId?: string | null;
  stage: DealStage;
  value: number;
  probability: number;
  expectedCloseDate?: string;
  nextTaskTitle?: string | null;
  nextTaskDueAt?: string | null;
  lastActivityAt?: string | null;
  activityCount?: number;
  selectedServiceIds?: string[];
};

export type DealRow = {
  id: string;
  values: {
    id: string;
    practiceName: string;
    companyName: string;
    primaryContactName: string;
    stage: DealStage;
    services: string;
    value: string;
    probability: number;
    expectedCloseDate: string;
    lastActivity: string;
    activityCount: number;
    nextTask: string;
    nextTaskDueAt: string;
    creationDate: string;
    lastUpdate: string;
  };
};

export type DealField = {
  id: string;
  label: string;
  type: "text" | "number" | "date";
  visible: boolean;
};

export type DealViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  fields: DealField[];
  rows: DealRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type DealQueryParams = {
  page?: number;
  limit?: number;
  stage?: string;
  practiceId?: string;
  companyId?: string;
  minValue?: number;
  maxValue?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type DealApiError = Error & {
  missingRequirements?: string[];
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

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

function dealToRow(deal: Deal): DealRow {
  return {
    id: deal.id,
    values: {
      id: deal.id,
      practiceName: deal.card?.practiceName || deal.practice?.name || "Unknown",
      companyName: deal.company?.name || deal.practice?.company?.name || "-",
      primaryContactName: deal.primaryContactName || "-",
      stage: deal.stage,
      services: deal.card?.servicesLabel || deal.selectedServiceNames.join(" + ") || "-",
      value: deal.card?.valueLabel || formatCurrency(deal.value),
      probability: deal.probability,
      expectedCloseDate: formatDate(deal.expectedCloseDate),
      lastActivity: formatDateTime(deal.card?.lastActivityAt || deal.lastActivityAt),
      activityCount: deal.card?.activityCount || deal.activityCount || 0,
      nextTask: deal.card?.nextTaskTitle || deal.nextTaskTitle || "-",
      nextTaskDueAt: formatDate(deal.card?.nextTaskDueAt || deal.nextTaskDueAt),
      creationDate: formatDateTime(deal.createdAt),
      lastUpdate: formatDateTime(deal.updatedAt),
    },
  };
}

const fields: DealField[] = [
  { id: "practiceName", label: "Practice", type: "text", visible: true },
  { id: "companyName", label: "Company", type: "text", visible: true },
  { id: "primaryContactName", label: "Primary Contact", type: "text", visible: true },
  { id: "stage", label: "Stage", type: "text", visible: true },
  { id: "services", label: "Services", type: "text", visible: true },
  { id: "value", label: "Value", type: "text", visible: true },
  { id: "probability", label: "Probability", type: "number", visible: true },
  {
    id: "expectedCloseDate",
    label: "Expected Close",
    type: "date",
    visible: true,
  },
  { id: "lastActivity", label: "Last Activity", type: "text", visible: true },
  { id: "activityCount", label: "Activity Count", type: "number", visible: true },
  { id: "nextTask", label: "Next Task", type: "text", visible: true },
  { id: "nextTaskDueAt", label: "Next Task Due", type: "date", visible: true },
  { id: "creationDate", label: "Created", type: "text", visible: false },
  { id: "lastUpdate", label: "Last Update", type: "text", visible: false },
];

export async function getDealsView(
  params?: DealQueryParams,
): Promise<DealViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.stage) queryString.set("stage", params.stage);
    if (params?.practiceId) queryString.set("practiceId", params.practiceId);
    if (params?.companyId) queryString.set("companyId", params.companyId);
    if (params?.minValue) queryString.set("minValue", String(params.minValue));
    if (params?.maxValue) queryString.set("maxValue", String(params.maxValue));
    if (params?.sortBy) queryString.set("sortBy", params.sortBy);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString()
      ? `${LIST}?${queryString.toString()}`
      : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });

    const { deals, pagination } = response.data as {
      deals: Deal[];
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };

    return {
      viewId: "deal-view-001",
      title: "All Deals",
      totalCount: pagination.total,
      fields,
      rows: deals.map(dealToRow),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch deals."));
  }
}

export async function getAllDeals(): Promise<Deal[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: `${LIST}?page=1&limit=100`,
      credentials: true,
    });
    const { deals } = response.data as { deals: Deal[] };
    return deals;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch deals."));
  }
}

export async function getDealsByPractice(practiceId: string): Promise<Deal[]> {
  try {
    const queryString = new URLSearchParams({
      practiceId,
      page: "1",
      limit: "1000",
    });
    const response = await apiConnector({
      method: "GET",
      url: `${LIST}?${queryString.toString()}`,
      credentials: true,
    });
    const { deals } = response.data as { deals: Deal[] };
    return deals;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch deals for practice."),
    );
  }
}

export async function getDeal(id: string): Promise<Deal> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { deal: Deal }).deal;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch deal."));
  }
}

export async function createDealApi(data: DealBody): Promise<DealRow> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    const deal = (response.data as { deal: Deal }).deal;
    return dealToRow(deal);
  } catch (error) {
    const err = new Error(
      getErrorMessage(error, "Unable to create deal."),
    ) as DealApiError;
    err.missingRequirements = getErrorDetails(error);
    throw err;
  }
}

export async function updateDealApi(
  id: string,
  data: Partial<DealBody>,
): Promise<DealRow> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    const deal = (response.data as { deal: Deal }).deal;
    return dealToRow(deal);
  } catch (error) {
    const err = new Error(
      getErrorMessage(error, "Unable to update deal."),
    ) as DealApiError;
    err.missingRequirements = getErrorDetails(error);
    throw err;
  }
}

export async function deleteDealApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete deal."));
  }
}

export const dealStageOptions: DealStage[] = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "AGREEMENT_SENT",
  "ONBOARDING",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export function getStageColor(stage: DealStage): string {
  switch (stage) {
    case "PROSPECTING":
      return "bg-blue-50 text-blue-600";
    case "QUALIFICATION":
      return "bg-indigo-50 text-indigo-600";
    case "PROPOSAL":
      return "bg-purple-50 text-purple-600";
    case "AGREEMENT_SENT":
      return "bg-amber-50 text-amber-700";
    case "ONBOARDING":
      return "bg-cyan-50 text-cyan-700";
    case "NEGOTIATION":
      return "bg-orange-50 text-orange-600";
    case "WON":
      return "bg-green-50 text-green-600";
    case "LOST":
      return "bg-red-50 text-red-600";
    default:
      return "bg-slate-50 text-slate-500";
  }
}
