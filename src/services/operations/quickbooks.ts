import axios from "axios";
import { apiConnector } from "../apiConnector";
import { quickbooksEndpoints } from "../apis";

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    
    // Prefer the detailed 'error' field if it exists (usually contains specific validation reasons)
    if (data?.error && typeof data.error === "string") {
      return data.error;
    }
    
    return data?.message ?? fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

export type ExternalSyncStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export type ExternalSyncJob = {
  id: string;
  system: string;
  entityType: string;
  entityId: string;
  externalId: string | null;
  status: ExternalSyncStatus;
  direction: string | null;
  lastError: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SyncLogsResponse = {
  logs: ExternalSyncJob[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function getSyncLogs(page = 1, limit = 20, companyId?: string): Promise<SyncLogsResponse> {
  try {
    let url = `${quickbooksEndpoints.GET_LOGS}?page=${page}&limit=${limit}`;
    if (companyId) {
      url += `&companyId=${companyId}`;
    }
    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    return response.data as SyncLogsResponse;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch sync logs."));
  }
}

export async function retrySyncJob(jobId: string): Promise<any> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: quickbooksEndpoints.RETRY_JOB(jobId),
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to retry sync job."));
  }
}

export async function connectQuickBooks(companyId: string, isSandbox = true): Promise<{ authUrl: string }> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: quickbooksEndpoints.CONNECT,
      body: { companyId, isSandbox },
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to connect to QuickBooks."));
  }
}

export type QuickBooksConnectionStatus = {
  connected: boolean;
  connection: {
    id: string;
    companyId: string;
    realmId: string;
    isSandbox: boolean;
    connectedByUserId: string | null;
    lastSyncAt: string | null;
    lastError: string | null;
  } | null;
  accountInfo: {
    id: string;
    name: string;
    legalName: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    fiscalYearStartMonth: number | null;
  } | null;
  tokenExpiresAt: string | null;
  isTokenExpired: boolean | null;
  lastSyncAt: string | null;
  lastError: string | null;
};

export async function getQuickBooksStatus(companyId: string): Promise<QuickBooksConnectionStatus> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: quickbooksEndpoints.STATUS(companyId),
      credentials: true,
    });
    return response.data as QuickBooksConnectionStatus;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch QuickBooks status."));
  }
}

export async function disconnectQuickBooks(companyId: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: quickbooksEndpoints.DISCONNECT(companyId),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to disconnect QuickBooks."));
  }
}

export type SyncSummary = {
  COMPLETED: number;
  FAILED: number;
  IN_PROGRESS: number;
  total: number;
};

export async function getSyncSummary(): Promise<SyncSummary> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: quickbooksEndpoints.GET_LOGS.replace("/sync-logs", "/sync-summary"),
      credentials: true,
    });
    return (response.data as { summary: SyncSummary }).summary;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch sync summary."));
  }
}
