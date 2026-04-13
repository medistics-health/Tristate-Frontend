export type AddressBody = {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
};

export type CompanyStatus = "LEAD" | "PROSPECT" | "ACTIVE" | "INACTIVE";

export type CompanyBody = {
  name: string;
  domain?: string;
  industry?: string;
  size?: number;
  revenue?: number;
  phone?: string;
  email?: string;
  website?: string;
  address?: AddressBody;
  status?: CompanyStatus;
};

export type Company = {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: number;
  revenue?: number;
  phone?: string;
  email?: string;
  website?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  status: CompanyStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  practices?: Array<{ id: string; name: string }>;
  _count?: { practices: number };
};

export type CompanyFieldType = "text" | "number" | "user" | "relation";

export type CompanyField = {
  id: string;
  label: string;
  type: CompanyFieldType;
  visible: boolean;
};

export type CompanyUserValue = {
  name: string;
  initials: string;
};

export type CompanyCellValue = string | number | CompanyUserValue | null;

export type CompanyRow = {
  id: string;
  values: Record<string, CompanyCellValue | Record<string, string | undefined>>;
};

export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CompanyViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  fields: CompanyField[];
  rows: CompanyRow[];
  pagination: PaginationInfo;
};
