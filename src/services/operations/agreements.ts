import axios from "axios";
import { apiConnector } from "../apiConnector";
import { agreementEndpoints } from "../apis";

const { LIST, CREATE, GET, UPDATE, DELETE } = agreementEndpoints;

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

export type AgreementOption = {
  id: string;
  practiceId: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  practice?: { id: string; name: string };
};

function agreementToRow(agreement: Agreement): AgreementsRow {
  return {
    id: agreement.id,
    values: {
      id: agreement.id,
      name: `${agreement.practice?.name || "Practice"} - ${agreement.type}`,
      type: agreement.type,
      status: agreement.status,
      practiceName: agreement.practice?.name || "",
      practiceId: agreement.practiceId || "",
      dealName: agreement.deal?.name || "",
      dealId: agreement.dealId || "",
      effectiveDate: agreement.effectiveDate
        ? new Date(agreement.effectiveDate).toLocaleDateString()
        : "",
      renewalDate: agreement.renewalDate
        ? new Date(agreement.renewalDate).toLocaleDateString()
        : "",
      terminationDate: agreement.terminationDate
        ? new Date(agreement.terminationDate).toLocaleDateString()
        : "",
      value: agreement.value?.toString() || "",
      creationDate: new Date(agreement.createdAt).toLocaleString(),
      lastUpdate: new Date(agreement.updatedAt).toLocaleString(),
    },
  };
}

export type Agreement = {
  id: string;
  practiceId: string;
  dealId?: string | null;
  type: string;
  status: string;
  value?: number;
  effectiveDate?: string | null;
  renewalDate?: string | null;
  terminationDate?: string | null;
  createdAt: string;
  updatedAt: string;
  practice?: { id: string; name: string };
  deal?: { id: string; name: string };
};

type AgreementsRow = {
  id: string;
  values: Record<string, string | number | null>;
};

const fields = [
  { id: "name", label: "Name", type: "text" as const, visible: true },
  { id: "type", label: "Type", type: "text" as const, visible: true },
  { id: "status", label: "Status", type: "text" as const, visible: true },
  { id: "practiceName", label: "Practice", type: "text" as const, visible: true },
  { id: "dealName", label: "Deal", type: "text" as const, visible: false },
  { id: "value", label: "Value", type: "text" as const, visible: false },
  { id: "effectiveDate", label: "Effective Date", type: "date" as const, visible: false },
  { id: "renewalDate", label: "Renewal Date", type: "date" as const, visible: false },
  { id: "terminationDate", label: "Termination Date", type: "date" as const, visible: false },
  { id: "creationDate", label: "Created", type: "date" as const, visible: true },
  { id: "lastUpdate", label: "Last Update", type: "date" as const, visible: true },
];

export type AgreementQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  practiceId?: string;
  dealId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type AgreementsViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  fields: { id: string; label: string; type: string; visible: boolean }[];
  rows: AgreementsRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function getAgreementsView(params?: AgreementQueryParams): Promise<AgreementsViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.status) queryString.set("status", params.status);
    if (params?.type) queryString.set("type", params.type);
    if (params?.practiceId) queryString.set("practiceId", params.practiceId);
    if (params?.dealId) queryString.set("dealId", params.dealId);
    if (params?.sortBy) queryString.set("sortBy", params.sortBy);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString() ? `${LIST}?${queryString.toString()}` : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });

    const { agreements, pagination } = response.data as {
      agreements: Agreement[];
      pagination: { totalRecords: number; totalPages: number; currentPage: number; limit: number };
    };

    return {
      viewId: "agreement-view-001",
      title: "All Agreements",
      totalCount: pagination.totalRecords,
      fields,
      rows: agreements.map(agreementToRow),
      pagination: {
        page: pagination.currentPage,
        limit: pagination.limit,
        total: pagination.totalRecords,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch agreements."));
  }
}

export async function getAllAgreements(): Promise<AgreementOption[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: LIST,
      credentials: true,
    });
    const { agreements } = response.data as { agreements: Agreement[] };
    return agreements.map((a) => ({
      id: a.id,
      practiceId: a.practiceId,
      type: a.type,
      status: a.status,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      practice: a.practice,
    }));
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch agreements."));
  }
}

export async function getAgreement(id: string): Promise<Agreement> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { agreement: Agreement }).agreement;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch agreement."));
  }
}

export type AgreementBody = {
  practiceId: string;
  dealId?: string | null;
  type: string;
  status: string;
  value?: number;
  effectiveDate?: string;
  renewalDate?: string;
  terminationDate?: string;
};

export async function createAgreementApi(data: AgreementBody): Promise<AgreementsRow> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    const agreement = (response.data as { agreement: Agreement }).agreement;
    return agreementToRow(agreement);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create agreement."));
  }
}

export async function updateAgreementApi(
  id: string,
  data: Partial<AgreementBody>,
): Promise<AgreementsRow> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    const agreement = (response.data as { agreement: Agreement }).agreement;
    return agreementToRow(agreement);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update agreement."));
  }
}

export async function deleteAgreementApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete agreement."));
  }
}