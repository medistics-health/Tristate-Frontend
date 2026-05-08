import axios from "axios";
import { apiConnector } from "../apiConnector";
import { portalEndpoints } from "../apis";

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

export type PortalSnapshot = {
  practiceName: string;
  practiceId: string;
  totalBilled: number;
  activeProviders: number;
  recentInvoices: any[];
  unpaidInvoices: number;
  pendingAgreements: number;
};

export async function getClientPortalSnapshot(): Promise<PortalSnapshot> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: portalEndpoints.GET_SNAPSHOT,
      credentials: true,
    });
    return (response.data as { snapshot: PortalSnapshot }).snapshot;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch portal snapshot."));
  }
}
