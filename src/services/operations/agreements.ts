import axios from "axios";
import { apiConnector } from "../apiConnector";
import { agreementEndpoints } from "../apis";

const {
  LIST,
  CREATE,
  GET,
  UPDATE,
  DELETE,
  GET_DOCUSEAL_TEMPLATES,
  GET_DOCUSEAL_FORM,
  SEND_AGREEMENT_EMAIL,
  CREATE_DOCUSEAL_SUBMISSION,
} = agreementEndpoints;

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
  const submissions = agreement.docusealSubmissions || [];
  const completedSubmissions = submissions.filter(
    (s) => s.status === "completed",
  ).length;
  const totalSubmissions = submissions.length;
  const signingStatus =
    totalSubmissions > 0
      ? `${completedSubmissions}/${totalSubmissions} signed`
      : "";

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
      docusealId: agreement.docusealId?.toString() || "",
      docusealUrl: agreement.docusealUrl || "",
      signingStatus: signingStatus,
    },
  };
}

export type DocusealSubmission = {
  id: string;
  agreementId: string;
  personId?: string | null;
  externalId: number;
  status: string;
  url?: string | null;
  embedUrl?: string | null;
  slug?: string | null;
  submitterUuid?: string | null;
  templateId: number;
  createdAt: string;
  updatedAt: string;
};

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
  docusealId?: number | null;
  docusealUrl?: string | null;
  docusealStatus?: string | null;
  createdAt: string;
  updatedAt: string;
  practice?: { id: string; name: string };
  deal?: { id: string; name: string };
  docusealSubmissions?: DocusealSubmission[];
};

export function getAgreementDocusealId(agreement: Agreement): number[] | null {
  if (agreement.docusealId) return [agreement.docusealId];
  if (agreement.docusealSubmissions?.length) {
    return agreement.docusealSubmissions.map((init: any) => init.templateId);
  }
  return null;
}

type AgreementsRow = {
  id: string;
  values: Record<string, string | number | null>;
};

const fields = [
  { id: "name", label: "Name", type: "text" as const, visible: true },
  { id: "type", label: "Type", type: "text" as const, visible: true },
  { id: "status", label: "Status", type: "text" as const, visible: true },
  {
    id: "practiceName",
    label: "Practice",
    type: "text" as const,
    visible: true,
  },
  { id: "dealName", label: "Deal", type: "text" as const, visible: false },
  { id: "value", label: "Value", type: "text" as const, visible: false },
  {
    id: "effectiveDate",
    label: "Effective Date",
    type: "date" as const,
    visible: false,
  },
  {
    id: "renewalDate",
    label: "Renewal Date",
    type: "date" as const,
    visible: false,
  },
  {
    id: "terminationDate",
    label: "Termination Date",
    type: "date" as const,
    visible: false,
  },
  {
    id: "creationDate",
    label: "Created",
    type: "date" as const,
    visible: true,
  },
  {
    id: "lastUpdate",
    label: "Last Update",
    type: "date" as const,
    visible: true,
  },
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

export async function getAgreementsView(
  params?: AgreementQueryParams,
): Promise<AgreementsViewData> {
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

    const url = queryString.toString()
      ? `${LIST}?${queryString.toString()}`
      : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });

    const { agreements, pagination } = response.data as {
      agreements: Agreement[];
      pagination: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        limit: number;
      };
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
  docusealSubmissions?: Array<{
    externalId: number;
    status: string;
    url?: string;
    templateId?: number;
  }>;
};

export async function createAgreementApi(
  data: AgreementBody,
): Promise<AgreementsRow> {
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

export type DocusealTemplate = {
  id: number;
  archived_at: string | null;
  fields: Array<{
    uuid: string;
    required: boolean;
    preferences: Record<string, unknown>;
    areas: Array<{
      page: number;
      x: number;
      y: number;
      w: number;
      h: number;
      attachment_uuid: string;
      cell_w?: number;
    }>;
    name: string;
    type: string;
    submitter_uuid: string;
    default_value?: boolean;
  }>;
  name: string;
  preferences: Record<string, unknown>;
  schema: Array<{
    attachment_uuid: string;
    name: string;
    pending_fields: boolean;
  }>;
  slug: string;
  source: string;
  submitters: Array<{
    name: string;
    uuid: string;
  }>;
  created_at: string;
  updated_at: string;
  author_id: number;
  external_id: string | null;
  folder_id: number;
  shared_link: boolean;
  application_key: string | null;
  folder_name: string;
  author: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  documents: Array<{
    id: number;
    uuid: string;
    url: string;
    preview_image_url: string;
    filename: string;
  }>;
};

export type DocusealTemplatesResponse = {
  message: string;
  templates: {
    data: DocusealTemplate[];
    pagination: {
      count: number;
      next: number | null;
      prev: number | null;
    };
  };
};

export async function getDocusealTemplates(): Promise<DocusealTemplatesResponse> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET_DOCUSEAL_TEMPLATES,
      credentials: true,
    });
    return response.data as DocusealTemplatesResponse;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch Docuseal templates."),
    );
  }
}

export async function getDocusealFormBySlug(slug: string): Promise<any> {
  try {
    const response = await axios.get(GET_DOCUSEAL_FORM(slug));
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch DocuSeal form."));
  }
}

export async function createDocusealSubmissionApi(data: {
  agreementId: string;
  personId: string;
  templateId: any[];
}): Promise<any> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE_DOCUSEAL_SUBMISSION,
      body: data,
      credentials: true,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to create DocuSeal submission."),
    );
  }
}

export async function sendAgreementEmailApi(
  data: SendAgreementEmailBody,
): Promise<void> {
  try {
    await apiConnector({
      method: "POST",
      url: SEND_AGREEMENT_EMAIL,
      body: data,
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to send agreement email."));
  }
}

export type SendAgreementEmailBody = {
  agreementId: string;
  personId: string;
  subject?: string;
  message?: string;
};

export async function sendAgreementEmail(
  data: SendAgreementEmailBody,
): Promise<void> {
  try {
    await apiConnector({
      method: "POST",
      url: SEND_AGREEMENT_EMAIL,
      body: data,
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to send agreement email."));
  }
}

export type CreateDocusealSubmissionBody = {
  agreementId: string;
  personId: string;
  templateId: number;
};

export type DocusealSubmissionResponse = {
  message: string;
  submission: {
    id: number;
    status: string;
    submitters?: Array<{
      url: string;
    }>;
  };
};

export async function createDocusealSubmission(
  data: CreateDocusealSubmissionBody,
): Promise<DocusealSubmissionResponse> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE_DOCUSEAL_SUBMISSION,
      body: data,
      credentials: true,
    });
    return response.data as DocusealSubmissionResponse;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to create Docuseal submission."),
    );
  }
}

export async function getAgreementsByPractice(
  practiceId: string,
): Promise<Agreement[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: LIST,
      params: { practiceId },
      credentials: true,
    });
    const { agreements } = response.data as { agreements: Agreement[] };
    return agreements;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch agreements for practice."),
    );
  }
}
