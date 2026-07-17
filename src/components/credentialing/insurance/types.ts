export const carrierTypeOptions = [
  "Commercial",
  "Government",
  "Medicare",
  "Medicaid",
  "TPA",
  "Managed Care",
  "Other",
] as const;

export const planTypeOptions = [
  "HMO",
  "PPO",
  "POS",
  "EPO",
  "Indemnity",
  "Other",
] as const;

export const insuranceStatusOptions = ["Active", "Inactive"] as const;

export const contactRoleOptions = [
  "Administrative",
  "Billing",
  "Claims",
  "Customer Service",
  "Provider Relations",
  "Technical Support",
  "General Contact",
  "Other",
] as const;

export const telecomSystemOptions = [
  "Phone",
  "Mobile",
  "Fax",
  "Email",
  "Website",
] as const;

export type CarrierType = (typeof carrierTypeOptions)[number];
export type PlanType = (typeof planTypeOptions)[number];
export type InsuranceStatus = (typeof insuranceStatusOptions)[number];
export type ContactRole = (typeof contactRoleOptions)[number];
export type TelecomSystem = (typeof telecomSystemOptions)[number];

export type AddressValue = {
  line: string[];
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type TelecomEntry = {
  system: TelecomSystem;
  value: string;
  use?: string;
};

export type CarrierContact = {
  role: ContactRole | "";
  name: string;
  telecom: TelecomEntry[];
  address: AddressValue;
};

export type InsurancePlanRecord = {
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
  carrierId: string;
  carrierName: string;
  carrierCode: string;
  planName: string;
  planCode: string;
  planType: PlanType;
  status: InsuranceStatus;
  address: AddressValue | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type InsuranceCarrierRecord = {
  id: string;
  carrierName: string;
  carrierCode: string;
  carrierType: CarrierType;
  status: InsuranceStatus;
  website: string;
  telecom: TelecomEntry[];
  address: AddressValue | null;
  notes: string;
  contacts: CarrierContact[];
  plans: InsurancePlanRecord[];
  createdAt: string;
  updatedAt: string;
};

export type InsuranceCarrierOption = {
  id: string;
  carrierName: string;
  carrierCode: string;
  status: InsuranceStatus;
};

export type InsuranceCarrierFormState = {
  carrierName: string;
  carrierCode: string;
  carrierType: CarrierType;
  status: InsuranceStatus;
  website: string;
  telecom: TelecomEntry[];
  address: AddressValue;
  notes: string;
  contacts: CarrierContact[];
  plans: InsurancePlanFormState[];
};

export type InsurancePlanFormState = {
  id?: string;
  planName: string;
  planCode: string;
  planType: PlanType;
  status: InsuranceStatus;
  address: AddressValue;
  notes: string;
};

export type InsurancePlanCreateFormState = {
  carrierId: string;
  plans: InsurancePlanFormState[];
};

export function createEmptyAddress(): AddressValue {
  return {
    line: [""],
    city: "",
    state: "",
    postalCode: "",
    country: "US",
  };
}

export function createEmptyTelecom(): TelecomEntry {
  return {
    system: "Phone",
    value: "",
    use: "",
  };
}

export function createEmptyContact(): CarrierContact {
  return {
    role: "",
    name: "",
    telecom: [],
    address: createEmptyAddress(),
  };
}

export function createEmptyPlan(): InsurancePlanFormState {
  return {
    planName: "",
    planCode: "",
    planType: "HMO",
    status: "Active",
    address: createEmptyAddress(),
    notes: "",
  };
}

export function createCarrierFormState(
  carrier?: InsuranceCarrierRecord | null,
): InsuranceCarrierFormState {
  return {
    carrierName: carrier?.carrierName || "",
    carrierCode: carrier?.carrierCode || "",
    carrierType: carrier?.carrierType || "Commercial",
    status: carrier?.status || "Active",
    website: carrier?.website || "",
    telecom: carrier?.telecom?.length ? carrier.telecom : [],
    address: carrier?.address || createEmptyAddress(),
    notes: carrier?.notes || "",
    contacts: carrier?.contacts?.length ? carrier.contacts : [],
    plans: carrier?.plans?.length
      ? carrier.plans.map((plan) => ({
          id: plan.id,
          planName: plan.planName,
          planCode: plan.planCode,
          planType: plan.planType,
          status: plan.status,
          address: plan.address || createEmptyAddress(),
          notes: plan.notes || "",
        }))
      : [],
  };
}

export function createPlanCreateFormState(
  plan?: InsurancePlanRecord | null,
): InsurancePlanCreateFormState {
  return {
    carrierId: plan?.carrierId || "",
    plans: [
      plan
        ? {
            id: plan.id,
            planName: plan.planName,
            planCode: plan.planCode,
            planType: plan.planType,
            status: plan.status,
            address: plan.address || createEmptyAddress(),
            notes: plan.notes || "",
          }
        : createEmptyPlan(),
    ],
  };
}
