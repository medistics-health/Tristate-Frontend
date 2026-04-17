import axios from "axios";
import { apiConnector } from "../apiConnector";
import { practiceGroupEndpoints, groupNpiEndpoints } from "../apis";

export type PracticeGroupOption = {
  id: string;
  name: string;
  companyId?: string;
};

export type GroupNpiOption = {
  id: string;
  groupNpiNumber: string;
  groupName: string;
  taxIdId?: string;
  practiceGroupId?: string;
};

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

export async function getPracticeGroups(companyId?: string): Promise<PracticeGroupOption[]> {
  try {
    const queryString = companyId ? `?companyId=${companyId}` : "";
    const response = await apiConnector({
      method: "GET",
      url: practiceGroupEndpoints.LIST + queryString,
      credentials: true,
    });
    const { practiceGroups } = response.data as { practiceGroups: PracticeGroupOption[] };
    return practiceGroups;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch practice groups."));
  }
}

export async function getGroupNpis(taxIdId?: string, practiceGroupId?: string): Promise<GroupNpiOption[]> {
  try {
    const params = new URLSearchParams();
    if (taxIdId) params.set("taxId", taxIdId);
    if (practiceGroupId) params.set("practiceGroupId", practiceGroupId);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    
    const response = await apiConnector({
      method: "GET",
      url: groupNpiEndpoints.LIST + queryString,
      credentials: true,
    });
    const { groupNpis } = response.data as { groupNpis: GroupNpiOption[] };
    return groupNpis;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch group NPIs."));
  }
}
