import axios from "axios";
import { apiConnector } from "../apiConnector";
import { vendorEndpoints } from "../apis";

const { LIST } = vendorEndpoints;

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

export type Vendor = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
};

export async function getAllVendors(): Promise<Vendor[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: LIST,
      credentials: true,
    });
    const { vendors } = response.data as { vendors: Vendor[] };
    return vendors;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch vendors."));
  }
}
