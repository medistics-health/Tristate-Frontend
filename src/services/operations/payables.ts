import axios from "axios";
import { apiConnector } from "../apiConnector";
import { quickbooksEndpoints } from "../apis";

const BASE = quickbooksEndpoints.GET_LOGS.replace("/quickbooks/sync-logs", "/vendor-payables");

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

export type VendorPayableStatus = "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "RELEASED" | "PAID" | "VOID";

export type VendorPayable = {
  id: string;
  vendorId: string;
  practiceId: string;
  payableNumber: string | null;
  totalAmount: string | number;
  status: VendorPayableStatus;
  releasePolicy: string;
  vendor: { id: string; name: string; remitEmail?: string | null | undefined };
  practice: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
  releasedAt?: string | null;
  quickbooksBillId?: string | null;
  quickbooksBillPaymentId?: string | null;
};

export type VendorPayablesResponse = {
  payables: VendorPayable[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export async function getVendorPayables(page = 1, limit = 20): Promise<VendorPayablesResponse> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: `${BASE}?page=${page}&limit=${limit}`,
      credentials: true,
    });
    return response.data as VendorPayablesResponse;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch vendor payables."));
  }
}

export async function releasePayable(id: string): Promise<VendorPayable> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: `${BASE}/${id}/release`,
      credentials: true,
    });
    return (response.data as { payable: VendorPayable }).payable;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to release payable."));
  }
}

export async function syncPayableToQuickBooks(id: string): Promise<any> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: `${BASE}/${id}/sync-qb`,
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to sync to QuickBooks."));
  }
}

export async function generatePayableStatement(id: string): Promise<string> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: `${BASE}/${id}/statement`,
      credentials: true,
    });
    return (response.data as { statementUrl: string }).statementUrl;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to generate statement."));
  }
}

export async function createVendorPayable(data: {
  vendorId: string;
  practiceId: string;
  totalAmount: number;
  description?: string;
}): Promise<VendorPayable> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: BASE,
      body: data,
      credentials: true,
    });
    return (response.data as { payable: VendorPayable }).payable;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create vendor payable."));
  }
}

export async function deletePayable(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: `${BASE}/${id}`,
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete payable."));
  }
}

export async function syncBillPaymentToQuickBooks(id: string): Promise<any> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: `${BASE}/${id}/bill-payments/sync`,
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to sync bill payment to QuickBooks."));
  }
}
