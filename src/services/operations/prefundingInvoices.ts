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

export async function openPrefundingInvoicePdf(id: string) {
  const response = await apiConnector({
    method: "GET",
    url: prefundingEndpoints.INVOICE_PDF(id),
    credentials: true,
    responseType: "blob",
  });
  const file = new Blob([response.data], { type: "application/pdf" });
  const fileURL = URL.createObjectURL(file);
  window.open(fileURL, "_blank");
  return fileURL;
}
