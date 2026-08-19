import axios from "axios";
import { onboardingEndpoints } from "../apis";
import { apiConnector } from "../apiConnector";

const {
  EXTERNAL,
  EXTERNAL_GET,
  LIST,
  GET,
  CREATE,
  UPDATE,
  DELETE,
  UPLOAD_EXTERNAL_DOCUMENT,
  DELETE_EXTERNAL_DOCUMENT,
} =
  onboardingEndpoints;

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
  cliaNumber?: string;
  notes?: string;
};

export type OnboardingProvider = {
  id?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  credentials?: string;
  providerType?: string;
  specialty?: string;
  npi?: string;
  caqhId?: string;
  ssnFullDigits?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  stateOfLicense?: string;
  licenseType?: string;
  taxonomy?: string;
  primarySpecialty?: string;
  secondarySpecialty?: string;
  boardCertifications?: string;
  caqhUsername?: string;
  caqhPassword?: string;
  caqhLastAttestationDate?: string;
  languagesSpoken?: string;
  telehealthAvailable?: boolean;
  malpracticeCarrier?: string;
  malpracticePolicyNumber?: string;
  malpracticeEffectiveDate?: string;
  malpracticeExpiryDate?: string;
  hospitalAffiliations?: string;
  personalCellNumber?: string;
  personalEmail?: string;
  practiceEmail?: string;
  medicarePtanIndividual?: string;
  medicaidIdIndividual?: string;
  ipaAffiliationsProviderLevel?: string;
  nppesUsername?: string;
  nppesPassword?: string;
  railroadMedicareIndividual?: string;
  railroadMedicareGroup?: string;
  cliaNumber?: string;
  copyOfBoardCertification?: string;
  copyOfProfessionalLiabilityInsurance?: string;
  copyOfBachelorsDegree?: string;
  copyOfMastersDegree?: string;
  copyOfSocialSecurityCard?: string;
  copyOfDriversLicense?: string;
  passportSizedPhoto?: string;
  resume?: string;
  providerEffectiveDateWithGroup?: string;
  countryOfBirth?: string;
  statePlaceOfBirth?: string;
  homeAddress?: string;
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
  medicaidIdNumber?: string;
  groupMedicaidNpi?: string;
  groupMedicarePtan?: string;
  groupTaxonomy?: string;
  ipaAffiliations?: string;
  practiceManagerName?: string;
  practiceManagerEmail?: string;
  practiceManagerPhone?: string;
  billingAddress?: string;
  mailingAddress?: string;
  practiceWorkStartDate?: string;
  railroadMedicareGroup?: string;
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
  documentType?: string[];
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
  recentW9Form?: string;
  voidCheck?: string;
  formalLetterFromBank?: string;
  currentlyBilledServices?: string[];
  activePayers?: string;
  eftEraSetup?: string;
  invoiceRecipient?: string;
  invoiceEmail?: string;
  preferredReportingCadence?: string;
  billingPainPoints?: string[];
  additionalNotes?: string;
};

export type OnboardingPayerPortalLogin = {
  payerName?: string;
  portalUrl?: string;
  username?: string;
  password?: string;
  designatedContactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  status?: string;
  notes?: string;
};

export type OnboardingCredentialing = {
  credentialingNeeded?: boolean;
  credentialingFor?: string[];
  payersToEnroll?: string;
  approvedInsurancesTracker?: string;
  designatedPortalContactName?: string;
  designatedPortalContactEmail?: string;
  designatedPortalContactPhone?: string;
  irsDocument147c?: string;
  desiredInsurancePlans?: string;
  payerPortalLogins?: OnboardingPayerPortalLogin[];
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

export type OnboardingMarketing = {
  websiteUrl?: string;
  socialMediaChannels?: string[];
  currentMarketingChannels?: string[];
  targetPatientDemographics?: string;
  monthlyMarketingBudget?: string;
  existingBrandAssets?: string;
  googleBusinessProfileClaimed?: boolean;
  patientAcquisitionGoals?: string;
  aiToolsUsed?: string;
  additionalMarketingNotes?: string;
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
  practiceId?: string;
  personId?: string;
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
  marketing?: OnboardingMarketing;
};

export type OnboardingScopeFields = Pick<
  OnboardingBody,
  | "requestedServices"
  | "primaryServiceToLaunch"
  | "requestedGoLiveDate"
  | "priorityLevel"
  | "servicesForAllPractices"
  | "selectedPractices"
  | "replacingExistingVendor"
  | "currentVendorName"
  | "currentVendorEndDate"
  | "engagementGoals"
>;

export type Onboarding = {
  id: string;
  practiceId?: string | null;
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
  marketing?: OnboardingMarketing;
};

type BackendOnboarding = Onboarding & {
  OnboardingMarketing?: OnboardingMarketing;
};

function normalizeOnboarding(onboarding: BackendOnboarding): Onboarding {
  return {
    ...onboarding,
    marketing: onboarding.marketing ?? onboarding.OnboardingMarketing,
  };
}

export async function createExternalOnboarding(
  data: OnboardingBody
): Promise<Onboarding> {
  try {
    const response = await axios.post(EXTERNAL, data);
    return normalizeOnboarding(
      (response.data as { onboarding: BackendOnboarding }).onboarding
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to submit onboarding.")
    );
  }
}

export async function getExternalOnboardingByPracticeId(
  practiceId: string
): Promise<Onboarding | null> {
  try {
    const response = await axios.get(EXTERNAL_GET(practiceId));
    const onboarding = (response.data as { onboarding?: BackendOnboarding | null })
      .onboarding;

    return onboarding ? normalizeOnboarding(onboarding) : null;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to fetch onboarding.")
    );
  }
}

export async function uploadExternalOnboardingDocument(params: {
  practiceId: string;
  practiceName: string;
  field: string;
  file: File;
}): Promise<{ fileUrl: string; fileName: string; field: string }> {
  try {
    const response = await axios.post(UPLOAD_EXTERNAL_DOCUMENT, params.file, {
      headers: {
        "Content-Type": params.file.type || "application/octet-stream",
        "x-practice-id": encodeURIComponent(params.practiceId),
        "x-practice-name": encodeURIComponent(params.practiceName),
        "x-upload-field": encodeURIComponent(params.field),
        "x-file-name": encodeURIComponent(params.file.name),
        "x-file-content-type": encodeURIComponent(
          params.file.type || "application/octet-stream",
        ),
      },
      maxBodyLength: 25 * 1024 * 1024,
      maxContentLength: 25 * 1024 * 1024,
    });
    return response.data as {
      fileUrl: string;
      fileName: string;
      field: string;
    };
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to upload onboarding document.")
    );
  }
}

export async function deleteExternalOnboardingDocument(params: {
  fileUrl: string;
}): Promise<{ blobName?: string }> {
  try {
    const response = await axios.post(DELETE_EXTERNAL_DOCUMENT, params);
    return response.data as { blobName?: string };
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Unable to delete onboarding document.")
    );
  }
}

export async function getOnboardings(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<{
  onboardings: Onboarding[];
  pagination: Record<string, unknown>;
}> {
  try {
    const queryString = new URLSearchParams();
    if (params?.page) queryString.set("page", String(params.page));
    if (params?.limit) queryString.set("limit", String(params.limit));
    if (params?.search) queryString.set("search", params.search);
    if (params?.status) queryString.set("status", params.status);
    if (params?.sortBy) queryString.set("sortBy", params.sortBy);
    if (params?.sortOrder) queryString.set("sortOrder", params.sortOrder);

    const url = queryString.toString()
      ? `${LIST}?${queryString.toString()}`
      : LIST;

    const response = await apiConnector({
      method: "GET",
      url,
      credentials: true,
    });

    const data = response.data as {
      onboardings: BackendOnboarding[];
      pagination: Record<string, unknown>;
    };

    return {
      ...data,
      onboardings: (data.onboardings || []).map(normalizeOnboarding),
    };
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
    return normalizeOnboarding(
      (response.data as { onboarding: BackendOnboarding }).onboarding
    );
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
    return normalizeOnboarding(
      (response.data as { onboarding: BackendOnboarding }).onboarding
    );
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
    return normalizeOnboarding(
      (response.data as { onboarding: BackendOnboarding }).onboarding
    );
  } catch (error) {
    throw new Error(getErrorMessage(error, "Unable to update onboarding."));
  }
}

export async function updateOnboardingScope(
  id: string,
  scope: OnboardingScopeFields
): Promise<Onboarding> {
  return updateOnboarding(id, scope);
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
