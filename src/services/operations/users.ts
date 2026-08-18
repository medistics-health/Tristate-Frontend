import { apiConnector } from "../apiConnector";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, "") ?? "";

export const userEndpoints = {
  LIST: BACKEND_URL + "/api/v1/users",
  CREATE: BACKEND_URL + "/api/v1/users",
  UPDATE: (id: string) => BACKEND_URL + `/api/v1/users/${id}`,
  DELETE: (id: string) => BACKEND_URL + `/api/v1/users/${id}`,
};

export const settingsEndpoints = {
  GET: BACKEND_URL + "/api/v1/settings",
  UPDATE: BACKEND_URL + "/api/v1/settings",
};

export type SystemSettings = {
  organizationName?: string;
  domain?: string;
  address?: string;
  supportEmail?: string | null;
  authorizedSigner?: string | null;
  notifyTo?: string[];
  creditCardCompanyRatePercent?: number;
  creditCardCompanyFixedFee?: number;
  creditCardClientRatePercent?: number;
  creditCardClientFixedFee?: number;
  achCompanyRatePercent?: number;
  achCompanyCapAmount?: number;
  achClientRatePercent?: number;
  achClientCapAmount?: number;
  invoiceDueDays?: number;
  invoiceReminderDays?: number;
  credentialingReminderDays?: number;
};

export type GetUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  twoFactorEnabled?: boolean | string;
};

export async function getAllUsers(params?: GetUsersParams) {
  try {
    const response = await apiConnector({
      method: "GET",
      url: userEndpoints.LIST,
      params,
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function createUserApi(data: any) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: userEndpoints.CREATE,
      body: data,
      credentials: true,
    });
    return response.data.user;
  } catch (error) {
    throw error;
  }
}

export async function updateUserApi(id: string, data: any) {
  try {
    const response = await apiConnector({
      method: "PUT",
      url: userEndpoints.UPDATE(id),
      body: data,
      credentials: true,
    });
    return response.data.user;
  } catch (error) {
    throw error;
  }
}

export async function deleteUserApi(id: string) {
  try {
    const response = await apiConnector({
      method: "DELETE",
      url: userEndpoints.DELETE(id),
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function getSystemSettingsApi() {
  try {
    const response = await apiConnector({
      method: "GET",
      url: settingsEndpoints.GET,
      credentials: true,
    });
    return response.data.settings as SystemSettings;
  } catch (error) {
    throw error;
  }
}

export async function updateSystemSettingsApi(data: any) {
  try {
    const response = await apiConnector({
      method: "PUT",
      url: settingsEndpoints.UPDATE,
      body: data,
      credentials: true,
    });
    return response.data.settings;
  } catch (error) {
    throw error;
  }
}
