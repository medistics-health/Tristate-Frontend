export type AgreementsFieldType =
  | "text"
  | "date"
  | "user"
  | "number"
  | "relation";

export type AgreementsField = {
  id: string;
  label: string;
  type: AgreementsFieldType;
  visible: boolean;
};

export type AgreementsUserValue = {
  name: string;
  initials: string;
};

export type AgreementsCellValue =
  | string
  | number
  | AgreementsUserValue
  | null;

export type AgreementsRow = {
  id: string;
  values: Record<string, AgreementsCellValue>;
};

export type AgreementsViewData = {
  viewId: string;
  title: string;
  totalCount: number;
  fields: AgreementsField[];
  rows: AgreementsRow[];
};
