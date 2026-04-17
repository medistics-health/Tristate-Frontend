export type PracticeStatus = "LEAD" | "ACTIVE" | "INACTIVE" | "CLOSED";

export type PracticeSource = "DIRECT" | "REFERRAL" | "CHANNEL_PARTNER" | "OUTBOUND" | "INBOUND";

export type PracticeBody = {
  name: string;
  npi?: string;
  status: PracticeStatus;
  region: string;
  source: PracticeSource;
  bucket: string[];
  companyId?: string;
  taxIdId?: string;
  groupNpiNumber?: string;
};

export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  role: string;
};

export type Agreement = {
  id: string;
  type: string;
  status: string;
};

export type Practice = {
  id: string;
  name: string;
  npi?: string;
  status: PracticeStatus;
  region: string;
  source: PracticeSource;
  bucket: string[];
  companyId?: string;
  taxIdId?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string };
  taxId?: { id: string; taxIdNumber: string; legalEntityName: string };
  practiceGroup?: { id: string; name: string };
  persons?: Person[];
  agreements?: Agreement[];
  groupNpis?: { id: string; groupNpiNumber: string; groupName: string }[];
  _count?: { persons: number; deals: number; agreements: number };
};

export type PracticeFieldType = "text" | "select" | "array";

export type PracticeField = {
  id: string;
  label: string;
  type: PracticeFieldType;
  visible: boolean;
};

export type PracticeUserValue = {
  name: string;
  initials: string;
};

export type PracticeCellValue = string | number | PracticeUserValue | null;

export type PracticeRow = {
  id: string;
  values: Record<string, PracticeCellValue | Record<string, string | undefined>>;
};

export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PracticeViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  fields: PracticeField[];
  rows: PracticeRow[];
  pagination: PaginationInfo;
};
