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
