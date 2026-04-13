import axios from "axios";
import { apiConnector } from "../apiConnector";
import { companyEndpoints } from "../apis";
import type {
  Company,
  CompanyBody,
  CompanyRow,
  CompanyViewData,
} from "../../components/companies/types";

const { LIST, CREATE, GET, UPDATE, DELETE } = companyEndpoints;

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

function companyToRow(company: Company): CompanyRow {
  return {
    id: company.id,
    values: {
      id: company.id,
      name: company.name,
      domain: company.domain || "",
      industry: company.industry || "",
      size: company.size || 0,
      revenue: company.revenue || 0,
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      status: company.status,
      street: company.street || "",
      city: company.city || "",
      state: company.state || "",
      country: company.country || "",
      zip: company.zip || "",
      creationDate: new Date(company.createdAt).toLocaleString(),
      lastUpdate: new Date(company.updatedAt).toLocaleString(),
      updatedBy: { name: "User", initials: "U" },
      createdBy: { name: "User", initials: "U" },
      practicesCount: company._count?.practices || 0,
    },
  };
}

const fields = [
  { id: "name", label: "Name", type: "text" as const, visible: true },
  { id: "domain", label: "Domain", type: "text" as const, visible: true },
  { id: "industry", label: "Industry", type: "text" as const, visible: true },
  { id: "size", label: "Size", type: "number" as const, visible: true },
  { id: "revenue", label: "Revenue", type: "number" as const, visible: false },
  { id: "phone", label: "Phone", type: "text" as const, visible: false },
  { id: "email", label: "Email", type: "text" as const, visible: true },
  { id: "website", label: "Website", type: "text" as const, visible: false },
  { id: "status", label: "Status", type: "text" as const, visible: true },
  { id: "city", label: "City", type: "text" as const, visible: false },
  { id: "state", label: "State", type: "text" as const, visible: false },
  {
    id: "creationDate",
    label: "Creation date",
    type: "text" as const,
    visible: true,
  },
  {
    id: "lastUpdate",
    label: "Last update",
    type: "text" as const,
    visible: true,
  },
  {
    id: "updatedBy",
    label: "Updated by",
    type: "user" as const,
    visible: true,
  },
  {
    id: "createdBy",
    label: "Created by",
    type: "user" as const,
    visible: true,
  },
  {
    id: "practicesCount",
    label: "Practices",
    type: "number" as const,
    visible: false,
  },
];

export type CompanyQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  industry?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export async function getCompaniesView(params?: CompanyQueryParams): Promise<CompanyViewData> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.status) queryString.set("status", params.status);
    if (params?.industry) queryString.set("industry", params.industry);
    if (params?.sortBy) queryString.set("sortBy", params.sortBy);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString() ? `${LIST}?${queryString.toString()}` : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });
    const { companies, pagination } = response.data as {
      companies: Company[];
      pagination: { totalRecords: number; totalPages: number; currentPage: number; limit: number };
    };
    return {
      viewId: "company-view-001",
      title: "All Companies",
      totalCount: pagination.totalRecords,
      fields,
      rows: companies.map(companyToRow),
      pagination: {
        page: pagination.currentPage,
        limit: pagination.limit,
        total: pagination.totalRecords,
        totalPages: pagination.totalPages,
      },
    };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch companies."));
  }
}

export async function getAllCompanies(): Promise<Company[]> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: LIST,
      credentials: true,
    });
    const { companies } = response.data as { companies: Company[] };
    return companies;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch companies."));
  }
}

export async function getCompany(id: string): Promise<Company> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { company: Company }).company;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch company."));
  }
}

export async function createCompanyApi(data: CompanyBody): Promise<CompanyRow> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    const company = (response.data as { company: Company }).company;
    return companyToRow(company);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create company."));
  }
}

export async function updateCompanyApi(
  id: string,
  data: Partial<CompanyBody>,
): Promise<CompanyRow> {
  try {
    const response = await apiConnector({
      method: "PATCH",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    const company = (response.data as { company: Company }).company;
    return companyToRow(company);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update company."));
  }
}

export async function deleteCompanyApi(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete company."));
  }
}
