import axios from "axios";
import { onboardingEndpoints } from "../apis";
import { apiConnector } from "../apiConnector";

const { EXTERNAL, LIST, GET, CREATE, UPDATE, DELETE } = onboardingEndpoints;

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = (
      error.response?.data as { message?: string } | undefined
    )?.message;
    return apiMessage ?? fallbackMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallbackMessage;
}

export type OnboardingContact = {
  id?: string;
  fullName?: string;
  jobTitle?: string;
  contactRole?: string;
  email?: string;
  phone?: string;
  extension?: string;
  preferredContactMethod?: string;
  bestTimeToReach?: string;
  isPrimaryDecisionMaker?: boolean;
  canSignAgreements?: boolean;
  additionalResponsibilities?: string[];
};

export type OnboardingLocation = {
  id?: string;
  locationName?: string;
  isPrimaryLocation?: boolean;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  mainPhoneNumber?: string;
  mainFaxNumber?: string;
  officeEmail?: string;
  hoursOfOperation?: string;
  officeManagerName?: string;
  patientOutreachManaged?: string;
  billingManaged?: string;
  notes?: string;
};

export type OnboardingProvider = {
  id?: string;
  firstName?: string;
  lastName?: string;
  credentials?: string;
  providerType?: string;
  specialty?: string;
  npi?: string;
  caqhId?: string;
  stateLicenseNumber?: string;
  deaNumber?: string;
  boardCertified?: boolean;
  employmentStatus?: string;
  participatingLocations?: string[];
  credentialingNeeded?: string;
  recredentialingNeeded?: string;
  notes?: string;
};

export type OnboardingPractice = {
  id?: string;
  practiceName?: string;
  practiceDbaName?: string;
  isPartOfParentCompany?: boolean;
  practiceType?: string;
  additionalSpecialtyAreas?: string[];
  groupNpi?: string;
  taxIdEin?: string;
  approximateNumberOfProviders?: number;
  approximateNumberOfLocations?: number;
  approximateMonthlyPatientVolume?: number;
  approximateMedicarePatientVolume?: number;
  approximateMedicaidPatientVolume?: number;
  approximateCommercialPatientVolume?: number;
  offersCareManagementServices?: boolean;
  currentServicesOffered?: string[];
  operationalPainPoints?: string[];
  additionalNotes?: string;
  locations?: OnboardingLocation[];
  providers?: OnboardingProvider[];
};

export type OnboardingDocument = {
  id?: string;
  documentType?: string;
  fileName?: string;
  fileUrl?: string;
  required?: boolean;
  status?: string;
  dateRequested?: string;
  dateReceived?: string;
  notes?: string;
};

export type OnboardingBilling = {
  currentBillingModel?: string;
  billingCompanyName?: string;
  mainBillingContactName?: string;
  mainBillingContactEmail?: string;
  mainBillingContactPhone?: string;
  currentlyBilledServices?: string[];
  activePayers?: string;
  eftEraSetup?: string;
  invoiceRecipient?: string;
  invoiceEmail?: string;
  preferredReportingCadence?: string;
  billingPainPoints?: string[];
  additionalNotes?: string;
};

export type OnboardingCredentialing = {
  credentialingNeeded?: boolean;
  credentialingFor?: string[];
  payersToEnroll?: string;
  caqhMaintained?: boolean;
  currentCredentialingIssues?: string[];
  medicarePtanAvailable?: string;
  medicaidEnrollmentActive?: string;
  additionalNotes?: string;
};

export type OnboardingTechnology = {
  ehrSystem?: string;
  practiceManagementSystem?: string;
  patientPortalAvailable?: boolean;
  patientListExportable?: boolean;
  appointmentListExportable?: boolean;
  apiAccessAvailable?: boolean;
  clearinghouse?: string;
  faxPlatform?: string;
  phonePlatform?: string;
  currentCareManagementPlatform?: string;
  itContactName?: string;
  itContactEmail?: string;
  additionalTechnicalNotes?: string;
};

export type OnboardingOutreach = {
  preferredChannels?: string[];
  patientTextConsent?: boolean;
  preferredLanguages?: string[];
  interpreterServices?: boolean;
  outreachFromPractice?: boolean;
  approvedOutreachHours?: string;
  messagingRequirements?: string;
};

export type OnboardingLabPharmacy = {
  preferredLab?: string;
  existingLabRelationship?: boolean;
  labInterfaceStatus?: string;
  labContactName?: string;
  labContactEmail?: string;
  pharmacyPartnerName?: string;
  pharmacyPartnerInvolved?: boolean;
  additionalNotes?: string;
};

export type OnboardingCompliance = {
  hipaaContactName?: string;
  hipaaContactEmail?: string;
  baaRequired?: boolean;
  securityQuestionnaire?: boolean;
  currentConcerns?: string[];
  additionalNotes?: string;
};

export type OnboardingCareProgram = {
  programsPlanned?: string[];
  estimatedEligiblePatients?: number;
  currentEnrolledPatients?: number;
  patientEnrollmentHandler?: string;
  monthlyFollowUpHandler?: string;
  consentFormsInPlace?: boolean;
  existingCarePlanWorkflow?: boolean;
  patientMinutesTracker?: string;
  complianceConcerns?: string;
};

export type OnboardingServiceSetup = {
  requestedServices?: string[];
  primaryServiceToLaunch?: string;
  requestedGoLiveDate?: string;
  priorityLevel?: string;
  servicesForAllPractices?: string;
  selectedPractices?: string[];
  replacingExistingVendor?: boolean;
  currentVendorName?: string;
  currentVendorEndDate?: string;
  engagementGoals?: string;
};

export type OnboardingBody = {
  onboardingType?: string;
  isAuthorizedPerson?: boolean;
  nonAuthorizedRole?: string;
  numberOfPractices?: number;
  numberOfLocations?: number;
  billingManagedCentrally?: string;
  credentialingManagedCentrally?: string;
  contractingManagedCentrally?: string;
  oneMainContact?: boolean;
  legalCompanyName?: string;
  dbaName?: string;
  organizationType?: string;
  taxIdEin?: string;
  mainCompanyPhone?: string;
  mainCompanyFax?: string;
  mainCompanyEmail?: string;
  companyWebsite?: string;
  companyAddressLine1?: string;
  companyAddressLine2?: string;
  companyCity?: string;
  companyState?: string;
  companyZip?: string;
  ownershipType?: string;
  statesOfOperation?: string[];
  isLegalContractingEntity?: boolean;
  isBillingEntity?: boolean;
  isCredentialingEntity?: boolean;
  primarySpecialty?: string;
  additionalSpecialties?: string[];
  requestedServices?: string[];
  primaryServiceToLaunch?: string;
  requestedGoLiveDate?: string;
  priorityLevel?: string;
  servicesForAllPractices?: string;
  selectedPractices?: string[];
  replacingExistingVendor?: boolean;
  currentVendorName?: string;
  currentVendorEndDate?: string;
  engagementGoals?: string;
  isIndividualPractice?: boolean;
  informationAccurate?: boolean;
  authorizeUse?: boolean;
  submittedByName?: string;
  submittedByTitle?: string;
  submissionDate?: string;
  status?: string;
  contacts?: OnboardingContact[];
  practices?: OnboardingPractice[];
  documents?: OnboardingDocument[];
  billing?: OnboardingBilling;
  credentialing?: OnboardingCredentialing;
  technology?: OnboardingTechnology;
  outreach?: OnboardingOutreach;
  labPharmacy?: OnboardingLabPharmacy;
  compliance?: OnboardingCompliance;
  serviceSetup?: OnboardingServiceSetup;
  careProgram?: OnboardingCareProgram;
};

export type Onboarding = {
  id: string;
  onboardingType?: string;
  isAuthorizedPerson?: boolean;
  nonAuthorizedRole?: string;
  numberOfPractices?: number;
  numberOfLocations?: number;
  billingManagedCentrally?: string;
  credentialingManagedCentrally?: string;
  contractingManagedCentrally?: string;
  oneMainContact?: boolean;
  legalCompanyName?: string;
  dbaName?: string;
  organizationType?: string;
  taxIdEin?: string;
  mainCompanyPhone?: string;
  mainCompanyFax?: string;
  mainCompanyEmail?: string;
  companyWebsite?: string;
  companyAddressLine1?: string;
  companyAddressLine2?: string;
  companyCity?: string;
  companyState?: string;
  companyZip?: string;
  ownershipType?: string;
  statesOfOperation?: string[];
  isLegalContractingEntity?: boolean;
  isBillingEntity?: boolean;
  isCredentialingEntity?: boolean;
  primarySpecialty?: string;
  additionalSpecialties?: string[];
  requestedServices?: string[];
  primaryServiceToLaunch?: string;
  requestedGoLiveDate?: string;
  priorityLevel?: string;
  servicesForAllPractices?: string;
  selectedPractices?: string[];
  replacingExistingVendor?: boolean;
  currentVendorName?: string;
  currentVendorEndDate?: string;
  engagementGoals?: string;
  informationAccurate?: boolean;
  authorizeUse?: boolean;
  submittedByName?: string;
  submittedByTitle?: string;
  submissionDate?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  contacts?: OnboardingContact[];
  practices?: OnboardingPractice[];
  documents?: OnboardingDocument[];
  billing?: OnboardingBilling;
  credentialing?: OnboardingCredentialing;
  technology?: OnboardingTechnology;
  outreach?: OnboardingOutreach;
  labPharmacy?: OnboardingLabPharmacy;
  compliance?: OnboardingCompliance;
  serviceSetup?: OnboardingServiceSetup;
  careProgram?: OnboardingCareProgram;
};

export async function createExternalOnboarding(
  data: OnboardingBody
): Promise<Onboarding> {
  try {
    const response = await axios.post(EXTERNAL, data);
    return (response.data as { onboarding: Onboarding }).onboarding;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to submit onboarding.")
    );
  }
}

export async function getOnboardings(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<{ onboardings: Onboarding[]; pagination: any }> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.status) queryString.set("status", params.status);

    const url = queryString.toString()
      ? `${LIST}?${queryString.toString()}`
      : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });

    return response.data as { onboardings: Onboarding[]; pagination: any };
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch onboardings."));
  }
}

export async function getOnboarding(id: string): Promise<Onboarding> {
  try {
    const response = await apiConnector({
      method: "GET",
      url: GET(id),
      credentials: true,
    });
    return (response.data as { onboarding: Onboarding }).onboarding;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to fetch onboarding."));
  }
}

export async function createOnboarding(
  data: OnboardingBody
): Promise<Onboarding> {
  try {
    const response = await apiConnector({
      method: "POST",
      url: CREATE,
      body: data,
      credentials: true,
    });
    return (response.data as { onboarding: Onboarding }).onboarding;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to create onboarding."));
  }
}

export async function updateOnboarding(
  id: string,
  data: Partial<OnboardingBody>
): Promise<Onboarding> {
  try {
    const response = await apiConnector({
      method: "PUT",
      url: UPDATE(id),
      body: data,
      credentials: true,
    });
    return (response.data as { onboarding: Onboarding }).onboarding;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update onboarding."));
  }
}

export async function deleteOnboarding(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: DELETE(id),
      credentials: true,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to delete onboarding."));
  }
}