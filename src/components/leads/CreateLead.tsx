import {
  Building2,
  Globe,
  LayoutGrid,
  Mail,
  MapPin,
  Phone,
  Save,
  Target,
  UserCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { LOGOUT_ACTION, type NavbarAction } from "../layout/Navbar";
import type { CompanyBody } from "../companies/types";
import type { PersonBody } from "../contact/types";
import type { DealApiError, DealBody } from "../../services/operations/deals";
import {
  createCompanyApi,
  getCompany,
} from "../../services/operations/companies";
import { createDealApi } from "../../services/operations/deals";
import { createPersonApi } from "../../services/operations/persons";
import { createPracticeApi } from "../../services/operations/practices";
import { getAllServices } from "../../services/operations/services";
import type { PracticeBody, PracticeSource } from "../practices/types";
import type { Service } from "../services/types";

type TaxIdFormState = {
  taxIdNumber: string;
  legalEntityName: string;
  notes: string;
};

type LeadFormState = {
  practiceName: string;
  practiceNpi: string;
  practiceRegion: string;
  practiceSource: PracticeSource;
  practiceBucket: string;
  companyName: string;
  companyIndustry: string;
  companySize: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite: string;
  companyStreet: string;
  companyCity: string;
  companyState: string;
  companyCountry: string;
  companyZip: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  primaryContactDesignation: string;
  interestedServiceIds: string[];
  estimatedValue: string;
  probability: string;
  followUpTaskTitle: string;
  followUpTaskDueAt: string;
  notes: string;
  taxIds: TaxIdFormState[];
};

type SavedLeadSummary = {
  practiceId: string;
  companyId: string;
  contactId: string;
  dealId: string;
  practiceName: string;
  companyName: string;
  contactName: string;
  dealStage: string;
  savedAt: string;
};

const initialTaxId: TaxIdFormState = {
  taxIdNumber: "",
  legalEntityName: "",
  notes: "",
};

const initialFormState: LeadFormState = {
  practiceName: "",
  practiceNpi: "",
  practiceRegion: "",
  practiceSource: "DIRECT",
  practiceBucket: "",
  companyName: "",
  companyIndustry: "",
  companySize: "",
  companyPhone: "",
  companyEmail: "",
  companyWebsite: "",
  companyStreet: "",
  companyCity: "",
  companyState: "",
  companyCountry: "",
  companyZip: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  primaryContactDesignation: "",
  interestedServiceIds: [],
  estimatedValue: "",
  probability: "10",
  followUpTaskTitle: "",
  followUpTaskDueAt: "",
  notes: "",
  taxIds: [initialTaxId],
};

const practiceSourceOptions: Array<{ value: PracticeSource; label: string }> = [
  { value: "DIRECT", label: "Direct" },
  { value: "REFERRAL", label: "Referral" },
  { value: "CHANNEL_PARTNER", label: "Channel Partner" },
  { value: "OUTBOUND", label: "Outbound" },
  { value: "INBOUND", label: "Inbound" },
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function defaultFollowUpTitle(contactName: string, practiceName: string) {
  const firstName = contactName.trim().split(/\s+/)[0];
  if (firstName) {
    return `Follow up with ${firstName} about ${practiceName}`;
  }
  return `Follow up on ${practiceName}`;
}

function parseContactName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, " ");
  const [firstName = "", ...rest] = normalized.split(" ");
  return {
    firstName,
    lastName: rest.join(" ") || "Contact",
    fullName: normalized,
  };
}

function buildErrorMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unable to save lead.";
  const missingRequirements = (error as DealApiError | undefined)
    ?.missingRequirements;
  if (!missingRequirements?.length) return message;
  return `${message} Missing: ${missingRequirements.join(", ")}.`;
}

function CreateLeadPage() {
  const [form, setForm] = useState<LeadFormState>(initialFormState);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedLead, setLastSavedLead] = useState<SavedLeadSummary | null>(
    null,
  );

  useEffect(() => {
    async function loadServices() {
      try {
        setIsLoadingServices(true);
        const serviceList = await getAllServices();
        setServices(serviceList.filter((service) => service.isActive));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load services.";
        toast.error(message);
      } finally {
        setIsLoadingServices(false);
      }
    }

    loadServices();
  }, []);

  function updateField<K extends keyof LeadFormState>(
    field: K,
    value: LeadFormState[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateTaxId(
    index: number,
    field: keyof TaxIdFormState,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      taxIds: current.taxIds.map((taxId, taxIndex) =>
        taxIndex === index ? { ...taxId, [field]: value } : taxId,
      ),
    }));
  }

  function addTaxId() {
    setForm((current) => ({
      ...current,
      taxIds: [...current.taxIds, { ...initialTaxId }],
    }));
  }

  function removeTaxId(index: number) {
    setForm((current) => ({
      ...current,
      taxIds:
        current.taxIds.length === 1
          ? [{ ...initialTaxId }]
          : current.taxIds.filter((_, taxIndex) => taxIndex !== index),
    }));
  }

  function toggleService(serviceId: string) {
    setForm((current) => ({
      ...current,
      interestedServiceIds: current.interestedServiceIds.includes(serviceId)
        ? current.interestedServiceIds.filter((id) => id !== serviceId)
        : [...current.interestedServiceIds, serviceId],
    }));
  }

  function resetForm() {
    setForm(initialFormState);
  }

  async function handleSaveLead(event: React.FormEvent) {
    event.preventDefault();

    const requiredFields: Array<[string, string]> = [
      [form.practiceName, "Practice name is required."],
      [form.practiceNpi, "Practice NPI is required."],
      [form.practiceRegion, "Practice region is required."],
      [form.practiceBucket, "Practice bucket is required."],
      [form.companyName, "Company name is required."],
      [form.companyIndustry, "Company industry is required."],
      [form.companySize, "Company size is required."],
      [form.primaryContactName, "Primary contact name is required."],
      [form.primaryContactEmail, "Primary contact email is required."],
      [form.estimatedValue, "Estimated deal value is required."],
      [form.followUpTaskDueAt, "Follow-up due date is required."],
    ];

    const missing = requiredFields.find(([value]) => !value.trim());
    if (missing) {
      toast.error(missing[1]);
      return;
    }

    const companySize = Number(form.companySize);
    if (!Number.isFinite(companySize) || companySize < 1) {
      toast.error("Company size must be a positive number.");
      return;
    }

    const estimatedValue = Number(form.estimatedValue);
    if (!Number.isFinite(estimatedValue) || estimatedValue < 0) {
      toast.error("Estimated deal value must be zero or greater.");
      return;
    }

    const probability = Number(form.probability);
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
      toast.error("Probability must be between 0 and 100.");
      return;
    }

    const parsedContact = parseContactName(form.primaryContactName);
    const activityTimestamp = new Date().toISOString();
    const followUpTaskTitle =
      form.followUpTaskTitle.trim() ||
      defaultFollowUpTitle(parsedContact.fullName, form.practiceName.trim());

    const validTaxIds = form.taxIds.filter(
      (taxId) => taxId.taxIdNumber.trim() && taxId.legalEntityName.trim(),
    );

    setIsSaving(true);

    try {
      const companyPayload: CompanyBody = {
        name: form.companyName.trim(),
        industry: form.companyIndustry.trim(),
        size: companySize,
        phone: form.companyPhone.trim() || undefined,
        email: form.companyEmail.trim() || undefined,
        website: form.companyWebsite.trim() || undefined,
        status: "LEAD",
        address: {
          street: form.companyStreet.trim() || undefined,
          city: form.companyCity.trim() || undefined,
          state: form.companyState.trim() || undefined,
          country: form.companyCountry.trim() || undefined,
          zip: form.companyZip.trim() || undefined,
        },
        ...(validTaxIds.length > 0
          ? {
              taxIds: validTaxIds.map((taxId) => ({
                taxIdNumber: taxId.taxIdNumber.trim(),
                legalEntityName: taxId.legalEntityName.trim(),
                notes: taxId.notes.trim() || undefined,
              })),
            }
          : {}),
      };

      const companyRow = await createCompanyApi(companyPayload);
      const createdCompany = await getCompany(companyRow.id);
      const createdTaxIdId =
        validTaxIds.length > 0
          ? createdCompany.taxIds?.find(
              (taxId) =>
                taxId.taxIdNumber === validTaxIds[0].taxIdNumber.trim(),
            )?.id
          : undefined;

      const practicePayload: PracticeBody = {
        name: form.practiceName.trim(),
        npi: form.practiceNpi.trim(),
        status: "LEAD",
        region: form.practiceRegion.trim(),
        source: form.practiceSource,
        bucket: form.practiceBucket
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        companyId: companyRow.id,
        taxIdId: createdTaxIdId,
      };
      const practiceRow = await createPracticeApi(practicePayload);

      const personPayload: PersonBody = {
        firstName: parsedContact.firstName,
        lastName: parsedContact.lastName,
        role: "ADMIN",
        influence: "HIGH",
        email: form.primaryContactEmail.trim(),
        phone: form.primaryContactPhone.trim() || undefined,
        designation: form.primaryContactDesignation.trim() || undefined,
        practiceIds: [practiceRow.id],
        companyIds: [companyRow.id],
      };
      const personRow = await createPersonApi(personPayload);

      const dealPayload: DealBody = {
        practiceId: practiceRow.id,
        companyId: companyRow.id,
        primaryContactId: personRow.id,
        stage: "PROSPECTING",
        value: estimatedValue,
        probability,
        selectedServiceIds: form.interestedServiceIds,
        nextTaskTitle: followUpTaskTitle,
        nextTaskDueAt: new Date(form.followUpTaskDueAt).toISOString(),
        lastActivityAt: activityTimestamp,
        activityCount: 1,
      };
      const dealRow = await createDealApi(dealPayload);

      setLastSavedLead({
        practiceId: practiceRow.id,
        companyId: companyRow.id,
        contactId: personRow.id,
        dealId: dealRow.id,
        practiceName: form.practiceName.trim(),
        companyName: form.companyName.trim(),
        contactName: parsedContact.fullName,
        dealStage: "PROSPECTING",
        savedAt: activityTimestamp,
      });
      resetForm();
      toast.success("Lead saved successfully.");
    } catch (error) {
      toast.error(buildErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const selectedServices = services.filter((service) =>
    form.interestedServiceIds.includes(service.id),
  );

  const navbarActions: NavbarAction[] = [
    // {
    //   label: isSaving ? "Saving..." : "Save Lead",
    //   icon: <Save className="h-4 w-4" />,
    //   onClick: () => {
    //     const formElement = document.getElementById("create-lead-form");
    //     if (formElement instanceof HTMLFormElement) {
    //       formElement.requestSubmit();
    //     }
    //   },
    // },
    LOGOUT_ACTION,
  ];

  return (
    <AppLayout
      title="Create Lead"
      activeModule="Leads"
      activeSubItem="Create Lead"
      navbarIcon={<Target className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="grid h-full gap-2 lg:grid-cols-[minmax(0,1.4fr)_380px]">
        <section className="app-panel overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
          <div className="border-b border-[#f0ece6] px-6 py-4">
            <h1 className="text-[18px] font-semibold text-slate-800">
              Create New Lead
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Capture the required practice and company details before
              generating downstream CRM records.
            </p>
          </div>

          <form
            id="create-lead-form"
            onSubmit={handleSaveLead}
            className="flex h-[calc(100%-76px)] flex-col"
          >
            <div className="flex-1 space-y-6 overflow-auto px-6 py-5">
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-slate-400" />
                  <h2 className="text-[14px] font-semibold text-slate-700">
                    Practice Details
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Practice Name <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={form.practiceName}
                      onChange={(event) =>
                        updateField("practiceName", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      NPI <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={form.practiceNpi}
                      onChange={(event) =>
                        updateField("practiceNpi", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Region <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={form.practiceRegion}
                      onChange={(event) =>
                        updateField("practiceRegion", event.target.value)
                      }
                      placeholder="Northeast"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Source <span className="text-red-500">*</span>
                    </span>
                    <select
                      value={form.practiceSource}
                      onChange={(event) =>
                        updateField(
                          "practiceSource",
                          event.target.value as PracticeSource,
                        )
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      {practiceSourceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Bucket / Specialty <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={form.practiceBucket}
                      onChange={(event) =>
                        updateField("practiceBucket", event.target.value)
                      }
                      placeholder="Radiology, Multi-site"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-[#f0ece6] bg-[#faf9f7] p-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <h2 className="text-[14px] font-semibold text-slate-700">
                    Company Details
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Company Name <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={form.companyName}
                      onChange={(event) =>
                        updateField("companyName", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Industry <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={form.companyIndustry}
                      onChange={(event) =>
                        updateField("companyIndustry", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Size <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={form.companySize}
                      onChange={(event) =>
                        updateField("companySize", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Phone
                    </span>
                    <input
                      type="text"
                      value={form.companyPhone}
                      onChange={(event) =>
                        updateField("companyPhone", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Email
                    </span>
                    <input
                      type="email"
                      value={form.companyEmail}
                      onChange={(event) =>
                        updateField("companyEmail", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Website
                    </span>
                    <input
                      type="text"
                      value={form.companyWebsite}
                      onChange={(event) =>
                        updateField("companyWebsite", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Street
                    </span>
                    <input
                      type="text"
                      value={form.companyStreet}
                      onChange={(event) =>
                        updateField("companyStreet", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      City
                    </span>
                    <input
                      type="text"
                      value={form.companyCity}
                      onChange={(event) =>
                        updateField("companyCity", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      State
                    </span>
                    <input
                      type="text"
                      value={form.companyState}
                      onChange={(event) =>
                        updateField("companyState", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Country
                    </span>
                    <input
                      type="text"
                      value={form.companyCountry}
                      onChange={(event) =>
                        updateField("companyCountry", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      ZIP
                    </span>
                    <input
                      type="text"
                      value={form.companyZip}
                      onChange={(event) =>
                        updateField("companyZip", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-slate-700">
                      Tax IDs
                    </span>
                    <button
                      type="button"
                      onClick={addTaxId}
                      className="text-[13px] font-medium text-[#4f63ea] hover:underline"
                    >
                      Add Tax ID
                    </button>
                  </div>
                  {form.taxIds.map((taxId, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-xl border border-[#ece8e1] bg-white p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <input
                        type="text"
                        value={taxId.taxIdNumber}
                        onChange={(event) =>
                          updateTaxId(index, "taxIdNumber", event.target.value)
                        }
                        placeholder="Tax ID Number"
                        className="app-control rounded-md px-3 py-2 text-[13px]"
                      />
                      <input
                        type="text"
                        value={taxId.legalEntityName}
                        onChange={(event) =>
                          updateTaxId(
                            index,
                            "legalEntityName",
                            event.target.value,
                          )
                        }
                        placeholder="Legal Entity Name"
                        className="app-control rounded-md px-3 py-2 text-[13px]"
                      />
                      <input
                        type="text"
                        value={taxId.notes}
                        onChange={(event) =>
                          updateTaxId(index, "notes", event.target.value)
                        }
                        placeholder="Notes"
                        className="app-control rounded-md px-3 py-2 text-[13px]"
                      />
                      <button
                        type="button"
                        onClick={() => removeTaxId(index)}
                        className="rounded-md border border-[#ece8e1] px-3 py-2 text-[13px] text-red-500 hover:bg-[#fff6f6]"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <UserCircle2 className="h-4 w-4 text-slate-400" />
                  <h2 className="text-[14px] font-semibold text-slate-700">
                    Primary Contact
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Contact Name <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="text"
                      value={form.primaryContactName}
                      onChange={(event) =>
                        updateField("primaryContactName", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Designation
                    </span>
                    <input
                      type="text"
                      value={form.primaryContactDesignation}
                      onChange={(event) =>
                        updateField(
                          "primaryContactDesignation",
                          event.target.value,
                        )
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Contact Email <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="email"
                      value={form.primaryContactEmail}
                      onChange={(event) =>
                        updateField("primaryContactEmail", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Contact Phone
                    </span>
                    <input
                      type="text"
                      value={form.primaryContactPhone}
                      onChange={(event) =>
                        updateField("primaryContactPhone", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-[#f0ece6] bg-[#faf9f7] p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-slate-400" />
                  <h2 className="text-[14px] font-semibold text-slate-700">
                    Lead / Deal Setup
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Estimated Value <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={form.estimatedValue}
                      onChange={(event) =>
                        updateField("estimatedValue", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Probability (%)
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.probability}
                      onChange={(event) =>
                        updateField("probability", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Follow-Up Due <span className="text-red-500">*</span>
                    </span>
                    <input
                      type="date"
                      value={form.followUpTaskDueAt}
                      onChange={(event) =>
                        updateField("followUpTaskDueAt", event.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      required
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-slate-700">
                    Follow-Up Task Title
                  </span>
                  <input
                    type="text"
                    value={form.followUpTaskTitle}
                    onChange={(event) =>
                      updateField("followUpTaskTitle", event.target.value)
                    }
                    placeholder="Follow up with contact about onboarding needs"
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  />
                </label>

                <div>
                  <span className="mb-2 block text-[13px] font-medium text-slate-700">
                    Interested Services
                  </span>
                  <div className="rounded-xl border border-[#ece8e1] bg-white p-3">
                    {isLoadingServices ? (
                      <div className="py-4 text-center text-[13px] text-slate-400">
                        Loading services...
                      </div>
                    ) : services.length === 0 ? (
                      <div className="py-4 text-center text-[13px] text-slate-400">
                        No active services available.
                      </div>
                    ) : (
                      <div className="grid gap-2 md:grid-cols-2">
                        {services.map((service) => {
                          const checked = form.interestedServiceIds.includes(
                            service.id,
                          );
                          return (
                            <label
                              key={service.id}
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 ${
                                checked
                                  ? "border-[#9cb1f6] bg-[#f5f7ff]"
                                  : "border-[#ece8e1] bg-[#fcfbf9]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleService(service.id)}
                                className="mt-0.5 h-4 w-4 rounded border border-[#cec8bf]"
                              />
                              <span>
                                <span className="block text-[13px] font-medium text-slate-700">
                                  {service.name}
                                </span>
                                <span className="block text-[12px] text-slate-500">
                                  {service.category ||
                                    service.code ||
                                    "Uncategorized"}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-slate-700">
                    Notes
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                    rows={4}
                    placeholder="Lead context, concerns, timeline, or internal notes."
                    className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                  />
                </label>
              </section>
            </div>

            <div className="flex items-center justify-between border-t border-[#f0ece6] px-6 py-4">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving}
                className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1] disabled:opacity-50"
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="app-control inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving Lead..." : "Save Lead"}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-2">
          <section className="app-panel rounded-2xl border border-[#f0ece6] bg-white p-5 shadow-sm">
            <h2 className="text-[14px] font-semibold text-slate-700">
              What Save Creates
            </h2>
            <div className="mt-4 space-y-3 text-[13px] text-slate-600">
              <p>
                Company record with the entered profile, address, and tax IDs.
              </p>
              <p>Practice record with NPI, region, source, and bucket data.</p>
              <p>Primary contact linked to both the company and practice.</p>
              <p>
                Initial deal in `PROSPECTING` with services and follow-up task.
              </p>
            </div>
          </section>

          <section className="app-panel rounded-2xl border border-[#f0ece6] bg-white p-5 shadow-sm">
            <h2 className="text-[14px] font-semibold text-slate-700">
              Preview
            </h2>
            <div className="mt-4 space-y-4 text-[13px] text-slate-600">
              <div>
                <div className="text-[12px] uppercase tracking-[0.08em] text-slate-400">
                  Practice
                </div>
                <div className="mt-1 font-medium text-slate-700">
                  {form.practiceName || "Practice Name"}
                </div>
              </div>
              <div>
                <div className="text-[12px] uppercase tracking-[0.08em] text-slate-400">
                  Company
                </div>
                <div className="mt-1 font-medium text-slate-700">
                  {form.companyName || "Company Name"}
                </div>
              </div>
              <div>
                <div className="text-[12px] uppercase tracking-[0.08em] text-slate-400">
                  Contact
                </div>
                <div className="mt-1 font-medium text-slate-700">
                  {form.primaryContactName || "Primary Contact"}
                </div>
              </div>
              <div>
                <div className="text-[12px] uppercase tracking-[0.08em] text-slate-400">
                  Services
                </div>
                <div className="mt-1 text-slate-700">
                  {selectedServices.length > 0
                    ? selectedServices.map((service) => service.name).join(", ")
                    : "No services selected"}
                </div>
              </div>
            </div>
          </section>

          {lastSavedLead ? (
            <section className="app-panel rounded-2xl border border-[#d9e7cb] bg-[#f7fbf2] p-5 shadow-sm">
              <h2 className="text-[14px] font-semibold text-slate-700">
                Last Saved Lead
              </h2>
              <div className="mt-4 space-y-3 text-[13px] text-slate-700">
                <div className="text-slate-500">
                  {formatDateTime(lastSavedLead.savedAt)}
                </div>
                <div className="grid gap-3">
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.08em] text-slate-400">
                      Practice ID
                    </div>
                    <div className="mt-1 break-all">
                      {lastSavedLead.practiceId}
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.08em] text-slate-400">
                      Company ID
                    </div>
                    <div className="mt-1 break-all">
                      {lastSavedLead.companyId}
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.08em] text-slate-400">
                      Contact ID
                    </div>
                    <div className="mt-1 break-all">
                      {lastSavedLead.contactId}
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] uppercase tracking-[0.08em] text-slate-400">
                      Deal ID
                    </div>
                    <div className="mt-1 break-all">{lastSavedLead.dealId}</div>
                  </div>
                </div>
                <div className="rounded-full bg-[#eef6ff] px-3 py-1 text-[12px] font-medium text-[#4366a8]">
                  Deal stage: {lastSavedLead.dealStage}
                </div>
              </div>
            </section>
          ) : null}

          <section className="app-panel rounded-2xl border border-[#f0ece6] bg-white p-5 shadow-sm">
            <h2 className="text-[14px] font-semibold text-slate-700">
              Field Mapping
            </h2>
            <div className="mt-4 space-y-3 text-[13px] text-slate-600">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                <span>Company address is saved on the company record.</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                <span>
                  Contact email is required because the lead creates a real
                  contact.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-slate-400" />
                <span>
                  Follow-up is stored on the deal using the current task fields.
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-4 w-4 text-slate-400" />
                <span>
                  `NEW LEAD` is still mapped to `PROSPECTING` because that is
                  the current API stage.
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </AppLayout>
  );
}

export default CreateLeadPage;
