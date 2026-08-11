export const credentialingStatusOptions = [
  "Not Started",
  "Application Submitted",
  "In Process - Payer Review",
  "Pending Additional Info",
  "Contracted - Direct",
  "Contracted - IPA/Delegated",
  "Out-of-Network (OON)",
  "Declined / Application Rejected",
  "Re-credentialing Due",
  "Terminated",
] as const;

export type CredentialingStatus = (typeof credentialingStatusOptions)[number];

export function isLockedCredentialingStatus(status?: string | null) {
  return (
    status === "Contracted - Direct" ||
    status === "Contracted - IPA/Delegated"
  );
}

export function canEditCredentialingStatus(status?: string | null) {
  return !isLockedCredentialingStatus(status);
}

export const requestTypeOptions = [
  "New Credentialing",
  "Re-credentialing",
  "Demographic Update",
  "Add Location",
] as const;

export type RequestType = (typeof requestTypeOptions)[number];

export const contractTypeOptions = [
  "Direct Contract",
  "IPA-Delegated",
  "Unknown - Pending Confirmation",
] as const;

export type ContractType = (typeof contractTypeOptions)[number];

export const verificationStatusOptions = ["Yes", "No", "Pending"] as const;

export type VerificationStatus = (typeof verificationStatusOptions)[number];

export const priorityOptions = ["High", "Medium", "Low"] as const;

export type Priority = (typeof priorityOptions)[number];

export const lineOfBusinessOptions = [
  "HMO",
  "PPO",
  "EPO",
  "Medicare Advantage",
  "Other",
] as const;

export type LineOfBusiness = (typeof lineOfBusinessOptions)[number];

export const followUpChannelOptions = [
  "Phone",
  "Email",
  "Payer Portal",
  "Fax",
  "Mail",
] as const;

export type FollowUpChannel = (typeof followUpChannelOptions)[number];

export const followUpDirectionOptions = ["Outbound", "Inbound"] as const;

export type FollowUpDirection = (typeof followUpDirectionOptions)[number];

export const allowedDocumentTypes = [
  "Medical License",
  "DEA",
  "Board Certificate",
  "CV",
  "W9",
  "Insurance Certificate",
  "Other Documents",
] as const;

export type AllowedDocumentType = (typeof allowedDocumentTypes)[number];

export type CredentialingDocument = {
  id: string;
  name: string;
  fileName?: string;
  type: AllowedDocumentType;
  documentType?: AllowedDocumentType;
  uploadedAt: string;
  uploadedBy: string;
  expiryDate?: string;
  fileUrl?: string;
  fileBase64?: string;
  fileSize?: number;
  mimeType?: string;
};

export type CredentialingActivity = {
  id: string;
  action: string;
  details?: string;
  actor: string;
  createdAt: string;
};

export type CredentialingFollowUp = {
  id: string;
  dateTime: string;
  channel: FollowUpChannel;
  direction: FollowUpDirection;
  referenceNumber: string;
  summary: string;
  nextAction: string;
  loggedBy: string;
};

export type CredentialingRecord = {
  id: string;
  credentialingId: string;
  practiceId?: string;
  practice: string;
  providerId?: string;
  provider: string;
  insuranceCompany: string;
  credentialingType: RequestType;
  contractType: ContractType;
  ipaDelegatedEntityName: string;
  status: CredentialingStatus;
  payerProviderId: string;
  assignedUser: string;
  assignedToUserId?: string;
  assignedUserId?: string;
  priority: Priority;
  startDate: string;
  submissionDate: string;
  effectiveDate: string;
  expirationDate: string;
  nextFollowUpDate: string;
  reCredentialingDueDate: string;
  lastActivityDate: string;
  tinVerified: VerificationStatus;
  addressVerified: VerificationStatus;
  lineOfBusiness: LineOfBusiness[];
  documents: CredentialingDocument[];
  followUpLogs: CredentialingFollowUp[];
  activity: CredentialingActivity[];
  notes?: string;
  enrollmentId?: string;
  credentialingChargeBilledAt?: string | null;
  credentialingChargeInvoiceLineItemId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CredentialingFormState = {
  practiceId: string;
  practice: string;
  providerId: string;
  provider: string;
  insuranceCompany: string;
  credentialingType: RequestType;
  contractType: ContractType;
  ipaDelegatedEntityName: string;
  status: CredentialingStatus;
  payerProviderId: string;
  assignedUser: string;
  assignedUserId: string;
  priority: Priority;
  startDate: string;
  submissionDate: string;
  effectiveDate: string;
  expirationDate: string;
  nextFollowUpDate: string;
  reCredentialingDueDate: string;
  tinVerified: VerificationStatus;
  addressVerified: VerificationStatus;
  lineOfBusiness: LineOfBusiness[];
  notes?: string;
  enrollmentId?: string;
  documents: CredentialingDocument[];
  followUpLogs: CredentialingFollowUp[];
};
