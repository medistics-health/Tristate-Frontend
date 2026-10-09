import { apiConnector } from "../apiConnector";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "";
const BASE_URL = BACKEND_URL + "/api/v1/prefunding/rates";

export async function getPrefundingRates(params?: {
  page?: number;
  limit?: number;
  search?: string;
  pricingModel?: string;
  practiceId?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const queryString = new URLSearchParams();
  if (params?.page) queryString.set("page", String(params.page));
  if (params?.limit) queryString.set("limit", String(params.limit));
  if (params?.search) queryString.set("search", params.search);
  if (params?.pricingModel) queryString.set("pricingModel", params.pricingModel);
  if (params?.practiceId) queryString.set("practiceId", params.practiceId);
  if (params?.sortBy) queryString.set("sortBy", params.sortBy);
  if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

  const url = queryString.toString() ? `${BASE_URL}?${queryString.toString()}` : BASE_URL;

  const response = await apiConnector({
    method: "GET",
    url,
    credentials: true,
  });
  return response.data;
}

export async function createPrefundingRate(data: any) {
  const response = await apiConnector({
    method: "POST",
    url: BASE_URL,
    body: data,
    credentials: true,
  });
  return response.data;
}

export async function updatePrefundingRate(id: string, data: any) {
  const response = await apiConnector({
    method: "PUT",
    url: `${BASE_URL}/${id}`,
    body: data,
    credentials: true,
  });
  return response.data;
}

export async function deletePrefundingRate(id: string) {
  const response = await apiConnector({
    method: "DELETE",
    url: `${BASE_URL}/${id}`,
    credentials: true,
  });
  return response.data;
}
