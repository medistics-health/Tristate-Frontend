export const payerTypeOptions = [
  "Commercial",
  "Government",
  "Medicare",
  "Medicaid",
  "Managed Care",
  "IPA",
] as const;

export type PayerType = (typeof payerTypeOptions)[number];

export const reCredentialingCycleOptions = [
  "Annually",
  "Every 2 Years",
  "Every 3 Years",
  "Custom",
] as const;

export type ReCredentialingCycle = (typeof reCredentialingCycleOptions)[number];

export type FhirAddress = {
  city: string;
  line: string[];
  state: string;
  country: string;
  postalCode: string;
};

export type FhirTelecom = {
  use: "work" | "home" | "mobile" | "old" | "temp";
  value: string;
  system: "phone" | "email" | "fax" | "pager" | "url" | "sms" | "other";
};

export type FhirOrganizationType = {
  coding: {
    code: string;
    system: string;
    display: string;
  }[];
};

export type FhirOrganizationExtension = {
  url: string;
  valueString: string;
};

export type FhirMeta = {
  lastUpdated: string;
  versionId: string;
  extension?: {
    url: string;
    valueInstant: string;
  }[];
};

export type InsuranceCarrier = {
  active: boolean;
  address: FhirAddress[];
  extension: FhirOrganizationExtension[];
  id: string;
  meta: FhirMeta;
  name: string;
  resourceType: "Organization";
  telecom: FhirTelecom[];
  type: FhirOrganizationType[];
};

export type CptCoding = {
  code: string;
  system: string;
};

export type HcpcsCoding = {
  code: string;
  system: string;
};

export type BillableUnitsCpt = {
  url: "urn:insuranceplan-extension:billable-units";
  extension: [
    {
      url: "cpt";
      valueCoding: CptCoding;
    },
    {
      url: "unitsAllowed";
      valueInteger: number;
    },
  ];
};

export type BillableUnitsHcpcs = {
  url: "urn:insuranceplan-extension:billable-units-hcpcs";
  extension: [
    {
      url: "hcpcs";
      valueCoding: HcpcsCoding;
    },
    {
      url: "unitsAllowed";
      valueInteger: number;
    },
  ];
};

export type InsurancePlanExtension =
  | {
      url: "urn:insurancePlan-extension:insurance-plan-organization-reference";
      valueReference: {
        reference: string;
      };
    }
  | BillableUnitsCpt
  | BillableUnitsHcpcs;

export type InsurancePlanResource = {
  extension: InsurancePlanExtension[];
  id: string;
  meta: FhirMeta;
  name: string;
  resourceType: "InsurancePlan";
  status: "Active" | "Inactive" | "Entered-in-error";
};

export type InsurancePlan = {
  id: string;
  planName: string;
  planId?: string;
  createdAt: string;
  updatedAt: string;
};

export type InsuranceRecord = {
  id: string;
  payerName: string;
  payerType: PayerType;
  contact: string;
  turnaroundTime: string;
  reCredentialingCycle: ReCredentialingCycle;
  createdAt: string;
  updatedAt: string;
  plans: InsurancePlan[];
};

export type InsuranceFormState = {
  payerName: string;
  payerType: PayerType;
  contact: string;
  turnaroundTime: string;
  reCredentialingCycle: ReCredentialingCycle;
};
