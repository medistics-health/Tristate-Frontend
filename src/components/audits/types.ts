export type AuditType = "COMPLIANCE" | "SECURITY" | "QUALITY" | "FINANCIAL" | "OPERATIONAL";

export type AuditBody = {
  practiceId: string;
  dealId?: string | null;
  type: AuditType;
  score?: number;
  findings?: Record<string, unknown>;
  recommendations?: Record<string, unknown>;
};

export type Audit = {
  id: string;
  practiceId: string;
  dealId?: string | null;
  type: AuditType;
  score?: number;
  findings: Record<string, unknown>;
  recommendations: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  practice?: { id: string; name: string };
  deal?: { id: string; name: string };
};

export type AuditFieldType = "text" | "number" | "json" | "select";

export type AuditField = {
  id: string;
  label: string;
  type: AuditFieldType;
  visible: boolean;
};

export type AuditCellValue = string | number | Record<string, unknown> | null;

export type AuditRow = {
  id: string;
  values: Record<string, AuditCellValue>;
};

export type AuditViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  fields: AuditField[];
  rows: AuditRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};