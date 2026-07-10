import axios from "axios";
import { apiConnector } from "../apiConnector";
import { credentialingEndpoints } from "../apis";
import type { CredentialingFormState, CredentialingRecord } from "../../components/credentialing/types";

const { DASHBOARD, LIST, CREATE, GET, UPDATE, DELETE } = credentialingEndpoints;

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

export type CredentialingQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  practice?: string;
  provider?: string;
  insuranceCompany?: string;
  status?: string;
  credentialingType?: string;
  contractType?: string;
  assignedUser?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type CredentialingDashboardResponse = {
  summary: {
    totalCredentialing: number;
    inProgress: number;
    submitted: number;
    approved: number;
    rejected: number;
    expired: number;
  };
  statusOverview: { status: string; count: number }[];
  recentCredentialing: CredentialingRecord[];
  recentlyExpiring: Array<CredentialingRecord & { daysLeft?: number | null }>;
  recentActivity: Array<{
    id: string;
    action: string;
    details?: string;
    actor: string;
    createdAt: string;
    practice: string;
    provider: string;
    payer: string;
  }>;
};

export type CredentialingListResponse = {
  credentialingRequests: CredentialingRecord[];
  pagination: {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
};

export type CredentialingOptionRecord = {
  id: string;
  practice: string;
  provider: string;
  insuranceCompany: string;
  assignedUser: string;
};

function buildQueryString(params?: CredentialingQueryParams) {
  const queryString = new URLSearchParams();
  if (params?.page) queryString.set("page", String(params.page));
  if (params?.limit) queryString.set("limit", String(params.limit));
  if (params?.search) queryString.set("search", params.search);
  if (params?.practice) queryString.set("practice", params.practice);
  if (params?.provider) queryString.set("provider", params.provider);
  if (params?.insuranceCompany) queryString.set("insuranceCompany", params.insuranceCompany);
  if (params?.status) queryString.set("status", params.status);
  if (params?.credentialingType) queryString.set("credentialingType", params.credentialingType);
  if (params?.contractType) queryString.set("contractType", params.contractType);
  if (params?.assignedUser) queryString.set("assignedUser", params.assignedUser);
  if (params?.dateFrom) queryString.set("dateFrom", params.dateFrom);
  if (params?.dateTo) queryString.set("dateTo", params.dateTo);
  if (params?.sortBy) queryString.set("sortBy", params.sortBy);
  if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);
  return queryString.toString();
}

export async function getCredentialingDashboardView(
  params?: CredentialingQueryParams,
): Promise<CredentialingDashboardResponse> {
  try {
    const queryString = buildQueryString(params);
    const url = queryString ? `${DASHBOARD}?${queryString}` : DASHBOARD;
    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    return response.data as CredentialingDashboardResponse;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch credentialing dashboard."),
    );
  }
}

export async function getCredentialingRequestsView(
  params?: CredentialingQueryParams,
): Promise<CredentialingListResponse> {
  try {
    const queryString = buildQueryString(params);
    const url = queryString ? `${LIST}?${queryString}` : LIST;
    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    return response.data as CredentialingListResponse;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch credentialing requests."),
    );
  }
}

export async function getCredentialingRequestById(
  id: string,
): Promise<CredentialingRecord> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { credentialingRequest: CredentialingRecord }).credentialingRequest;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch credentialing request."),
    );
  }
}

export async function getCredentialingRequestOptions(
  params?: Pick<CredentialingQueryParams, "search" | "practice" | "provider" | "insuranceCompany" | "assignedUser">,
): Promise<CredentialingOptionRecord[]> {
  try {
    const queryString = buildQueryString({
      ...params,
      limit: 200,
      page: 1,
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
    const url = queryString ? `${LIST}?${queryString}` : LIST;
    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    return (response.data as CredentialingListResponse).credentialingRequests.map(
      (record) => ({
        id: record.id,
        practice: record.practice,
        provider: record.provider,
        insuranceCompany: record.insuranceCompany,
        assignedUser: record.assignedUser,
      }),
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch credentialing options."),
    );
  }
}

export async function createCredentialingRequestApi(
  data: CredentialingFormState & {
    practiceName?: string;
    providerName?: string;
    assignedToUserName?: string;
  },
): Promise<CredentialingRecord> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    return (response.data as { credentialingRequest: CredentialingRecord }).credentialingRequest;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to create credentialing request."),
    );
  }
}

export async function updateCredentialingRequestApi(
  id: string,
  data: Partial<
    CredentialingFormState & {
      practiceName?: string;
      providerName?: string;
      assignedToUserName?: string;
    }
  >,
): Promise<CredentialingRecord> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    return (response.data as { credentialingRequest: CredentialingRecord }).credentialingRequest;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to update credentialing request."),
    );
  }
}

export async function deleteCredentialingRequestApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to delete credentialing request."),
    );
  }
}
