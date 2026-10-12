import type { HubLinkedDocument } from "../document-hub/types";

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
  signedDocUrl?: string;
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
  status?: string;
  individualNpi?: string | null;
  individualPtan?: string | null;
  individualRailroadMedicarePtan?: string | null;
  caqhId?: string | null;
  caqhLoginId?: string | null;
  caqhPassword?: string | null;
  groupPecosAccess?: string | null;
  individualMedicaidNumber?: string | null;
  stateLicense?: string | null;
  dea?: string | null;
  ein?: string | null;
  specialty?: string | null;
  secondarySpecialty?: string | null;
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
  status?: string;
  individualNpi?: string | null;
  individualPtan?: string | null;
  individualRailroadMedicarePtan?: string | null;
  caqhId?: string | null;
  caqhLoginId?: string | null;
  caqhPassword?: string | null;
  groupPecosAccess?: string | null;
  individualMedicaidNumber?: string | null;
  stateLicense?: string | null;
  dea?: string | null;
  ein?: string | null;
  specialty?: string | null;
  secondarySpecialty?: string | null;
  createdAt: string;
  updatedAt: string;
  practices?: PersonPractice[];
  companies?: PersonCompany[];
  docusealSubmissions?: DocusealSubmission[];
  hubDocuments?: HubLinkedDocument[];
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
