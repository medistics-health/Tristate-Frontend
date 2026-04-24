import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import type {
  OnboardingBilling,
  OnboardingBody,
  OnboardingCompliance,
  OnboardingContact,
  OnboardingCredentialing,
  OnboardingDocument,
  OnboardingLabPharmacy,
  OnboardingLocation,
  OnboardingOutreach,
  OnboardingPractice,
  OnboardingProvider,
  OnboardingTechnology,
} from "../../services/operations/onboarding";
import { createOnboardingFromForm } from "../../services/operations/createOnboardingForm";

type Option = {
  label: string;
  value: string;
};

type Step = {
  id: number;
  title: string;
  description: string;
};

type NestedSectionKey =
  | "billing"
  | "credentialing"
  | "technology"
  | "outreach"
  | "labPharmacy"
  | "compliance";

const usStates: Option[] = [
  { label: "Alabama", value: "AL" },
  { label: "Alaska", value: "AK" },
  { label: "Arizona", value: "AZ" },
  { label: "Arkansas", value: "AR" },
  { label: "California", value: "CA" },
  { label: "Colorado", value: "CO" },
  { label: "Connecticut", value: "CT" },
  { label: "Delaware", value: "DE" },
  { label: "Florida", value: "FL" },
  { label: "Georgia", value: "GA" },
  { label: "Hawaii", value: "HI" },
  { label: "Idaho", value: "ID" },
  { label: "Illinois", value: "IL" },
  { label: "Indiana", value: "IN" },
  { label: "Iowa", value: "IA" },
  { label: "Kansas", value: "KS" },
  { label: "Kentucky", value: "KY" },
  { label: "Louisiana", value: "LA" },
  { label: "Maine", value: "ME" },
  { label: "Maryland", value: "MD" },
  { label: "Massachusetts", value: "MA" },
  { label: "Michigan", value: "MI" },
  { label: "Minnesota", value: "MN" },
  { label: "Mississippi", value: "MS" },
  { label: "Missouri", value: "MO" },
  { label: "Montana", value: "MT" },
  { label: "Nebraska", value: "NE" },
  { label: "Nevada", value: "NV" },
  { label: "New Hampshire", value: "NH" },
  { label: "New Jersey", value: "NJ" },
  { label: "New Mexico", value: "NM" },
  { label: "New York", value: "NY" },
  { label: "North Carolina", value: "NC" },
  { label: "North Dakota", value: "ND" },
  { label: "Ohio", value: "OH" },
  { label: "Oklahoma", value: "OK" },
  { label: "Oregon", value: "OR" },
  { label: "Pennsylvania", value: "PA" },
  { label: "Rhode Island", value: "RI" },
  { label: "South Carolina", value: "SC" },
  { label: "South Dakota", value: "SD" },
  { label: "Tennessee", value: "TN" },
  { label: "Texas", value: "TX" },
  { label: "Utah", value: "UT" },
  { label: "Vermont", value: "VT" },
  { label: "Virginia", value: "VA" },
  { label: "Washington", value: "WA" },
  { label: "West Virginia", value: "WV" },
  { label: "Wisconsin", value: "WI" },
  { label: "Wyoming", value: "WY" },
];

const onboardingTypeOptions: Option[] = [
  { label: "Single Practice", value: "SINGLE_PRACTICE" },
  {
    label: "Company / Organization with Multiple Practices",
    value: "MULTI_PRACTICE_ORGANIZATION",
  },
  {
    label: "Company / Organization with One Practice Right Now",
    value: "SINGLE_PRACTICE_ORGANIZATION",
  },
];

const organizationTypeOptions: Option[] = [
  { label: "Independent Practice", value: "INDEPENDENT_PRACTICE" },
  { label: "Medical Group", value: "MEDICAL_GROUP" },
  { label: "Multi-Specialty Group", value: "MULTI_SPECIALTY_GROUP" },
  { label: "MSO", value: "MSO" },
  { label: "IPA", value: "IPA" },
  { label: "DSO", value: "DSO" },
  { label: "FQHC", value: "FQHC" },
  { label: "Hospital-Affiliated Group", value: "HOSPITAL_AFFILIATED_GROUP" },
  { label: "Pharmacy Organization", value: "PHARMACY_ORGANIZATION" },
  { label: "Other", value: "OTHER" },
];

const ownershipTypeOptions: Option[] = [
  { label: "Physician-Owned", value: "PHYSICIAN_OWNED" },
  { label: "Corporate-Owned", value: "CORPORATE_OWNED" },
  { label: "Private Equity Backed", value: "PRIVATE_EQUITY_BACKED" },
  { label: "Hospital-Affiliated", value: "HOSPITAL_AFFILIATED" },
  { label: "Family-Owned", value: "FAMILY_OWNED" },
  { label: "Partnership", value: "PARTNERSHIP" },
  { label: "Other", value: "OTHER" },
];

const roleOptions: Option[] = [
  { label: "Executive / Owner", value: "EXECUTIVE_OWNER" },
  { label: "Office Manager", value: "OFFICE_MANAGER" },
  { label: "Practice Manager", value: "PRACTICE_MANAGER" },
  { label: "Billing", value: "BILLING" },
  { label: "Credentialing", value: "CREDENTIALING" },
  { label: "Clinical Staff", value: "CLINICAL_STAFF" },
  { label: "IT / Technical", value: "IT_TECHNICAL" },
  { label: "Consultant", value: "CONSULTANT" },
  { label: "Other", value: "OTHER" },
];

const contactRoleOptions: Option[] = [
  { label: "Executive / Owner", value: "EXECUTIVE_OWNER" },
  { label: "Practice Manager", value: "PRACTICE_MANAGER" },
  { label: "Office Manager", value: "OFFICE_MANAGER" },
  { label: "Billing Contact", value: "BILLING_CONTACT" },
  { label: "Credentialing Contact", value: "CREDENTIALING_CONTACT" },
  { label: "Clinical Lead", value: "CLINICAL_LEAD" },
  { label: "IT / Technical Contact", value: "IT_TECHNICAL_CONTACT" },
  { label: "Compliance Contact", value: "COMPLIANCE_CONTACT" },
  { label: "Marketing Contact", value: "MARKETING_CONTACT" },
  { label: "Authorized Signer", value: "AUTHORIZED_SIGNER" },
  { label: "Other", value: "OTHER" },
];

const specialtyOptions: Option[] = [
  { label: "Family Medicine", value: "FAMILY_MEDICINE" },
  { label: "Internal Medicine", value: "INTERNAL_MEDICINE" },
  { label: "Primary Care", value: "PRIMARY_CARE" },
  { label: "Pediatrics", value: "PEDIATRICS" },
  { label: "Cardiology", value: "CARDIOLOGY" },
  { label: "Gastroenterology", value: "GASTROENTEROLOGY" },
  { label: "Endocrinology", value: "ENDOCRINOLOGY" },
  { label: "Pulmonology", value: "PULMONOLOGY" },
  { label: "Nephrology", value: "NEPHROLOGY" },
  { label: "Neurology", value: "NEUROLOGY" },
  {
    label: "Psychiatry / Behavioral Health",
    value: "PSYCHIATRY_BEHAVIORAL_HEALTH",
  },
  { label: "Multi-Specialty", value: "MULTI_SPECIALTY" },
  { label: "Other", value: "OTHER" },
];

const serviceOptions: Option[] = [
  { label: "Credentialing", value: "CREDENTIALING" },
  { label: "Billing / Revenue Cycle Management", value: "BILLING_RCM" },
  { label: "APCM", value: "APCM" },
  { label: "CCM", value: "CCM" },
  { label: "RPM", value: "RPM" },
  { label: "PCM", value: "PCM" },
  { label: "RTM", value: "RTM" },
  { label: "BHI", value: "BHI" },
  { label: "TCM", value: "TCM" },
  { label: "Lab Relationship Support", value: "LAB_RELATIONSHIP_SUPPORT" },
  { label: "Pharmacy Program Support", value: "PHARMACY_PROGRAM_SUPPORT" },
  { label: "Patient Acquisition", value: "PATIENT_ACQUISITION" },
  { label: "Brand Growth", value: "BRAND_GROWTH" },
  { label: "AI Visibility", value: "AI_VISIBILITY" },
  { label: "Other", value: "OTHER" },
];

const careProgramServiceValues = [
  "APCM",
  "CCM",
  "RPM",
  "PCM",
  "RTM",
  "BHI",
  "TCM",
];

const painPointOptions: Option[] = [
  { label: "Billing", value: "BILLING" },
  { label: "Credentialing", value: "CREDENTIALING" },
  { label: "Staffing", value: "STAFFING" },
  { label: "Patient Outreach", value: "PATIENT_OUTREACH" },
  { label: "Enrollment", value: "ENROLLMENT" },
  { label: "Compliance", value: "COMPLIANCE" },
  { label: "Reporting", value: "REPORTING" },
  { label: "Technology / EHR", value: "TECHNOLOGY_EHR" },
  { label: "Patient Retention", value: "PATIENT_RETENTION" },
  { label: "Marketing / Growth", value: "MARKETING_GROWTH" },
  { label: "Other", value: "OTHER" },
];

const responsibilityOptions: Option[] = [
  { label: "Operations", value: "OPERATIONS" },
  { label: "Billing", value: "BILLING" },
  { label: "Credentialing", value: "CREDENTIALING" },
  { label: "IT", value: "IT" },
  { label: "Clinical Oversight", value: "CLINICAL_OVERSIGHT" },
  { label: "Compliance", value: "COMPLIANCE" },
  { label: "Marketing", value: "MARKETING" },
  { label: "Contracts", value: "CONTRACTS" },
  { label: "Finance", value: "FINANCE" },
];

const credentialOptions: Option[] = [
  { label: "MD", value: "MD" },
  { label: "DO", value: "DO" },
  { label: "NP", value: "NP" },
  { label: "PA", value: "PA" },
  { label: "RN", value: "RN" },
  { label: "LCSW", value: "LCSW" },
  { label: "Psychologist", value: "PSYCHOLOGIST" },
  { label: "Other", value: "OTHER" },
];

const providerTypeOptions: Option[] = [
  { label: "Physician", value: "PHYSICIAN" },
  { label: "Nurse Practitioner", value: "NURSE_PRACTITIONER" },
  { label: "Physician Assistant", value: "PHYSICIAN_ASSISTANT" },
  { label: "Behavioral Health Provider", value: "BEHAVIORAL_HEALTH_PROVIDER" },
  { label: "Care Manager", value: "CARE_MANAGER" },
  { label: "Other", value: "OTHER" },
];

const employmentStatusOptions: Option[] = [
  { label: "Owner", value: "OWNER" },
  { label: "Employed", value: "EMPLOYED" },
  { label: "Contractor", value: "CONTRACTOR" },
  { label: "Locum", value: "LOCUM" },
  { label: "Other", value: "OTHER" },
];

const yesNoMaybeOptions: Option[] = [
  { label: "Yes", value: "YES" },
  { label: "No", value: "NO" },
  { label: "Not Sure", value: "NOT_SURE" },
];

const centralizationOptions: Option[] = [
  { label: "Yes", value: "YES" },
  { label: "No", value: "NO" },
  { label: "Partially", value: "PARTIALLY" },
];

const preferredContactOptions: Option[] = [
  { label: "Email", value: "EMAIL" },
  { label: "Phone", value: "PHONE" },
  { label: "Text", value: "TEXT" },
];

const bestTimeOptions: Option[] = [
  { label: "Morning", value: "MORNING" },
  { label: "Afternoon", value: "AFTERNOON" },
  { label: "Evening", value: "EVENING" },
  { label: "Anytime", value: "ANYTIME" },
];

const billingLocationOptions: Option[] = [
  { label: "At this location", value: "AT_LOCATION" },
  { label: "Centrally", value: "CENTRALLY" },
  { label: "Both", value: "BOTH" },
];

const currentServiceOptions: Option[] = [
  { label: "APCM", value: "APCM" },
  { label: "CCM", value: "CCM" },
  { label: "RPM", value: "RPM" },
  { label: "PCM", value: "PCM" },
  { label: "RTM", value: "RTM" },
  { label: "BHI", value: "BHI" },
  { label: "TCM", value: "TCM" },
  { label: "None", value: "NONE" },
  { label: "Other", value: "OTHER" },
];

const ehrOptions: Option[] = [
  { label: "eClinicalWorks", value: "ECLINICALWORKS" },
  { label: "Athenahealth", value: "ATHENAHEALTH" },
  { label: "Epic", value: "EPIC" },
  { label: "NextGen", value: "NEXTGEN" },
  { label: "Kareo / Tebra", value: "KAREO_TEBRA" },
  { label: "Practice Fusion", value: "PRACTICE_FUSION" },
  { label: "Greenway", value: "GREENWAY" },
  { label: "Cerner", value: "CERNER" },
  { label: "Amazing Charts", value: "AMAZING_CHARTS" },
  { label: "DrChrono", value: "DRCHRONO" },
  { label: "Other", value: "OTHER" },
];

const reportingCadenceOptions: Option[] = [
  { label: "Weekly", value: "WEEKLY" },
  { label: "Biweekly", value: "BIWEEKLY" },
  { label: "Monthly", value: "MONTHLY" },
  { label: "Custom", value: "CUSTOM" },
];

const billingModelOptions: Option[] = [
  { label: "In-House", value: "IN_HOUSE" },
  { label: "Outsourced", value: "OUTSOURCED" },
  { label: "Hybrid", value: "HYBRID" },
];

const billingPainPointOptions: Option[] = [
  { label: "Denials", value: "DENIALS" },
  { label: "Slow Payments", value: "SLOW_PAYMENTS" },
  { label: "Coding Issues", value: "CODING_ISSUES" },
  { label: "Credentialing Issues", value: "CREDENTIALING_ISSUES" },
  { label: "Eligibility Issues", value: "ELIGIBILITY_ISSUES" },
  { label: "Poor Reporting", value: "POOR_REPORTING" },
  { label: "Staff Shortage", value: "STAFF_SHORTAGE" },
  { label: "A/R Follow-Up", value: "AR_FOLLOW_UP" },
  { label: "Other", value: "OTHER" },
];

const credentialingIssueOptions: Option[] = [
  {
    label: "Incorrect Specialty Enrollment",
    value: "INCORRECT_SPECIALTY_ENROLLMENT",
  },
  { label: "Missing Payer Enrollment", value: "MISSING_PAYER_ENROLLMENT" },
  { label: "Expired Enrollment", value: "EXPIRED_ENROLLMENT" },
  { label: "Recredentialing Needed", value: "RECREDENTIALING_NEEDED" },
  { label: "CAQH Not Updated", value: "CAQH_NOT_UPDATED" },
  { label: "EFT / ERA Not Set Up", value: "EFT_ERA_NOT_SET_UP" },
  { label: "Unknown Status", value: "UNKNOWN_STATUS" },
  { label: "Other", value: "OTHER" },
];

const careHandlerOptions: Option[] = [
  { label: "Practice Staff", value: "PRACTICE_STAFF" },
  { label: "Vendor", value: "VENDOR" },
  { label: "Provider", value: "PROVIDER" },
  { label: "Nobody Currently", value: "NOBODY_CURRENTLY" },
  { label: "Other", value: "OTHER" },
];

const minutesTrackerOptions: Option[] = [
  { label: "EHR", value: "EHR" },
  { label: "Spreadsheet", value: "SPREADSHEET" },
  { label: "Vendor Platform", value: "VENDOR_PLATFORM" },
  { label: "Not Tracked", value: "NOT_TRACKED" },
  { label: "Other", value: "OTHER" },
];

const outreachChannelOptions: Option[] = [
  { label: "Phone", value: "PHONE" },
  { label: "SMS", value: "SMS" },
  { label: "Email", value: "EMAIL" },
  { label: "Patient Portal", value: "PATIENT_PORTAL" },
];

const languageOptions: Option[] = [
  { label: "English", value: "ENGLISH" },
  { label: "Spanish", value: "SPANISH" },
  { label: "Hindi", value: "HINDI" },
  { label: "Gujarati", value: "GUJARATI" },
  { label: "Portuguese", value: "PORTUGUESE" },
  { label: "Arabic", value: "ARABIC" },
  { label: "Other", value: "OTHER" },
];

const complianceConcernOptions: Option[] = [
  { label: "HIPAA", value: "HIPAA" },
  { label: "Audit Risk", value: "AUDIT_RISK" },
  { label: "Documentation", value: "DOCUMENTATION" },
  { label: "Consent", value: "CONSENT" },
  { label: "Billing Compliance", value: "BILLING_COMPLIANCE" },
  { label: "State-Specific Rules", value: "STATE_SPECIFIC_RULES" },
  { label: "None", value: "NONE" },
  { label: "Other", value: "OTHER" },
];

const labStatusOptions: Option[] = [
  { label: "Active", value: "ACTIVE" },
  { label: "Pending", value: "PENDING" },
  { label: "Not Started", value: "NOT_STARTED" },
  { label: "Not Needed", value: "NOT_NEEDED" },
  { label: "Unknown", value: "UNKNOWN" },
];

const credentialingForOptions: Option[] = [
  { label: "Group / Practice", value: "GROUP_PRACTICE" },
  { label: "Individual Providers", value: "INDIVIDUAL_PROVIDERS" },
  { label: "Both", value: "BOTH" },
];

const servicePracticeOptions: Option[] = [
  { label: "All Practices", value: "ALL_PRACTICES" },
  { label: "Selected Practices", value: "SELECTED_PRACTICES" },
  { label: "Single Practice Only", value: "SINGLE_PRACTICE_ONLY" },
];

const priorityOptions: Option[] = [
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

const documentStatusOptions: Option[] = [
  { label: "Not Requested", value: "NOT_REQUESTED" },
  { label: "Requested", value: "REQUESTED" },
  { label: "Received", value: "RECEIVED" },
  { label: "Under Review", value: "UNDER_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Expired", value: "EXPIRED" },
];

const documentTypeOptions: Option[] = [
  { label: "W-9", value: "W9" },
  { label: "Signed Agreement", value: "SIGNED_AGREEMENT" },
  { label: "BAA", value: "BAA" },
  { label: "COI", value: "COI" },
  { label: "Provider Roster", value: "PROVIDER_ROSTER" },
  { label: "CAQH", value: "CAQH" },
  { label: "Enrollment Letter", value: "ENROLLMENT_LETTER" },
  { label: "Branding Asset", value: "BRANDING_ASSET" },
  { label: "Billing Report", value: "BILLING_REPORT" },
  { label: "Other", value: "OTHER" },
];

const steps: Step[] = [
  {
    id: 1,
    title: "Structure",
    description: "Client structure and authorization",
  },
  { id: 2, title: "Company", description: "Company or organization details" },
  { id: 3, title: "Contacts", description: "Primary contacts and signers" },
  {
    id: 4,
    title: "Practices",
    description: "Practices, locations, and providers",
  },
  { id: 5, title: "Scope", description: "Requested services and timeline" },
  {
    id: 6,
    title: "Operations",
    description: "Technology, billing, and credentialing",
  },
  {
    id: 7,
    title: "Outreach",
    description: "Programs, outreach, lab, and compliance",
  },
  { id: 8, title: "Review", description: "Documents and final confirmation" },
];

const initialContact: OnboardingContact = {
  fullName: "",
  jobTitle: "",
  contactRole: "",
  email: "",
  phone: "",
  extension: "",
  preferredContactMethod: "",
  bestTimeToReach: "",
  isPrimaryDecisionMaker: false,
  canSignAgreements: false,
  additionalResponsibilities: [],
};

const initialLocation: OnboardingLocation = {
  locationName: "",
  isPrimaryLocation: false,
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zipCode: "",
  mainPhoneNumber: "",
  mainFaxNumber: "",
  officeEmail: "",
  hoursOfOperation: "",
  officeManagerName: "",
  patientOutreachManaged: "",
  billingManaged: "",
  notes: "",
};

const initialProvider: OnboardingProvider = {
  firstName: "",
  lastName: "",
  credentials: "",
  providerType: "",
  specialty: "",
  npi: "",
  caqhId: "",
  stateLicenseNumber: "",
  deaNumber: "",
  boardCertified: false,
  employmentStatus: "",
  participatingLocations: [],
  credentialingNeeded: "",
  recredentialingNeeded: "",
  notes: "",
};

const initialPractice: OnboardingPractice = {
  practiceName: "",
  practiceDbaName: "",
  isPartOfParentCompany: true,
  practiceType: "",
  additionalSpecialtyAreas: [],
  groupNpi: "",
  taxIdEin: "",
  approximateNumberOfProviders: 0,
  approximateNumberOfLocations: 0,
  approximateMonthlyPatientVolume: 0,
  approximateMedicarePatientVolume: 0,
  approximateMedicaidPatientVolume: 0,
  approximateCommercialPatientVolume: 0,
  offersCareManagementServices: false,
  currentServicesOffered: [],
  operationalPainPoints: [],
  additionalNotes: "",
  locations: [{ ...initialLocation }],
  providers: [{ ...initialProvider }],
};

const initialDocument: OnboardingDocument = {
  documentType: "",
  fileName: "",
  fileUrl: "",
  required: false,
  status: "NOT_REQUESTED",
  dateRequested: "",
  dateReceived: "",
  notes: "",
};

const initialBilling: OnboardingBilling = {
  currentBillingModel: "",
  billingCompanyName: "",
  mainBillingContactName: "",
  mainBillingContactEmail: "",
  mainBillingContactPhone: "",
  currentlyBilledServices: [],
  activePayers: "",
  eftEraSetup: "",
  invoiceRecipient: "",
  invoiceEmail: "",
  preferredReportingCadence: "",
  billingPainPoints: [],
  additionalNotes: "",
};

const initialCredentialing: OnboardingCredentialing = {
  credentialingNeeded: false,
  credentialingFor: [],
  payersToEnroll: "",
  caqhMaintained: false,
  currentCredentialingIssues: [],
  medicarePtanAvailable: "",
  medicaidEnrollmentActive: "",
  additionalNotes: "",
};

const initialTechnology: OnboardingTechnology = {
  ehrSystem: "",
  practiceManagementSystem: "",
  patientPortalAvailable: false,
  patientListExportable: false,
  appointmentListExportable: false,
  apiAccessAvailable: false,
  clearinghouse: "",
  faxPlatform: "",
  phonePlatform: "",
  currentCareManagementPlatform: "",
  itContactName: "",
  itContactEmail: "",
  additionalTechnicalNotes: "",
};

const initialOutreach: OnboardingOutreach = {
  preferredChannels: [],
  patientTextConsent: false,
  preferredLanguages: [],
  interpreterServices: false,
  outreachFromPractice: true,
  approvedOutreachHours: "",
  messagingRequirements: "",
};

const initialLabPharmacy: OnboardingLabPharmacy = {
  preferredLab: "",
  existingLabRelationship: false,
  labInterfaceStatus: "",
  labContactName: "",
  labContactEmail: "",
  pharmacyPartnerName: "",
  pharmacyPartnerInvolved: false,
  additionalNotes: "",
};

const initialCompliance: OnboardingCompliance = {
  hipaaContactName: "",
  hipaaContactEmail: "",
  baaRequired: false,
  securityQuestionnaire: false,
  currentConcerns: [],
  additionalNotes: "",
};

const initialFormData: OnboardingBody = {
  onboardingType: "",
  isAuthorizedPerson: true,
  nonAuthorizedRole: "",
  numberOfPractices: 1,
  numberOfLocations: 1,
  billingManagedCentrally: "",
  credentialingManagedCentrally: "",
  contractingManagedCentrally: "",
  oneMainContact: true,
  legalCompanyName: "",
  dbaName: "",
  organizationType: "",
  taxIdEin: "",
  mainCompanyPhone: "",
  mainCompanyFax: "",
  mainCompanyEmail: "",
  companyWebsite: "",
  companyAddressLine1: "",
  companyAddressLine2: "",
  companyCity: "",
  companyState: "",
  companyZip: "",
  ownershipType: "",
  statesOfOperation: [],
  isLegalContractingEntity: true,
  isBillingEntity: true,
  isCredentialingEntity: true,
  primarySpecialty: "",
  additionalSpecialties: [],
  requestedServices: [],
  primaryServiceToLaunch: "",
  requestedGoLiveDate: "",
  priorityLevel: "",
  servicesForAllPractices: "",
  selectedPractices: [],
  replacingExistingVendor: false,
  currentVendorName: "",
  currentVendorEndDate: "",
  engagementGoals: "",
  isIndividualPractice: false,
  informationAccurate: false,
  authorizeUse: false,
  submittedByName: "",
  submittedByTitle: "",
  submissionDate: "",
  status: "",
  contacts: [{ ...initialContact }],
  practices: [{ ...initialPractice }],
  documents: [],
  billing: { ...initialBilling },
  credentialing: { ...initialCredentialing },
  technology: { ...initialTechnology },
  outreach: { ...initialOutreach },
  labPharmacy: { ...initialLabPharmacy },
  compliance: { ...initialCompliance },
  serviceSetup: {
    requestedServices: [],
    primaryServiceToLaunch: "",
    requestedGoLiveDate: "",
    priorityLevel: "",
    servicesForAllPractices: "",
    selectedPractices: [],
    replacingExistingVendor: false,
    currentVendorName: "",
    currentVendorEndDate: "",
    engagementGoals: "",
  },
  careProgram: {
    programsPlanned: [],
    estimatedEligiblePatients: 0,
    currentEnrolledPatients: 0,
    patientEnrollmentHandler: "",
    monthlyFollowUpHandler: "",
    consentFormsInPlace: false,
    existingCarePlanWorkflow: false,
    patientMinutesTracker: "",
    complianceConcerns: "",
  },
};

function parseNumber(value: string) {
  if (value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(199,231,255,0.95),_transparent_34%),linear-gradient(135deg,_#f4f9ff_0%,_#edf4ef_46%,_#f8efe4_100%)] text-slate-950">
      <div className="relative isolate mx-auto flex min-h-screen max-w-[1600px] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="absolute left-[8%] top-[12%] h-48 w-48 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute bottom-[8%] right-[10%] h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
        </div>
        <section className="relative flex w-full items-start justify-center overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-6xl rounded-[32px] border border-white/70 bg-white/80 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-6">
            <div className="rounded-[28px] bg-[linear-gradient(180deg,_rgba(255,255,255,0.92)_0%,_rgba(245,248,252,0.95)_100%)] p-6 sm:p-8">
              {children}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function baseInputClass(multiline?: boolean) {
  return `w-full rounded-2xl border border-slate-200 bg-white px-4 ${
    multiline ? "py-3" : "py-3"
  } text-sm outline-none transition focus:border-slate-950`;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`${baseInputClass()} ${props.className ?? ""}`.trim()}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${baseInputClass(true)} ${props.className ?? ""}`.trim()}
      rows={props.rows ?? 4}
    />
  );
}

function SelectInput({
  options,
  placeholder = "Select an option",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: Option[];
  placeholder?: string;
}) {
  return (
    <select
      {...props}
      className={`${baseInputClass()} ${props.className ?? ""}`.trim()}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function RadioGroup({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => {
        const checked = value === option.value;
        return (
          <label
            key={`${name}-${option.value}`}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
              checked
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 border-slate-300 text-slate-950 focus:ring-slate-950"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function BooleanRadioGroup({
  name,
  value,
  onChange,
  trueLabel = "Yes",
  falseLabel = "No",
}: {
  name: string;
  value: boolean;
  onChange: (value: boolean) => void;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return (
    <RadioGroup
      name={name}
      value={value ? "yes" : "no"}
      options={[
        { label: trueLabel, value: "yes" },
        { label: falseLabel, value: "no" },
      ]}
      onChange={(nextValue) => onChange(nextValue === "yes")}
    />
  );
}

function CheckboxGroup({
  options,
  values,
  onToggle,
}: {
  options: Option[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => {
        const checked = values.includes(option.value);
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
              checked
                ? "border-slate-900 bg-slate-50 text-slate-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(option.value)}
              className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
            />
            <span>{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function StepBar({
  stepsToRender,
  currentStep,
  maxUnlockedStep,
  onSelect,
}: {
  stepsToRender: Step[];
  currentStep: number;
  maxUnlockedStep: number;
  onSelect: (step: number) => void;
}) {
  return (
    <div className="mb-6 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
      {stepsToRender.map((step) => {
        const active = step.id === currentStep;
        const complete = step.id < currentStep;
        const locked = step.id > maxUnlockedStep;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => {
              if (!locked) onSelect(step.id);
            }}
            disabled={locked}
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              active
                ? "border-slate-950 bg-slate-950 text-white"
                : complete
                  ? "border-slate-300 bg-slate-100 text-slate-800"
                  : locked
                    ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                    : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.22em]">
              Step {step.id}
            </p>
            <p className="mt-2 text-sm font-semibold">{step.title}</p>
          </button>
        );
      })}
    </div>
  );
}

function RepeaterHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      <button
        type="button"
        onClick={onAction}
        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default function OnboardingFormV2() {
  const [formData, setFormData] = useState<OnboardingBody>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      localStorage.setItem("onBoardingId", id);
    }
  }, [id]);

  useEffect(() => {
    if (formData.isIndividualPractice && currentStep === 2) {
      setCurrentStep(3);
    }
  }, [currentStep, formData.isIndividualPractice]);

  const practiceNames = (formData.practices ?? [])
    .map((practice) => practice.practiceName?.trim() ?? "")
    .filter(Boolean);

  const locationNames = (formData.practices ?? []).flatMap((practice) =>
    (practice.locations ?? [])
      .map((location) => location.locationName?.trim() ?? "")
      .filter(Boolean),
  );

  const hasCareProgramsSelected =
    (formData.requestedServices ?? []).some((service) =>
      careProgramServiceValues.includes(service),
    ) || (formData.careProgram?.programsPlanned ?? []).length > 0;
  const visibleSteps = steps.filter(
    (step) => !(formData.isIndividualPractice && step.id === 2),
  );

  function updateField<K extends keyof OnboardingBody>(
    field: K,
    value: OnboardingBody[K],
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function updateNestedField<
    K extends NestedSectionKey,
    F extends keyof NonNullable<OnboardingBody[K]>,
  >(section: K, field: F, value: NonNullable<OnboardingBody[K]>[F]) {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as NonNullable<OnboardingBody[K]>),
        [field]: value,
      },
    }));
  }

  function toggleArrayValue<K extends keyof OnboardingBody>(
    field: K,
    value: string,
  ) {
    const values = ((formData[field] as string[] | undefined) ?? []).slice();
    const nextValues = values.includes(value)
      ? values.filter((entry) => entry !== value)
      : [...values, value];
    updateField(field, nextValues as OnboardingBody[K]);
  }

  function toggleNestedArrayValue<
    K extends NestedSectionKey,
    F extends keyof NonNullable<OnboardingBody[K]>,
  >(section: K, field: F, value: string) {
    const values = (
      ((formData[section] as NonNullable<OnboardingBody[K]> | undefined)?.[
        field
      ] as string[] | undefined) ?? []
    ).slice();
    const nextValues = values.includes(value)
      ? values.filter((entry) => entry !== value)
      : [...values, value];
    updateNestedField(
      section,
      field,
      nextValues as NonNullable<OnboardingBody[K]>[F],
    );
  }

  function updateServiceSetup(
    field:
      | "requestedServices"
      | "primaryServiceToLaunch"
      | "requestedGoLiveDate"
      | "priorityLevel"
      | "servicesForAllPractices"
      | "selectedPractices"
      | "replacingExistingVendor"
      | "currentVendorName"
      | "currentVendorEndDate"
      | "engagementGoals",
    value: string | string[] | boolean,
  ) {
    setFormData((prev) => ({
      ...prev,
      ...(field === "requestedServices"
        ? { requestedServices: value as string[] }
        : {}),
      ...(field === "primaryServiceToLaunch"
        ? { primaryServiceToLaunch: value as string }
        : {}),
      ...(field === "requestedGoLiveDate"
        ? { requestedGoLiveDate: value as string }
        : {}),
      ...(field === "priorityLevel" ? { priorityLevel: value as string } : {}),
      ...(field === "servicesForAllPractices"
        ? { servicesForAllPractices: value as string }
        : {}),
      ...(field === "selectedPractices"
        ? { selectedPractices: value as string[] }
        : {}),
      ...(field === "replacingExistingVendor"
        ? { replacingExistingVendor: value as boolean }
        : {}),
      ...(field === "currentVendorName"
        ? { currentVendorName: value as string }
        : {}),
      ...(field === "currentVendorEndDate"
        ? { currentVendorEndDate: value as string }
        : {}),
      ...(field === "engagementGoals"
        ? { engagementGoals: value as string }
        : {}),
      serviceSetup: {
        ...(prev.serviceSetup ?? {}),
        [field]: value,
      },
    }));
  }

  function toggleService(value: string) {
    const currentServices = formData.requestedServices ?? [];
    const nextServices = currentServices.includes(value)
      ? currentServices.filter((service) => service !== value)
      : [...currentServices, value];
    updateServiceSetup("requestedServices", nextServices);
  }

  function addContact() {
    setFormData((prev) => ({
      ...prev,
      contacts: [...(prev.contacts ?? []), { ...initialContact }],
    }));
  }

  function updateContact<K extends keyof OnboardingContact>(
    index: number,
    field: K,
    value: OnboardingContact[K],
  ) {
    setFormData((prev) => ({
      ...prev,
      contacts: (prev.contacts ?? []).map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      ),
    }));
  }

  function removeContact(index: number) {
    setFormData((prev) => ({
      ...prev,
      contacts: (prev.contacts ?? []).filter(
        (_, contactIndex) => contactIndex !== index,
      ),
    }));
  }

  function addPractice() {
    setFormData((prev) => ({
      ...prev,
      practices: [...(prev.practices ?? []), { ...initialPractice }],
    }));
  }

  function updatePractice<K extends keyof OnboardingPractice>(
    index: number,
    field: K,
    value: OnboardingPractice[K],
  ) {
    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices ?? []).map((practice, practiceIndex) =>
        practiceIndex === index ? { ...practice, [field]: value } : practice,
      ),
    }));
  }

  function removePractice(index: number) {
    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices ?? []).filter(
        (_, practiceIndex) => practiceIndex !== index,
      ),
    }));
  }

  function addLocation(practiceIndex: number) {
    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices ?? []).map((practice, index) =>
        index === practiceIndex
          ? {
              ...practice,
              locations: [
                ...(practice.locations ?? []),
                { ...initialLocation },
              ],
            }
          : practice,
      ),
    }));
  }

  function updateLocation<K extends keyof OnboardingLocation>(
    practiceIndex: number,
    locationIndex: number,
    field: K,
    value: OnboardingLocation[K],
  ) {
    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices ?? []).map((practice, index) =>
        index === practiceIndex
          ? {
              ...practice,
              locations: (practice.locations ?? []).map(
                (location, innerIndex) =>
                  innerIndex === locationIndex
                    ? { ...location, [field]: value }
                    : location,
              ),
            }
          : practice,
      ),
    }));
  }

  function removeLocation(practiceIndex: number, locationIndex: number) {
    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices ?? []).map((practice, index) =>
        index === practiceIndex
          ? {
              ...practice,
              locations: (practice.locations ?? []).filter(
                (_, innerIndex) => innerIndex !== locationIndex,
              ),
            }
          : practice,
      ),
    }));
  }

  function addProvider(practiceIndex: number) {
    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices ?? []).map((practice, index) =>
        index === practiceIndex
          ? {
              ...practice,
              providers: [
                ...(practice.providers ?? []),
                { ...initialProvider },
              ],
            }
          : practice,
      ),
    }));
  }

  function updateProvider<K extends keyof OnboardingProvider>(
    practiceIndex: number,
    providerIndex: number,
    field: K,
    value: OnboardingProvider[K],
  ) {
    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices ?? []).map((practice, index) =>
        index === practiceIndex
          ? {
              ...practice,
              providers: (practice.providers ?? []).map(
                (provider, innerIndex) =>
                  innerIndex === providerIndex
                    ? { ...provider, [field]: value }
                    : provider,
              ),
            }
          : practice,
      ),
    }));
  }

  function removeProvider(practiceIndex: number, providerIndex: number) {
    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices ?? []).map((practice, index) =>
        index === practiceIndex
          ? {
              ...practice,
              providers: (practice.providers ?? []).filter(
                (_, innerIndex) => innerIndex !== providerIndex,
              ),
            }
          : practice,
      ),
    }));
  }

  function addDocument() {
    setFormData((prev) => ({
      ...prev,
      documents: [...(prev.documents ?? []), { ...initialDocument }],
    }));
  }

  function updateDocument<K extends keyof OnboardingDocument>(
    index: number,
    field: K,
    value: OnboardingDocument[K],
  ) {
    setFormData((prev) => ({
      ...prev,
      documents: (prev.documents ?? []).map((document, documentIndex) =>
        documentIndex === index ? { ...document, [field]: value } : document,
      ),
    }));
  }

  function removeDocument(index: number) {
    setFormData((prev) => ({
      ...prev,
      documents: (prev.documents ?? []).filter(
        (_, documentIndex) => documentIndex !== index,
      ),
    }));
  }

  function validateCurrentStep() {
    const errors: string[] = [];

    if (currentStep === 1) {
      if (!formData.onboardingType) errors.push("Onboarding type");
      if (!formData.isAuthorizedPerson && !formData.nonAuthorizedRole) {
        errors.push("Role in onboarding");
      }
    }

    if (currentStep === 2) {
      if (!formData.legalCompanyName) errors.push("Legal company name");
      if (!formData.mainCompanyEmail) errors.push("Main company email");
    }

    if (currentStep === 3) {
      if (!(formData.contacts ?? []).length) {
        errors.push("At least one contact");
      } else {
        const primaryContact = formData.contacts?.[0];
        if (!primaryContact?.fullName) errors.push("Main contact name");
        if (!primaryContact?.contactRole) errors.push("Contact role");
        if (!primaryContact?.email) errors.push("Main contact email");
      }
    }

    if (currentStep === 4) {
      if (!(formData.practices ?? []).length) {
        errors.push("At least one practice");
      } else {
        const firstPractice = formData.practices?.[0];
        if (!firstPractice?.practiceName?.trim()) errors.push("Practice name");
        if (!firstPractice?.practiceType) errors.push("Practice type");
        if (
          !(firstPractice?.locations ?? []).some((location) =>
            location.locationName?.trim(),
          )
        ) {
          errors.push("At least one location");
        }
      }
    }

    if (currentStep === 5) {
      if (!(formData.requestedServices ?? []).length)
        errors.push("Requested services");
      if (!formData.primaryServiceToLaunch)
        errors.push("Primary service to launch");
    }

    if (currentStep === 6) {
      if (!formData.technology?.ehrSystem) errors.push("EHR");
      if (!formData.billing?.currentBillingModel) errors.push("Billing model");
    }

    // if (currentStep === 8) {
    //   if (!formData.informationAccurate) errors.push("Accuracy confirmation");
    //   if (!formData.authorizeUse) errors.push("Authorization confirmation");
    // }

    if (errors.length) {
      toast.error(`Please complete: ${errors.join(", ")}`);
      return false;
    }

    return true;
  }

  function isStepComplete(stepId: number) {
    if (stepId === 1) {
      return (
        !!formData.onboardingType &&
        (!!formData.isAuthorizedPerson || !!formData.nonAuthorizedRole)
      );
    }

    if (stepId === 2) {
      if (formData.isIndividualPractice) return true;
      return !!formData.legalCompanyName && !!formData.mainCompanyEmail;
    }

    if (stepId === 3) {
      const primaryContact = formData.contacts?.[0];
      return !!(
        primaryContact?.fullName &&
        primaryContact?.contactRole &&
        primaryContact?.email
      );
    }

    if (stepId === 4) {
      const firstPractice = formData.practices?.[0];
      return !!(
        firstPractice?.practiceName?.trim() &&
        firstPractice?.practiceType &&
        (firstPractice.locations ?? []).some((location) =>
          location.locationName?.trim(),
        )
      );
    }

    if (stepId === 5) {
      return !!(
        formData.requestedServices?.length && formData.primaryServiceToLaunch
      );
    }

    if (stepId === 6) {
      return !!(
        formData.technology?.ehrSystem && formData.billing?.currentBillingModel
      );
    }

    if (stepId === 8) {
      return !!(formData.informationAccurate && formData.authorizeUse);
    }

    return true;
  }

  function getNextVisibleStep(stepId: number) {
    const currentIndex = visibleSteps.findIndex((step) => step.id === stepId);
    return (
      visibleSteps[Math.min(currentIndex + 1, visibleSteps.length - 1)]?.id ??
      stepId
    );
  }

  function getPrevVisibleStep(stepId: number) {
    const currentIndex = visibleSteps.findIndex((step) => step.id === stepId);
    return visibleSteps[Math.max(currentIndex - 1, 0)]?.id ?? stepId;
  }

  function getMaxUnlockedStep() {
    let unlocked = visibleSteps[0]?.id ?? 1;

    for (let index = 0; index < visibleSteps.length; index += 1) {
      const stepId = visibleSteps[index]?.id;
      if (!stepId) break;
      if (!isStepComplete(stepId)) break;
      unlocked = stepId;
      const nextStepId = visibleSteps[index + 1]?.id;
      if (nextStepId) unlocked = nextStepId;
    }

    return unlocked;
  }

  const maxUnlockedStep = getMaxUnlockedStep();

  function nextStep() {
    if (!validateCurrentStep()) return;
    setCurrentStep((prev) => getNextVisibleStep(prev));
  }

  function prevStep() {
    setCurrentStep((prev) => getPrevVisibleStep(prev));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateCurrentStep()) return;

    if (!formData.informationAccurate) {
      toast.error("Accuracy confirmation");
      return;
    }
    if (!formData.authorizeUse) {
      toast.error("Authorization confirmation");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Submitting your onboarding request...");

    try {
      await createOnboardingFromForm({
        ...formData,
        submissionDate: new Date().toISOString().slice(0, 10),
      });
      toast.success("Onboarding submitted successfully!", { id: loadingToast });
      setIsSubmitted(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to submit onboarding.";
      toast.error(message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-semibold text-slate-950">
            Thank You!
          </h2>
          <p className="mb-8 max-w-md text-slate-600">
            Your onboarding request has been submitted successfully. Our team
            will review your information and follow up shortly.
          </p>
          <button
            type="button"
            onClick={() => {
              setFormData(initialFormData);
              setCurrentStep(1);
              setIsSubmitted(false);
            }}
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Submit Another Request
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-app-sans text-xs uppercase tracking-[0.35em] text-slate-500">
            New Practice
          </p>
          <h2 className="font-app-sans mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            Onboarding Form
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Capture company structure, onboarding scope, operational readiness,
            and compliance details in one flow using the existing onboarding
            API.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-right">
          <p className="text-sm text-slate-600">
            Step {visibleSteps.findIndex((step) => step.id === currentStep) + 1}{" "}
            of {visibleSteps.length}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
            {visibleSteps.find((step) => step.id === currentStep)?.title}
          </p>
        </div>
      </div>

      <StepBar
        stepsToRender={visibleSteps}
        currentStep={currentStep}
        maxUnlockedStep={maxUnlockedStep}
        onSelect={setCurrentStep}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {currentStep === 1 ? (
          <>
            <SectionCard
              title="Client Structure"
              description="This determines how the rest of the onboarding behaves."
            >
              <div className="grid gap-6">
                <Field label="What are you onboarding as?" required>
                  <RadioGroup
                    name="onboardingType"
                    value={formData.onboardingType ?? ""}
                    options={onboardingTypeOptions}
                    onChange={(value) => {
                      updateField("onboardingType", value);
                      updateField(
                        "isIndividualPractice",
                        value === "SINGLE_PRACTICE",
                      );
                    }}
                  />
                </Field>

                <Field label="Are you the authorized person completing this onboarding?">
                  <BooleanRadioGroup
                    name="isAuthorizedPerson"
                    value={formData.isAuthorizedPerson ?? false}
                    onChange={(value) =>
                      updateField("isAuthorizedPerson", value)
                    }
                  />
                </Field>

                {!formData.isAuthorizedPerson ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field
                      label="If no, what is your role in this onboarding?"
                      required
                    >
                      <SelectInput
                        value={formData.nonAuthorizedRole ?? ""}
                        onChange={(event) =>
                          updateField("nonAuthorizedRole", event.target.value)
                        }
                        options={roleOptions}
                      />
                    </Field>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {formData.onboardingType === "MULTI_PRACTICE_ORGANIZATION" ? (
                    <Field label="How many practices are being onboarded?">
                      <TextInput
                        type="number"
                        min={0}
                        value={formData.numberOfPractices ?? 0}
                        onChange={(event) =>
                          updateField(
                            "numberOfPractices",
                            parseNumber(event.target.value),
                          )
                        }
                      />
                    </Field>
                  ) : null}

                  <Field label="How many locations total are being onboarded?">
                    <TextInput
                      type="number"
                      min={0}
                      value={formData.numberOfLocations ?? 0}
                      onChange={(event) =>
                        updateField(
                          "numberOfLocations",
                          parseNumber(event.target.value),
                        )
                      }
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Centralized Operations"
              description="Use these settings to understand parent-level ownership and communication."
            >
              <div className="grid gap-6">
                <Field label="Is billing managed centrally for all practices?">
                  <RadioGroup
                    name="billingManagedCentrally"
                    value={formData.billingManagedCentrally ?? ""}
                    options={centralizationOptions}
                    onChange={(value) =>
                      updateField("billingManagedCentrally", value)
                    }
                  />
                </Field>

                <Field label="Is credentialing managed centrally for all practices?">
                  <RadioGroup
                    name="credentialingManagedCentrally"
                    value={formData.credentialingManagedCentrally ?? ""}
                    options={centralizationOptions}
                    onChange={(value) =>
                      updateField("credentialingManagedCentrally", value)
                    }
                  />
                </Field>

                <Field label="Is contracting managed centrally for all practices?">
                  <RadioGroup
                    name="contractingManagedCentrally"
                    value={formData.contractingManagedCentrally ?? ""}
                    options={centralizationOptions}
                    onChange={(value) =>
                      updateField("contractingManagedCentrally", value)
                    }
                  />
                </Field>

                <Field label="Is there one main contact for all practices?">
                  <BooleanRadioGroup
                    name="oneMainContact"
                    value={formData.oneMainContact ?? false}
                    onChange={(value) => updateField("oneMainContact", value)}
                  />
                </Field>
              </div>
            </SectionCard>
          </>
        ) : null}

        {currentStep === 2 && !formData.isIndividualPractice ? (
          <>
            <SectionCard title="Company / Organization Information">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Legal Company Name" required>
                  <TextInput
                    value={formData.legalCompanyName ?? ""}
                    onChange={(event) =>
                      updateField("legalCompanyName", event.target.value)
                    }
                  />
                </Field>

                <Field label="DBA / Trade Name">
                  <TextInput
                    value={formData.dbaName ?? ""}
                    onChange={(event) =>
                      updateField("dbaName", event.target.value)
                    }
                  />
                </Field>

                <Field label="Organization Type">
                  <SelectInput
                    value={formData.organizationType ?? ""}
                    onChange={(event) =>
                      updateField("organizationType", event.target.value)
                    }
                    options={organizationTypeOptions}
                  />
                </Field>

                <Field label="Tax ID / EIN">
                  <TextInput
                    value={formData.taxIdEin ?? ""}
                    onChange={(event) =>
                      updateField("taxIdEin", event.target.value)
                    }
                  />
                </Field>

                <Field label="Main Company Phone">
                  <TextInput
                    type="tel"
                    value={formData.mainCompanyPhone ?? ""}
                    onChange={(event) =>
                      updateField("mainCompanyPhone", event.target.value)
                    }
                  />
                </Field>

                <Field label="Main Company Fax">
                  <TextInput
                    type="tel"
                    value={formData.mainCompanyFax ?? ""}
                    onChange={(event) =>
                      updateField("mainCompanyFax", event.target.value)
                    }
                  />
                </Field>

                <Field label="Main Company Email" required>
                  <TextInput
                    type="email"
                    value={formData.mainCompanyEmail ?? ""}
                    onChange={(event) =>
                      updateField("mainCompanyEmail", event.target.value)
                    }
                  />
                </Field>

                <Field label="Website">
                  <TextInput
                    type="url"
                    placeholder="https://"
                    value={formData.companyWebsite ?? ""}
                    onChange={(event) =>
                      updateField("companyWebsite", event.target.value)
                    }
                  />
                </Field>

                <Field label="Ownership Type">
                  <SelectInput
                    value={formData.ownershipType ?? ""}
                    onChange={(event) =>
                      updateField("ownershipType", event.target.value)
                    }
                    options={ownershipTypeOptions}
                  />
                </Field>

                <Field label="Primary Specialty">
                  <SelectInput
                    value={formData.primarySpecialty ?? ""}
                    onChange={(event) =>
                      updateField("primarySpecialty", event.target.value)
                    }
                    options={specialtyOptions}
                  />
                </Field>

                <div className="md:col-span-2 lg:col-span-3">
                  <Field label="Additional Specialties">
                    <CheckboxGroup
                      options={specialtyOptions}
                      values={formData.additionalSpecialties ?? []}
                      onToggle={(value) =>
                        toggleArrayValue("additionalSpecialties", value)
                      }
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Business Address">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="md:col-span-2 lg:col-span-3">
                  <Field label="Primary Business Address Line 1">
                    <TextInput
                      value={formData.companyAddressLine1 ?? ""}
                      onChange={(event) =>
                        updateField("companyAddressLine1", event.target.value)
                      }
                    />
                  </Field>
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <Field label="Address Line 2">
                    <TextInput
                      value={formData.companyAddressLine2 ?? ""}
                      onChange={(event) =>
                        updateField("companyAddressLine2", event.target.value)
                      }
                    />
                  </Field>
                </div>

                <Field label="City">
                  <TextInput
                    value={formData.companyCity ?? ""}
                    onChange={(event) =>
                      updateField("companyCity", event.target.value)
                    }
                  />
                </Field>

                <Field label="State">
                  <SelectInput
                    value={formData.companyState ?? ""}
                    onChange={(event) =>
                      updateField("companyState", event.target.value)
                    }
                    options={usStates}
                    placeholder="Select state"
                  />
                </Field>

                <Field label="ZIP Code">
                  <TextInput
                    value={formData.companyZip ?? ""}
                    onChange={(event) =>
                      updateField("companyZip", event.target.value)
                    }
                  />
                </Field>

                <div className="md:col-span-2 lg:col-span-3">
                  <Field label="States of Operation">
                    <CheckboxGroup
                      options={usStates}
                      values={formData.statesOfOperation ?? []}
                      onToggle={(value) =>
                        toggleArrayValue("statesOfOperation", value)
                      }
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Entity Roles">
              <div className="grid gap-6">
                <Field label="Is this the legal contracting entity?">
                  <BooleanRadioGroup
                    name="isLegalContractingEntity"
                    value={formData.isLegalContractingEntity ?? false}
                    onChange={(value) =>
                      updateField("isLegalContractingEntity", value)
                    }
                  />
                </Field>

                <Field label="Is this the billing entity?">
                  <BooleanRadioGroup
                    name="isBillingEntity"
                    value={formData.isBillingEntity ?? false}
                    onChange={(value) => updateField("isBillingEntity", value)}
                  />
                </Field>

                <Field label="Is this the credentialing entity?">
                  <BooleanRadioGroup
                    name="isCredentialingEntity"
                    value={formData.isCredentialingEntity ?? false}
                    onChange={(value) =>
                      updateField("isCredentialingEntity", value)
                    }
                  />
                </Field>
              </div>
            </SectionCard>
          </>
        ) : null}

        {currentStep === 3 ? (
          <SectionCard
            title="Main Contact Information"
            description="Use one or more contacts and assign responsibilities to each."
          >
            <RepeaterHeader
              title="Contacts"
              actionLabel="+ Add Contact"
              onAction={addContact}
            />
            <div className="space-y-4">
              {(formData.contacts ?? []).map((contact, index) => (
                <div
                  key={`contact-${index}`}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <p className="font-medium text-slate-800">
                      Contact {index + 1}
                    </p>
                    {(formData.contacts ?? []).length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        className="text-sm text-red-500"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="Full Name" required={index === 0}>
                      <TextInput
                        value={contact.fullName ?? ""}
                        onChange={(event) =>
                          updateContact(index, "fullName", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="Job Title">
                      <TextInput
                        value={contact.jobTitle ?? ""}
                        onChange={(event) =>
                          updateContact(index, "jobTitle", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="Contact Role" required={index === 0}>
                      <SelectInput
                        value={contact.contactRole ?? ""}
                        onChange={(event) =>
                          updateContact(
                            index,
                            "contactRole",
                            event.target.value,
                          )
                        }
                        options={contactRoleOptions}
                      />
                    </Field>

                    <Field label="Email" required={index === 0}>
                      <TextInput
                        type="email"
                        value={contact.email ?? ""}
                        onChange={(event) =>
                          updateContact(index, "email", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="Phone">
                      <TextInput
                        type="tel"
                        value={contact.phone ?? ""}
                        onChange={(event) =>
                          updateContact(index, "phone", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="Extension">
                      <TextInput
                        value={contact.extension ?? ""}
                        onChange={(event) =>
                          updateContact(index, "extension", event.target.value)
                        }
                      />
                    </Field>

                    <Field label="Preferred Contact Method">
                      <SelectInput
                        value={contact.preferredContactMethod ?? ""}
                        onChange={(event) =>
                          updateContact(
                            index,
                            "preferredContactMethod",
                            event.target.value,
                          )
                        }
                        options={preferredContactOptions}
                      />
                    </Field>

                    <Field label="Best Time to Reach">
                      <SelectInput
                        value={contact.bestTimeToReach ?? ""}
                        onChange={(event) =>
                          updateContact(
                            index,
                            "bestTimeToReach",
                            event.target.value,
                          )
                        }
                        options={bestTimeOptions}
                      />
                    </Field>

                    <div className="lg:col-span-3">
                      <Field label="Additional Responsibilities">
                        <CheckboxGroup
                          options={responsibilityOptions}
                          values={contact.additionalResponsibilities ?? []}
                          onToggle={(value) => {
                            const currentValues =
                              contact.additionalResponsibilities ?? [];
                            const nextValues = currentValues.includes(value)
                              ? currentValues.filter((entry) => entry !== value)
                              : [...currentValues, value];
                            updateContact(
                              index,
                              "additionalResponsibilities",
                              nextValues,
                            );
                          }}
                        />
                      </Field>
                    </div>

                    <div className="lg:col-span-3 grid gap-6 lg:grid-cols-2">
                      <Field label="Is this the primary decision maker?">
                        <BooleanRadioGroup
                          name={`primary-decision-maker-${index}`}
                          value={contact.isPrimaryDecisionMaker ?? false}
                          onChange={(value) =>
                            updateContact(
                              index,
                              "isPrimaryDecisionMaker",
                              value,
                            )
                          }
                        />
                      </Field>

                      <Field label="Can this person sign agreements?">
                        <BooleanRadioGroup
                          name={`can-sign-${index}`}
                          value={contact.canSignAgreements ?? false}
                          onChange={(value) =>
                            updateContact(index, "canSignAgreements", value)
                          }
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {currentStep === 4 ? (
          <SectionCard
            title="Practice Information"
            description="Each practice can include its own locations and providers."
          >
            <RepeaterHeader
              title="Practices"
              actionLabel="+ Add Practice"
              onAction={addPractice}
            />
            <div className="space-y-6">
              {(formData.practices ?? []).map((practice, practiceIndex) => (
                <div
                  key={`practice-${practiceIndex}`}
                  className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
                >
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        Practice {practiceIndex + 1}
                      </p>
                      <p className="text-sm text-slate-500">
                        Capture practice demographics, locations, and providers.
                      </p>
                    </div>
                    {(formData.practices ?? []).length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removePractice(practiceIndex)}
                        className="text-sm text-red-500"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="Practice Name" required>
                      <TextInput
                        value={practice.practiceName ?? ""}
                        onChange={(event) =>
                          updatePractice(
                            practiceIndex,
                            "practiceName",
                            event.target.value,
                          )
                        }
                      />
                    </Field>

                    <Field label="Practice DBA Name">
                      <TextInput
                        value={practice.practiceDbaName ?? ""}
                        onChange={(event) =>
                          updatePractice(
                            practiceIndex,
                            "practiceDbaName",
                            event.target.value,
                          )
                        }
                      />
                    </Field>

                    <Field label="Practice Type" required={practiceIndex === 0}>
                      <SelectInput
                        value={practice.practiceType ?? ""}
                        onChange={(event) =>
                          updatePractice(
                            practiceIndex,
                            "practiceType",
                            event.target.value,
                          )
                        }
                        options={specialtyOptions}
                      />
                    </Field>

                    <Field label="Group NPI">
                      <TextInput
                        value={practice.groupNpi ?? ""}
                        onChange={(event) =>
                          updatePractice(
                            practiceIndex,
                            "groupNpi",
                            event.target.value,
                          )
                        }
                      />
                    </Field>

                    <Field label="Tax ID / EIN Used for This Practice">
                      <TextInput
                        value={practice.taxIdEin ?? ""}
                        onChange={(event) =>
                          updatePractice(
                            practiceIndex,
                            "taxIdEin",
                            event.target.value,
                          )
                        }
                      />
                    </Field>

                    <Field label="Is this practice part of a parent company?">
                      <BooleanRadioGroup
                        name={`parent-company-${practiceIndex}`}
                        value={practice.isPartOfParentCompany ?? false}
                        onChange={(value) =>
                          updatePractice(
                            practiceIndex,
                            "isPartOfParentCompany",
                            value,
                          )
                        }
                      />
                    </Field>

                    <Field label="Approximate Number of Providers">
                      <TextInput
                        type="number"
                        min={0}
                        value={practice.approximateNumberOfProviders ?? 0}
                        onChange={(event) =>
                          updatePractice(
                            practiceIndex,
                            "approximateNumberOfProviders",
                            parseNumber(event.target.value),
                          )
                        }
                      />
                    </Field>

                    <Field label="Approximate Number of Locations">
                      <TextInput
                        type="number"
                        min={0}
                        value={practice.approximateNumberOfLocations ?? 0}
                        onChange={(event) =>
                          updatePractice(
                            practiceIndex,
                            "approximateNumberOfLocations",
                            parseNumber(event.target.value),
                          )
                        }
                      />
                    </Field>

                    <Field label="Approximate Monthly Patient Volume">
                      <TextInput
                        type="number"
                        min={0}
                        value={practice.approximateMonthlyPatientVolume ?? 0}
                        onChange={(event) =>
                          updatePractice(
                            practiceIndex,
                            "approximateMonthlyPatientVolume",
                            parseNumber(event.target.value),
                          )
                        }
                      />
                    </Field>

                    <Field label="Approximate Medicare Patient Volume">
                      <TextInput
                        type="number"
                        min={0}
                        value={practice.approximateMedicarePatientVolume ?? 0}
                        onChange={(event) =>
                          updatePractice(
                            practiceIndex,
                            "approximateMedicarePatientVolume",
                            parseNumber(event.target.value),
                          )
                        }
                      />
                    </Field>

                    <Field label="Approximate Medicaid Patient Volume">
                      <TextInput
                        type="number"
                        min={0}
                        value={practice.approximateMedicaidPatientVolume ?? 0}
                        onChange={(event) =>
                          updatePractice(
                            practiceIndex,
                            "approximateMedicaidPatientVolume",
                            parseNumber(event.target.value),
                          )
                        }
                      />
                    </Field>

                    <Field label="Approximate Commercial Patient Volume">
                      <TextInput
                        type="number"
                        min={0}
                        value={practice.approximateCommercialPatientVolume ?? 0}
                        onChange={(event) =>
                          updatePractice(
                            practiceIndex,
                            "approximateCommercialPatientVolume",
                            parseNumber(event.target.value),
                          )
                        }
                      />
                    </Field>

                    <div className="lg:col-span-3">
                      <Field label="Additional Specialty Areas">
                        <CheckboxGroup
                          options={specialtyOptions}
                          values={practice.additionalSpecialtyAreas ?? []}
                          onToggle={(value) => {
                            const values =
                              practice.additionalSpecialtyAreas ?? [];
                            const nextValues = values.includes(value)
                              ? values.filter((entry) => entry !== value)
                              : [...values, value];
                            updatePractice(
                              practiceIndex,
                              "additionalSpecialtyAreas",
                              nextValues,
                            );
                          }}
                        />
                      </Field>
                    </div>

                    <div className="lg:col-span-3">
                      <Field label="Does this practice currently offer care management services?">
                        <BooleanRadioGroup
                          name={`care-management-${practiceIndex}`}
                          value={practice.offersCareManagementServices ?? false}
                          onChange={(value) =>
                            updatePractice(
                              practiceIndex,
                              "offersCareManagementServices",
                              value,
                            )
                          }
                        />
                      </Field>
                    </div>

                    <div className="lg:col-span-3">
                      <Field label="Which services are currently being offered?">
                        <CheckboxGroup
                          options={currentServiceOptions}
                          values={practice.currentServicesOffered ?? []}
                          onToggle={(value) => {
                            const values =
                              practice.currentServicesOffered ?? [];
                            const nextValues = values.includes(value)
                              ? values.filter((entry) => entry !== value)
                              : [...values, value];
                            updatePractice(
                              practiceIndex,
                              "currentServicesOffered",
                              nextValues,
                            );
                          }}
                        />
                      </Field>
                    </div>

                    <div className="lg:col-span-3">
                      <Field label="Current Operational Pain Points">
                        <CheckboxGroup
                          options={painPointOptions}
                          values={practice.operationalPainPoints ?? []}
                          onToggle={(value) => {
                            const values = practice.operationalPainPoints ?? [];
                            const nextValues = values.includes(value)
                              ? values.filter((entry) => entry !== value)
                              : [...values, value];
                            updatePractice(
                              practiceIndex,
                              "operationalPainPoints",
                              nextValues,
                            );
                          }}
                        />
                      </Field>
                    </div>

                    <div className="lg:col-span-3">
                      <Field label="Additional Notes About Practice Needs">
                        <TextArea
                          value={practice.additionalNotes ?? ""}
                          onChange={(event) =>
                            updatePractice(
                              practiceIndex,
                              "additionalNotes",
                              event.target.value,
                            )
                          }
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
                    <RepeaterHeader
                      title="Practice Locations"
                      actionLabel="+ Add Location"
                      onAction={() => addLocation(practiceIndex)}
                    />
                    <div className="space-y-4">
                      {(practice.locations ?? []).map(
                        (location, locationIndex) => (
                          <div
                            key={`location-${practiceIndex}-${locationIndex}`}
                            className="rounded-2xl border border-slate-200 p-4"
                          >
                            <div className="mb-4 flex items-center justify-between gap-4">
                              <p className="font-medium text-slate-800">
                                Location {locationIndex + 1}
                              </p>
                              {(practice.locations ?? []).length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeLocation(practiceIndex, locationIndex)
                                  }
                                  className="text-sm text-red-500"
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                              <Field
                                label="Location Name"
                                required={
                                  practiceIndex === 0 && locationIndex === 0
                                }
                              >
                                <TextInput
                                  value={location.locationName ?? ""}
                                  onChange={(event) =>
                                    updateLocation(
                                      practiceIndex,
                                      locationIndex,
                                      "locationName",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="Is this the primary location?">
                                <BooleanRadioGroup
                                  name={`primary-location-${practiceIndex}-${locationIndex}`}
                                  value={location.isPrimaryLocation ?? false}
                                  onChange={(value) =>
                                    updateLocation(
                                      practiceIndex,
                                      locationIndex,
                                      "isPrimaryLocation",
                                      value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="Office Manager Name">
                                <TextInput
                                  value={location.officeManagerName ?? ""}
                                  onChange={(event) =>
                                    updateLocation(
                                      practiceIndex,
                                      locationIndex,
                                      "officeManagerName",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <div className="md:col-span-2 lg:col-span-3">
                                <Field label="Address Line 1">
                                  <TextInput
                                    value={location.addressLine1 ?? ""}
                                    onChange={(event) =>
                                      updateLocation(
                                        practiceIndex,
                                        locationIndex,
                                        "addressLine1",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </Field>
                              </div>

                              <div className="md:col-span-2 lg:col-span-3">
                                <Field label="Address Line 2">
                                  <TextInput
                                    value={location.addressLine2 ?? ""}
                                    onChange={(event) =>
                                      updateLocation(
                                        practiceIndex,
                                        locationIndex,
                                        "addressLine2",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </Field>
                              </div>

                              <Field label="City">
                                <TextInput
                                  value={location.city ?? ""}
                                  onChange={(event) =>
                                    updateLocation(
                                      practiceIndex,
                                      locationIndex,
                                      "city",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="State">
                                <SelectInput
                                  value={location.state ?? ""}
                                  onChange={(event) =>
                                    updateLocation(
                                      practiceIndex,
                                      locationIndex,
                                      "state",
                                      event.target.value,
                                    )
                                  }
                                  options={usStates}
                                  placeholder="Select state"
                                />
                              </Field>

                              <Field label="ZIP Code">
                                <TextInput
                                  value={location.zipCode ?? ""}
                                  onChange={(event) =>
                                    updateLocation(
                                      practiceIndex,
                                      locationIndex,
                                      "zipCode",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="Main Phone Number">
                                <TextInput
                                  type="tel"
                                  value={location.mainPhoneNumber ?? ""}
                                  onChange={(event) =>
                                    updateLocation(
                                      practiceIndex,
                                      locationIndex,
                                      "mainPhoneNumber",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="Main Fax Number">
                                <TextInput
                                  type="tel"
                                  value={location.mainFaxNumber ?? ""}
                                  onChange={(event) =>
                                    updateLocation(
                                      practiceIndex,
                                      locationIndex,
                                      "mainFaxNumber",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="Office Email">
                                <TextInput
                                  type="email"
                                  value={location.officeEmail ?? ""}
                                  onChange={(event) =>
                                    updateLocation(
                                      practiceIndex,
                                      locationIndex,
                                      "officeEmail",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="Patient Outreach Managed Here or Centrally?">
                                <SelectInput
                                  value={location.patientOutreachManaged ?? ""}
                                  onChange={(event) =>
                                    updateLocation(
                                      practiceIndex,
                                      locationIndex,
                                      "patientOutreachManaged",
                                      event.target.value,
                                    )
                                  }
                                  options={billingLocationOptions}
                                />
                              </Field>

                              <Field label="Billing Managed Here or Centrally?">
                                <SelectInput
                                  value={location.billingManaged ?? ""}
                                  onChange={(event) =>
                                    updateLocation(
                                      practiceIndex,
                                      locationIndex,
                                      "billingManaged",
                                      event.target.value,
                                    )
                                  }
                                  options={billingLocationOptions}
                                />
                              </Field>

                              <div className="lg:col-span-3">
                                <Field label="Hours of Operation">
                                  <TextArea
                                    rows={3}
                                    value={location.hoursOfOperation ?? ""}
                                    onChange={(event) =>
                                      updateLocation(
                                        practiceIndex,
                                        locationIndex,
                                        "hoursOfOperation",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </Field>
                              </div>

                              <div className="lg:col-span-3">
                                <Field label="Notes">
                                  <TextArea
                                    rows={3}
                                    value={location.notes ?? ""}
                                    onChange={(event) =>
                                      updateLocation(
                                        practiceIndex,
                                        locationIndex,
                                        "notes",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </Field>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
                    <RepeaterHeader
                      title="Providers"
                      actionLabel="+ Add Provider"
                      onAction={() => addProvider(practiceIndex)}
                    />
                    <div className="space-y-4">
                      {(practice.providers ?? []).map(
                        (provider, providerIndex) => (
                          <div
                            key={`provider-${practiceIndex}-${providerIndex}`}
                            className="rounded-2xl border border-slate-200 p-4"
                          >
                            <div className="mb-4 flex items-center justify-between gap-4">
                              <p className="font-medium text-slate-800">
                                Provider {providerIndex + 1}
                              </p>
                              {(practice.providers ?? []).length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeProvider(practiceIndex, providerIndex)
                                  }
                                  className="text-sm text-red-500"
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                              <Field label="Provider First Name">
                                <TextInput
                                  value={provider.firstName ?? ""}
                                  onChange={(event) =>
                                    updateProvider(
                                      practiceIndex,
                                      providerIndex,
                                      "firstName",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="Provider Last Name">
                                <TextInput
                                  value={provider.lastName ?? ""}
                                  onChange={(event) =>
                                    updateProvider(
                                      practiceIndex,
                                      providerIndex,
                                      "lastName",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="Credentials">
                                <SelectInput
                                  value={provider.credentials ?? ""}
                                  onChange={(event) =>
                                    updateProvider(
                                      practiceIndex,
                                      providerIndex,
                                      "credentials",
                                      event.target.value,
                                    )
                                  }
                                  options={credentialOptions}
                                />
                              </Field>

                              <Field label="Provider Type">
                                <SelectInput
                                  value={provider.providerType ?? ""}
                                  onChange={(event) =>
                                    updateProvider(
                                      practiceIndex,
                                      providerIndex,
                                      "providerType",
                                      event.target.value,
                                    )
                                  }
                                  options={providerTypeOptions}
                                />
                              </Field>

                              <Field label="Specialty">
                                <SelectInput
                                  value={provider.specialty ?? ""}
                                  onChange={(event) =>
                                    updateProvider(
                                      practiceIndex,
                                      providerIndex,
                                      "specialty",
                                      event.target.value,
                                    )
                                  }
                                  options={specialtyOptions}
                                />
                              </Field>

                              <Field label="Employment Status">
                                <SelectInput
                                  value={provider.employmentStatus ?? ""}
                                  onChange={(event) =>
                                    updateProvider(
                                      practiceIndex,
                                      providerIndex,
                                      "employmentStatus",
                                      event.target.value,
                                    )
                                  }
                                  options={employmentStatusOptions}
                                />
                              </Field>

                              <Field label="NPI">
                                <TextInput
                                  value={provider.npi ?? ""}
                                  onChange={(event) =>
                                    updateProvider(
                                      practiceIndex,
                                      providerIndex,
                                      "npi",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="CAQH ID">
                                <TextInput
                                  value={provider.caqhId ?? ""}
                                  onChange={(event) =>
                                    updateProvider(
                                      practiceIndex,
                                      providerIndex,
                                      "caqhId",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="State License Number">
                                <TextInput
                                  value={provider.stateLicenseNumber ?? ""}
                                  onChange={(event) =>
                                    updateProvider(
                                      practiceIndex,
                                      providerIndex,
                                      "stateLicenseNumber",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="DEA Number">
                                <TextInput
                                  value={provider.deaNumber ?? ""}
                                  onChange={(event) =>
                                    updateProvider(
                                      practiceIndex,
                                      providerIndex,
                                      "deaNumber",
                                      event.target.value,
                                    )
                                  }
                                />
                              </Field>

                              <Field label="Is Credentialing Needed?">
                                <SelectInput
                                  value={provider.credentialingNeeded ?? ""}
                                  onChange={(event) =>
                                    updateProvider(
                                      practiceIndex,
                                      providerIndex,
                                      "credentialingNeeded",
                                      event.target.value,
                                    )
                                  }
                                  options={yesNoMaybeOptions}
                                />
                              </Field>

                              <Field label="Is Recredentialing Needed?">
                                <SelectInput
                                  value={provider.recredentialingNeeded ?? ""}
                                  onChange={(event) =>
                                    updateProvider(
                                      practiceIndex,
                                      providerIndex,
                                      "recredentialingNeeded",
                                      event.target.value,
                                    )
                                  }
                                  options={yesNoMaybeOptions}
                                />
                              </Field>

                              <div className="lg:col-span-3">
                                <Field label="Participating Locations">
                                  <CheckboxGroup
                                    options={locationNames.map((name) => ({
                                      label: name,
                                      value: name,
                                    }))}
                                    values={
                                      provider.participatingLocations ?? []
                                    }
                                    onToggle={(value) => {
                                      const currentValues =
                                        provider.participatingLocations ?? [];
                                      const nextValues = currentValues.includes(
                                        value,
                                      )
                                        ? currentValues.filter(
                                            (entry) => entry !== value,
                                          )
                                        : [...currentValues, value];
                                      updateProvider(
                                        practiceIndex,
                                        providerIndex,
                                        "participatingLocations",
                                        nextValues,
                                      );
                                    }}
                                  />
                                </Field>
                              </div>

                              <div className="lg:col-span-3 grid gap-6 lg:grid-cols-2">
                                <Field label="Board Certified?">
                                  <BooleanRadioGroup
                                    name={`board-certified-${practiceIndex}-${providerIndex}`}
                                    value={provider.boardCertified ?? false}
                                    onChange={(value) =>
                                      updateProvider(
                                        practiceIndex,
                                        providerIndex,
                                        "boardCertified",
                                        value,
                                      )
                                    }
                                  />
                                </Field>
                              </div>

                              <div className="lg:col-span-3">
                                <Field label="Notes">
                                  <TextArea
                                    rows={3}
                                    value={provider.notes ?? ""}
                                    onChange={(event) =>
                                      updateProvider(
                                        practiceIndex,
                                        providerIndex,
                                        "notes",
                                        event.target.value,
                                      )
                                    }
                                  />
                                </Field>
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {currentStep === 5 ? (
          <>
            <SectionCard title="Services Requested / Onboarding Scope">
              <div className="grid gap-6">
                <Field label="Which services are you requesting?" required>
                  <CheckboxGroup
                    options={serviceOptions}
                    values={formData.requestedServices ?? []}
                    onToggle={toggleService}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field
                    label="What is the primary service you want to launch first?"
                    required
                  >
                    <SelectInput
                      value={formData.primaryServiceToLaunch ?? ""}
                      onChange={(event) =>
                        updateServiceSetup(
                          "primaryServiceToLaunch",
                          event.target.value,
                        )
                      }
                      options={serviceOptions}
                    />
                  </Field>

                  <Field label="Requested Go-Live Date">
                    <TextInput
                      type="date"
                      value={formData.requestedGoLiveDate ?? ""}
                      onChange={(event) =>
                        updateServiceSetup(
                          "requestedGoLiveDate",
                          event.target.value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Priority Level">
                    <SelectInput
                      value={formData.priorityLevel ?? ""}
                      onChange={(event) =>
                        updateServiceSetup("priorityLevel", event.target.value)
                      }
                      options={priorityOptions}
                    />
                  </Field>
                </div>

                <Field label="Are these services for all practices or only selected practices?">
                  <RadioGroup
                    name="servicesForAllPractices"
                    value={formData.servicesForAllPractices ?? ""}
                    options={servicePracticeOptions}
                    onChange={(value) =>
                      updateServiceSetup("servicesForAllPractices", value)
                    }
                  />
                </Field>

                {formData.servicesForAllPractices === "SELECTED_PRACTICES" ? (
                  <Field label="If selected practices, which practices?">
                    <CheckboxGroup
                      options={practiceNames.map((name) => ({
                        label: name,
                        value: name,
                      }))}
                      values={formData.selectedPractices ?? []}
                      onToggle={(value) => {
                        const currentValues = formData.selectedPractices ?? [];
                        const nextValues = currentValues.includes(value)
                          ? currentValues.filter((entry) => entry !== value)
                          : [...currentValues, value];
                        updateServiceSetup("selectedPractices", nextValues);
                      }}
                    />
                  </Field>
                ) : null}

                <Field label="Are we replacing an existing vendor?">
                  <BooleanRadioGroup
                    name="replacingExistingVendor"
                    value={formData.replacingExistingVendor ?? false}
                    onChange={(value) =>
                      updateServiceSetup("replacingExistingVendor", value)
                    }
                  />
                </Field>

                {formData.replacingExistingVendor ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Current Vendor Name">
                      <TextInput
                        value={formData.currentVendorName ?? ""}
                        onChange={(event) =>
                          updateServiceSetup(
                            "currentVendorName",
                            event.target.value,
                          )
                        }
                      />
                    </Field>

                    <Field label="Expected Transition / End Date With Current Vendor">
                      <TextInput
                        type="date"
                        value={formData.currentVendorEndDate ?? ""}
                        onChange={(event) =>
                          updateServiceSetup(
                            "currentVendorEndDate",
                            event.target.value,
                          )
                        }
                      />
                    </Field>
                  </div>
                ) : null}

                <Field label="Describe your goals for this engagement">
                  <TextArea
                    value={formData.engagementGoals ?? ""}
                    onChange={(event) =>
                      updateServiceSetup("engagementGoals", event.target.value)
                    }
                  />
                </Field>
              </div>
            </SectionCard>
          </>
        ) : null}

        {currentStep === 6 ? (
          <>
            <SectionCard title="EHR / Billing / Technology Stack">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="EHR System" required>
                  <SelectInput
                    value={formData.technology?.ehrSystem ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "technology",
                        "ehrSystem",
                        event.target.value,
                      )
                    }
                    options={ehrOptions}
                  />
                </Field>

                <Field label="Practice Management System">
                  <TextInput
                    value={formData.technology?.practiceManagementSystem ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "technology",
                        "practiceManagementSystem",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Clearinghouse">
                  <TextInput
                    value={formData.technology?.clearinghouse ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "technology",
                        "clearinghouse",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Fax Platform">
                  <TextInput
                    value={formData.technology?.faxPlatform ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "technology",
                        "faxPlatform",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Phone Platform">
                  <TextInput
                    value={formData.technology?.phonePlatform ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "technology",
                        "phonePlatform",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Current Care Management Platform">
                  <TextInput
                    value={
                      formData.technology?.currentCareManagementPlatform ?? ""
                    }
                    onChange={(event) =>
                      updateNestedField(
                        "technology",
                        "currentCareManagementPlatform",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="IT / Integration Contact Name">
                  <TextInput
                    value={formData.technology?.itContactName ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "technology",
                        "itContactName",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="IT / Integration Contact Email">
                  <TextInput
                    type="email"
                    value={formData.technology?.itContactEmail ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "technology",
                        "itContactEmail",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <div className="lg:col-span-3 grid gap-6 lg:grid-cols-2">
                  <Field label="Patient Portal Available?">
                    <BooleanRadioGroup
                      name="patientPortalAvailable"
                      value={
                        formData.technology?.patientPortalAvailable ?? false
                      }
                      onChange={(value) =>
                        updateNestedField(
                          "technology",
                          "patientPortalAvailable",
                          value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Can patient lists be exported?">
                    <BooleanRadioGroup
                      name="patientListExportable"
                      value={
                        formData.technology?.patientListExportable ?? false
                      }
                      onChange={(value) =>
                        updateNestedField(
                          "technology",
                          "patientListExportable",
                          value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Can appointment lists be exported?">
                    <BooleanRadioGroup
                      name="appointmentListExportable"
                      value={
                        formData.technology?.appointmentListExportable ?? false
                      }
                      onChange={(value) =>
                        updateNestedField(
                          "technology",
                          "appointmentListExportable",
                          value,
                        )
                      }
                    />
                  </Field>

                  <Field label="API Access Available?">
                    <BooleanRadioGroup
                      name="apiAccessAvailable"
                      value={formData.technology?.apiAccessAvailable ?? false}
                      onChange={(value) =>
                        updateNestedField(
                          "technology",
                          "apiAccessAvailable",
                          value,
                        )
                      }
                    />
                  </Field>
                </div>

                <div className="lg:col-span-3">
                  <Field label="Additional Technical Notes">
                    <TextArea
                      value={
                        formData.technology?.additionalTechnicalNotes ?? ""
                      }
                      onChange={(event) =>
                        updateNestedField(
                          "technology",
                          "additionalTechnicalNotes",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Billing / RCM Setup">
              <div className="grid gap-6">
                <Field label="Current Billing Model" required>
                  <RadioGroup
                    name="currentBillingModel"
                    value={formData.billing?.currentBillingModel ?? ""}
                    options={billingModelOptions}
                    onChange={(value) =>
                      updateNestedField("billing", "currentBillingModel", value)
                    }
                  />
                </Field>

                {formData.billing?.currentBillingModel === "OUTSOURCED" ||
                formData.billing?.currentBillingModel === "HYBRID" ? (
                  <Field label="Billing Company Name">
                    <TextInput
                      value={formData.billing?.billingCompanyName ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "billing",
                          "billingCompanyName",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                ) : null}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="Main Billing Contact Name">
                    <TextInput
                      value={formData.billing?.mainBillingContactName ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "billing",
                          "mainBillingContactName",
                          event.target.value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Main Billing Contact Email">
                    <TextInput
                      type="email"
                      value={formData.billing?.mainBillingContactEmail ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "billing",
                          "mainBillingContactEmail",
                          event.target.value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Main Billing Contact Phone">
                    <TextInput
                      type="tel"
                      value={formData.billing?.mainBillingContactPhone ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "billing",
                          "mainBillingContactPhone",
                          event.target.value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Are EFT / ERA already set up?">
                    <SelectInput
                      value={formData.billing?.eftEraSetup ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "billing",
                          "eftEraSetup",
                          event.target.value,
                        )
                      }
                      options={[
                        { label: "Yes", value: "YES" },
                        { label: "No", value: "NO" },
                        { label: "Partially", value: "PARTIALLY" },
                        { label: "Not Sure", value: "NOT_SURE" },
                      ]}
                    />
                  </Field>

                  <Field label="Who should receive invoices?">
                    <TextInput
                      value={formData.billing?.invoiceRecipient ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "billing",
                          "invoiceRecipient",
                          event.target.value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Invoice Email">
                    <TextInput
                      type="email"
                      value={formData.billing?.invoiceEmail ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "billing",
                          "invoiceEmail",
                          event.target.value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Preferred Billing / Reporting Cadence">
                    <SelectInput
                      value={formData.billing?.preferredReportingCadence ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "billing",
                          "preferredReportingCadence",
                          event.target.value,
                        )
                      }
                      options={reportingCadenceOptions}
                    />
                  </Field>
                </div>

                <Field label="Are APCM / CCM / RPM / PCM / BHI currently billed today?">
                  <CheckboxGroup
                    options={[
                      { label: "APCM", value: "APCM" },
                      { label: "CCM", value: "CCM" },
                      { label: "RPM", value: "RPM" },
                      { label: "PCM", value: "PCM" },
                      { label: "BHI", value: "BHI" },
                      { label: "RTM", value: "RTM" },
                      { label: "None", value: "NONE" },
                      { label: "Not Sure", value: "NOT_SURE" },
                    ]}
                    values={formData.billing?.currentlyBilledServices ?? []}
                    onToggle={(value) =>
                      toggleNestedArrayValue(
                        "billing",
                        "currentlyBilledServices",
                        value,
                      )
                    }
                  />
                </Field>

                <Field label="Which payers are active?">
                  <TextArea
                    value={formData.billing?.activePayers ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "billing",
                        "activePayers",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Current Billing Pain Points">
                  <CheckboxGroup
                    options={billingPainPointOptions}
                    values={formData.billing?.billingPainPoints ?? []}
                    onToggle={(value) =>
                      toggleNestedArrayValue(
                        "billing",
                        "billingPainPoints",
                        value,
                      )
                    }
                  />
                </Field>

                <Field label="Additional Billing Notes">
                  <TextArea
                    value={formData.billing?.additionalNotes ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "billing",
                        "additionalNotes",
                        event.target.value,
                      )
                    }
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Credentialing / Payer Enrollment">
              <div className="grid gap-6">
                <Field label="Is credentialing needed?">
                  <BooleanRadioGroup
                    name="credentialingNeeded"
                    value={formData.credentialing?.credentialingNeeded ?? false}
                    onChange={(value) =>
                      updateNestedField(
                        "credentialing",
                        "credentialingNeeded",
                        value,
                      )
                    }
                  />
                </Field>

                {formData.credentialing?.credentialingNeeded ? (
                  <Field label="Credentialing Needed For">
                    <CheckboxGroup
                      options={credentialingForOptions}
                      values={formData.credentialing?.credentialingFor ?? []}
                      onToggle={(value) =>
                        toggleNestedArrayValue(
                          "credentialing",
                          "credentialingFor",
                          value,
                        )
                      }
                    />
                  </Field>
                ) : null}

                <Field label="List of Payers to Enroll / Update">
                  <TextArea
                    value={formData.credentialing?.payersToEnroll ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "credentialing",
                        "payersToEnroll",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="Medicare PTAN Available?">
                    <SelectInput
                      value={
                        formData.credentialing?.medicarePtanAvailable ?? ""
                      }
                      onChange={(event) =>
                        updateNestedField(
                          "credentialing",
                          "medicarePtanAvailable",
                          event.target.value,
                        )
                      }
                      options={yesNoMaybeOptions}
                    />
                  </Field>

                  <Field label="Medicaid Enrollment Active?">
                    <SelectInput
                      value={
                        formData.credentialing?.medicaidEnrollmentActive ?? ""
                      }
                      onChange={(event) =>
                        updateNestedField(
                          "credentialing",
                          "medicaidEnrollmentActive",
                          event.target.value,
                        )
                      }
                      options={yesNoMaybeOptions}
                    />
                  </Field>

                  <Field label="Is CAQH currently maintained?">
                    <BooleanRadioGroup
                      name="caqhMaintained"
                      value={formData.credentialing?.caqhMaintained ?? false}
                      onChange={(value) =>
                        updateNestedField(
                          "credentialing",
                          "caqhMaintained",
                          value,
                        )
                      }
                    />
                  </Field>
                </div>

                <Field label="Are there any current credentialing issues?">
                  <CheckboxGroup
                    options={credentialingIssueOptions}
                    values={
                      formData.credentialing?.currentCredentialingIssues ?? []
                    }
                    onToggle={(value) =>
                      toggleNestedArrayValue(
                        "credentialing",
                        "currentCredentialingIssues",
                        value,
                      )
                    }
                  />
                </Field>

                <Field label="Additional Credentialing Notes">
                  <TextArea
                    value={formData.credentialing?.additionalNotes ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "credentialing",
                        "additionalNotes",
                        event.target.value,
                      )
                    }
                  />
                </Field>
              </div>
            </SectionCard>
          </>
        ) : null}

        {currentStep === 7 ? (
          <>
            {hasCareProgramsSelected ? (
              <SectionCard title="Care Program Readiness">
                <div className="grid gap-6">
                  <Field label="Which programs are you planning to implement?">
                    <CheckboxGroup
                      options={serviceOptions.filter((option) =>
                        careProgramServiceValues.includes(option.value),
                      )}
                      values={formData.careProgram?.programsPlanned ?? []}
                      onToggle={(value) => {
                        const values =
                          formData.careProgram?.programsPlanned ?? [];
                        const nextValues = values.includes(value)
                          ? values.filter((entry) => entry !== value)
                          : [...values, value];
                        setFormData((prev) => ({
                          ...prev,
                          careProgram: {
                            ...(prev.careProgram ?? {}),
                            programsPlanned: nextValues,
                          },
                        }));
                      }}
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="Estimated Eligible Patient Count">
                      <TextInput
                        type="number"
                        min={0}
                        value={
                          formData.careProgram?.estimatedEligiblePatients ?? 0
                        }
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            careProgram: {
                              ...(prev.careProgram ?? {}),
                              estimatedEligiblePatients: parseNumber(
                                event.target.value,
                              ),
                            },
                          }))
                        }
                      />
                    </Field>

                    <Field label="Current Enrolled Patient Count">
                      <TextInput
                        type="number"
                        min={0}
                        value={
                          formData.careProgram?.currentEnrolledPatients ?? 0
                        }
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            careProgram: {
                              ...(prev.careProgram ?? {}),
                              currentEnrolledPatients: parseNumber(
                                event.target.value,
                              ),
                            },
                          }))
                        }
                      />
                    </Field>

                    <Field label="How are patient minutes tracked today?">
                      <SelectInput
                        value={
                          formData.careProgram?.patientMinutesTracker ?? ""
                        }
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            careProgram: {
                              ...(prev.careProgram ?? {}),
                              patientMinutesTracker: event.target.value,
                            },
                          }))
                        }
                        options={minutesTrackerOptions}
                      />
                    </Field>

                    <Field label="Who currently handles patient enrollment?">
                      <SelectInput
                        value={
                          formData.careProgram?.patientEnrollmentHandler ?? ""
                        }
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            careProgram: {
                              ...(prev.careProgram ?? {}),
                              patientEnrollmentHandler: event.target.value,
                            },
                          }))
                        }
                        options={careHandlerOptions}
                      />
                    </Field>

                    <Field label="Who currently handles monthly follow-up?">
                      <SelectInput
                        value={
                          formData.careProgram?.monthlyFollowUpHandler ?? ""
                        }
                        onChange={(event) =>
                          setFormData((prev) => ({
                            ...prev,
                            careProgram: {
                              ...(prev.careProgram ?? {}),
                              monthlyFollowUpHandler: event.target.value,
                            },
                          }))
                        }
                        options={careHandlerOptions}
                      />
                    </Field>

                    <Field label="Are consent forms already in place?">
                      <BooleanRadioGroup
                        name="consentFormsInPlace"
                        value={
                          formData.careProgram?.consentFormsInPlace ?? false
                        }
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            careProgram: {
                              ...(prev.careProgram ?? {}),
                              consentFormsInPlace: value,
                            },
                          }))
                        }
                      />
                    </Field>

                    <Field label="Is there an existing care plan workflow?">
                      <BooleanRadioGroup
                        name="existingCarePlanWorkflow"
                        value={
                          formData.careProgram?.existingCarePlanWorkflow ??
                          false
                        }
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            careProgram: {
                              ...(prev.careProgram ?? {}),
                              existingCarePlanWorkflow: value,
                            },
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Any compliance or operational concerns?">
                    <TextArea
                      value={formData.careProgram?.complianceConcerns ?? ""}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          careProgram: {
                            ...(prev.careProgram ?? {}),
                            complianceConcerns: event.target.value,
                          },
                        }))
                      }
                    />
                  </Field>
                </div>
              </SectionCard>
            ) : null}

            <SectionCard title="Patient Communication / Outreach">
              <div className="grid gap-6">
                <Field label="Preferred Outreach Channels">
                  <CheckboxGroup
                    options={outreachChannelOptions}
                    values={formData.outreach?.preferredChannels ?? []}
                    onToggle={(value) =>
                      toggleNestedArrayValue(
                        "outreach",
                        "preferredChannels",
                        value,
                      )
                    }
                  />
                </Field>

                <Field label="Preferred Outreach Language(s)">
                  <CheckboxGroup
                    options={languageOptions}
                    values={formData.outreach?.preferredLanguages ?? []}
                    onToggle={(value) =>
                      toggleNestedArrayValue(
                        "outreach",
                        "preferredLanguages",
                        value,
                      )
                    }
                  />
                </Field>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Field label="Is patient text consent available?">
                    <BooleanRadioGroup
                      name="patientTextConsent"
                      value={formData.outreach?.patientTextConsent ?? false}
                      onChange={(value) =>
                        updateNestedField(
                          "outreach",
                          "patientTextConsent",
                          value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Are interpreter services needed?">
                    <BooleanRadioGroup
                      name="interpreterServices"
                      value={formData.outreach?.interpreterServices ?? false}
                      onChange={(value) =>
                        updateNestedField(
                          "outreach",
                          "interpreterServices",
                          value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Should outreach appear to come from the practice?">
                    <BooleanRadioGroup
                      name="outreachFromPractice"
                      value={formData.outreach?.outreachFromPractice ?? true}
                      onChange={(value) =>
                        updateNestedField(
                          "outreach",
                          "outreachFromPractice",
                          value,
                        )
                      }
                    />
                  </Field>
                </div>

                <Field label="Approved Calling / Outreach Hours">
                  <TextArea
                    rows={3}
                    value={formData.outreach?.approvedOutreachHours ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "outreach",
                        "approvedOutreachHours",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Any messaging / scripting requirements?">
                  <TextArea
                    value={formData.outreach?.messagingRequirements ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "outreach",
                        "messagingRequirements",
                        event.target.value,
                      )
                    }
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard title="Laboratory / Pharmacy / External Relationships">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Field label="Preferred Lab">
                  <TextInput
                    value={formData.labPharmacy?.preferredLab ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "labPharmacy",
                        "preferredLab",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Lab Interface Status">
                  <SelectInput
                    value={formData.labPharmacy?.labInterfaceStatus ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "labPharmacy",
                        "labInterfaceStatus",
                        event.target.value,
                      )
                    }
                    options={labStatusOptions}
                  />
                </Field>

                <Field label="Pharmacy Partner Name">
                  <TextInput
                    value={formData.labPharmacy?.pharmacyPartnerName ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "labPharmacy",
                        "pharmacyPartnerName",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Lab Contact Name">
                  <TextInput
                    value={formData.labPharmacy?.labContactName ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "labPharmacy",
                        "labContactName",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <Field label="Lab Contact Email">
                  <TextInput
                    type="email"
                    value={formData.labPharmacy?.labContactEmail ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "labPharmacy",
                        "labContactEmail",
                        event.target.value,
                      )
                    }
                  />
                </Field>

                <div className="lg:col-span-3 grid gap-6 lg:grid-cols-2">
                  <Field label="Existing Lab Relationship in Place?">
                    <BooleanRadioGroup
                      name="existingLabRelationship"
                      value={
                        formData.labPharmacy?.existingLabRelationship ?? false
                      }
                      onChange={(value) =>
                        updateNestedField(
                          "labPharmacy",
                          "existingLabRelationship",
                          value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Is a pharmacy partner already involved?">
                    <BooleanRadioGroup
                      name="pharmacyPartnerInvolved"
                      value={
                        formData.labPharmacy?.pharmacyPartnerInvolved ?? false
                      }
                      onChange={(value) =>
                        updateNestedField(
                          "labPharmacy",
                          "pharmacyPartnerInvolved",
                          value,
                        )
                      }
                    />
                  </Field>
                </div>

                <div className="lg:col-span-3">
                  <Field label="Additional Vendor / Partner Notes">
                    <TextArea
                      value={formData.labPharmacy?.additionalNotes ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "labPharmacy",
                          "additionalNotes",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Compliance / Legal">
              <div className="grid gap-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="HIPAA / Privacy Contact Name">
                    <TextInput
                      value={formData.compliance?.hipaaContactName ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "compliance",
                          "hipaaContactName",
                          event.target.value,
                        )
                      }
                    />
                  </Field>

                  <Field label="HIPAA / Privacy Contact Email">
                    <TextInput
                      type="email"
                      value={formData.compliance?.hipaaContactEmail ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "compliance",
                          "hipaaContactEmail",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <Field label="Is a BAA required?">
                    <BooleanRadioGroup
                      name="baaRequired"
                      value={formData.compliance?.baaRequired ?? false}
                      onChange={(value) =>
                        updateNestedField("compliance", "baaRequired", value)
                      }
                    />
                  </Field>

                  <Field label="Is a security questionnaire required?">
                    <BooleanRadioGroup
                      name="securityQuestionnaire"
                      value={
                        formData.compliance?.securityQuestionnaire ?? false
                      }
                      onChange={(value) =>
                        updateNestedField(
                          "compliance",
                          "securityQuestionnaire",
                          value,
                        )
                      }
                    />
                  </Field>
                </div>

                <Field label="Any current compliance concerns?">
                  <CheckboxGroup
                    options={complianceConcernOptions}
                    values={formData.compliance?.currentConcerns ?? []}
                    onToggle={(value) =>
                      toggleNestedArrayValue(
                        "compliance",
                        "currentConcerns",
                        value,
                      )
                    }
                  />
                </Field>

                <Field label="Additional Compliance Notes">
                  <TextArea
                    value={formData.compliance?.additionalNotes ?? ""}
                    onChange={(event) =>
                      updateNestedField(
                        "compliance",
                        "additionalNotes",
                        event.target.value,
                      )
                    }
                  />
                </Field>
              </div>
            </SectionCard>
          </>
        ) : null}

        {currentStep === 8 ? (
          <>
            <SectionCard
              title="Document Checklist"
              description="The current onboarding API accepts document metadata, so this section records required documents and tracking notes."
            >
              <RepeaterHeader
                title="Documents"
                actionLabel="+ Add Document"
                onAction={addDocument}
              />
              <div className="space-y-4">
                {(formData.documents ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No documents added yet. Use this section to track W-9s,
                    agreements, rosters, CAQH files, and other onboarding
                    materials.
                  </p>
                ) : null}

                {(formData.documents ?? []).map((document, index) => (
                  <div
                    key={`document-${index}`}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <p className="font-medium text-slate-800">
                        Document {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-sm text-red-500"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <Field label="Document Type">
                        <SelectInput
                          value={document.documentType ?? ""}
                          onChange={(event) =>
                            updateDocument(
                              index,
                              "documentType",
                              event.target.value,
                            )
                          }
                          options={documentTypeOptions}
                        />
                      </Field>

                      <Field label="Reference / File Name">
                        <TextInput
                          value={document.fileName ?? ""}
                          onChange={(event) =>
                            updateDocument(
                              index,
                              "fileName",
                              event.target.value,
                            )
                          }
                        />
                      </Field>

                      <Field label="File URL">
                        <TextInput
                          type="url"
                          placeholder="https://"
                          value={document.fileUrl ?? ""}
                          onChange={(event) =>
                            updateDocument(index, "fileUrl", event.target.value)
                          }
                        />
                      </Field>

                      <Field label="Status">
                        <SelectInput
                          value={document.status ?? ""}
                          onChange={(event) =>
                            updateDocument(index, "status", event.target.value)
                          }
                          options={documentStatusOptions}
                        />
                      </Field>

                      <Field label="Date Requested">
                        <TextInput
                          type="date"
                          value={document.dateRequested ?? ""}
                          onChange={(event) =>
                            updateDocument(
                              index,
                              "dateRequested",
                              event.target.value,
                            )
                          }
                        />
                      </Field>

                      <Field label="Date Received">
                        <TextInput
                          type="date"
                          value={document.dateReceived ?? ""}
                          onChange={(event) =>
                            updateDocument(
                              index,
                              "dateReceived",
                              event.target.value,
                            )
                          }
                        />
                      </Field>

                      <div className="lg:col-span-3 grid gap-6 lg:grid-cols-2">
                        <Field label="Required?">
                          <BooleanRadioGroup
                            name={`document-required-${index}`}
                            value={document.required ?? false}
                            onChange={(value) =>
                              updateDocument(index, "required", value)
                            }
                          />
                        </Field>
                      </div>

                      <div className="lg:col-span-3">
                        <Field label="Notes">
                          <TextArea
                            rows={3}
                            value={document.notes ?? ""}
                            onChange={(event) =>
                              updateDocument(index, "notes", event.target.value)
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Final Review / Submission">
              <div className="grid gap-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Name of person submitting">
                    <TextInput
                      value={formData.submittedByName ?? ""}
                      onChange={(event) =>
                        updateField("submittedByName", event.target.value)
                      }
                    />
                  </Field>

                  <Field label="Title of person submitting">
                    <TextInput
                      value={formData.submittedByTitle ?? ""}
                      onChange={(event) =>
                        updateField("submittedByTitle", event.target.value)
                      }
                    />
                  </Field>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <input
                    type="checkbox"
                    checked={formData.informationAccurate ?? false}
                    onChange={(event) =>
                      updateField("informationAccurate", event.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
                  />
                  <span className="text-sm text-slate-700">
                    I confirm the information provided is accurate to the best
                    of my knowledge. <span className="text-red-500"> *</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <input
                    type="checkbox"
                    checked={formData.authorizeUse ?? false}
                    onChange={(event) =>
                      updateField("authorizeUse", event.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
                  />
                  <span className="text-sm text-slate-700">
                    I authorize the use of this information for onboarding and
                    service setup. <span className="text-red-500"> *</span>
                  </span>
                </label>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Review highlights before submission:
                  <ul className="mt-3 list-disc space-y-1 pl-5">
                    <li>
                      {formData.legalCompanyName ||
                        "No company name entered yet"}
                      .
                    </li>
                    <li>
                      {(formData.contacts ?? []).length} contact(s) captured.
                    </li>
                    <li>
                      {(formData.practices ?? []).length} practice record(s)
                      captured.
                    </li>
                    <li>
                      {(formData.requestedServices ?? []).length} requested
                      service(s) selected.
                    </li>
                  </ul>
                </div>
              </div>
            </SectionCard>
          </>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            {currentStep !== visibleSteps[visibleSteps.length - 1]?.id ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!isStepComplete(currentStep)}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Submitting..." : "Submit Onboarding"}
              </button>
            )}
          </div>
        </div>
      </form>
    </Shell>
  );
}
