import axios from "axios";
import { insuranceEndpoints } from "../apis";
import { apiConnector } from "../apiConnector";
import type {
  InsuranceCarrierFormState,
  InsuranceCarrierOption,
  InsuranceCarrierRecord,
  InsurancePlanCreateFormState,
  InsurancePlanRecord,
} from "../../components/credentialing/insurance/types";

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

type InsuranceCarrierListResponse = {
  carriers: InsuranceCarrierRecord[];
};

type InsuranceCarrierResponse = {
  carrier: InsuranceCarrierRecord;
};

type InsuranceCarrierOptionsResponse = {
  carriers: InsuranceCarrierOption[];
};

type InsurancePlansResponse = {
  plans: InsurancePlanRecord[];
};

type InsurancePlanOption = {
  id: string;
  planName: string;
  planCode: string;
  planType: string;
  status: string;
};

type InsurancePlanResponse = {
  plan: InsurancePlanRecord;
};

export type ClaimPayerRecord = {
  payerid: string;
  payer_name: string;
  services?: string;
  payer_type?: string;
  payer_alt_names?: string;
  payer_state?: string;
  prime?: string | null;
  [key: string]: unknown;
};

export type ClaimPayerListResponse = {
  rows: ClaimPayerRecord[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
};

export type ClaimPayerQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  services?: string[];
  type?: string;
};

export type ClaimPayerOption = {
  label: string;
  value: string;
  subLabel?: string;
};

export function formatPayerDisplayLabel(
  payerName?: string | null,
  payerid?: string | null,
) {
  const name = payerName?.trim() || "";
  const id = payerid?.trim() || "";
  if (name && id) return `${name} (${id})`;
  return name || id || "";
}

export async function getClaimPayersListApi(
  params?: ClaimPayerQuery,
): Promise<ClaimPayerListResponse> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: insuranceEndpoints.PAYERS_LIST,
      credentials: true,
      body: {
        page: params?.page ?? 0,
        pageSize: params?.pageSize ?? 20,
        search: params?.search ?? "",
        services: params?.services ?? [],
        type: params?.type ?? "",
      },
    });
    return response.data as ClaimPayerListResponse;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch payer list."));
  }
}

export async function getClaimPayerOptionsApi(
  search = "",
): Promise<ClaimPayerOption[]> {
  const response = await getClaimPayersListApi({
    page: 0,
    pageSize: 20,
    search,
  });

  return response.rows.map((row) => ({
    label: row.payer_name,
    value: row.payerid,
    subLabel: [
      `ID: ${row.payerid}`,
      row.payer_type ? `Type: ${row.payer_type}` : "",
      row.services ? `Services: ${row.services}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
  }));
}

export async function getInsuranceCarriersApi(params?: {
  search?: string;
  status?: string;
  carrierType?: string;
}) {
  try {
    const response = await apiConnector({
      method: "GET",
      url: insuranceEndpoints.CARRIERS,
      credentials: true,
      params,
    });
    return (response.data as InsuranceCarrierListResponse).carriers;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch insurance carriers."),
    );
  }
}

export async function getInsuranceCarrierOptionsApi() {
  try {
    const response = await apiConnector({
      method: "GET",
      url: insuranceEndpoints.CARRIER_OPTIONS,
      credentials: true,
    });
    return (response.data as InsuranceCarrierOptionsResponse).carriers;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch insurance carrier options."),
    );
  }
}

export async function getInsurancePlanOptionsApi() {
  try {
    const response = await apiConnector({
      method: "GET",
      url: insuranceEndpoints.PLAN_OPTIONS,
      credentials: true,
    });
    return (response.data as { plans: InsurancePlanOption[] }).plans;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch insurance plan options."),
    );
  }
}

export async function createInsuranceCarrierApi(
  data: InsuranceCarrierFormState,
) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: insuranceEndpoints.CREATE_CARRIER,
      body: data,
      credentials: true,
    });
    return (response.data as InsuranceCarrierResponse).carrier;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to create insurance carrier."),
    );
  }
}

export async function updateInsuranceCarrierApi(
  id: string,
  data: InsuranceCarrierFormState,
) {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: insuranceEndpoints.UPDATE_CARRIER(id),
      body: data,
      credentials: true,
    });
    return (response.data as InsuranceCarrierResponse).carrier;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to update insurance carrier."),
    );
  }
}

export async function deleteInsuranceCarrierApi(id: string) {
  try {
    await apiConnector({
      method: "DELETE",
      url: insuranceEndpoints.DELETE_CARRIER(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to delete insurance carrier."),
    );
  }
}

export async function createInsurancePlansApi(
  data: InsurancePlanCreateFormState,
) {
  try {
    const response = await apiConnector({
      method: "POST",
      url: insuranceEndpoints.CREATE_PLANS,
      body: data,
      credentials: true,
    });
    return (response.data as InsurancePlansResponse).plans;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to create insurance plans."),
    );
  }
}

export async function updateInsurancePlanApi(
  id: string,
  data: InsurancePlanCreateFormState["plans"][number] & { carrierId: string },
) {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: insuranceEndpoints.UPDATE_PLAN(id),
      body: data,
      credentials: true,
    });
    return (response.data as InsurancePlanResponse).plan;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to update insurance plan."),
    );
  }
}

export async function deleteInsurancePlanApi(id: string) {
  try {
    await apiConnector({
      method: "DELETE",
      url: insuranceEndpoints.DELETE_PLAN(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to delete insurance plan."),
    );
  }
}


