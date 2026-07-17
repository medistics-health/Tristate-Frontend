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
