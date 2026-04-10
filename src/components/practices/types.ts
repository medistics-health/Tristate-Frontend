export type PracticeStatus = "LEAD" | "ACTIVE" | "INACTIVE" | "CLOSED";

export type PracticeSource = "DIRECT" | "REFERRAL" | "CHANNEL_PARTNER" | "OUTBOUND" | "INBOUND";

export type PracticeBody = {
  name: string;
  status: PracticeStatus;
  region: string;
  source: PracticeSource;
  bucket: string[];
  companyId?: string;
};

export type Practice = {
  id: string;
  name: string;
  status: PracticeStatus;
  region: string;
  source: PracticeSource;
  bucket: string[];
  companyId?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  company?: { id: string; name: string };
  _count?: { persons: number; deals: number };
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

export type PracticeViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  fields: PracticeField[];
  rows: PracticeRow[];
};
