import {
  createOnboarding,
  type Onboarding,
  type OnboardingBody,
} from "./onboarding";

type CreateOnboardingPayload = Omit<OnboardingBody, "serviceSetup" | "isIndividualPractice"> & {
  documents?: Array<
    Omit<NonNullable<OnboardingBody["documents"]>[number], "documentType"> & {
      documentType?: string[];
    }
  >;
};

const onboardingTypeMap: Record<string, string> = {
  SINGLE_PRACTICE: "SINGLE_PRACTICE",
  MULTI_PRACTICE_ORGANIZATION: "MULTIPLE_PRACTICES",
  SINGLE_PRACTICE_ORGANIZATION: "SINGLE_PRACTICE_NOW",
  MULTIPLE_PRACTICES: "MULTIPLE_PRACTICES",
  SINGLE_PRACTICE_NOW: "SINGLE_PRACTICE_NOW",
};

const contactRoleMap: Record<string, string> = {
  EXECUTIVE_OWNER: "OWNER",
  PRACTICE_MANAGER: "PRACTICE_MANAGER",
  OFFICE_MANAGER: "OFFICE_MANAGER",
  BILLING_CONTACT: "BILLING_CONTACT",
  CREDENTIALING_CONTACT: "CREDENTIALING_CONTACT",
  CLINICAL_LEAD: "CLINICAL_LEAD",
  IT_TECHNICAL_CONTACT: "TECHNICAL_CONTACT",
  COMPLIANCE_CONTACT: "COMPLIANCE_CONTACT",
  MARKETING_CONTACT: "MARKETING_CONTACT",
  AUTHORIZED_SIGNER: "AUTHORIZED_SIGNER",
  OTHER: "OTHER",
};

const practiceTypeMap: Record<string, string> = {
  PRIMARY_CARE: "PRIMARY_CARE",
  FAMILY_MEDICINE: "FAMILY_MEDICINE",
  INTERNAL_MEDICINE: "INTERNAL_MEDICINE",
  PEDIATRICS: "PEDIATRICS",
  CARDIOLOGY: "CARDIOLOGY",
  GASTROENTEROLOGY: "GASTROENTEROLOGY",
  ENDOCRINOLOGY: "ENDOCRINOLOGY",
  PULMONOLOGY: "PULMONOLOGY",
  NEPHROLOGY: "NEPHROLOGY",
  NEUROLOGY: "NEUROLOGY",
  BEHAVIORAL_HEALTH: "BEHAVIORAL_HEALTH",
  PSYCHIATRY_BEHAVIORAL_HEALTH: "BEHAVIORAL_HEALTH",
  MULTI_SPECIALTY: "MULTI_SPECIALTY",
  OTHER: "OTHER",
};

const credentialingIssueMap: Record<string, string> = {
  INCORRECT_SPECIALTY_ENROLLMENT: "INCORRECT_SPECIALTY_ENROLLMENT",
  MISSING_PAYER_ENROLLMENT: "MISSING_PAYER_ENROLLMENT",
  EXPIRED_ENROLLMENT: "EXPIRED_ENROLLMENT",
  RECREDENTIALING_NEEDED: "RECREDENTIALING_LETTER",
  RECREDENTIALING_LETTER: "RECREDENTIALING_LETTER",
  CAQH_NOT_UPDATED: "OTHER",
  EFT_ERA_NOT_SET_UP: "OTHER",
  UNKNOWN_STATUS: "OTHER",
  OTHER: "OTHER",
};

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function mapValue(value: string | undefined, mapping: Record<string, string>) {
  if (!value) return value;
  return mapping[value] ?? value;
}

export async function createOnboardingFromForm(
  formData: OnboardingBody,
): Promise<Onboarding> {
  const payload: CreateOnboardingPayload = {
    onboardingType: mapValue(formData.onboardingType, onboardingTypeMap),
    isAuthorizedPerson: formData.isAuthorizedPerson,
    nonAuthorizedRole: formData.nonAuthorizedRole,
    numberOfPractices: formData.numberOfPractices,
    numberOfLocations: formData.numberOfLocations,
    billingManagedCentrally: formData.billingManagedCentrally,
    credentialingManagedCentrally: formData.credentialingManagedCentrally,
    contractingManagedCentrally: formData.contractingManagedCentrally,
    oneMainContact: formData.oneMainContact,
    legalCompanyName: formData.legalCompanyName,
    dbaName: formData.dbaName,
    organizationType: formData.organizationType,
    taxIdEin: formData.taxIdEin,
    mainCompanyPhone: formData.mainCompanyPhone,
    mainCompanyFax: formData.mainCompanyFax,
    mainCompanyEmail: formData.mainCompanyEmail,
    companyWebsite: formData.companyWebsite,
    companyAddressLine1: formData.companyAddressLine1,
    companyAddressLine2: formData.companyAddressLine2,
    companyCity: formData.companyCity,
    companyState: formData.companyState,
    companyZip: formData.companyZip,
    ownershipType: formData.ownershipType,
    statesOfOperation: formData.statesOfOperation,
    isLegalContractingEntity: formData.isLegalContractingEntity,
    isBillingEntity: formData.isBillingEntity,
    isCredentialingEntity: formData.isCredentialingEntity,
    primarySpecialty: formData.primarySpecialty,
    additionalSpecialties: formData.additionalSpecialties,
    requestedServices:
      formData.requestedServices ??
      formData.serviceSetup?.requestedServices ??
      [],
    primaryServiceToLaunch:
      formData.primaryServiceToLaunch ??
      formData.serviceSetup?.primaryServiceToLaunch,
    requestedGoLiveDate:
      formData.requestedGoLiveDate ??
      formData.serviceSetup?.requestedGoLiveDate,
    priorityLevel: formData.priorityLevel ?? formData.serviceSetup?.priorityLevel,
    servicesForAllPractices:
      formData.servicesForAllPractices ??
      formData.serviceSetup?.servicesForAllPractices,
    selectedPractices:
      formData.selectedPractices ??
      formData.serviceSetup?.selectedPractices ??
      [],
    replacingExistingVendor:
      formData.replacingExistingVendor ??
      formData.serviceSetup?.replacingExistingVendor,
    currentVendorName:
      formData.currentVendorName ?? formData.serviceSetup?.currentVendorName,
    currentVendorEndDate:
      formData.currentVendorEndDate ?? formData.serviceSetup?.currentVendorEndDate,
    engagementGoals:
      formData.engagementGoals ?? formData.serviceSetup?.engagementGoals,
    informationAccurate: formData.informationAccurate,
    authorizeUse: formData.authorizeUse,
    submittedByName: formData.submittedByName,
    submittedByTitle: formData.submittedByTitle,
    submissionDate: formData.submissionDate,
    status: formData.status,
    contacts: (formData.contacts ?? []).map((contact) => ({
      ...contact,
      contactRole: mapValue(contact.contactRole, contactRoleMap),
    })),
    practices: (formData.practices ?? []).map((practice) => ({
      ...practice,
      practiceType: mapValue(practice.practiceType, practiceTypeMap),
      locations: practice.locations ?? [],
      providers: practice.providers ?? [],
    })),
    documents: (formData.documents ?? []).map((document) => ({
      ...document,
      documentType: document.documentType ? [document.documentType] : [],
    })),
    billing: formData.billing,
    credentialing: formData.credentialing
      ? {
          ...formData.credentialing,
          currentCredentialingIssues: unique(
            (formData.credentialing.currentCredentialingIssues ?? []).map(
              (issue) => mapValue(issue, credentialingIssueMap) ?? "OTHER",
            ),
          ),
        }
      : undefined,
    technology: formData.technology,
    outreach: formData.outreach,
    labPharmacy: formData.labPharmacy,
    compliance: formData.compliance,
    careProgram: formData.careProgram,
  };

  return createOnboarding(payload as OnboardingBody);
}
