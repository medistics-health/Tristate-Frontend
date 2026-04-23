export type PersonRole =
  | "OWNER"
  | "ADMIN"
  | "FINANCE"
  | "OPERATIONS"
  | "CLINICAL"
  | "PROCUREMENT"
  | "OTHER";

export type InfluenceLevel = "LOW" | "MEDIUM" | "HIGH" | "DECISION_MAKER";

export type DocusealSubmission = {
  id: string;
  agreementId: string;
  externalId: number;
  status: string;
  url?: string;
  signedDocUrls?: string;
  auditLogUrl?: string;
  embedUrl?: string;
  slug?: string;
  templateId: number;
  createdAt: string;
  updatedAt: string;
};

export type PersonBody = {
  practiceIds: string[];
  companyIds: string[];
  firstName: string;
  lastName: string;
  role: PersonRole;
  influence: InfluenceLevel;
  email?: string;
  phone?: string;
  designation?: string;
};

export type PersonPractice = { id: string; name: string };
export type PersonCompany = { id: string; name: string };

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  role: PersonRole;
  influence: InfluenceLevel;
  email?: string;
  phone?: string;
  designation?: string;
  createdAt: string;
  updatedAt: string;
  practices?: PersonPractice[];
  companies?: PersonCompany[];
  docusealSubmissions?: DocusealSubmission[];
};

export type PersonFieldType = "text" | "select";

export type PersonField = {
  id: string;
  label: string;
  type: PersonFieldType;
  visible: boolean;
};

export type PersonUserValue = {
  name: string;
  initials: string;
};

export type PersonCellValue = string | number | PersonUserValue | null;

export type PersonRow = {
  id: string;
  values: Record<string, PersonCellValue>;
};

export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PersonViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  fields: PersonField[];
  rows: PersonRow[];
  pagination: PaginationInfo;
};
