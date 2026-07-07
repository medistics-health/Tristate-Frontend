import { useEffect, useRef, useState } from "react";
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
  OnboardingMarketing,
  OnboardingOutreach,
  Onboarding,
  OnboardingPractice,
  OnboardingProvider,
  OnboardingTechnology,
} from "../../services/operations/onboarding";
import {
  createExternalOnboardingFromForm,
  createOnboardingFromForm,
} from "../../services/operations/createOnboardingForm";
import {
  deleteExternalOnboardingDocument,
  getExternalOnboardingByPracticeId,
  uploadExternalOnboardingDocument,
} from "../../services/operations/onboarding";

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
  | "compliance"
  | "marketing";

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
  {
    label: "Company / Organization with single practice ",
    value: "SINGLE_PRACTICE_ORGANIZATION",
  },
  {
    label: "Company / Organization with multiple practices",
    value: "MULTI_PRACTICE_ORGANIZATION",
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
  { label: "Care Management", value: "CARE_MANAGEMENT" },
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
  "CARE_MANAGEMENT",
  "APCM",
  "CCM",
  "RPM",
  "PCM",
  "RTM",
  "BHI",
  "TCM",
];

const subCareProgramValues = careProgramServiceValues.filter(
  (v) => v !== "CARE_MANAGEMENT",
);

const marketingServiceValues = [
  "PATIENT_ACQUISITION",
  "BRAND_GROWTH",
  "AI_VISIBILITY",
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

const genderOptions: Option[] = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
  { label: "Prefer not to say", value: "PREFER_NOT_TO_SAY" },
];

const credentialsByProviderType: Record<string, Option[]> = {
  PHYSICIAN: [
    { label: "MD", value: "MD" },
    { label: "DO", value: "DO" },
    { label: "Other", value: "OTHER" },
  ],
  NURSE_PRACTITIONER: [
    { label: "NP", value: "NP" },
    { label: "Other", value: "OTHER" },
  ],
  PHYSICIAN_ASSISTANT: [
    { label: "PA", value: "PA" },
    { label: "Other", value: "OTHER" },
  ],
  BEHAVIORAL_HEALTH_PROVIDER: [
    { label: "LCSW", value: "LCSW" },
    { label: "Psychologist", value: "PSYCHOLOGIST" },
    { label: "RN", value: "RN" },
    { label: "Other", value: "OTHER" },
  ],
  CARE_MANAGER: [
    { label: "RN", value: "RN" },
    { label: "Other", value: "OTHER" },
  ],
  OTHER: [
    { label: "MD", value: "MD" },
    { label: "DO", value: "DO" },
    { label: "NP", value: "NP" },
    { label: "PA", value: "PA" },
    { label: "RN", value: "RN" },
    { label: "LCSW", value: "LCSW" },
    { label: "Psychologist", value: "PSYCHOLOGIST" },
    { label: "Other", value: "OTHER" },
  ],
};

const specialtyByProviderType: Record<string, Option[]> = {
  PHYSICIAN: [
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
    { label: "Other", value: "OTHER" },
  ],
  NURSE_PRACTITIONER: [
    { label: "Family Medicine", value: "FAMILY_MEDICINE" },
    { label: "Internal Medicine", value: "INTERNAL_MEDICINE" },
    { label: "Primary Care", value: "PRIMARY_CARE" },
    { label: "Pediatrics", value: "PEDIATRICS" },
    {
      label: "Psychiatry / Behavioral Health",
      value: "PSYCHIATRY_BEHAVIORAL_HEALTH",
    },
    { label: "Other", value: "OTHER" },
  ],
  PHYSICIAN_ASSISTANT: [
    { label: "Family Medicine", value: "FAMILY_MEDICINE" },
    { label: "Internal Medicine", value: "INTERNAL_MEDICINE" },
    { label: "Primary Care", value: "PRIMARY_CARE" },
    { label: "Pediatrics", value: "PEDIATRICS" },
    {
      label: "Psychiatry / Behavioral Health",
      value: "PSYCHIATRY_BEHAVIORAL_HEALTH",
    },
    { label: "Other", value: "OTHER" },
  ],
  BEHAVIORAL_HEALTH_PROVIDER: [
    {
      label: "Psychiatry / Behavioral Health",
      value: "PSYCHIATRY_BEHAVIORAL_HEALTH",
    },
    { label: "Other", value: "OTHER" },
  ],
  CARE_MANAGER: [
    { label: "Primary Care", value: "PRIMARY_CARE" },
    { label: "Other", value: "OTHER" },
  ],
  OTHER: [
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
    { label: "Other", value: "OTHER" },
  ],
};

type ProviderDocumentField =
  | "copyOfBoardCertification"
  | "copyOfProfessionalLiabilityInsurance"
  | "copyOfBachelorsDegree"
  | "copyOfMastersDegree"
  | "copyOfSocialSecurityCard"
  | "copyOfDriversLicense"
  | "passportSizedPhoto"
  | "resume"
  | "voidedCheck";

const providerDocumentFieldOptions: Array<
  Option & { value: ProviderDocumentField }
> = [
  {
    label: "Professional Liability Insurance (PLI)",
    value: "copyOfProfessionalLiabilityInsurance",
  },
  {
    label: "Bachelor's Degree",
    value: "copyOfBachelorsDegree",
  },
  {
    label: "Master's Degree",
    value: "copyOfMastersDegree",
  },
  {
    label: "Social Security Card (required for credentialing)",
    value: "copyOfSocialSecurityCard",
  },
  {
    label: "Driver's License",
    value: "copyOfDriversLicense",
  },
  {
    label: "Passport-sized Photo",
    value: "passportSizedPhoto",
  },
  {
    label: "Resume (with MM/DD/YYYY format)",
    value: "resume",
  },
  {
    label: "Voided Check",
    value: "voidedCheck",
  },
];

function isValidCompanyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.com$/i.test(value.trim());
}

function isValidWebsite(value: string) {
  try {
    const url = new URL(value.trim());
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.includes(".")
    );
  } catch {
    return false;
  }
}

function isValidZipCode(value: string) {
  return /^\d{5}(?:-\d{4})?$/.test(value.trim());
}

function isValidTenDigitPhone(value: string) {
  return value.replace(/\D/g, "").length === 10;
}

function isDocumentReceivedAfterRequested(
  dateRequested?: string,
  dateReceived?: string,
) {
  const requested = dateRequested?.trim() ?? "";
  const received = dateReceived?.trim() ?? "";

  if (!requested || !received) return true;

  return received > requested;
}

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

const clearinghouseOptions: Option[] = [
  { label: "Availity", value: "AVAILITY" },
  { label: "Waystar/NextGen", value: "WAYSTAR/NEXTGEN" },
  { label: "Optum / Change Healthcare", value: "OPTUM/CHANGE_HEALTHCARE" },
  { label: "Office Ally", value: "OFFICE_ALLY" },
  { label: "TriZetto", value: "TRIZETTO" },
  { label: "Waystar", value: "WAYSTAR" },
  { label: "Claim.MD", value: "CLAIM.MD" },
  {
    label: "Ensora Clearinghouse (formerly Apex EDI)",
    value: "ENSORA_CLEARINGHOUSE",
  },
  { label: "Stedi", value: "STEDI" },
  { label: "PracticeSuite", value: "PRACTICESUITE" },
  { label: "ClaimRemed", value: "CLAIMREMED" },
  { label: "Kareo / Tebra", value: "KAREO_TEBRA" },
  { label: "RXNT", value: "RXNT" },
  { label: "Other", value: "OTHER" },
];

function isPresetClearinghouse(value: string) {
  return clearinghouseOptions.some((option) => option.value === value);
}

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

// const billingPainPointOptions: Option[] = [
//   { label: "Denials", value: "DENIALS" },
//   { label: "Slow Payments", value: "SLOW_PAYMENTS" },
//   { label: "Coding Issues", value: "CODING_ISSUES" },
//   { label: "Credentialing Issues", value: "CREDENTIALING_ISSUES" },
//   { label: "Eligibility Issues", value: "ELIGIBILITY_ISSUES" },
//   { label: "Poor Reporting", value: "POOR_REPORTING" },
//   { label: "Staff Shortage", value: "STAFF_SHORTAGE" },
//   { label: "A/R Follow-Up", value: "AR_FOLLOW_UP" },
//   { label: "Other", value: "OTHER" },
// ];

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
  {
    id: 3,
    title: "Practices",
    description: "Practices and locations",
  },
  {
    id: 4,
    title: "Providers",
    description: "Provider details and documentation",
  },
  {
    id: 5,
    title: "Contacts",
    description: "Primary contacts and signers",
  },
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
  isPrimaryDecisionMaker: undefined,
  canSignAgreements: undefined,
  additionalResponsibilities: [],
};

const initialLocation: OnboardingLocation = {
  locationName: "",
  isPrimaryLocation: true,
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
  fullName: "",
  dateOfBirth: "",
  gender: "",
  credentials: "",
  providerType: "",
  specialty: "",
  cliaNumber: "",
  npi: "",
  caqhId: "",
  ssnFullDigits: "",
  licenseNumber: "",
  licenseExpiryDate: "",
  stateOfLicense: "",
  licenseType: "",
  taxonomy: "",
  primarySpecialty: "",
  secondarySpecialty: "",
  boardCertifications: "",
  caqhUsername: "",
  caqhPassword: "",
  caqhLastAttestationDate: "",
  languagesSpoken: "",
  telehealthAvailable: false,
  malpracticeCarrier: "",
  malpracticePolicyNumber: "",
  malpracticeEffectiveDate: "",
  malpracticeExpiryDate: "",
  hospitalAffiliations: "",
  personalCellNumber: "",
  personalEmail: "",
  practiceEmail: "",
  medicarePtanIndividual: "",
  medicaidIdIndividual: "",
  ipaAffiliationsProviderLevel: "",
  nppesUsername: "",
  nppesPassword: "",
  railroadMedicareIndividual: "",
  copyOfBoardCertification: "",
  copyOfProfessionalLiabilityInsurance: "",
  copyOfBachelorsDegree: "",
  copyOfMastersDegree: "",
  copyOfSocialSecurityCard: "",
  copyOfDriversLicense: "",
  passportSizedPhoto: "",
  resume: "",
  providerEffectiveDateWithGroup: "",
  countryOfBirth: "",
  statePlaceOfBirth: "",
  homeAddress: "",
  stateLicenseNumber: "",
  deaNumber: "",
  boardCertified: undefined,
  employmentStatus: "",
  participatingLocations: [],
  credentialingNeeded: "",
  recredentialingNeeded: "",
  notes: "",
};

const initialPractice: OnboardingPractice = {
  practiceName: "",
  practiceDbaName: "",
  isPartOfParentCompany: undefined,
  practiceType: "",
  additionalSpecialtyAreas: [],
  groupNpi: "",
  taxIdEin: "",
  medicaidIdNumber: "",
  groupMedicaidNpi: "",
  groupMedicarePtan: "",
  groupTaxonomy: "",
  ipaAffiliations: "",
  practiceManagerName: "",
  practiceManagerEmail: "",
  practiceManagerPhone: "",
  billingAddress: "",
  mailingAddress: "",
  practiceWorkStartDate: "",
  railroadMedicareGroup: "",
  approximateNumberOfProviders: 0,
  approximateNumberOfLocations: 0,
  approximateMonthlyPatientVolume: 0,
  approximateMedicarePatientVolume: 0,
  approximateMedicaidPatientVolume: 0,
  approximateCommercialPatientVolume: 0,
  offersCareManagementServices: undefined,
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
  recentW9Form: "",
  voidCheck: "",
  formalLetterFromBank: "",
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
  approvedInsurancesTracker: "",
  designatedPortalContactName: "",
  designatedPortalContactEmail: "",
  designatedPortalContactPhone: "",
  irsDocument147c: "",
  desiredInsurancePlans: "",
  caqhMaintained: undefined,
  currentCredentialingIssues: [],
  medicarePtanAvailable: "",
  medicaidEnrollmentActive: "",
  additionalNotes: "",
};

const initialTechnology: OnboardingTechnology = {
  ehrSystem: "",
  practiceManagementSystem: "",
  patientPortalAvailable: undefined,
  patientListExportable: undefined,
  appointmentListExportable: undefined,
  apiAccessAvailable: undefined,
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
  patientTextConsent: undefined,
  preferredLanguages: [],
  interpreterServices: undefined,
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

const initialMarketing: OnboardingMarketing = {
  websiteUrl: "",
  socialMediaChannels: [],
  currentMarketingChannels: [],
  targetPatientDemographics: "",
  monthlyMarketingBudget: "",
  existingBrandAssets: "",
  googleBusinessProfileClaimed: false,
  patientAcquisitionGoals: "",
  aiToolsUsed: "",
  additionalMarketingNotes: "",
};

const initialFormData: OnboardingBody = {
  onboardingType: "",
  isAuthorizedPerson: true,
  nonAuthorizedRole: "",
  numberOfPractices: 1,
  numberOfLocations: 1,
  billingManagedCentrally: "NO",
  credentialingManagedCentrally: "NO",
  contractingManagedCentrally: "NO",
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
  marketing: { ...initialMarketing },
};

function normalizeLoadedOnboarding(onboarding: Onboarding): OnboardingBody {
  return {
    ...initialFormData,
    ...onboarding,
    documents: (onboarding.documents ?? []).map((document) => ({
      ...document,
      documentType: Array.isArray(document.documentType)
        ? (document.documentType[0] ?? "")
        : (document.documentType ?? ""),
    })) as unknown as OnboardingDocument[],
    billing: onboarding.billing ?? initialFormData.billing,
    credentialing: onboarding.credentialing ?? initialFormData.credentialing,
    technology: onboarding.technology ?? initialFormData.technology,
    outreach: onboarding.outreach ?? initialFormData.outreach,
    labPharmacy: onboarding.labPharmacy ?? initialFormData.labPharmacy,
    compliance: onboarding.compliance ?? initialFormData.compliance,
    careProgram: initialFormData.careProgram,
    marketing: onboarding.marketing ?? initialFormData.marketing,
    serviceSetup: {
      requestedServices: onboarding.requestedServices ?? [],
      primaryServiceToLaunch: onboarding.primaryServiceToLaunch ?? "",
      requestedGoLiveDate: onboarding.requestedGoLiveDate ?? "",
      priorityLevel: onboarding.priorityLevel ?? "",
      servicesForAllPractices: onboarding.servicesForAllPractices ?? "",
      selectedPractices: onboarding.selectedPractices ?? [],
      replacingExistingVendor: onboarding.replacingExistingVendor ?? false,
      currentVendorName: onboarding.currentVendorName ?? "",
      currentVendorEndDate: onboarding.currentVendorEndDate ?? "",
      engagementGoals: onboarding.engagementGoals ?? "",
    },
  };
}

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
    <div className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
    </div>
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
  value: boolean | null;
  onChange: (value: boolean) => void;
  trueLabel?: string;
  falseLabel?: string;
}) {
  const radioValue = value === true ? "yes" : value === false ? "no" : "";
  return (
    <RadioGroup
      name={name}
      value={radioValue}
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

function MultiSelectDropdown({
  options,
  values,
  onToggle,
  placeholder = "Select options",
}: {
  options: Option[];
  values: string[];
  onToggle: (value: string) => void;
  placeholder?: string;
}) {
  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);

  const selectedPreview =
    selectedLabels.length === 0
      ? placeholder
      : selectedLabels.length <= 2
        ? selectedLabels.join(", ")
        : `${selectedLabels.slice(0, 2).join(", ")} +${
            selectedLabels.length - 2
          } more`;

  return (
    <details className="group relative [&_summary::-webkit-details-marker]:hidden">
      <summary
        className={`${baseInputClass()} flex cursor-pointer list-none items-center justify-between gap-3`}
      >
        <span className={values.length ? "text-slate-800" : "text-slate-400"}>
          {selectedPreview}
        </span>
        <span className="text-xs text-slate-500 transition group-open:rotate-180">
          ▼
        </span>
      </summary>

      <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
        {options.map((option) => {
          const checked = values.includes(option.value);
          return (
            <label
              key={option.value}
              className={`mb-1 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                checked
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-700 hover:bg-slate-50"
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
    </details>
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

function DocumentUploadField({
  value,
  onSelect,
  onClear,
  isUploading = false,
  accept = ".pdf,.png,.jpg,.jpeg,.doc,.docx,.csv,.xlsx",
}: {
  value?: string;
  onSelect: (file: File) => void;
  onClear: () => void;
  isUploading?: boolean;
  accept?: string;
}) {
  const displayValue = value
    ? (value.split("/").pop()?.split("?")[0] ?? value)
    : "";
  const acceptedFormats = accept
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.replace(".", "").toUpperCase())
    .join(", ");

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-medium text-slate-800">
            {isUploading
              ? "Uploading document..."
              : value
                ? "Selected document"
                : "No document selected"}
          </p>
          <p className="mt-1 break-all text-xs text-slate-500">
            {displayValue ||
              "Choose a file to upload this document one at a time."}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Allowed formats: {acceptedFormats}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            <span>
              {isUploading
                ? "Uploading..."
                : value
                  ? "Replace File"
                  : "Upload File"}
            </span>
            <input
              type="file"
              accept={accept}
              className="hidden"
              disabled={isUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onSelect(file);
                event.currentTarget.value = "";
              }}
            />
          </label>

          {value ? (
            <button
              type="button"
              onClick={onClear}
              disabled={isUploading}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
            >
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RepeaterHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h4 className="text-base font-semibold text-slate-900">{title}</h4>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function isSubmittedOnboardingStatus(status?: string) {
  return status === "IN_PROGRESS" || status === "COMPLETED";
}

export default function OnboardingFormV5() {
  const { id } = useParams();
  const [formData, setFormData] = useState<OnboardingBody>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(!!id);
  const [isAlreadySubmitted, setIsAlreadySubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  const [uploadingFieldKey, setUploadingFieldKey] = useState<string | null>(
    null,
  );
  const [selectedProviderUploadField, setSelectedProviderUploadField] =
    useState<Record<string, ProviderDocumentField>>({});
  const [hasPracticeManager, setHasPracticeManager] = useState(false);
  const [pmFirstName, setPmFirstName] = useState("");
  const [pmLastName, setPmLastName] = useState("");
  const [copyCompanyInfoToPracticeOne, setCopyCompanyInfoToPracticeOne] =
    useState(false);
  const [
    copyCompanyAddressToPrimaryLocation,
    setCopyCompanyAddressToPrimaryLocation,
  ] = useState(false);

  useEffect(() => {
    if (id) {
      localStorage.setItem("onBoardingId", id);
    }
  }, [id]);

  useEffect(() => {
    const fullName = formData.contacts?.[0]?.fullName ?? "";
    const spaceIndex = fullName.indexOf(" ");
    if (spaceIndex === -1) {
      setPmFirstName(fullName);
      setPmLastName("");
    } else {
      setPmFirstName(fullName.slice(0, spaceIndex));
      setPmLastName(fullName.slice(spaceIndex + 1));
    }
  }, [formData.contacts?.[0]?.fullName]);

  useEffect(() => {
    if (!id) return;

    let active = true;

    async function loadOnboarding() {
      setIsLoadingRecord(true);
      try {
        const onboarding = await getExternalOnboardingByPracticeId(id);
        if (!active) return;

        if (!onboarding) {
          setFormData(initialFormData);
          setIsAlreadySubmitted(false);
          setIsSubmitted(false);
          return;
        }

        setFormData(normalizeLoadedOnboarding(onboarding));
        const isSubmittedRecord = isSubmittedOnboardingStatus(
          onboarding.status,
        );
        setIsAlreadySubmitted(isSubmittedRecord);
        setIsSubmitted(isSubmittedRecord);
      } catch (error) {
        if (!active) return;
        const message =
          error instanceof Error ? error.message : "Unable to load onboarding.";
        toast.error(message);
      } finally {
        if (active) setIsLoadingRecord(false);
      }
    }

    void loadOnboarding();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (formData.isIndividualPractice && currentStep === 2) {
      setCurrentStep(3);
    }
  }, [currentStep, formData.isIndividualPractice]);

  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [currentStep]);

  useEffect(() => {
    const isMultiPracticeOrg =
      formData.onboardingType === "MULTI_PRACTICE_ORGANIZATION";
    const isSinglePracticeOrg =
      formData.onboardingType === "SINGLE_PRACTICE_ORGANIZATION";

    if (!isMultiPracticeOrg && !isSinglePracticeOrg) {
      return;
    }

    const practiceCount = isSinglePracticeOrg
      ? 1
      : Math.max(2, Number(formData.numberOfPractices ?? 0) || 0);

    setFormData((prev) => {
      const currentPractices = prev.practices ?? [];

      if (currentPractices.length === practiceCount) {
        return prev;
      }

      if (currentPractices.length > practiceCount) {
        return {
          ...prev,
          practices: currentPractices.slice(0, practiceCount),
        };
      }

      return {
        ...prev,
        practices: [
          ...currentPractices,
          ...Array.from(
            { length: practiceCount - currentPractices.length },
            () => ({ ...initialPractice }),
          ),
        ],
      };
    });
  }, [formData.numberOfPractices, formData.onboardingType]);

  useEffect(() => {
    if (
      formData.onboardingType === "SINGLE_PRACTICE_ORGANIZATION" ||
      !copyCompanyInfoToPracticeOne
    ) {
      return;
    }
    setCopyCompanyInfoToPracticeOne(false);
  }, [copyCompanyInfoToPracticeOne, formData.onboardingType]);

  useEffect(() => {
    if (
      !copyCompanyInfoToPracticeOne ||
      formData.onboardingType !== "SINGLE_PRACTICE_ORGANIZATION"
    ) {
      return;
    }

    setFormData((prev) => {
      const practiceName = prev.legalCompanyName?.trim() || prev.dbaName || "";
      const practiceDbaName = prev.dbaName ?? "";
      const practiceTaxIdEin = prev.taxIdEin ?? "";
      const locationName =
        prev.dbaName?.trim() || practiceName || "Primary Location";
      const locationAddressLine1 = prev.companyAddressLine1 ?? "";
      const locationAddressLine2 = prev.companyAddressLine2 ?? "";
      const locationCity = prev.companyCity ?? "";
      const locationState = prev.companyState ?? "";
      const locationZipCode = prev.companyZip ?? "";
      const locationMainPhoneNumber = prev.mainCompanyPhone ?? "";
      const locationOfficeEmail = prev.mainCompanyEmail ?? "";

      const practices = (prev.practices ?? []).slice();
      const currentPractice = practices[0] ?? { ...initialPractice };
      const locations = (currentPractice.locations ?? []).slice();
      const currentLocation = locations[0] ?? { ...initialLocation };

      const nextLocation: OnboardingLocation = {
        ...currentLocation,
        locationName,
        addressLine1: locationAddressLine1,
        addressLine2: locationAddressLine2,
        city: locationCity,
        state: locationState,
        zipCode: locationZipCode,
        mainPhoneNumber: locationMainPhoneNumber,
        officeEmail: locationOfficeEmail,
      };
      const nextPractice: OnboardingPractice = {
        ...currentPractice,
        practiceName,
        practiceDbaName,
        taxIdEin: practiceTaxIdEin,
        locations: [nextLocation, ...locations.slice(1)],
      };

      const hasPracticeChanges =
        (currentPractice.practiceName ?? "") !== nextPractice.practiceName ||
        (currentPractice.practiceDbaName ?? "") !==
          nextPractice.practiceDbaName ||
        (currentPractice.taxIdEin ?? "") !== nextPractice.taxIdEin;
      const hasLocationChanges =
        (currentLocation.locationName ?? "") !==
          (nextLocation.locationName ?? "") ||
        (currentLocation.addressLine1 ?? "") !==
          (nextLocation.addressLine1 ?? "") ||
        (currentLocation.addressLine2 ?? "") !==
          (nextLocation.addressLine2 ?? "") ||
        (currentLocation.city ?? "") !== (nextLocation.city ?? "") ||
        (currentLocation.state ?? "") !== (nextLocation.state ?? "") ||
        (currentLocation.zipCode ?? "") !== (nextLocation.zipCode ?? "") ||
        (currentLocation.mainPhoneNumber ?? "") !==
          (nextLocation.mainPhoneNumber ?? "") ||
        (currentLocation.officeEmail ?? "") !==
          (nextLocation.officeEmail ?? "");

      if (!hasPracticeChanges && !hasLocationChanges && practices[0]) {
        return prev;
      }

      practices[0] = nextPractice;
      return {
        ...prev,
        practices,
      };
    });
  }, [
    copyCompanyInfoToPracticeOne,
    formData.companyAddressLine1,
    formData.companyAddressLine2,
    formData.companyCity,
    formData.companyState,
    formData.companyZip,
    formData.dbaName,
    formData.legalCompanyName,
    formData.mainCompanyEmail,
    formData.mainCompanyPhone,
    formData.onboardingType,
    formData.taxIdEin,
  ]);

  useEffect(() => {
    if (
      formData.onboardingType === "SINGLE_PRACTICE_ORGANIZATION" ||
      !copyCompanyAddressToPrimaryLocation
    ) {
      return;
    }
    setCopyCompanyAddressToPrimaryLocation(false);
  }, [copyCompanyAddressToPrimaryLocation, formData.onboardingType]);

  useEffect(() => {
    if (
      !copyCompanyAddressToPrimaryLocation ||
      formData.onboardingType !== "SINGLE_PRACTICE_ORGANIZATION"
    ) {
      return;
    }

    setFormData((prev) => {
      const practices = (prev.practices ?? []).slice();
      const currentPractice = practices[0] ?? { ...initialPractice };
      const locations = (currentPractice.locations ?? []).slice();
      const currentLocation = locations[0] ?? { ...initialLocation };

      const nextLocation: OnboardingLocation = {
        ...currentLocation,
        addressLine1: prev.companyAddressLine1 ?? "",
        addressLine2: prev.companyAddressLine2 ?? "",
        city: prev.companyCity ?? "",
        state: prev.companyState ?? "",
        zipCode: prev.companyZip ?? "",
      };

      const hasChanges =
        (currentLocation.addressLine1 ?? "") !==
          (nextLocation.addressLine1 ?? "") ||
        (currentLocation.addressLine2 ?? "") !==
          (nextLocation.addressLine2 ?? "") ||
        (currentLocation.city ?? "") !== (nextLocation.city ?? "") ||
        (currentLocation.state ?? "") !== (nextLocation.state ?? "") ||
        (currentLocation.zipCode ?? "") !== (nextLocation.zipCode ?? "");

      if (!hasChanges && practices[0]) {
        return prev;
      }

      const nextPractice: OnboardingPractice = {
        ...currentPractice,
        locations: [nextLocation, ...locations.slice(1)],
      };
      practices[0] = nextPractice;
      return {
        ...prev,
        practices,
      };
    });
  }, [
    copyCompanyAddressToPrimaryLocation,
    formData.companyAddressLine1,
    formData.companyAddressLine2,
    formData.companyCity,
    formData.companyState,
    formData.companyZip,
    formData.onboardingType,
  ]);

  const locationNames = (formData.practices ?? []).flatMap((practice) =>
    (practice.locations ?? [])
      .map((location) => location.locationName?.trim() ?? "")
      .filter(Boolean),
  );

  const scopeRequestedServices =
    (formData.requestedServices ?? []).length > 0
      ? (formData.requestedServices ?? [])
      : (formData.serviceSetup?.requestedServices ?? []);
  const scopeReplacingVendor =
    formData.replacingExistingVendor ??
    formData.serviceSetup?.replacingExistingVendor ??
    false;
  const scopeCurrentVendorName =
    formData.currentVendorName ??
    formData.serviceSetup?.currentVendorName ??
    "";
  const scopeCurrentVendorEndDate =
    formData.currentVendorEndDate ??
    formData.serviceSetup?.currentVendorEndDate ??
    "";
  const scopeEngagementGoals =
    formData.engagementGoals ?? formData.serviceSetup?.engagementGoals ?? "";
  const isScopeConfigured = scopeRequestedServices.length > 0;

  const serviceLabelMap = new Map(
    serviceOptions.map((option) => [option.value, option.label]),
  );

  const hasCareProgramsSelected =
    scopeRequestedServices.some((service) =>
      careProgramServiceValues.includes(service),
    ) || (formData.careProgram?.programsPlanned ?? []).length > 0;
  const hasCredentialingSelected =
    scopeRequestedServices.includes("CREDENTIALING");
  const hasBillingRcmSelected = scopeRequestedServices.includes("BILLING_RCM");
  const hasMarketingSelected = scopeRequestedServices.some((service) =>
    marketingServiceValues.includes(service),
  );
  const hasLabPharmacySelected = scopeRequestedServices.some((service) =>
    ["LAB_RELATIONSHIP_SUPPORT", "PHARMACY_PROGRAM_SUPPORT"].includes(service),
  );
  const hasFixedPracticeCount =
    formData.onboardingType === "MULTI_PRACTICE_ORGANIZATION" ||
    formData.onboardingType === "SINGLE_PRACTICE_ORGANIZATION";
  const requiredPracticeCount = Math.max(
    hasFixedPracticeCount ? 1 : 0,
    Number(formData.numberOfPractices ?? 0) || 0,
  );
  const visibleSteps = steps.filter(
    (step) => !(formData.isIndividualPractice && step.id === 2),
  );

  function getProviderUploadStateKey(
    practiceIndex: number,
    providerIndex: number,
  ) {
    return `${practiceIndex}-${providerIndex}`;
  }

  function getSelectedProviderUploadField(
    practiceIndex: number,
    providerIndex: number,
  ): ProviderDocumentField {
    return (
      selectedProviderUploadField[
        getProviderUploadStateKey(practiceIndex, providerIndex)
      ] ?? "copyOfProfessionalLiabilityInsurance"
    );
  }

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
    setFormData((prev) => {
      const values = ((prev[field] as string[] | undefined) ?? []).slice();
      const nextValues = values.includes(value)
        ? values.filter((entry) => entry !== value)
        : [...values, value];
      return {
        ...prev,
        [field]: nextValues as OnboardingBody[K],
      };
    });
  }

  function toggleNestedArrayValue<
    K extends NestedSectionKey,
    F extends keyof NonNullable<OnboardingBody[K]>,
  >(section: K, field: F, value: string) {
    setFormData((prev) => {
      const sectionData =
        (prev[section] as NonNullable<OnboardingBody[K]> | undefined) ?? {};
      const values = (
        (sectionData[field] as string[] | undefined) ?? []
      ).slice();
      const nextValues = values.includes(value)
        ? values.filter((entry) => entry !== value)
        : [...values, value];

      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: nextValues as NonNullable<OnboardingBody[K]>[F],
        },
      };
    });
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
    if (hasFixedPracticeCount) {
      return;
    }

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
    if (hasFixedPracticeCount) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices ?? []).filter(
        (_, practiceIndex) => practiceIndex !== index,
      ),
    }));
  }

  function isValidPractice(practice: OnboardingPractice) {
    const practiceName = practice.practiceName?.trim() ?? "";
    const practiceType = practice.practiceType?.trim() ?? "";
    const taxIdEin = practice.taxIdEin?.trim() ?? "";
    const hasLocation = (practice.locations ?? []).some(
      (location) => (location.locationName?.trim() ?? "").length > 0,
    );
    return !!practiceName && !!practiceType && !!taxIdEin && hasLocation;
  }

  function isValidProvider(provider: OnboardingProvider) {
    const credentialingRequested =
      scopeRequestedServices.includes("CREDENTIALING");
    const firstName = provider.firstName?.trim() ?? "";
    const lastName = provider.lastName?.trim() ?? "";
    const providerType = provider.providerType?.trim() ?? "";
    const npi = provider.npi?.trim() ?? "";
    const ssnLastFour = provider.ssnFullDigits?.trim() ?? "";
    const caqhId = provider.caqhId?.trim() ?? "";
    const caqhUsername = provider.caqhUsername?.trim() ?? "";
    const caqhPassword = provider.caqhPassword?.trim() ?? "";
    const validSsnLastFour = /^\d{4}$/.test(ssnLastFour);
    const requiresCaqhCredentials = credentialingRequested;
    const hasBoardCertificationFile = !!(
      provider.copyOfBoardCertification?.trim() ?? ""
    );
    return (
      !!firstName &&
      !!lastName &&
      !!providerType &&
      !!npi &&
      validSsnLastFour &&
      (!requiresCaqhCredentials ||
        (!!caqhId && !!caqhUsername && !!caqhPassword)) &&
      (!provider.boardCertified || hasBoardCertificationFile)
    );
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
                { ...initialLocation, isPrimaryLocation: false },
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
                (location, innerIndex) => {
                  if (field === "isPrimaryLocation" && Boolean(value)) {
                    return {
                      ...location,
                      isPrimaryLocation: innerIndex === locationIndex,
                    };
                  }
                  return innerIndex === locationIndex
                    ? { ...location, [field]: value }
                    : location;
                },
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

  function getUploadPracticeName() {
    return (
      formData.practices?.[0]?.practiceName?.trim() ||
      formData.legalCompanyName?.trim() ||
      formData.dbaName?.trim() ||
      ""
    );
  }

  async function uploadNestedDocument<
    K extends "billing" | "credentialing",
    F extends keyof NonNullable<OnboardingBody[K]>,
  >(section: K, field: F, file: File) {
    if (!id) {
      toast.error("Practice id is required before uploading documents.");
      return;
    }

    const practiceName = getUploadPracticeName();

    if (!practiceName) {
      toast.error("Practice name is required before uploading documents.");
      return;
    }

    const fieldKey = `${section}-${String(field)}`;
    setUploadingFieldKey(fieldKey);

    try {
      const upload = await uploadExternalOnboardingDocument({
        practiceId: id,
        practiceName,
        field: `${section}.${String(field)}`,
        file,
      });

      updateNestedField(
        section,
        field,
        upload.fileUrl as NonNullable<OnboardingBody[K]>[F],
      );
      toast.success("Document uploaded successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to upload document.";
      toast.error(message);
    } finally {
      setUploadingFieldKey(null);
    }
  }

  async function removeUploadedDocument(
    fileUrl: string,
    clearField: () => void,
    fieldKey: string,
  ) {
    if (!fileUrl) {
      clearField();
      return;
    }

    setUploadingFieldKey(fieldKey);

    try {
      await deleteExternalOnboardingDocument({ fileUrl });
      clearField();
      toast.success("Document removed successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to remove document.";
      toast.error(message);
    } finally {
      setUploadingFieldKey(null);
    }
  }

  async function removeNestedDocument<
    K extends "billing" | "credentialing",
    F extends keyof NonNullable<OnboardingBody[K]>,
  >(section: K, field: F) {
    const currentValue = formData[section]?.[field];
    const fileUrl = typeof currentValue === "string" ? currentValue : "";

    await removeUploadedDocument(
      fileUrl,
      () =>
        updateNestedField(
          section,
          field,
          "" as NonNullable<OnboardingBody[K]>[F],
        ),
      `${section}-${String(field)}`,
    );
  }

  async function uploadProviderDocument(
    practiceIndex: number,
    providerIndex: number,
    field: keyof OnboardingProvider,
    file: File,
  ) {
    if (!id) {
      toast.error("Practice id is required before uploading documents.");
      return;
    }

    const practiceName =
      formData.practices?.[practiceIndex]?.practiceName?.trim() ?? "";

    if (!practiceName) {
      toast.error("Practice name is required before uploading documents.");
      return;
    }

    const fieldKey = `${practiceIndex}-${providerIndex}-${String(field)}`;
    setUploadingFieldKey(fieldKey);

    try {
      const upload = await uploadExternalOnboardingDocument({
        practiceId: id,
        practiceName,
        field: String(field),
        file,
      });

      updateProvider(
        practiceIndex,
        providerIndex,
        field,
        upload.fileUrl as OnboardingProvider[typeof field],
      );
      toast.success("Document uploaded successfully.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to upload document.";
      toast.error(message);
    } finally {
      setUploadingFieldKey(null);
    }
  }

  async function removeProviderDocument(
    practiceIndex: number,
    providerIndex: number,
    field: keyof OnboardingProvider,
  ) {
    const currentValue =
      formData.practices?.[practiceIndex]?.providers?.[providerIndex]?.[field];
    const fileUrl = typeof currentValue === "string" ? currentValue : "";

    await removeUploadedDocument(
      fileUrl,
      () => updateProvider(practiceIndex, providerIndex, field, ""),
      `${practiceIndex}-${providerIndex}-${String(field)}`,
    );
  }

  function toggleContactArrayValue<K extends keyof OnboardingContact>(
    index: number,
    field: K,
    value: string,
  ) {
    setFormData((prev) => ({
      ...prev,
      contacts: (prev.contacts ?? []).map((contact, contactIndex) => {
        if (contactIndex !== index) return contact;
        const values = ((contact[field] as string[] | undefined) ?? []).slice();
        const nextValues = values.includes(value)
          ? values.filter((entry) => entry !== value)
          : [...values, value];
        return {
          ...contact,
          [field]: nextValues as OnboardingContact[K],
        };
      }),
    }));
  }

  function togglePracticeArrayValue<K extends keyof OnboardingPractice>(
    index: number,
    field: K,
    value: string,
  ) {
    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices ?? []).map((practice, practiceIndex) => {
        if (practiceIndex !== index) return practice;
        const values = (
          (practice[field] as string[] | undefined) ?? []
        ).slice();
        const nextValues = values.includes(value)
          ? values.filter((entry) => entry !== value)
          : [...values, value];
        return {
          ...practice,
          [field]: nextValues as OnboardingPractice[K],
        };
      }),
    }));
  }

  function toggleProviderArrayValue<K extends keyof OnboardingProvider>(
    practiceIndex: number,
    providerIndex: number,
    field: K,
    value: string,
  ) {
    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices ?? []).map((practice, index) => {
        if (index !== practiceIndex) return practice;
        return {
          ...practice,
          providers: (practice.providers ?? []).map((provider, innerIndex) => {
            if (innerIndex !== providerIndex) return provider;
            const values = (
              (provider[field] as string[] | undefined) ?? []
            ).slice();
            const nextValues = values.includes(value)
              ? values.filter((entry) => entry !== value)
              : [...values, value];
            return {
              ...provider,
              [field]: nextValues as OnboardingProvider[K],
            };
          }),
        };
      }),
    }));
  }

  function toggleCareProgramArrayValue(
    field: "programsPlanned",
    value: string,
  ) {
    setFormData((prev) => {
      const currentCareProgram = prev.careProgram ?? {};
      const values = (currentCareProgram[field] ?? []).slice();
      const nextValues = values.includes(value)
        ? values.filter((entry) => entry !== value)
        : [...values, value];

      return {
        ...prev,
        careProgram: {
          ...currentCareProgram,
          [field]: nextValues,
        },
      };
    });
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
      if (
        formData.onboardingType === "MULTI_PRACTICE_ORGANIZATION" &&
        (Number(formData.numberOfPractices ?? 0) || 0) < 2
      ) {
        errors.push(
          "How many practices are being onboarded (must be 2 or more)",
        );
      }
      if (
        formData.onboardingType === "SINGLE_PRACTICE_ORGANIZATION" &&
        (Number(formData.numberOfPractices ?? 0) || 0) !== 1
      ) {
        errors.push("How many practices are being onboarded (must be 1)");
      }
      // if (!formData.isAuthorizedPerson && !formData.nonAuthorizedRole) {
      //   errors.push("Role in onboarding");
      // }
    }

    if (currentStep === 2) {
      const legalCompanyName = formData.legalCompanyName?.trim() ?? "";
      if (!legalCompanyName) errors.push("Legal company name");

      const taxIdEin = formData.taxIdEin?.trim() ?? "";
      if (!taxIdEin) errors.push("Tax ID / EIN");

      const mainCompanyPhone = formData.mainCompanyPhone?.trim() ?? "";
      if (mainCompanyPhone && !isValidTenDigitPhone(mainCompanyPhone)) {
        errors.push("Main company phone (must be 10 digits)");
      }

      const mainCompanyFax = formData.mainCompanyFax?.trim() ?? "";
      if (mainCompanyFax && !isValidTenDigitPhone(mainCompanyFax)) {
        errors.push("Main company fax (must be 10 digits)");
      }

      const mainCompanyEmail = formData.mainCompanyEmail?.trim() ?? "";
      if (!mainCompanyEmail) {
        errors.push("Main company email");
      } else if (!isValidCompanyEmail(mainCompanyEmail)) {
        errors.push("Main company email (must end in .com)");
      }

      const companyWebsite = formData.companyWebsite?.trim() ?? "";
      if (companyWebsite && !isValidWebsite(companyWebsite)) {
        errors.push("Website (enter a valid URL)");
      }

      const companyZip = formData.companyZip?.trim() ?? "";
      if (companyZip && !isValidZipCode(companyZip)) {
        errors.push("ZIP Code (use 12345 or 12345-6789)");
      }
    }

    if (currentStep === 3) {
      if (!(formData.practices ?? []).length) {
        errors.push("At least one practice");
      } else if (
        !(formData.practices ?? []).every((practice) =>
          isValidPractice(practice),
        )
      ) {
        errors.push(
          "Every practice needs a name, type, Tax ID / EIN, and at least one location",
        );
      }
    }

    if (currentStep === 4) {
      if (
        !(formData.practices ?? []).every((practice) =>
          (practice.providers ?? []).some((provider) =>
            isValidProvider(provider),
          ),
        )
      ) {
        errors.push(
          "Every practice needs at least one provider with first name, last name, provider type, NPI, and SSN last 4 digits. When credentialing is a selected service, CAQH ID, username, and password are also required.",
        );
      }
    }

    if (currentStep === 5) {
      if (!hasPracticeManager) {
        // no-op: no practice manager means no contacts required
      } else if (!(formData.contacts ?? []).length) {
        errors.push("At least one contact");
      } else {
        const invalidContactIndexes = (formData.contacts ?? [])
          .map((contact, index) => {
            const fullName = contact.fullName?.trim() ?? "";
            const contactRole = contact.contactRole?.trim() ?? "";
            const email = contact.email?.trim() ?? "";
            const phone = contact.phone?.trim() ?? "";
            const isValid =
              !!fullName &&
              !!contactRole &&
              isValidCompanyEmail(email) &&
              (!phone || isValidTenDigitPhone(phone));
            return isValid ? null : index + 1;
          })
          .filter((index): index is number => index !== null);

        if (invalidContactIndexes.length) {
          errors.push(
            `Contact ${invalidContactIndexes.join(", ")} (full name, contact role, email, and 10-digit phone are required when phone is entered)`,
          );
        }
      }
    }

    if (currentStep === 6) {
      if (!formData.technology?.ehrSystem) errors.push("EHR");
      if (hasBillingRcmSelected && !formData.billing?.currentBillingModel) {
        errors.push("Billing model");
      }
      if (
        (formData.billing?.currentBillingModel === "OUTSOURCED" ||
          formData.billing?.currentBillingModel === "HYBRID") &&
        !(formData.billing?.billingCompanyName?.trim() ?? "")
      ) {
        errors.push("Billing company name");
      }
    }

    if (currentStep === 8) {
      const invalidDocumentIndexes = (formData.documents ?? [])
        .map((document, index) => {
          const documentType = document.documentType?.trim() ?? "";
          const validDateOrder = isDocumentReceivedAfterRequested(
            document.dateRequested,
            document.dateReceived,
          );
          return documentType && validDateOrder ? null : index + 1;
        })
        .filter((index): index is number => index !== null);

      if (invalidDocumentIndexes.length) {
        errors.push(`Document ${invalidDocumentIndexes.join(", ")} type`);
      }

      if (!(formData.submittedByName?.trim() ?? "")) {
        errors.push("Name of person submitting");
      }

      if (!(formData.submittedByTitle?.trim() ?? "")) {
        errors.push("Title of person submitting");
      }
    }

    if (errors.length) {
      toast.error(`Please complete: ${errors.join(", ")}`);
      return false;
    }

    return true;
  }

  function isStepComplete(stepId: number) {
    if (stepId >= 6 && !isScopeConfigured) {
      return false;
    }

    if (stepId === 1) {
      return !!formData.onboardingType;
      // &&
      // (!!formData.isAuthorizedPerson || !!formData.nonAuthorizedRole)
    }

    if (stepId === 2) {
      if (formData.isIndividualPractice) return true;
      const mainCompanyPhone = formData.mainCompanyPhone?.trim() ?? "";
      const mainCompanyEmail = formData.mainCompanyEmail?.trim() ?? "";
      const companyWebsite = formData.companyWebsite?.trim() ?? "";
      const companyZip = formData.companyZip?.trim() ?? "";
      return (
        !!(formData.legalCompanyName?.trim() ?? "") &&
        (!mainCompanyPhone || isValidTenDigitPhone(mainCompanyPhone)) &&
        isValidCompanyEmail(mainCompanyEmail) &&
        (!companyWebsite || isValidWebsite(companyWebsite)) &&
        (!companyZip || isValidZipCode(companyZip))
      );
    }

    if (stepId === 3) {
      return (formData.practices ?? []).every((practice) =>
        isValidPractice(practice),
      );
    }

    if (stepId === 4) {
      return (formData.practices ?? []).every((practice) =>
        (practice.providers ?? []).some((provider) =>
          isValidProvider(provider),
        ),
      );
    }

    if (stepId === 5) {
      if (!hasPracticeManager) return true;
      return (
        (formData.contacts ?? []).every((contact) => {
          const fullName = contact.fullName?.trim() ?? "";
          const contactRole = contact.contactRole?.trim() ?? "";
          const email = contact.email?.trim() ?? "";
          return !!fullName && !!contactRole && isValidCompanyEmail(email);
        }) && isScopeConfigured
      );
    }

    if (stepId === 6) {
      if (!formData.technology?.ehrSystem) return false;
      if (hasBillingRcmSelected && !formData.billing?.currentBillingModel) {
        return false;
      }
      if (
        (formData.billing?.currentBillingModel === "OUTSOURCED" ||
          formData.billing?.currentBillingModel === "HYBRID") &&
        !(formData.billing?.billingCompanyName?.trim() ?? "")
      ) {
        return false;
      }
      return true;
    }

    if (stepId === 8) {
      const allDocumentsValid = (formData.documents ?? []).every(
        (document) =>
          !!(document.documentType?.trim() ?? "") &&
          isDocumentReceivedAfterRequested(
            document.dateRequested,
            document.dateReceived,
          ),
      );
      return (
        !!(formData.informationAccurate && formData.authorizeUse) &&
        !!(formData.submittedByName?.trim() ?? "") &&
        !!(formData.submittedByTitle?.trim() ?? "") &&
        allDocumentsValid
      );
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

  function isScopeRequiredForStep(stepId: number) {
    return stepId >= 6;
  }

  function notifyMissingScope() {
    toast.error(
      "Scope has not been configured by CRM yet. Please contact your onboarding coordinator before continuing.",
    );
  }

  function nextStep() {
    const nextStepId = getNextVisibleStep(currentStep);
    if (nextStepId !== currentStep && isScopeRequiredForStep(nextStepId)) {
      if (!isScopeConfigured) {
        notifyMissingScope();
        return;
      }
    }

    if (!validateCurrentStep()) return;
    setCurrentStep((prev) => getNextVisibleStep(prev));
  }

  function prevStep() {
    setCurrentStep((prev) => getPrevVisibleStep(prev));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isScopeConfigured) {
      notifyMissingScope();
      return;
    }

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
      const submissionPayload = {
        ...formData,
        practiceId: id,
        submissionDate: new Date().toISOString().slice(0, 10),
        status: "IN_PROGRESS",
      };

      if (id) {
        await createExternalOnboardingFromForm(submissionPayload);
      } else {
        await createOnboardingFromForm(submissionPayload);
      }

      toast.success("Onboarding submitted successfully!", { id: loadingToast });
      setIsSubmitted(true);
      setIsAlreadySubmitted(false);
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
            {isAlreadySubmitted ? "Already Submitted" : "Thank You!"}
          </h2>
          <p className="mb-8 max-w-md text-slate-600">
            {isAlreadySubmitted
              ? "This onboarding form has already been submitted and can no longer be edited."
              : "Your onboarding request has been submitted successfully. Our team will review your information and follow up shortly."}
          </p>
          {/*{!isAlreadySubmitted ? (
            <button
              type="button"
              onClick={() => {
                setFormData(initialFormData);
                setCurrentStep(1);
                setIsSubmitted(false);
                setIsAlreadySubmitted(false);
              }}
              className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Submit Another Request
            </button>
          ) : null}*/}
        </div>
      </Shell>
    );
  }

  if (isLoadingRecord) {
    return (
      <Shell>
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
          Loading onboarding form...
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
            {/*Capture company structure, onboarding scope, operational readiness,
            and compliance details in one flow using the existing onboarding
            API.*/}
            Complete this form to begin your onboarding.
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

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-4 mb-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
              Scope (Read-only)
            </p>
            <p className="mt-1 text-sm text-slate-700">
              Configured by CRM before onboarding submission.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isScopeConfigured
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isScopeConfigured ? "Configured" : "Pending CRM configuration"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-slate-700 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Requested services
            </p>
            <p className="mt-1">
              {(() => {
                const raw = scopeRequestedServices;
                const hasSubProgram = raw.some((s) =>
                  subCareProgramValues.includes(s),
                );
                const display = hasSubProgram
                  ? [
                      "CARE_MANAGEMENT",
                      ...raw.filter(
                        (s) => !careProgramServiceValues.includes(s),
                      ),
                    ]
                  : raw;
                return display.length
                  ? display.map((s) => serviceLabelMap.get(s) ?? s).join(", ")
                  : "Not configured";
              })()}
            </p>
          </div>
          {/*<div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Replacing existing vendor
            </p>
            <p className="mt-1">
              {scopeReplacingVendor ? "Yes" : "No"}
              {scopeReplacingVendor && scopeCurrentVendorName
                ? ` - ${scopeCurrentVendorName}`
                : ""}
              {scopeReplacingVendor && scopeCurrentVendorEndDate
                ? ` (${scopeCurrentVendorEndDate.split("T")[0]})`
                : ""}
            </p>
          </div>*/}
          {/*<div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Engagement goals
            </p>
            <p className="mt-1">{scopeEngagementGoals || "Not provided"}</p>
          </div>*/}
        </div>

        {!isScopeConfigured ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Scope is not fully configured yet. You can review onboarding
            details, but continuing into operations and final submission is
            blocked until CRM completes Scope.
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div ref={topRef} />
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
                      if (value === "MULTI_PRACTICE_ORGANIZATION") {
                        updateField(
                          "numberOfPractices",
                          Math.max(
                            2,
                            Number(formData.numberOfPractices ?? 0) || 0,
                          ),
                        );
                      } else if (value === "SINGLE_PRACTICE_ORGANIZATION") {
                        updateField("numberOfPractices", 1);
                      }
                    }}
                  />
                </Field>

                {/*<Field label="Are you the authorized person completing this onboarding?">
                  <BooleanRadioGroup
                    name="isAuthorizedPerson"
                    value={formData.isAuthorizedPerson ?? false}
                    onChange={(value) =>
                      updateField("isAuthorizedPerson", value)
                    }
                  />
                </Field>*/}

                {/*{!formData.isAuthorizedPerson ? (
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
                ) : null}*/}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {formData.onboardingType === "MULTI_PRACTICE_ORGANIZATION" ? (
                    <Field
                      label="How many practices are being onboarded?"
                      required
                    >
                      <TextInput
                        type="number"
                        min={
                          formData.onboardingType ===
                          "MULTI_PRACTICE_ORGANIZATION"
                            ? 2
                            : 1
                        }
                        max={
                          formData.onboardingType ===
                          "SINGLE_PRACTICE_ORGANIZATION"
                            ? 1
                            : undefined
                        }
                        step={1}
                        value={formData.numberOfPractices ?? 1}
                        disabled={
                          formData.onboardingType ===
                          "SINGLE_PRACTICE_ORGANIZATION"
                        }
                        onChange={(event) =>
                          updateField(
                            "numberOfPractices",
                            formData.onboardingType ===
                              "MULTI_PRACTICE_ORGANIZATION"
                              ? Math.max(
                                  2,
                                  parseNumber(
                                    event.target.value.replace(/\D/g, ""),
                                  ),
                                )
                              : 1,
                          )
                        }
                      />
                    </Field>
                  ) : null}

                  {formData.onboardingType !== "SINGLE_PRACTICE_ORGANIZATION" &&
                  formData.onboardingType?.length ? (
                    <Field label="How many locations total are being onboarded?">
                      <TextInput
                        type="number"
                        min={0}
                        value={formData.numberOfLocations ?? 0}
                        onChange={(event) =>
                          updateField(
                            "numberOfLocations",
                            parseNumber(event.target.value.replace(/\D/g, "")),
                          )
                        }
                      />
                    </Field>
                  ) : null}
                </div>
              </div>
            </SectionCard>

            {!formData.isIndividualPractice &&
              formData.onboardingType !== "SINGLE_PRACTICE_ORGANIZATION" &&
              formData.onboardingType?.length && (
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
                        onChange={(value) =>
                          updateField("oneMainContact", value)
                        }
                      />
                    </Field>
                  </div>
                </SectionCard>
              )}
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

                <Field label="Tax ID / EIN" required>
                  <TextInput
                    value={formData.taxIdEin ?? ""}
                    onChange={(event) =>
                      updateField(
                        "taxIdEin",
                        event.target.value.replace(/\D/g, ""),
                      )
                    }
                  />
                </Field>

                <Field label="Main Company Phone">
                  <TextInput
                    type="tel"
                    placeholder="1234567890"
                    value={formData.mainCompanyPhone ?? ""}
                    onChange={(event) =>
                      updateField(
                        "mainCompanyPhone",
                        event.target.value.replace(/\D/g, ""),
                      )
                    }
                  />
                </Field>

                <Field label="Main Company Fax">
                  <TextInput
                    type="tel"
                    placeholder="1234567890"
                    value={formData.mainCompanyFax ?? ""}
                    onChange={(event) =>
                      updateField(
                        "mainCompanyFax",
                        event.target.value.replace(/\D/g, ""),
                      )
                    }
                    inputMode="numeric"
                    maxLength={10}
                    pattern="\d{10}"
                    title="Main company fax must be exactly 10 digits"
                  />
                </Field>

                <Field label="Main Company Email" required>
                  <TextInput
                    type="email"
                    placeholder="name@company.com"
                    value={formData.mainCompanyEmail ?? ""}
                    onChange={(event) =>
                      updateField("mainCompanyEmail", event.target.value)
                    }
                  />
                </Field>

                <Field label="Website">
                  <TextInput
                    type="url"
                    placeholder="https://example.com"
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
                    <MultiSelectDropdown
                      options={specialtyOptions}
                      values={formData.additionalSpecialties ?? []}
                      onToggle={(value) =>
                        toggleArrayValue("additionalSpecialties", value)
                      }
                      placeholder="Select additional specialties"
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
                    inputMode="numeric"
                    placeholder="12345 or 12345-6789"
                    value={formData.companyZip ?? ""}
                    onChange={(event) =>
                      updateField(
                        "companyZip",
                        event.target.value.replace(/\D/g, ""),
                      )
                    }
                  />
                </Field>

                <div className="md:col-span-2 lg:col-span-3">
                  <Field label="States of Operation">
                    <MultiSelectDropdown
                      options={usStates}
                      values={formData.statesOfOperation ?? []}
                      onToggle={(value) =>
                        toggleArrayValue("statesOfOperation", value)
                      }
                      placeholder="Select states"
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
                    value={formData.isLegalContractingEntity ?? null}
                    onChange={(value) =>
                      updateField("isLegalContractingEntity", value)
                    }
                  />
                </Field>

                <Field label="Is this the billing entity?">
                  <BooleanRadioGroup
                    name="isBillingEntity"
                    value={formData.isBillingEntity ?? null}
                    onChange={(value) => updateField("isBillingEntity", value)}
                  />
                </Field>

                <Field label="Is this the credentialing entity?">
                  <BooleanRadioGroup
                    name="isCredentialingEntity"
                    value={formData.isCredentialingEntity ?? null}
                    onChange={(value) =>
                      updateField("isCredentialingEntity", value)
                    }
                  />
                </Field>
              </div>
            </SectionCard>
          </>
        ) : null}

        {currentStep === 5 ? (
          <SectionCard
            title="Practice Manager & Additional Contacts"
            description="Manage the practice manager and additional contacts for this onboarding."
          >
            <div className="grid gap-6">
              <Field label="Does this practice have a practice manager?">
                <BooleanRadioGroup
                  name="hasPracticeManager"
                  value={hasPracticeManager}
                  onChange={(value) => {
                    setHasPracticeManager(value);
                    if (value) {
                      setFormData((prev) => ({
                        ...prev,
                        contacts:
                          (prev.contacts ?? []).length > 0
                            ? (prev.contacts ?? []).map((contact, index) =>
                                index === 0
                                  ? {
                                      ...contact,
                                      contactRole: "PRACTICE_MANAGER",
                                    }
                                  : contact,
                              )
                            : [
                                {
                                  ...initialContact,
                                  contactRole: "PRACTICE_MANAGER",
                                },
                              ],
                      }));
                    }
                  }}
                />
              </Field>
            </div>

            {hasPracticeManager ? (
              <div className="mt-6 space-y-4">
                {(formData.contacts ?? []).length > 0 ? (
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <p className="font-medium text-slate-800">
                        Practice Manager
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <Field label="First Name" required>
                        <TextInput
                          value={pmFirstName}
                          onChange={(event) => {
                            setPmFirstName(event.target.value);
                            updateContact(
                              0,
                              "fullName",
                              (event.target.value + " " + pmLastName).trim(),
                            );
                          }}
                        />
                      </Field>

                      <Field label="Last Name" required>
                        <TextInput
                          value={pmLastName}
                          onChange={(event) => {
                            setPmLastName(event.target.value);
                            updateContact(
                              0,
                              "fullName",
                              (pmFirstName + " " + event.target.value).trim(),
                            );
                          }}
                        />
                      </Field>

                      <Field label="Job Title">
                        <TextInput
                          value={formData.contacts?.[0]?.jobTitle ?? ""}
                          onChange={(event) =>
                            updateContact(0, "jobTitle", event.target.value)
                          }
                        />
                      </Field>

                      <Field label="Email" required>
                        <TextInput
                          type="email"
                          placeholder="name@company.com"
                          value={formData.contacts?.[0]?.email ?? ""}
                          onChange={(event) =>
                            updateContact(0, "email", event.target.value)
                          }
                        />
                      </Field>

                      <Field label="Phone">
                        <TextInput
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          pattern="\d{10}"
                          title="Contact phone must be exactly 10 digits"
                          placeholder="1234567890"
                          value={formData.contacts?.[0]?.phone ?? ""}
                          onChange={(event) =>
                            updateContact(
                              0,
                              "phone",
                              event.target.value.replace(/\D/g, ""),
                            )
                          }
                        />
                      </Field>

                      <Field label="Extension">
                        <TextInput
                          value={formData.contacts?.[0]?.extension ?? ""}
                          onChange={(event) =>
                            updateContact(0, "extension", event.target.value)
                          }
                        />
                      </Field>

                      <Field label="Preferred Contact Method">
                        <SelectInput
                          value={
                            formData.contacts?.[0]?.preferredContactMethod ?? ""
                          }
                          onChange={(event) =>
                            updateContact(
                              0,
                              "preferredContactMethod",
                              event.target.value,
                            )
                          }
                          options={preferredContactOptions}
                        />
                      </Field>

                      <Field label="Best Time to Reach">
                        <SelectInput
                          value={formData.contacts?.[0]?.bestTimeToReach ?? ""}
                          onChange={(event) =>
                            updateContact(
                              0,
                              "bestTimeToReach",
                              event.target.value,
                            )
                          }
                          options={bestTimeOptions}
                        />
                      </Field>

                      <div className="lg:col-span-3">
                        <Field label="Additional Responsibilities">
                          <MultiSelectDropdown
                            options={responsibilityOptions}
                            values={
                              formData.contacts?.[0]
                                ?.additionalResponsibilities ?? []
                            }
                            onToggle={(value) =>
                              toggleContactArrayValue(
                                0,
                                "additionalResponsibilities",
                                value,
                              )
                            }
                            placeholder="Select responsibilities"
                          />
                        </Field>
                      </div>

                      <div className="lg:col-span-3 grid gap-6 lg:grid-cols-2">
                        <Field label="Is this the primary decision maker?">
                          <BooleanRadioGroup
                            name="primary-decision-maker-0"
                            value={
                              formData.contacts?.[0]?.isPrimaryDecisionMaker ??
                              null
                            }
                            onChange={(value) =>
                              updateContact(0, "isPrimaryDecisionMaker", value)
                            }
                          />
                        </Field>

                        <Field label="Can this person sign agreements?">
                          <BooleanRadioGroup
                            name="can-sign-0"
                            value={
                              formData.contacts?.[0]?.canSignAgreements ?? null
                            }
                            onChange={(value) =>
                              updateContact(0, "canSignAgreements", value)
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                ) : null}

                <RepeaterHeader
                  title="Additional Contacts"
                  actionLabel="+ Add Another Contact"
                  onAction={addContact}
                />

                {(formData.contacts ?? []).slice(1).map((contact, index) => {
                  const actualIndex = index + 1;
                  return (
                    <div
                      key={`contact-${actualIndex}`}
                      className="rounded-2xl border border-slate-200 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <p className="font-medium text-slate-800">
                          Additional Contact {actualIndex}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeContact(actualIndex)}
                          className="text-sm text-red-500"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Field label="Full Name" required>
                          <TextInput
                            value={contact.fullName ?? ""}
                            onChange={(event) =>
                              updateContact(
                                actualIndex,
                                "fullName",
                                event.target.value,
                              )
                            }
                          />
                        </Field>

                        <Field label="Job Title">
                          <TextInput
                            value={contact.jobTitle ?? ""}
                            onChange={(event) =>
                              updateContact(
                                actualIndex,
                                "jobTitle",
                                event.target.value,
                              )
                            }
                          />
                        </Field>

                        <Field label="Contact Role" required>
                          <SelectInput
                            value={contact.contactRole ?? ""}
                            onChange={(event) =>
                              updateContact(
                                actualIndex,
                                "contactRole",
                                event.target.value,
                              )
                            }
                            options={contactRoleOptions}
                          />
                        </Field>

                        <Field label="Email" required>
                          <TextInput
                            type="email"
                            placeholder="name@company.com"
                            value={contact.email ?? ""}
                            onChange={(event) =>
                              updateContact(
                                actualIndex,
                                "email",
                                event.target.value,
                              )
                            }
                          />
                        </Field>

                        <Field label="Phone">
                          <TextInput
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            pattern="\d{10}"
                            title="Contact phone must be exactly 10 digits"
                            placeholder="1234567890"
                            value={contact.phone ?? ""}
                            onChange={(event) =>
                              updateContact(
                                actualIndex,
                                "phone",
                                event.target.value.replace(/\D/g, ""),
                              )
                            }
                          />
                        </Field>

                        <Field label="Extension">
                          <TextInput
                            value={contact.extension ?? ""}
                            onChange={(event) =>
                              updateContact(
                                actualIndex,
                                "extension",
                                event.target.value,
                              )
                            }
                          />
                        </Field>

                        <Field label="Preferred Contact Method">
                          <SelectInput
                            value={contact.preferredContactMethod ?? ""}
                            onChange={(event) =>
                              updateContact(
                                actualIndex,
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
                                actualIndex,
                                "bestTimeToReach",
                                event.target.value,
                              )
                            }
                            options={bestTimeOptions}
                          />
                        </Field>

                        <div className="lg:col-span-3">
                          <Field label="Additional Responsibilities">
                            <MultiSelectDropdown
                              options={responsibilityOptions}
                              values={contact.additionalResponsibilities ?? []}
                              onToggle={(value) =>
                                toggleContactArrayValue(
                                  actualIndex,
                                  "additionalResponsibilities",
                                  value,
                                )
                              }
                              placeholder="Select responsibilities"
                            />
                          </Field>
                        </div>

                        <div className="lg:col-span-3 grid gap-6 lg:grid-cols-2">
                          <Field label="Is this the primary decision maker?">
                            <BooleanRadioGroup
                              name={`primary-decision-maker-${actualIndex}`}
                              value={contact.isPrimaryDecisionMaker ?? null}
                              onChange={(value) =>
                                updateContact(
                                  actualIndex,
                                  "isPrimaryDecisionMaker",
                                  value,
                                )
                              }
                            />
                          </Field>

                          <Field label="Can this person sign agreements?">
                            <BooleanRadioGroup
                              name={`can-sign-${actualIndex}`}
                              value={contact.canSignAgreements ?? null}
                              onChange={(value) =>
                                updateContact(
                                  actualIndex,
                                  "canSignAgreements",
                                  value,
                                )
                              }
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {currentStep === 3 || currentStep === 4 ? (
          <SectionCard
            title={
              currentStep === 3
                ? "Practice Information"
                : "Provider Information"
            }
            description={
              currentStep === 3
                ? "Each practice can include its own locations."
                : "Capture providers for each practice."
            }
          >
            {currentStep === 3 ? (
              <RepeaterHeader
                title="Practices"
                actionLabel={
                  hasFixedPracticeCount ? undefined : "+ Add Practice"
                }
                onAction={hasFixedPracticeCount ? undefined : addPractice}
              />
            ) : null}
            <div className="space-y-6">
              {(formData.practices ?? []).map((practice, practiceIndex) => {
                const shouldLockPracticeOneToCompanyInfo =
                  copyCompanyInfoToPracticeOne &&
                  formData.onboardingType === "SINGLE_PRACTICE_ORGANIZATION" &&
                  practiceIndex === 0;
                const isSinglePracticeOrgPracticeOne =
                  formData.onboardingType === "SINGLE_PRACTICE_ORGANIZATION" &&
                  practiceIndex === 0;
                const shouldLockPrimaryLocationAddressToCompanyInfo =
                  copyCompanyAddressToPrimaryLocation &&
                  formData.onboardingType === "SINGLE_PRACTICE_ORGANIZATION" &&
                  practiceIndex === 0;

                return (
                  <div key={`practice-${practiceIndex}`} className="space-y-6">
                    {currentStep === 3 ? (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                        <div className="mb-5 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-base font-semibold text-slate-900">
                              Practice {practiceIndex + 1}
                            </p>
                            <p className="text-sm text-slate-500">
                              Capture practice demographics and locations.
                            </p>
                          </div>
                          {!hasFixedPracticeCount &&
                          (formData.practices ?? []).length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removePractice(practiceIndex)}
                              className="text-sm text-red-500"
                            >
                              Remove
                            </button>
                          ) : hasFixedPracticeCount ? (
                            <p className="text-xs text-slate-400">
                              Locked to {requiredPracticeCount} practice
                              {requiredPracticeCount === 1 ? "" : "s"}
                            </p>
                          ) : null}
                        </div>

                        {isSinglePracticeOrgPracticeOne ? (
                          <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <label className="flex items-start gap-3 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={copyCompanyInfoToPracticeOne}
                                onChange={(event) =>
                                  setCopyCompanyInfoToPracticeOne(
                                    event.target.checked,
                                  )
                                }
                              />
                              <span>
                                Use Company / Organization info for Practice 1
                                <span className="mt-1 block text-xs text-slate-500">
                                  Copies company name, DBA, Tax ID, phone,
                                  email, and address to Practice 1 and its first
                                  location.
                                </span>
                              </span>
                            </label>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <Field label="Practice Name" required>
                            <TextInput
                              value={practice.practiceName ?? ""}
                              disabled={shouldLockPracticeOneToCompanyInfo}
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
                              disabled={shouldLockPracticeOneToCompanyInfo}
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "practiceDbaName",
                                  event.target.value,
                                )
                              }
                            />
                          </Field>

                          <Field label="Practice Type" required>
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
                                  event.target.value.replace(/\D/g, ""),
                                )
                              }
                            />
                          </Field>

                          <Field
                            label="Tax ID / EIN Used for This Practice"
                            required
                          >
                            <TextInput
                              value={practice.taxIdEin ?? ""}
                              disabled={shouldLockPracticeOneToCompanyInfo}
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "taxIdEin",
                                  event.target.value.replace(/\D/g, ""),
                                )
                              }
                            />
                          </Field>

                          <Field label="Medicaid ID Number">
                            <TextInput
                              value={practice.medicaidIdNumber ?? ""}
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "medicaidIdNumber",
                                  event.target.value.replace(/\D/g, ""),
                                )
                              }
                            />
                          </Field>

                          <Field label="Group Medicaid NPI">
                            <TextInput
                              value={practice.groupMedicaidNpi ?? ""}
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "groupMedicaidNpi",
                                  event.target.value.replace(/\D/g, ""),
                                )
                              }
                            />
                          </Field>

                          <Field label="Group Medicare PTAN">
                            <TextInput
                              value={practice.groupMedicarePtan ?? ""}
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "groupMedicarePtan",
                                  event.target.value,
                                )
                              }
                            />
                          </Field>

                          <Field label="Group Taxonomy">
                            <TextInput
                              value={practice.groupTaxonomy ?? ""}
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "groupTaxonomy",
                                  event.target.value,
                                )
                              }
                            />
                          </Field>

                          <Field label="Is this practice part of a parent company?">
                            <BooleanRadioGroup
                              name={`parent-company-${practiceIndex}`}
                              value={practice.isPartOfParentCompany ?? null}
                              onChange={(value) =>
                                updatePractice(
                                  practiceIndex,
                                  "isPartOfParentCompany",
                                  value,
                                )
                              }
                            />
                          </Field>

                          {/* <Field label="Approximate Number of Providers">
                            <TextInput
                              type="number"
                              min={0}
                              value={practice.approximateNumberOfProviders ?? 0}
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "approximateNumberOfProviders",
                                  parseNumber(
                                    event.target.value.replace(/\D/g, ""),
                                  ),
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
                                  parseNumber(
                                    event.target.value.replace(/\D/g, ""),
                                  ),
                                )
                              }
                            />
                          </Field>

                          <Field label="Approximate Monthly Patient Volume">
                            <TextInput
                              type="number"
                              min={0}
                              value={
                                practice.approximateMonthlyPatientVolume ?? 0
                              }
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "approximateMonthlyPatientVolume",
                                  parseNumber(
                                    event.target.value.replace(/\D/g, ""),
                                  ),
                                )
                              }
                            />
                          </Field>

                          <Field label="Approximate Medicare Patient Volume">
                            <TextInput
                              type="number"
                              min={0}
                              value={
                                practice.approximateMedicarePatientVolume ?? 0
                              }
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "approximateMedicarePatientVolume",
                                  parseNumber(
                                    event.target.value.replace(/\D/g, ""),
                                  ),
                                )
                              }
                            />
                          </Field>

                          <Field label="Approximate Medicaid Patient Volume">
                            <TextInput
                              type="number"
                              min={0}
                              value={
                                practice.approximateMedicaidPatientVolume ?? 0
                              }
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "approximateMedicaidPatientVolume",
                                  parseNumber(
                                    event.target.value.replace(/\D/g, ""),
                                  ),
                                )
                              }
                            />
                          </Field>

                          <Field label="Approximate Commercial Patient Volume">
                            <TextInput
                              type="number"
                              min={0}
                              value={
                                practice.approximateCommercialPatientVolume ?? 0
                              }
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "approximateCommercialPatientVolume",
                                  parseNumber(
                                    event.target.value.replace(/\D/g, ""),
                                  ),
                                )
                              }
                            />
                          </Field> */}

                          <Field label="Practice Work Start Date">
                            <TextInput
                              type="date"
                              value={practice.practiceWorkStartDate ?? ""}
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "practiceWorkStartDate",
                                  event.target.value,
                                )
                              }
                            />
                          </Field>

                          <Field label="Railroad Medicare (Group)">
                            <TextInput
                              value={practice.railroadMedicareGroup ?? ""}
                              onChange={(event) =>
                                updatePractice(
                                  practiceIndex,
                                  "railroadMedicareGroup",
                                  event.target.value,
                                )
                              }
                            />
                          </Field>

                          <div className="lg:col-span-3">
                            <Field label="Additional Specialty Areas">
                              <MultiSelectDropdown
                                options={specialtyOptions}
                                values={practice.additionalSpecialtyAreas ?? []}
                                onToggle={(value) =>
                                  togglePracticeArrayValue(
                                    practiceIndex,
                                    "additionalSpecialtyAreas",
                                    value,
                                  )
                                }
                                placeholder="Select specialties"
                              />
                            </Field>
                          </div>

                          <div className="lg:col-span-3">
                            <Field label="Does this practice currently offer care management services?">
                              <BooleanRadioGroup
                                name={`care-management-${practiceIndex}`}
                                value={
                                  practice.offersCareManagementServices ?? null
                                }
                                onChange={(value) => {
                                  updatePractice(
                                    practiceIndex,
                                    "offersCareManagementServices",
                                    value,
                                  );
                                  if (!value) {
                                    updatePractice(
                                      practiceIndex,
                                      "currentServicesOffered",
                                      [],
                                    );
                                    updatePractice(
                                      practiceIndex,
                                      "operationalPainPoints",
                                      [],
                                    );
                                  }
                                }}
                              />
                            </Field>
                          </div>

                          {practice.offersCareManagementServices ? (
                            <div className="lg:col-span-3">
                              <Field label="Which services are currently being offered?">
                                <CheckboxGroup
                                  options={currentServiceOptions}
                                  values={practice.currentServicesOffered ?? []}
                                  onToggle={(value) =>
                                    togglePracticeArrayValue(
                                      practiceIndex,
                                      "currentServicesOffered",
                                      value,
                                    )
                                  }
                                />
                              </Field>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
                          <RepeaterHeader
                            title="Practice Locations"
                            actionLabel={
                              formData.onboardingType ===
                                "SINGLE_PRACTICE_ORGANIZATION" ||
                              formData.onboardingType === "SINGLE_PRACTICE" ||
                              formData.onboardingType === "SINGLE_PRACTICE_NOW"
                                ? undefined
                                : "+ Add Location"
                            }
                            onAction={
                              formData.onboardingType ===
                                "SINGLE_PRACTICE_ORGANIZATION" ||
                              formData.onboardingType === "SINGLE_PRACTICE" ||
                              formData.onboardingType === "SINGLE_PRACTICE_NOW"
                                ? undefined
                                : () => addLocation(practiceIndex)
                            }
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
                                      Practice {practiceIndex + 1} - Location{" "}
                                      {locationIndex + 1}
                                    </p>
                                    {(practice.locations ?? []).length > 1 ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeLocation(
                                            practiceIndex,
                                            locationIndex,
                                          )
                                        }
                                        className="text-sm text-red-500"
                                      >
                                        Remove
                                      </button>
                                    ) : null}
                                  </div>

                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <Field label="Location Name" required>
                                      <TextInput
                                        value={location.locationName ?? ""}
                                        disabled={
                                          shouldLockPracticeOneToCompanyInfo &&
                                          locationIndex === 0
                                        }
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

                                    {(formData.practices ?? []).length === 1 &&
                                    (practice.locations ?? []).length ===
                                      1 ? null : (
                                      <Field label="Is this the primary location?">
                                        <BooleanRadioGroup
                                          name={`primary-location-${practiceIndex}-${locationIndex}`}
                                          value={
                                            location.isPrimaryLocation ?? false
                                          }
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
                                    )}

                                    {isSinglePracticeOrgPracticeOne &&
                                    locationIndex === 0 ? (
                                      <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                                        <label className="flex items-start gap-3 text-sm text-slate-700">
                                          <input
                                            type="checkbox"
                                            className="mt-0.5"
                                            checked={
                                              copyCompanyAddressToPrimaryLocation ||
                                              shouldLockPracticeOneToCompanyInfo
                                            }
                                            disabled={
                                              shouldLockPracticeOneToCompanyInfo
                                            }
                                            onChange={(event) =>
                                              setCopyCompanyAddressToPrimaryLocation(
                                                event.target.checked,
                                              )
                                            }
                                          />
                                          <span>
                                            Use same address as Company /
                                            Organization
                                            <span className="mt-1 block text-xs text-slate-500">
                                              Copies company address fields to
                                              this location.
                                            </span>
                                          </span>
                                        </label>
                                      </div>
                                    ) : null}

                                    <div className="md:col-span-2 lg:col-span-3">
                                      <Field label="Address Line 1">
                                        <TextInput
                                          value={location.addressLine1 ?? ""}
                                          disabled={
                                            shouldLockPracticeOneToCompanyInfo &&
                                            locationIndex === 0
                                              ? true
                                              : shouldLockPrimaryLocationAddressToCompanyInfo &&
                                                locationIndex === 0
                                          }
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
                                          disabled={
                                            shouldLockPracticeOneToCompanyInfo &&
                                            locationIndex === 0
                                              ? true
                                              : shouldLockPrimaryLocationAddressToCompanyInfo &&
                                                locationIndex === 0
                                          }
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
                                        disabled={
                                          shouldLockPracticeOneToCompanyInfo &&
                                          locationIndex === 0
                                            ? true
                                            : shouldLockPrimaryLocationAddressToCompanyInfo &&
                                              locationIndex === 0
                                        }
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
                                        disabled={
                                          shouldLockPracticeOneToCompanyInfo &&
                                          locationIndex === 0
                                            ? true
                                            : shouldLockPrimaryLocationAddressToCompanyInfo &&
                                              locationIndex === 0
                                        }
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
                                        disabled={
                                          shouldLockPracticeOneToCompanyInfo &&
                                          locationIndex === 0
                                            ? true
                                            : shouldLockPrimaryLocationAddressToCompanyInfo &&
                                              locationIndex === 0
                                        }
                                        onChange={(event) =>
                                          updateLocation(
                                            practiceIndex,
                                            locationIndex,
                                            "zipCode",
                                            event.target.value.replace(
                                              /\D/g,
                                              "",
                                            ),
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Main Phone Number">
                                      <TextInput
                                        type="tel"
                                        value={location.mainPhoneNumber ?? ""}
                                        disabled={
                                          shouldLockPracticeOneToCompanyInfo &&
                                          locationIndex === 0
                                        }
                                        onChange={(event) =>
                                          updateLocation(
                                            practiceIndex,
                                            locationIndex,
                                            "mainPhoneNumber",
                                            event.target.value.replace(
                                              /\D/g,
                                              "",
                                            ),
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
                                            event.target.value.replace(
                                              /\D/g,
                                              "",
                                            ),
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Office Email">
                                      <TextInput
                                        type="email"
                                        value={location.officeEmail ?? ""}
                                        disabled={
                                          shouldLockPracticeOneToCompanyInfo &&
                                          locationIndex === 0
                                        }
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

                                    <div className="lg:col-span-3">
                                      <Field label="Hours of Operation">
                                        <TextArea
                                          rows={3}
                                          value={
                                            location.hoursOfOperation ?? ""
                                          }
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
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {currentStep === 4 ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
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
                                    Practice {practiceIndex + 1} - Provider{" "}
                                    {providerIndex + 1}
                                  </p>
                                  {(practice.providers ?? []).length > 1 ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeProvider(
                                          practiceIndex,
                                          providerIndex,
                                        )
                                      }
                                      className="text-sm text-red-500"
                                    >
                                      Remove
                                    </button>
                                  ) : null}
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                  <Field label="Provider First Name" required>
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

                                  <Field label="Provider Last Name" required>
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

                                  <Field label="Date of Birth">
                                    <TextInput
                                      type="date"
                                      value={provider.dateOfBirth ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "dateOfBirth",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </Field>

                                  <Field label="Gender">
                                    <SelectInput
                                      value={provider.gender ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "gender",
                                          event.target.value,
                                        )
                                      }
                                      options={genderOptions}
                                    />
                                  </Field>

                                  <Field label="State/Place of Birth">
                                    <TextInput
                                      value={provider.statePlaceOfBirth ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "statePlaceOfBirth",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </Field>

                                  <Field label="Country of Birth">
                                    <TextInput
                                      value={provider.countryOfBirth ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "countryOfBirth",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </Field>

                                  <Field label="Provider Type" required>
                                    <SelectInput
                                      value={provider.providerType ?? ""}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "providerType",
                                          value,
                                        );
                                        const validCredentials = (
                                          credentialsByProviderType[value] ??
                                          credentialsByProviderType["OTHER"]
                                        ).map((o) => o.value);
                                        if (
                                          provider.credentials &&
                                          !validCredentials.includes(
                                            provider.credentials,
                                          )
                                        ) {
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "credentials",
                                            "",
                                          );
                                        }
                                        const validSpecialties = (
                                          specialtyByProviderType[value] ??
                                          specialtyByProviderType["OTHER"]
                                        ).map((o) => o.value);
                                        if (
                                          provider.specialty &&
                                          !validSpecialties.includes(
                                            provider.specialty,
                                          )
                                        ) {
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "specialty",
                                            "",
                                          );
                                        }
                                      }}
                                      options={providerTypeOptions}
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
                                      options={
                                        credentialsByProviderType[
                                          provider.providerType ?? "OTHER"
                                        ] ?? credentialsByProviderType["OTHER"]
                                      }
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
                                      options={
                                        specialtyByProviderType[
                                          provider.providerType ?? "OTHER"
                                        ] ?? specialtyByProviderType["OTHER"]
                                      }
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

                                  <Field label="NPI" required>
                                    <TextInput
                                      value={provider.npi ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "npi",
                                          event.target.value.replace(/\D/g, ""),
                                        )
                                      }
                                    />
                                  </Field>

                                  <Field label="SSN (Last 4 Digits)" required>
                                    <TextInput
                                      inputMode="numeric"
                                      maxLength={4}
                                      pattern="\d{4}"
                                      title="Enter last 4 digits of SSN"
                                      placeholder="1234"
                                      value={provider.ssnFullDigits ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "ssnFullDigits",
                                          event.target.value.replace(/\D/g, ""),
                                        )
                                      }
                                    />
                                  </Field>

                                  {scopeRequestedServices.includes(
                                    "CREDENTIALING",
                                  ) ? (
                                    <Field label="CAQH ID" required>
                                      <TextInput
                                        value={provider.caqhId ?? ""}
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "caqhId",
                                            event.target.value.replace(
                                              /\D/g,
                                              "",
                                            ),
                                          )
                                        }
                                      />
                                    </Field>
                                  ) : null}

                                  <Field label="CLIA Number">
                                    <TextInput
                                      value={provider.cliaNumber ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "cliaNumber",
                                          event.target.value.replace(/\D/g, ""),
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

                                  <Field label="License Expiry Date">
                                    <TextInput
                                      type="date"
                                      value={provider.licenseExpiryDate ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "licenseExpiryDate",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </Field>

                                  <Field label="State of License">
                                    <TextInput
                                      value={provider.stateOfLicense ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "stateOfLicense",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </Field>

                                  <Field label="License Type (MD, NP, etc.)">
                                    <TextInput
                                      value={provider.licenseType ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "licenseType",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </Field>

                                  <Field label="Taxonomy">
                                    <TextInput
                                      value={provider.taxonomy ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "taxonomy",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </Field>

                                  <Field label="Secondary Specialty">
                                    <SelectInput
                                      value={provider.secondarySpecialty ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "secondarySpecialty",
                                          event.target.value,
                                        )
                                      }
                                      options={
                                        specialtyByProviderType[
                                          provider.providerType ?? "OTHER"
                                        ] ?? specialtyByProviderType["OTHER"]
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

                                  <Field label="Board Certifications">
                                    <TextArea
                                      rows={3}
                                      value={provider.boardCertifications ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "boardCertifications",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </Field>

                                  {scopeRequestedServices.includes(
                                    "CREDENTIALING",
                                  ) ? (
                                    <Field label="CAQH Username" required>
                                      <TextInput
                                        value={provider.caqhUsername ?? ""}
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "caqhUsername",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>
                                  ) : null}

                                  {scopeRequestedServices.includes(
                                    "CREDENTIALING",
                                  ) ? (
                                    <Field label="CAQH Password" required>
                                      <TextInput
                                        type="password"
                                        value={provider.caqhPassword ?? ""}
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "caqhPassword",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>
                                  ) : null}

                                  {scopeRequestedServices.includes(
                                    "CREDENTIALING",
                                  ) ? (
                                    <Field label="CAQH Last Attestation Date">
                                      <TextInput
                                        type="date"
                                        value={
                                          provider.caqhLastAttestationDate ?? ""
                                        }
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "caqhLastAttestationDate",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>
                                  ) : null}

                                  <Field label="Languages Spoken">
                                    <TextArea
                                      rows={3}
                                      value={provider.languagesSpoken ?? ""}
                                      onChange={(event) =>
                                        updateProvider(
                                          practiceIndex,
                                          providerIndex,
                                          "languagesSpoken",
                                          event.target.value,
                                        )
                                      }
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
                                        onToggle={(value) =>
                                          toggleProviderArrayValue(
                                            practiceIndex,
                                            providerIndex,
                                            "participatingLocations",
                                            value,
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Medicare PTAN (Individual)">
                                      <TextInput
                                        value={
                                          provider.medicarePtanIndividual ?? ""
                                        }
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "medicarePtanIndividual",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Medicaid ID (Individual)">
                                      <TextInput
                                        value={
                                          provider.medicaidIdIndividual ?? ""
                                        }
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "medicaidIdIndividual",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="IPA Affiliations (Provider Level)">
                                      <TextArea
                                        rows={3}
                                        value={
                                          provider.ipaAffiliationsProviderLevel ??
                                          ""
                                        }
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "ipaAffiliationsProviderLevel",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="NPPES Username">
                                      <TextInput
                                        value={provider.nppesUsername ?? ""}
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "nppesUsername",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="NPPES Password">
                                      <TextInput
                                        type="password"
                                        value={provider.nppesPassword ?? ""}
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "nppesPassword",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Railroad Medicare (Individual)">
                                      <TextInput
                                        value={
                                          provider.railroadMedicareIndividual ??
                                          ""
                                        }
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "railroadMedicareIndividual",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>
                                  </div>

                                  <div className="lg:col-span-3 grid gap-6 lg:grid-cols-2">
                                    <div className="space-y-4">
                                      <Field label="Board Certified?">
                                        <BooleanRadioGroup
                                          name={`board-certified-${practiceIndex}-${providerIndex}`}
                                          value={
                                            provider.boardCertified ?? null
                                          }
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

                                      {provider.boardCertified ? (
                                        <Field
                                          label="Board Certification"
                                          required
                                        >
                                          <DocumentUploadField
                                            value={
                                              provider.copyOfBoardCertification ??
                                              ""
                                            }
                                            isUploading={
                                              uploadingFieldKey ===
                                              `${practiceIndex}-${providerIndex}-copyOfBoardCertification`
                                            }
                                            onSelect={(file) =>
                                              void uploadProviderDocument(
                                                practiceIndex,
                                                providerIndex,
                                                "copyOfBoardCertification",
                                                file,
                                              )
                                            }
                                            onClear={() =>
                                              void removeProviderDocument(
                                                practiceIndex,
                                                providerIndex,
                                                "copyOfBoardCertification",
                                              )
                                            }
                                          />
                                        </Field>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="lg:col-span-3 space-y-4">
                                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                                      <Field label="Select Document Type">
                                        <SelectInput
                                          value={getSelectedProviderUploadField(
                                            practiceIndex,
                                            providerIndex,
                                          )}
                                          onChange={(event) =>
                                            setSelectedProviderUploadField(
                                              (prev) => ({
                                                ...prev,
                                                [getProviderUploadStateKey(
                                                  practiceIndex,
                                                  providerIndex,
                                                )]: event.target
                                                  .value as ProviderDocumentField,
                                              }),
                                            )
                                          }
                                          options={providerDocumentFieldOptions}
                                          placeholder="Select document type"
                                        />
                                      </Field>

                                      <Field label="Upload Selected Document">
                                        <DocumentUploadField
                                          value={
                                            provider[
                                              getSelectedProviderUploadField(
                                                practiceIndex,
                                                providerIndex,
                                              )
                                            ] ?? ""
                                          }
                                          accept={
                                            getSelectedProviderUploadField(
                                              practiceIndex,
                                              providerIndex,
                                            ) === "passportSizedPhoto"
                                              ? ".png,.jpg,.jpeg"
                                              : ".pdf,.png,.jpg,.jpeg,.doc,.docx,.csv,.xlsx"
                                          }
                                          isUploading={
                                            uploadingFieldKey ===
                                            `${practiceIndex}-${providerIndex}-${getSelectedProviderUploadField(
                                              practiceIndex,
                                              providerIndex,
                                            )}`
                                          }
                                          onSelect={(file) =>
                                            void uploadProviderDocument(
                                              practiceIndex,
                                              providerIndex,
                                              getSelectedProviderUploadField(
                                                practiceIndex,
                                                providerIndex,
                                              ),
                                              file,
                                            )
                                          }
                                          onClear={() =>
                                            void removeProviderDocument(
                                              practiceIndex,
                                              providerIndex,
                                              getSelectedProviderUploadField(
                                                practiceIndex,
                                                providerIndex,
                                              ),
                                            )
                                          }
                                        />
                                      </Field>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                      <p className="text-sm font-medium text-slate-800">
                                        Uploaded Documents
                                      </p>
                                      {providerDocumentFieldOptions.filter(
                                        (documentOption) =>
                                          Boolean(
                                            provider[documentOption.value],
                                          ),
                                      ).length > 0 ? (
                                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                                          {providerDocumentFieldOptions
                                            .filter((documentOption) =>
                                              Boolean(
                                                provider[documentOption.value],
                                              ),
                                            )
                                            .map((documentOption) => {
                                              const documentValue =
                                                provider[
                                                  documentOption.value
                                                ] ?? "";

                                              return (
                                                <div
                                                  key={documentOption.value}
                                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                                                >
                                                  <p className="text-xs font-medium text-slate-600">
                                                    {documentOption.label}
                                                  </p>
                                                  <p className="mt-1 break-all text-xs text-slate-500">
                                                    {documentValue
                                                      .split("/")
                                                      .pop()
                                                      ?.split("?")[0] ??
                                                      documentValue}
                                                  </p>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      ) : (
                                        <p className="mt-3 text-xs text-slate-500">
                                          No documents uploaded yet.
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="lg:col-span-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <Field label="Malpractice Carrier">
                                      <TextInput
                                        value={
                                          provider.malpracticeCarrier ?? ""
                                        }
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "malpracticeCarrier",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Malpractice Policy #">
                                      <TextInput
                                        value={
                                          provider.malpracticePolicyNumber ?? ""
                                        }
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "malpracticePolicyNumber",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Malpractice Effective Date">
                                      <TextInput
                                        type="date"
                                        value={
                                          provider.malpracticeEffectiveDate ??
                                          ""
                                        }
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "malpracticeEffectiveDate",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Malpractice Expiry Date">
                                      <TextInput
                                        type="date"
                                        value={
                                          provider.malpracticeExpiryDate ?? ""
                                        }
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "malpracticeExpiryDate",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Provider Effective Date with the Group">
                                      <TextInput
                                        type="date"
                                        value={
                                          provider.providerEffectiveDateWithGroup ??
                                          ""
                                        }
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "providerEffectiveDateWithGroup",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>
                                  </div>

                                  <div className="lg:col-span-3">
                                    <Field label="Hospital Affiliations">
                                      <TextArea
                                        rows={3}
                                        value={
                                          provider.hospitalAffiliations ?? ""
                                        }
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "hospitalAffiliations",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>
                                  </div>

                                  <div className="lg:col-span-3">
                                    <Field label="Home Address (for Medicaid applications)">
                                      <TextArea
                                        rows={3}
                                        value={provider.homeAddress ?? ""}
                                        onChange={(event) =>
                                          updateProvider(
                                            practiceIndex,
                                            providerIndex,
                                            "homeAddress",
                                            event.target.value,
                                          )
                                        }
                                      />
                                    </Field>
                                  </div>

                                  <div className="hidden lg:col-span-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <Field label="Board Certification">
                                      <DocumentUploadField
                                        value={
                                          provider.copyOfBoardCertification ??
                                          ""
                                        }
                                        isUploading={
                                          uploadingFieldKey ===
                                          `${practiceIndex}-${providerIndex}-copyOfBoardCertification`
                                        }
                                        onSelect={(file) =>
                                          void uploadProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "copyOfBoardCertification",
                                            file,
                                          )
                                        }
                                        onClear={() =>
                                          void removeProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "copyOfBoardCertification",
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Professional Liability Insurance (PLI)">
                                      <DocumentUploadField
                                        value={
                                          provider.copyOfProfessionalLiabilityInsurance ??
                                          ""
                                        }
                                        isUploading={
                                          uploadingFieldKey ===
                                          `${practiceIndex}-${providerIndex}-copyOfProfessionalLiabilityInsurance`
                                        }
                                        onSelect={(file) =>
                                          void uploadProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "copyOfProfessionalLiabilityInsurance",
                                            file,
                                          )
                                        }
                                        onClear={() =>
                                          void removeProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "copyOfProfessionalLiabilityInsurance",
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Bachelor’s Degree">
                                      <DocumentUploadField
                                        value={
                                          provider.copyOfBachelorsDegree ?? ""
                                        }
                                        isUploading={
                                          uploadingFieldKey ===
                                          `${practiceIndex}-${providerIndex}-copyOfBachelorsDegree`
                                        }
                                        onSelect={(file) =>
                                          void uploadProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "copyOfBachelorsDegree",
                                            file,
                                          )
                                        }
                                        onClear={() =>
                                          void removeProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "copyOfBachelorsDegree",
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Master’s Degree">
                                      <DocumentUploadField
                                        value={
                                          provider.copyOfMastersDegree ?? ""
                                        }
                                        isUploading={
                                          uploadingFieldKey ===
                                          `${practiceIndex}-${providerIndex}-copyOfMastersDegree`
                                        }
                                        onSelect={(file) =>
                                          void uploadProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "copyOfMastersDegree",
                                            file,
                                          )
                                        }
                                        onClear={() =>
                                          void removeProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "copyOfMastersDegree",
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Social Security Card (required for credentialing)">
                                      <DocumentUploadField
                                        value={
                                          provider.copyOfSocialSecurityCard ??
                                          ""
                                        }
                                        isUploading={
                                          uploadingFieldKey ===
                                          `${practiceIndex}-${providerIndex}-copyOfSocialSecurityCard`
                                        }
                                        onSelect={(file) =>
                                          void uploadProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "copyOfSocialSecurityCard",
                                            file,
                                          )
                                        }
                                        onClear={() =>
                                          void removeProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "copyOfSocialSecurityCard",
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Driver’s License">
                                      <DocumentUploadField
                                        value={
                                          provider.copyOfDriversLicense ?? ""
                                        }
                                        isUploading={
                                          uploadingFieldKey ===
                                          `${practiceIndex}-${providerIndex}-copyOfDriversLicense`
                                        }
                                        onSelect={(file) =>
                                          void uploadProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "copyOfDriversLicense",
                                            file,
                                          )
                                        }
                                        onClear={() =>
                                          void removeProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "copyOfDriversLicense",
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Passport-sized Photo">
                                      <DocumentUploadField
                                        value={
                                          provider.passportSizedPhoto ?? ""
                                        }
                                        accept=".png,.jpg,.jpeg"
                                        isUploading={
                                          uploadingFieldKey ===
                                          `${practiceIndex}-${providerIndex}-passportSizedPhoto`
                                        }
                                        onSelect={(file) =>
                                          void uploadProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "passportSizedPhoto",
                                            file,
                                          )
                                        }
                                        onClear={() =>
                                          void removeProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "passportSizedPhoto",
                                          )
                                        }
                                      />
                                    </Field>

                                    <Field label="Resume (with MM/DD/YYYY format)">
                                      <DocumentUploadField
                                        value={provider.resume ?? ""}
                                        isUploading={
                                          uploadingFieldKey ===
                                          `${practiceIndex}-${providerIndex}-resume`
                                        }
                                        onSelect={(file) =>
                                          void uploadProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "resume",
                                            file,
                                          )
                                        }
                                        onClear={() =>
                                          void removeProviderDocument(
                                            practiceIndex,
                                            providerIndex,
                                            "resume",
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
                    ) : null}
                  </div>
                );
              })}
            </div>
          </SectionCard>
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

                <Field label="Practice Management System/Billing Software Name">
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
                  {(() => {
                    const clearinghouseValue =
                      formData.technology?.clearinghouse ?? "";
                    const selectedClearinghouseValue = isPresetClearinghouse(
                      clearinghouseValue,
                    )
                      ? clearinghouseValue
                      : clearinghouseValue
                        ? "OTHER"
                        : "";
                    const customClearinghouseValue =
                      selectedClearinghouseValue === "OTHER" &&
                      !isPresetClearinghouse(clearinghouseValue)
                        ? clearinghouseValue
                        : "";

                    return (
                      <div className="space-y-3">
                        <SelectInput
                          value={selectedClearinghouseValue}
                          onChange={(event) => {
                            updateNestedField(
                              "technology",
                              "clearinghouse",
                              event.target.value,
                            );
                          }}
                          options={clearinghouseOptions}
                        />
                        {selectedClearinghouseValue === "OTHER" ? (
                          <TextInput
                            placeholder="Type clearinghouse name"
                            value={customClearinghouseValue}
                            onChange={(event) =>
                              updateNestedField(
                                "technology",
                                "clearinghouse",
                                event.target.value,
                              )
                            }
                          />
                        ) : null}
                      </div>
                    );
                  })()}
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

                {hasCareProgramsSelected ? (
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
                ) : null}

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
                        formData.technology?.patientPortalAvailable ?? null
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
                        formData.technology?.patientListExportable ?? null
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
                        formData.technology?.appointmentListExportable ?? null
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
                      value={formData.technology?.apiAccessAvailable ?? null}
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

            {hasBillingRcmSelected ? (
              <SectionCard title="Billing / RCM Setup">
                <div className="grid gap-6">
                  <Field label="Current Billing Model" required>
                    <RadioGroup
                      name="currentBillingModel"
                      value={formData.billing?.currentBillingModel ?? ""}
                      options={billingModelOptions}
                      onChange={(value) =>
                        updateNestedField(
                          "billing",
                          "currentBillingModel",
                          value,
                        )
                      }
                    />
                  </Field>

                  {formData.billing?.currentBillingModel === "OUTSOURCED" ||
                  formData.billing?.currentBillingModel === "HYBRID" ? (
                    <Field
                      label="Billing Company Name"
                      required={
                        formData.billing?.currentBillingModel ===
                          "OUTSOURCED" ||
                        formData.billing?.currentBillingModel === "HYBRID"
                      }
                    >
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
                            event.target.value.replace(/\D/g, ""),
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
                        value={
                          formData.billing?.preferredReportingCadence ?? ""
                        }
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
                        setFormData((prev) => {
                          const programValues = ["APCM", "CCM", "RPM", "PCM", "BHI", "RTM"];
                          const specialValues = ["NONE", "NOT_SURE"];
                          const current = prev.billing?.currentlyBilledServices ?? [];
                          let next: string[];
                          if (specialValues.includes(value)) {
                            if (current.includes(value)) {
                              next = current.filter((v) => v !== value);
                            } else {
                              next = [value];
                            }
                          } else {
                            next = current.includes(value)
                              ? current.filter((v) => v !== value)
                              : [...current, value];
                            next = next.filter((v) => !specialValues.includes(v));
                          }
                          return {
                            ...prev,
                            billing: {
                              ...(prev.billing ?? {}),
                              currentlyBilledServices: next,
                            },
                          };
                        })
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

                  {/* <Field label="Current Billing Pain Points">
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
                  </Field> */}

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

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="Recent W9 Form">
                      <DocumentUploadField
                        value={formData.billing?.recentW9Form ?? ""}
                        isUploading={
                          uploadingFieldKey === "billing-recentW9Form"
                        }
                        onSelect={(file) =>
                          void uploadNestedDocument(
                            "billing",
                            "recentW9Form",
                            file,
                          )
                        }
                        onClear={() =>
                          void removeNestedDocument("billing", "recentW9Form")
                        }
                      />
                    </Field>

                    <Field label="Void Check">
                      <DocumentUploadField
                        value={formData.billing?.voidCheck ?? ""}
                        isUploading={uploadingFieldKey === "billing-voidCheck"}
                        onSelect={(file) =>
                          void uploadNestedDocument(
                            "billing",
                            "voidCheck",
                            file,
                          )
                        }
                        onClear={() =>
                          void removeNestedDocument("billing", "voidCheck")
                        }
                      />
                    </Field>

                    <Field label="Formal Letter from Bank Stating the Client Holds an Account">
                      <DocumentUploadField
                        value={formData.billing?.formalLetterFromBank ?? ""}
                        isUploading={
                          uploadingFieldKey === "billing-formalLetterFromBank"
                        }
                        onSelect={(file) =>
                          void uploadNestedDocument(
                            "billing",
                            "formalLetterFromBank",
                            file,
                          )
                        }
                        onClear={() =>
                          void removeNestedDocument(
                            "billing",
                            "formalLetterFromBank",
                          )
                        }
                      />
                    </Field>
                  </div>
                </div>
              </SectionCard>
            ) : null}

            {hasCredentialingSelected ? (
              <SectionCard title="Credentialing / Payer Enrollment">
                <div className="grid gap-6">
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

                  <Field label="Excel spreadsheet or tracker listing all approved and in-network insurances, including online portal login credentials (if available)">
                    <DocumentUploadField
                      value={
                        formData.credentialing?.approvedInsurancesTracker ?? ""
                      }
                      isUploading={
                        uploadingFieldKey ===
                        "credentialing-approvedInsurancesTracker"
                      }
                      onSelect={(file) =>
                        void uploadNestedDocument(
                          "credentialing",
                          "approvedInsurancesTracker",
                          file,
                        )
                      }
                      onClear={() =>
                        void removeNestedDocument(
                          "credentialing",
                          "approvedInsurancesTracker",
                        )
                      }
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="lg:col-span-3">
                      <Field label="Do you have a designated contact person for insurance/credentialing?">
                        <BooleanRadioGroup
                          name="designated-credentialing-contact"
                          value={
                            formData.credentialing?.caqhMaintained ?? null
                          }
                          onChange={(value) => {
                            updateNestedField(
                              "credentialing",
                              "caqhMaintained",
                              value,
                            );
                            if (!value) {
                              updateNestedField(
                                "credentialing",
                                "designatedPortalContactName",
                                "",
                              );
                              updateNestedField(
                                "credentialing",
                                "designatedPortalContactEmail",
                                "",
                              );
                              updateNestedField(
                                "credentialing",
                                "designatedPortalContactPhone",
                                "",
                              );
                            }
                          }}
                        />
                      </Field>
                    </div>

                    {formData.credentialing?.caqhMaintained ? (
                      <>
                        <Field label="Designated contact person for all insurance portal setup, access, and maintenance matters">
                          <TextInput
                            value={
                              formData.credentialing
                                ?.designatedPortalContactName ?? ""
                            }
                            onChange={(event) =>
                              updateNestedField(
                                "credentialing",
                                "designatedPortalContactName",
                                event.target.value,
                              )
                            }
                          />
                        </Field>

                        <Field label="Designated Contact Email">
                          <TextInput
                            type="email"
                            value={
                              formData.credentialing
                                ?.designatedPortalContactEmail ?? ""
                            }
                            onChange={(event) =>
                              updateNestedField(
                                "credentialing",
                                "designatedPortalContactEmail",
                                event.target.value,
                              )
                            }
                          />
                        </Field>

                        <Field label="Designated Contact Phone">
                          <TextInput
                            type="tel"
                            value={
                              formData.credentialing
                                ?.designatedPortalContactPhone ?? ""
                            }
                            onChange={(event) =>
                              updateNestedField(
                                "credentialing",
                                "designatedPortalContactPhone",
                                event.target.value.replace(/\D/g, ""),
                              )
                            }
                          />
                        </Field>
                      </>
                    ) : null}

                    <Field label="IRS Document – Letter 147C">
                      <DocumentUploadField
                        value={formData.credentialing?.irsDocument147c ?? ""}
                        isUploading={
                          uploadingFieldKey === "credentialing-irsDocument147c"
                        }
                        onSelect={(file) =>
                          void uploadNestedDocument(
                            "credentialing",
                            "irsDocument147c",
                            file,
                          )
                        }
                        onClear={() =>
                          void removeNestedDocument(
                            "credentialing",
                            "irsDocument147c",
                          )
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Which insurance plans would you like us to enroll/credential this provider with? (Please list all desired commercial, Medicare, Medicaid, IPA/HMO, and specialty plans.)">
                    <TextArea
                      value={
                        formData.credentialing?.desiredInsurancePlans ?? ""
                      }
                      onChange={(event) =>
                        updateNestedField(
                          "credentialing",
                          "desiredInsurancePlans",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                </div>
              </SectionCard>
            ) : null}

            {hasMarketingSelected ? (
              <SectionCard title="Marketing Setup">
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Field label="Website URL">
                      <TextInput
                        type="url"
                        placeholder="https://"
                        value={formData.marketing?.websiteUrl ?? ""}
                        onChange={(event) =>
                          updateNestedField(
                            "marketing",
                            "websiteUrl",
                            event.target.value,
                          )
                        }
                      />
                    </Field>

                    <Field label="Monthly Marketing Budget">
                      <SelectInput
                        value={formData.marketing?.monthlyMarketingBudget ?? ""}
                        onChange={(event) =>
                          updateNestedField(
                            "marketing",
                            "monthlyMarketingBudget",
                            event.target.value,
                          )
                        }
                        options={[
                          {
                            label: "Less than $1,000",
                            value: "LESS_THAN_1000",
                          },
                          { label: "$1,000 - $5,000", value: "1000_TO_5000" },
                          { label: "$5,000 - $10,000", value: "5000_TO_10000" },
                          { label: "$10,000+", value: "OVER_10000" },
                          { label: "Not Sure", value: "NOT_SURE" },
                        ]}
                      />
                    </Field>

                    <Field label="Google Business Profile Claimed?">
                      <BooleanRadioGroup
                        name="googleBusinessProfileClaimed"
                        value={
                          formData.marketing?.googleBusinessProfileClaimed ??
                          false
                        }
                        onChange={(value) =>
                          updateNestedField(
                            "marketing",
                            "googleBusinessProfileClaimed",
                            value,
                          )
                        }
                      />
                    </Field>
                  </div>

                  <Field label="Active Social Media Channels">
                    <CheckboxGroup
                      options={[
                        { label: "Facebook", value: "FACEBOOK" },
                        { label: "Instagram", value: "INSTAGRAM" },
                        { label: "LinkedIn", value: "LINKEDIN" },
                        { label: "Twitter / X", value: "TWITTER_X" },
                        { label: "YouTube", value: "YOUTUBE" },
                        { label: "TikTok", value: "TIKTOK" },
                        { label: "Nextdoor", value: "NEXTDOOR" },
                        { label: "None", value: "NONE" },
                      ]}
                      values={formData.marketing?.socialMediaChannels ?? []}
                      onToggle={(value) =>
                        toggleNestedArrayValue(
                          "marketing",
                          "socialMediaChannels",
                          value,
                        )
                      }
                    />
                  </Field>

                  <Field label="Current Marketing Channels">
                    <CheckboxGroup
                      options={[
                        { label: "Google Ads", value: "GOOGLE_ADS" },
                        {
                          label: "Social Media Ads",
                          value: "SOCIAL_MEDIA_ADS",
                        },
                        { label: "SEO", value: "SEO" },
                        { label: "Email Marketing", value: "EMAIL_MARKETING" },
                        { label: "Direct Mail", value: "DIRECT_MAIL" },
                        {
                          label: "Community Events",
                          value: "COMMUNITY_EVENTS",
                        },
                        {
                          label: "Referral Program",
                          value: "REFERRAL_PROGRAM",
                        },
                        { label: "TV / Radio", value: "TV_RADIO" },
                        { label: "Billboards", value: "BILLBOARDS" },
                        { label: "None", value: "NONE" },
                      ]}
                      values={
                        formData.marketing?.currentMarketingChannels ?? []
                      }
                      onToggle={(value) =>
                        toggleNestedArrayValue(
                          "marketing",
                          "currentMarketingChannels",
                          value,
                        )
                      }
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field label="Target Patient Demographics">
                      <TextArea
                        rows={3}
                        value={
                          formData.marketing?.targetPatientDemographics ?? ""
                        }
                        onChange={(event) =>
                          updateNestedField(
                            "marketing",
                            "targetPatientDemographics",
                            event.target.value,
                          )
                        }
                        placeholder="Describe your ideal patient demographics..."
                      />
                    </Field>

                    <Field label="Patient Acquisition Goals">
                      <TextArea
                        rows={3}
                        value={
                          formData.marketing?.patientAcquisitionGoals ?? ""
                        }
                        onChange={(event) =>
                          updateNestedField(
                            "marketing",
                            "patientAcquisitionGoals",
                            event.target.value,
                          )
                        }
                        placeholder="What are your goals for new patient acquisition?"
                      />
                    </Field>
                  </div>

                  <Field label="Existing Brand Assets">
                    <TextArea
                      rows={3}
                      value={formData.marketing?.existingBrandAssets ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "marketing",
                          "existingBrandAssets",
                          event.target.value,
                        )
                      }
                      placeholder="Describe any existing brand materials, logos, style guides..."
                    />
                  </Field>

                  <Field label="AI Tools Currently Used">
                    <TextArea
                      rows={3}
                      value={formData.marketing?.aiToolsUsed ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "marketing",
                          "aiToolsUsed",
                          event.target.value,
                        )
                      }
                      placeholder="Describe any AI tools or platforms currently in use..."
                    />
                  </Field>

                  <Field label="Additional Marketing Notes">
                    <TextArea
                      rows={3}
                      value={formData.marketing?.additionalMarketingNotes ?? ""}
                      onChange={(event) =>
                        updateNestedField(
                          "marketing",
                          "additionalMarketingNotes",
                          event.target.value,
                        )
                      }
                    />
                  </Field>
                </div>
              </SectionCard>
            ) : null}

            {hasCareProgramsSelected ? (
              <>
                {/* Care Program Readiness section - commented out per removal request
                <SectionCard title="Care Program Readiness">
                  <div className="grid gap-6">
                    <Field label="Which programs are you planning to implement?">
                      <CheckboxGroup
                        options={serviceOptions.filter((option) =>
                          subCareProgramValues.includes(option.value),
                        )}
                        values={formData.careProgram?.programsPlanned ?? []}
                        onToggle={(value) =>
                          toggleCareProgramArrayValue("programsPlanned", value)
                        }
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
                                  event.target.value.replace(/\D/g, ""),
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
                                  event.target.value.replace(/\D/g, ""),
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
                */}
              </>
            ) : null}
          </>
        ) : null}

        {currentStep === 7 ? (
          <>
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
                      value={formData.outreach?.patientTextConsent ?? null}
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
                      value={formData.outreach?.interpreterServices ?? null}
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

            {hasLabPharmacySelected ? (
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
            ) : null}
          </>
        ) : null}

        {currentStep === 8 ? (
          <>
            <SectionCard
              title="Additional Document Tracking"
              description="Use this section to track any extra onboarding documents, request dates, received dates, file references, and notes that are not covered by the dedicated upload fields."
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
                      <Field label="Document Type" required>
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
                  <Field label="Name of person submitting" required>
                    <TextInput
                      value={formData.submittedByName ?? ""}
                      onChange={(event) =>
                        updateField("submittedByName", event.target.value)
                      }
                    />
                  </Field>

                  <Field label="Title of person submitting" required>
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
                      {scopeRequestedServices.length} requested service(s)
                      selected.
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
