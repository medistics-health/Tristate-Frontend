import { apiConnector } from "../apiConnector";
import { prefundingEndpoints } from "../apis";

export async function getPrefundingInvoices(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  practiceId?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const queryString = new URLSearchParams();
  if (params?.page) queryString.set("page", String(params.page));
  if (params?.limit) queryString.set("limit", String(params.limit));
  if (params?.search) queryString.set("search", params.search);
  if (params?.status) queryString.set("status", params.status);
  if (params?.practiceId) queryString.set("practiceId", params.practiceId);
  if (params?.sortBy) queryString.set("sortBy", params.sortBy);
  if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

  const url = queryString.toString()
    ? `${prefundingEndpoints.INVOICES}?${queryString.toString()}`
    : prefundingEndpoints.INVOICES;

  const response = await apiConnector({
    method: "GET",
    url,
    credentials: true,
  });
  return response.data;
}

export async function getPrefundingInvoice(id: string) {
  const response = await apiConnector({
    method: "GET",
    url: prefundingEndpoints.INVOICE(id),
    credentials: true,
  });
  return response.data;
}

export async function createPrefundingInvoice(data: any) {
  const response = await apiConnector({
    method: "POST",
    url: prefundingEndpoints.INVOICES,
    body: data,
    credentials: true,
  });
  return response.data;
}

export async function updatePrefundingInvoice(id: string, data: any) {
  const response = await apiConnector({
    method: "PUT",
    url: prefundingEndpoints.INVOICE(id),
    body: data,
    credentials: true,
  });
  return response.data;
}

export async function updatePrefundingInvoiceStatus(id: string, status: string) {
  const response = await apiConnector({
    method: "PUT",
    url: prefundingEndpoints.UPDATE_INVOICE_STATUS(id),
    body: { status },
    credentials: true,
  });
  return response.data;
}

export async function deletePrefundingInvoice(id: string) {
  const response = await apiConnector({
    method: "DELETE",
    url: prefundingEndpoints.INVOICE(id),
    credentials: true,
  });
  return response.data;
}

export async function previewPrefundingInvoicePdf(payload: any) {
  const response = await apiConnector({
    method: 'POST',
    url: prefundingEndpoints.PREVIEW_INVOICE_PDF,
    body: payload,
    credentials: true,
    responseType: 'blob',
  });
  return response.data;
}

export function openPrefundingInvoicePdf(id: string) {
  const target = prefundingEndpoints.INVOICE_PDF(id);
  window.open(target, "_blank", "noopener,noreferrer");
}
export async function resendPrefundingInvoice(id: string) {
  const response = await apiConnector({
    method: "POST",
    url: prefundingEndpoints.RESEND_INVOICE(id),
    credentials: true,
  });
  return response.data;
}

export async function validatePracticeForPrefunding(practiceId: string) {
  const response = await apiConnector({
    method: "GET",
    url: prefundingEndpoints.VALIDATE_PRACTICE(practiceId),
    credentials: true,
  });
  return response.data;
}

export async function getPrefundingDashboard(params?: {
  practiceId?: string;
  cycle?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const searchParams = new URLSearchParams();
  if (params?.practiceId) searchParams.append("practiceId", params.practiceId);
  if (params?.cycle) searchParams.append("cycle", params.cycle);
  if (params?.status) searchParams.append("status", params.status);
  if (params?.dateFrom) searchParams.append("dateFrom", params.dateFrom);
  if (params?.dateTo) searchParams.append("dateTo", params.dateTo);

  const qs = searchParams.toString();
  const url = qs ? `${prefundingEndpoints.DASHBOARD}?${qs}` : prefundingEndpoints.DASHBOARD;

  const response = await apiConnector({
    method: "GET",
    url,
    credentials: true,
  });
  return response.data;
}
