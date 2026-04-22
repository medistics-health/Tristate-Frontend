import { useState } from "react";
import toast from "react-hot-toast";
import type {
  OnboardingBody,
  OnboardingContact,
  OnboardingPractice,
  OnboardingDocument,
  OnboardingBilling,
  OnboardingCredentialing,
  OnboardingTechnology,
  OnboardingOutreach,
  OnboardingLabPharmacy,
  OnboardingCompliance,
} from "../../services/operations/onboarding";

import { createOnboarding } from "../../services/operations/onboarding";

const initialFormData: OnboardingBody = {
  onboardingType: "",
  isAuthorizedPerson: false,
  nonAuthorizedRole: "",
  numberOfPractices: 0,
  numberOfLocations: 0,
  billingManagedCentrally: "",
  credentialingManagedCentrally: "",
  contractingManagedCentrally: "",
  oneMainContact: false,
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
  isLegalContractingEntity: false,
  isBillingEntity: false,
  isCredentialingEntity: false,
  primarySpecialty: "",
  additionalSpecialties: [],
  requestedServices: [],
  primaryServiceToLaunch: "",
  requestedGoLiveDate: "",
  priorityLevel: "",
  servicesForAllPractices: "",
  replacingExistingVendor: false,
  currentVendorName: "",
  currentVendorEndDate: "",
  engagementGoals: "",
  informationAccurate: false,
  authorizeUse: false,
  submittedByName: "",
  submittedByTitle: "",
  contacts: [],
  practices: [],
  documents: [],
  billing: {},
  credentialing: {},
  technology: {},
  outreach: {},
  labPharmacy: {},
  compliance: {},
};

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

const initialPractice: OnboardingPractice = {
  practiceName: "",
  practiceDbaName: "",
  isPartOfParentCompany: false,
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
  locations: [],
  providers: [],
};

function OnboardingForm() {
  const [formData, setFormData] = useState<OnboardingBody>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 11;

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function handleNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value ? parseInt(value) : 0 }));
  }

  function handleArrayChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    const currentValues = (formData as any)[name] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v: string) => v !== value)
      : [...currentValues, value];
    setFormData((prev) => ({ ...prev, [name]: newValues }));
  }

  function handleNestedChange(
    section: keyof OnboardingBody,
    field: string,
    value: any,
  ) {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...(prev as any)[section], [field]: value },
    }));
  }

  function addContact() {
    setFormData((prev) => ({
      ...prev,
      contacts: [...(prev.contacts || []), { ...initialContact }],
    }));
  }

  function updateContact(index: number, field: string, value: any) {
    setFormData((prev) => ({
      ...prev,
      contacts: (prev.contacts || []).map((c, i) =>
        i === index ? { ...c, [field]: value } : c,
      ),
    }));
  }

  function removeContact(index: number) {
    setFormData((prev) => ({
      ...prev,
      contacts: (prev.contacts || []).filter((_, i) => i !== index),
    }));
  }

  function addPractice() {
    setFormData((prev) => ({
      ...prev,
      practices: [...(prev.practices || []), { ...initialPractice }],
    }));
  }

  function updatePractice(index: number, field: string, value: any) {
    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices || []).map((p, i) =>
        i === index ? { ...p, [field]: value } : p,
      ),
    }));
  }

  function removePractice(index: number) {
    setFormData((prev) => ({
      ...prev,
      practices: (prev.practices || []).filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !formData.legalCompanyName ||
      !formData.submittedByName ||
      !formData.mainCompanyEmail
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!formData.informationAccurate || !formData.authorizeUse) {
      toast.error("Please confirm the accuracy and authorization.");
      return;
    }
    setIsSubmitting(true);
    const loadingToast = toast.loading("Submitting your onboarding request...");
    try {
      await createOnboarding(formData);
      toast.success("Onboarding submitted successfully!", { id: loadingToast });
      setFormData(initialFormData);
      setCurrentStep(1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to submit onboarding.";
      toast.error(message, { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  const steps = [
    "Authorization",
    "Company Info",
    "Address",
    "Contacts",
    "Practices",
    "Documents",
    "Billing",
    "Credentialing",
    "Technology",
    "Outreach",
    "Lab & Pharmacy",
    "Compliance",
  ];

  function nextStep() {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  }
  function prevStep() {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(199,231,255,0.95),_transparent_34%),linear-gradient(135deg,_#f4f9ff_0%,_#edf4ef_46%,_#f8efe4_100%)] text-slate-950">
      <div className="relative isolate mx-auto flex min-h-screen max-w-[1600px] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="absolute left-[8%] top-[12%] h-48 w-48 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="absolute bottom-[8%] right-[10%] h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
        </div>

        <section className="relative flex w-full items-start justify-center overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="w-full max-w-5xl rounded-[32px] border border-white/70 bg-white/80 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:p-6">
            <div className="rounded-[28px] bg-[linear-gradient(180deg,_rgba(255,255,255,0.92)_0%,_rgba(245,248,252,0.95)_100%)] p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="font-app-sans text-xs uppercase tracking-[0.35em] text-slate-500">
                    New Practice
                  </p>
                  <h2 className="font-app-sans mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                    Onboarding Form
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">
                    Step {currentStep} of {totalSteps}
                  </p>
                  <p className="text-xs text-slate-500">
                    {steps[currentStep - 1]}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {currentStep === 1 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">
                      Authorization
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="isAuthorizedPerson"
                          checked={formData.isAuthorizedPerson || false}
                          onChange={handleChange}
                          className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700">
                          I am authorized to sign agreements
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="oneMainContact"
                          checked={formData.oneMainContact || false}
                          onChange={handleChange}
                          className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700">
                          One main contact for all communications
                        </span>
                      </label>
                      <label className="block md:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          If not authorized, your role
                        </span>
                        <input
                          type="text"
                          name="nonAuthorizedRole"
                          value={formData.nonAuthorizedRole || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">
                      Company Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Company Name <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="text"
                          name="legalCompanyName"
                          value={formData.legalCompanyName || ""}
                          onChange={handleChange}
                          required
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          DBA Name
                        </span>
                        <input
                          type="text"
                          name="dbaName"
                          value={formData.dbaName || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Organization Type
                        </span>
                        <select
                          name="organizationType"
                          value={formData.organizationType || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        >
                          <option value="">Select type</option>
                          <option value="PRIVATE_PRACTICE">
                            Private Practice
                          </option>
                          <option value="HEALTH_SYSTEM">Health System</option>
                          <option value="HOSPITAL">Hospital</option>
                          <option value="CLINIC">Clinic</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Ownership Type
                        </span>
                        <select
                          name="ownershipType"
                          value={formData.ownershipType || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        >
                          <option value="">Select type</option>
                          <option value="FOR_PROFIT">For Profit</option>
                          <option value="NON_PROFIT">Non-Profit</option>
                          <option value="GOVERNMENT">Government</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Tax ID / EIN
                        </span>
                        <input
                          type="text"
                          name="taxIdEin"
                          value={formData.taxIdEin || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Primary Specialty
                        </span>
                        <input
                          type="text"
                          name="primarySpecialty"
                          value={formData.primarySpecialty || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Company Phone
                        </span>
                        <input
                          type="tel"
                          name="mainCompanyPhone"
                          value={formData.mainCompanyPhone || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Company Fax
                        </span>
                        <input
                          type="tel"
                          name="mainCompanyFax"
                          value={formData.mainCompanyFax || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Company Email <span className="text-red-500">*</span>
                        </span>
                        <input
                          type="email"
                          name="mainCompanyEmail"
                          value={formData.mainCompanyEmail || ""}
                          onChange={handleChange}
                          required
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block lg:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Website
                        </span>
                        <input
                          type="url"
                          name="companyWebsite"
                          value={formData.companyWebsite || ""}
                          onChange={handleChange}
                          placeholder="https://"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">
                      Address
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="block md:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Address Line 1
                        </span>
                        <input
                          type="text"
                          name="companyAddressLine1"
                          value={formData.companyAddressLine1 || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Address Line 2
                        </span>
                        <input
                          type="text"
                          name="companyAddressLine2"
                          value={formData.companyAddressLine2 || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          City
                        </span>
                        <input
                          type="text"
                          name="companyCity"
                          value={formData.companyCity || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          State
                        </span>
                        <input
                          type="text"
                          name="companyState"
                          value={formData.companyState || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          ZIP Code
                        </span>
                        <input
                          type="text"
                          name="companyZip"
                          value={formData.companyZip || ""}
                          onChange={handleChange}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          States of Operation
                        </span>
                        <input
                          type="text"
                          name="statesOfOperation"
                          value={(formData.statesOfOperation || []).join(", ")}
                          onChange={(e) => {
                            const states = e.target.value
                              .split(",")
                              .map((s) => s.trim());
                            setFormData((prev) => ({
                              ...prev,
                              statesOfOperation: states.filter(Boolean),
                            }));
                          }}
                          placeholder="Enter states separated by commas"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Contacts
                      </h3>
                      <button
                        type="button"
                        onClick={addContact}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                      >
                        + Add Contact
                      </button>
                    </div>
                    {(formData.contacts || []).length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No contacts added yet. Click "Add Contact" to add one.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {(formData.contacts || []).map((contact, index) => (
                          <div
                            key={index}
                            className="rounded-2xl border border-slate-200 p-4"
                          >
                            <div className="mb-2 flex justify-between">
                              <p className="font-medium text-slate-700">
                                Contact {index + 1}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeContact(index)}
                                className="text-red-500 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Full Name
                                </span>
                                <input
                                  type="text"
                                  value={contact.fullName || ""}
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      "fullName",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Job Title
                                </span>
                                <input
                                  type="text"
                                  value={contact.jobTitle || ""}
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      "jobTitle",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Contact Role
                                </span>
                                <select
                                  value={contact.contactRole || ""}
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      "contactRole",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                >
                                  <option value="">Select role</option>
                                  <option value="ADMINISTRATIVE">
                                    Administrative
                                  </option>
                                  <option value="BILLING">Billing</option>
                                  <option value="CLINICAL">Clinical</option>
                                  <option value="OPERATIONS">Operations</option>
                                  <option value="IT">IT</option>
                                </select>
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Email
                                </span>
                                <input
                                  type="email"
                                  value={contact.email || ""}
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      "email",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Phone
                                </span>
                                <input
                                  type="tel"
                                  value={contact.phone || ""}
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      "phone",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Extension
                                </span>
                                <input
                                  type="text"
                                  value={contact.extension || ""}
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      "extension",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="block md:col-span-2">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Preferred Contact Method
                                </span>
                                <select
                                  value={contact.preferredContactMethod || ""}
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      "preferredContactMethod",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                >
                                  <option value="">Select method</option>
                                  <option value="EMAIL">Email</option>
                                  <option value="PHONE">Phone</option>
                                  <option value="TEXT">Text</option>
                                </select>
                              </label>
                              <label className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={
                                    contact.isPrimaryDecisionMaker || false
                                  }
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      "isPrimaryDecisionMaker",
                                      e.target.checked,
                                    )
                                  }
                                  className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                <span className="text-sm text-slate-700">
                                  Primary Decision Maker
                                </span>
                              </label>
                              <label className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={contact.canSignAgreements || false}
                                  onChange={(e) =>
                                    updateContact(
                                      index,
                                      "canSignAgreements",
                                      e.target.checked,
                                    )
                                  }
                                  className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                <span className="text-sm text-slate-700">
                                  Can Sign Agreements
                                </span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">
                        Practices
                      </h3>
                      <button
                        type="button"
                        onClick={addPractice}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                      >
                        + Add Practice
                      </button>
                    </div>
                    {(formData.practices || []).length === 0 ? (
                      <p className="text-sm text-slate-500">
                        No practices added yet. Click "Add Practice" to add one.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {(formData.practices || []).map((practice, index) => (
                          <div
                            key={index}
                            className="rounded-2xl border border-slate-200 p-4"
                          >
                            <div className="mb-2 flex justify-between">
                              <p className="font-medium text-slate-700">
                                Practice {index + 1}
                              </p>
                              <button
                                type="button"
                                onClick={() => removePractice(index)}
                                className="text-red-500 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Practice Name
                                </span>
                                <input
                                  type="text"
                                  value={practice.practiceName || ""}
                                  onChange={(e) =>
                                    updatePractice(
                                      index,
                                      "practiceName",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  DBA Name
                                </span>
                                <input
                                  type="text"
                                  value={practice.practiceDbaName || ""}
                                  onChange={(e) =>
                                    updatePractice(
                                      index,
                                      "practiceDbaName",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Practice Type
                                </span>
                                <select
                                  value={practice.practiceType || ""}
                                  onChange={(e) =>
                                    updatePractice(
                                      index,
                                      "practiceType",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                >
                                  <option value="">Select type</option>
                                  <option value="PRIMARY_CARE">
                                    Primary Care
                                  </option>
                                  <option value="SPECIALTY">Specialty</option>
                                  <option value="URGENT_CARE">
                                    Urgent Care
                                  </option>
                                  <option value="OTHER">Other</option>
                                </select>
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Group NPI
                                </span>
                                <input
                                  type="text"
                                  value={practice.groupNpi || ""}
                                  onChange={(e) =>
                                    updatePractice(
                                      index,
                                      "groupNpi",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Tax ID / EIN
                                </span>
                                <input
                                  type="text"
                                  value={practice.taxIdEin || ""}
                                  onChange={(e) =>
                                    updatePractice(
                                      index,
                                      "taxIdEin",
                                      e.target.value,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Approx. # of Providers
                                </span>
                                <input
                                  type="number"
                                  value={
                                    practice.approximateNumberOfProviders || 0
                                  }
                                  onChange={(e) =>
                                    updatePractice(
                                      index,
                                      "approximateNumberOfProviders",
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Approx. # of Locations
                                </span>
                                <input
                                  type="number"
                                  value={
                                    practice.approximateNumberOfLocations || 0
                                  }
                                  onChange={(e) =>
                                    updatePractice(
                                      index,
                                      "approximateNumberOfLocations",
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-sm font-medium text-slate-700">
                                  Monthly Patient Volume
                                </span>
                                <input
                                  type="number"
                                  value={
                                    practice.approximateMonthlyPatientVolume ||
                                    0
                                  }
                                  onChange={(e) =>
                                    updatePractice(
                                      index,
                                      "approximateMonthlyPatientVolume",
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                                />
                              </label>
                              <label className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={
                                    practice.isPartOfParentCompany || false
                                  }
                                  onChange={(e) =>
                                    updatePractice(
                                      index,
                                      "isPartOfParentCompany",
                                      e.target.checked,
                                    )
                                  }
                                  className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                <span className="text-sm text-slate-700">
                                  Part of Parent Company
                                </span>
                              </label>
                              <label className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={
                                    practice.offersCareManagementServices ||
                                    false
                                  }
                                  onChange={(e) =>
                                    updatePractice(
                                      index,
                                      "offersCareManagementServices",
                                      e.target.checked,
                                    )
                                  }
                                  className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                <span className="text-sm text-slate-700">
                                  Offers Care Management
                                </span>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 6 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">
                      Documents
                    </h3>
                    <p className="text-sm text-slate-500">
                      Document upload can be handled separately through the
                      document management system.
                    </p>
                  </div>
                )}

                {currentStep === 7 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">
                      Billing Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Current Billing Model
                        </span>
                        <select
                          value={formData.billing?.currentBillingModel || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "billing",
                              "currentBillingModel",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        >
                          <option value="">Select model</option>
                          <option value="INHOUSE">In-House</option>
                          <option value="OUTSOURCED">Outsourced</option>
                          <option value="HYBRID">Hybrid</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Billing Company Name
                        </span>
                        <input
                          type="text"
                          value={formData.billing?.billingCompanyName || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "billing",
                              "billingCompanyName",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Main Billing Contact Name
                        </span>
                        <input
                          type="text"
                          value={formData.billing?.mainBillingContactName || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "billing",
                              "mainBillingContactName",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Main Billing Contact Email
                        </span>
                        <input
                          type="email"
                          value={
                            formData.billing?.mainBillingContactEmail || ""
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "billing",
                              "mainBillingContactEmail",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Main Billing Contact Phone
                        </span>
                        <input
                          type="tel"
                          value={
                            formData.billing?.mainBillingContactPhone || ""
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "billing",
                              "mainBillingContactPhone",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Active Payers
                        </span>
                        <input
                          type="text"
                          value={formData.billing?.activePayers || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "billing",
                              "activePayers",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          EFT/ERA Setup
                        </span>
                        <select
                          value={formData.billing?.eftEraSetup || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "billing",
                              "eftEraSetup",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        >
                          <option value="">Select</option>
                          <option value="SETUP">Setup</option>
                          <option value="NOT_SETUP">Not Setup</option>
                          <option value="IN_PROGRESS">In Progress</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Preferred Reporting Cadence
                        </span>
                        <select
                          value={
                            formData.billing?.preferredReportingCadence || ""
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "billing",
                              "preferredReportingCadence",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        >
                          <option value="">Select cadence</option>
                          <option value="WEEKLY">Weekly</option>
                          <option value="BIWEEKLY">Bi-Weekly</option>
                          <option value="MONTHLY">Monthly</option>
                          <option value="QUARTERLY">Quarterly</option>
                        </select>
                      </label>
                      <label className="block md:col-span-2">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Invoice Email
                        </span>
                        <input
                          type="email"
                          value={formData.billing?.invoiceEmail || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "billing",
                              "invoiceEmail",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 8 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">
                      Credentialing Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={
                            formData.credentialing?.credentialingNeeded || false
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "credentialing",
                              "credentialingNeeded",
                              e.target.checked,
                            )
                          }
                          className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700">
                          Credentialing Needed
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={
                            formData.credentialing?.caqhMaintained || false
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "credentialing",
                              "caqhMaintained",
                              e.target.checked,
                            )
                          }
                          className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700">
                          CAQH Maintained
                        </span>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Payers to Enroll
                        </span>
                        <input
                          type="text"
                          value={formData.credentialing?.payersToEnroll || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "credentialing",
                              "payersToEnroll",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Medicare PTAN Available
                        </span>
                        <input
                          type="text"
                          value={
                            formData.credentialing?.medicarePtanAvailable || ""
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "credentialing",
                              "medicarePtanAvailable",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Medicaid Enrollment Active
                        </span>
                        <input
                          type="text"
                          value={
                            formData.credentialing?.medicaidEnrollmentActive ||
                            ""
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "credentialing",
                              "medicaidEnrollmentActive",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 9 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">
                      Technology Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          EHR System
                        </span>
                        <input
                          type="text"
                          value={formData.technology?.ehrSystem || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "technology",
                              "ehrSystem",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Practice Management System
                        </span>
                        <input
                          type="text"
                          value={
                            formData.technology?.practiceManagementSystem || ""
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "technology",
                              "practiceManagementSystem",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Clearinghouse
                        </span>
                        <input
                          type="text"
                          value={formData.technology?.clearinghouse || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "technology",
                              "clearinghouse",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Fax Platform
                        </span>
                        <input
                          type="text"
                          value={formData.technology?.faxPlatform || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "technology",
                              "faxPlatform",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Phone Platform
                        </span>
                        <input
                          type="text"
                          value={formData.technology?.phonePlatform || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "technology",
                              "phonePlatform",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Current Care Management Platform
                        </span>
                        <input
                          type="text"
                          value={
                            formData.technology
                              ?.currentCareManagementPlatform || ""
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "technology",
                              "currentCareManagementPlatform",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={
                            formData.technology?.patientPortalAvailable || false
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "technology",
                              "patientPortalAvailable",
                              e.target.checked,
                            )
                          }
                          className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700">
                          Patient Portal Available
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={
                            formData.technology?.patientListExportable || false
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "technology",
                              "patientListExportable",
                              e.target.checked,
                            )
                          }
                          className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700">
                          Patient List Exportable
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={
                            formData.technology?.appointmentListExportable ||
                            false
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "technology",
                              "appointmentListExportable",
                              e.target.checked,
                            )
                          }
                          className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700">
                          Appointment List Exportable
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={
                            formData.technology?.apiAccessAvailable || false
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "technology",
                              "apiAccessAvailable",
                              e.target.checked,
                            )
                          }
                          className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700">
                          API Access Available
                        </span>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          IT Contact Name
                        </span>
                        <input
                          type="text"
                          value={formData.technology?.itContactName || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "technology",
                              "itContactName",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          IT Contact Email
                        </span>
                        <input
                          type="email"
                          value={formData.technology?.itContactEmail || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "technology",
                              "itContactEmail",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 10 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6">
                    <h3 className="mb-4 text-lg font-semibold text-slate-900">
                      Lab & Pharmacy Information
                    </h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Preferred Lab
                        </span>
                        <input
                          type="text"
                          value={formData.labPharmacy?.preferredLab || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "labPharmacy",
                              "preferredLab",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={
                            formData.labPharmacy?.existingLabRelationship ||
                            false
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "labPharmacy",
                              "existingLabRelationship",
                              e.target.checked,
                            )
                          }
                          className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700">
                          Existing Lab Relationship
                        </span>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Lab Interface Status
                        </span>
                        <input
                          type="text"
                          value={formData.labPharmacy?.labInterfaceStatus || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "labPharmacy",
                              "labInterfaceStatus",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Lab Contact Name
                        </span>
                        <input
                          type="text"
                          value={formData.labPharmacy?.labContactName || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "labPharmacy",
                              "labContactName",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Lab Contact Email
                        </span>
                        <input
                          type="email"
                          value={formData.labPharmacy?.labContactEmail || ""}
                          onChange={(e) =>
                            handleNestedChange(
                              "labPharmacy",
                              "labContactEmail",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">
                          Pharmacy Partner Name
                        </span>
                        <input
                          type="text"
                          value={
                            formData.labPharmacy?.pharmacyPartnerName || ""
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "labPharmacy",
                              "pharmacyPartnerName",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                        />
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={
                            formData.labPharmacy?.pharmacyPartnerInvolved ||
                            false
                          }
                          onChange={(e) =>
                            handleNestedChange(
                              "labPharmacy",
                              "pharmacyPartnerInvolved",
                              e.target.checked,
                            )
                          }
                          className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700">
                          Pharmacy Partner Involved
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {currentStep === 11 && (
                  <div className="space-y-6">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h3 className="mb-4 text-lg font-semibold text-slate-900">
                        Compliance Information
                      </h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            HIPAA Contact Name
                          </span>
                          <input
                            type="text"
                            value={formData.compliance?.hipaaContactName || ""}
                            onChange={(e) =>
                              handleNestedChange(
                                "compliance",
                                "hipaaContactName",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            HIPAA Contact Email
                          </span>
                          <input
                            type="email"
                            value={formData.compliance?.hipaaContactEmail || ""}
                            onChange={(e) =>
                              handleNestedChange(
                                "compliance",
                                "hipaaContactEmail",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </label>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={formData.compliance?.baaRequired || false}
                            onChange={(e) =>
                              handleNestedChange(
                                "compliance",
                                "baaRequired",
                                e.target.checked,
                              )
                            }
                            className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="text-sm text-slate-700">
                            BAA Required
                          </span>
                        </label>
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={
                              formData.compliance?.securityQuestionnaire ||
                              false
                            }
                            onChange={(e) =>
                              handleNestedChange(
                                "compliance",
                                "securityQuestionnaire",
                                e.target.checked,
                              )
                            }
                            className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span className="text-sm text-slate-700">
                            Security Questionnaire
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h3 className="mb-4 text-lg font-semibold text-slate-900">
                        Additional Information
                      </h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            Onboarding Type
                          </span>
                          <select
                            name="onboardingType"
                            value={formData.onboardingType || ""}
                            onChange={handleChange}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          >
                            <option value="">Select type</option>
                            <option value="NEW_PRACTICE">New Practice</option>
                            <option value="EXISTING_PRACTICE">
                              Existing Practice
                            </option>
                            <option value="MERGER">Merger</option>
                            <option value="ACQUISITION">Acquisition</option>
                          </select>
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            Number of Practices
                          </span>
                          <input
                            type="number"
                            name="numberOfPractices"
                            value={formData.numberOfPractices || 0}
                            onChange={handleNumberChange}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            Number of Locations
                          </span>
                          <input
                            type="number"
                            name="numberOfLocations"
                            value={formData.numberOfLocations || 0}
                            onChange={handleNumberChange}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            Primary Service to Launch
                          </span>
                          <input
                            type="text"
                            name="primaryServiceToLaunch"
                            value={formData.primaryServiceToLaunch || ""}
                            onChange={handleChange}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            Requested Go-Live Date
                          </span>
                          <input
                            type="date"
                            name="requestedGoLiveDate"
                            value={formData.requestedGoLiveDate || ""}
                            onChange={handleChange}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            Priority Level
                          </span>
                          <select
                            name="priorityLevel"
                            value={formData.priorityLevel || ""}
                            onChange={handleChange}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          >
                            <option value="">Select priority</option>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                        </label>
                        <label className="block md:col-span-2">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            Services for All Practices
                          </span>
                          <input
                            type="text"
                            name="servicesForAllPractices"
                            value={formData.servicesForAllPractices || ""}
                            onChange={handleChange}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-6">
                      <h3 className="mb-4 text-lg font-semibold text-slate-900">
                        Submitted By
                      </h3>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            Submitted By Name{" "}
                            <span className="text-red-500">*</span>
                          </span>
                          <input
                            type="text"
                            name="submittedByName"
                            value={formData.submittedByName || ""}
                            onChange={handleChange}
                            required
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            Title
                          </span>
                          <input
                            type="text"
                            name="submittedByTitle"
                            value={formData.submittedByTitle || ""}
                            onChange={handleChange}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </label>
                        <label className="block md:col-span-2">
                          <span className="mb-1 block text-sm font-medium text-slate-700">
                            Engagement Goals
                          </span>
                          <textarea
                            name="engagementGoals"
                            value={formData.engagementGoals || ""}
                            onChange={handleChange}
                            rows={3}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          name="informationAccurate"
                          checked={formData.informationAccurate || false}
                          onChange={handleChange}
                          className="mt-1 h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700">
                          I confirm that all the information provided is
                          accurate and complete to the best of my knowledge.{" "}
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          name="authorizeUse"
                          checked={formData.authorizeUse || false}
                          onChange={handleChange}
                          className="mt-1 h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <span className="text-sm text-slate-700">
                          I authorize Tristate to use this information for
                          onboarding purposes.{" "}
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  {currentStep > 1 ? (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Previous
                    </button>
                  ) : (
                    <div />
                  )}
                  {currentStep < totalSteps ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-900"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-full bg-slate-950 px-8 py-3 text-sm font-medium text-white transition hover:bg-slate-900 disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default OnboardingForm;
