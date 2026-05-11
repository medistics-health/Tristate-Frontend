import axios from "axios";
import { apiConnector } from "../apiConnector";
import { quickbooksEndpoints } from "../apis";

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

export async function getSyncLogs(page = 1, limit = 20): Promise<SyncLogsResponse> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: `${quickbooksEndpoints.GET_LOGS}?page=${page}&limit=${limit}`,
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

export async function getQuickBooksStatus(companyId: string): Promise<{ isConnected: boolean; realmId?: string }> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: quickbooksEndpoints.STATUS(companyId),
      credentials: true,
    });
    return response.data;
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
