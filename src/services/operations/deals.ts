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

export type DealStage =
  | "PROSPECTING"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type Deal = {
  id: string;
  practiceId: string;
  stage: DealStage;
  value: number;
  probability: number;
  expectedCloseDate?: string | null;
  createdAt: string;
  updatedAt: string;
  practice?: { id: string; name: string };
  agreements?: Array<{ id: string }>;
  audits?: Array<{ id: string }>;
};

export type DealBody = {
  practiceId: string;
  stage: DealStage;
  value: number;
  probability: number;
  expectedCloseDate?: string;
};

export type DealRow = {
  id: string;
  values: {
    id: string;
    practiceName: string;
    stage: DealStage;
    value: string;
    probability: number;
    expectedCloseDate: string;
    creationDate: string;
    lastUpdate: string;
  };
};

export type DealViewData = {
  viewId: string;
  title: string;
  totalCount: number;
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
  minValue?: number;
  maxValue?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
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
      practiceName: deal.practice?.name || "Unknown",
      stage: deal.stage,
      value: formatCurrency(deal.value),
      probability: deal.probability,
      expectedCloseDate: formatDate(deal.expectedCloseDate),
      creationDate: formatDateTime(deal.createdAt),
      lastUpdate: formatDateTime(deal.updatedAt),
    },
  };
}

const fields = [
  {
    id: "practiceName",
    label: "Practice",
    type: "text" as const,
    visible: true,
  },
  { id: "stage", label: "Stage", type: "text" as const, visible: true },
  { id: "value", label: "Value", type: "text" as const, visible: true },
  {
    id: "probability",
    label: "Probability",
    type: "number" as const,
    visible: true,
  },
  {
    id: "expectedCloseDate",
    label: "Expected Close",
    type: "date" as const,
    visible: true,
  },
  {
    id: "creationDate",
    label: "Created",
    type: "text" as const,
    visible: true,
  },
  {
    id: "lastUpdate",
    label: "Last Update",
    type: "text" as const,
    visible: false,
  },
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
    throw new Error(getErrorMessage(error, "Unable to create deal."));
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
    throw new Error(getErrorMessage(error, "Unable to update deal."));
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
