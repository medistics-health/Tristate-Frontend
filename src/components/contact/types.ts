export type PersonRole = "OWNER" | "ADMIN" | "FINANCE" | "OPERATIONS" | "CLINICAL" | "PROCUREMENT" | "OTHER";

export type InfluenceLevel = "LOW" | "MEDIUM" | "HIGH" | "DECISION_MAKER";

export type PersonBody = {
  practiceId: string;
  firstName: string;
  lastName: string;
  role: PersonRole;
  influence: InfluenceLevel;
  email?: string;
  phone?: string;
};

export type Person = {
  id: string;
  practiceId: string;
  firstName: string;
  lastName: string;
  role: PersonRole;
  influence: InfluenceLevel;
  email?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  practice?: { id: string; name: string };
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

export type PersonViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  fields: PersonField[];
  rows: PersonRow[];
};
