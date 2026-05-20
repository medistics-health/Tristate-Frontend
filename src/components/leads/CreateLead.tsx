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
  Users,
  Search,
  Plus,
  ArrowRight,
  CheckCircle2,
  X,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { LOGOUT_ACTION, type NavbarAction } from "../layout/Navbar";
import type { CompanyBody, Company } from "../companies/types";
import type { PersonBody } from "../contact/types";
import type { DealApiError, DealBody } from "../../services/operations/deals";
import {
  createCompanyApi,
  getCompany,
  getCompaniesView,
} from "../../services/operations/companies";
import { createDealApi } from "../../services/operations/deals";
import {
  createPersonApi,
  getPersonsView,
} from "../../services/operations/persons";
import {
  createPracticeApi,
  getPracticesView,
} from "../../services/operations/practices";
import { getAllServices } from "../../services/operations/services";
import { getAllUsers } from "../../services/operations/users";
import type {
  PracticeBody,
  PracticeSource,
  Practice,
} from "../practices/types";
import type { Service } from "../services/types";
import SearchSelect, { type SearchSelectOption } from "../shared/SearchSelect";
import ConfirmModal from "../shared/ConfirmModal";

type TaxIdFormState = {
  taxIdNumber: string;
  legalEntityName: string;
  notes: string;
};

type RelationType = "existing" | "new";

type LeadFormState = {
  // Company
  companyRelation: RelationType;
  selectedCompanyId: string;
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
  taxIds: TaxIdFormState[];

  // Practice
  practiceRelation: RelationType;
  selectedPracticeId: string;
  practiceName: string;
  practiceNpi: string;
  practiceRegion: string;
  practiceSource: PracticeSource;
  practiceBucket: string;

  // Contact
  contactRelation: RelationType;
  selectedContactId: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  primaryContactDesignation: string;

  // Deal
  interestedServiceIds: string[];
  estimatedValue: string;
  probability: string;
  followUpTaskTitle: string;
  followUpTaskDueAt: string;
  assignedOwnerId: string;
  channelPartnerId: string;
  notes: string;
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
  companyRelation: "new",
  selectedCompanyId: "",
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
  taxIds: [initialTaxId],

  practiceRelation: "new",
  selectedPracticeId: "",
  practiceName: "",
  practiceNpi: "",
  practiceRegion: "",
  practiceSource: "DIRECT",
  practiceBucket: "",

  contactRelation: "new",
  selectedContactId: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  primaryContactDesignation: "",

  interestedServiceIds: [],
  estimatedValue: "",
  probability: "10",
  followUpTaskTitle: "",
  followUpTaskDueAt: "",
  assignedOwnerId: "",
  channelPartnerId: "",
  notes: "",
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
  const navigate = useNavigate();
  const [form, setForm] = useState<LeadFormState>(initialFormState);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedLead, setLastSavedLead] = useState<SavedLeadSummary | null>(
    null,
  );

  // Agreement Redirect State
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  const performLeadCreation = async (autoRedirect: boolean = false) => {
    setIsSaving(true);
    try {
      let companyId = form.selectedCompanyId;
      let practiceId = form.selectedPracticeId;
      let contactId = form.selectedContactId;

      // 1. Handle Company
      if (form.companyRelation === "new") {
        const validTaxIds = form.taxIds.filter(
          (taxId) => taxId.taxIdNumber.trim() && taxId.legalEntityName.trim(),
        );
        const companyPayload: CompanyBody = {
          name: form.companyName.trim(),
          industry: form.companyIndustry.trim(),
          size: Number(form.companySize) || undefined,
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
          taxIds:
            validTaxIds.length > 0
              ? validTaxIds.map((t) => ({
                  taxIdNumber: t.taxIdNumber.trim(),
                  legalEntityName: t.legalEntityName.trim(),
                  notes: t.notes.trim() || undefined,
                }))
              : undefined,
        };
        const companyRow = await createCompanyApi(companyPayload);
        companyId = companyRow.id;
      }

      // 2. Handle Practice
      if (form.practiceRelation === "new") {
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
          companyId: companyId,
        };
        const practiceRow = await createPracticeApi(practicePayload);
        practiceId = practiceRow.id;
      }

      // 3. Handle Contact
      if (form.contactRelation === "new") {
        const parsedContact = parseContactName(form.primaryContactName);
        const personPayload: PersonBody = {
          firstName: parsedContact.firstName,
          lastName: parsedContact.lastName,
          role: "ADMIN",
          influence: "HIGH",
          email: form.primaryContactEmail.trim(),
          phone: form.primaryContactPhone.trim() || undefined,
          designation: form.primaryContactDesignation.trim() || undefined,
          practiceIds: [practiceId],
          companyIds: [companyId],
        };
        const personRow = await createPersonApi(personPayload);
        contactId = personRow.id;
      }

      // 4. Handle Deal
      const activityTimestamp = new Date().toISOString();
      const contactName =
        form.contactRelation === "new"
          ? form.primaryContactName
          : "Selected Contact";
      const pName =
        form.practiceRelation === "new"
          ? form.practiceName
          : "Selected Practice";

      const dealPayload: DealBody = {
        practiceId: practiceId,
        companyId: companyId,
        primaryContactId: contactId,
        stage: "PROSPECTING",
        value: Number(form.estimatedValue),
        probability: Number(form.probability),
        selectedServiceIds: form.interestedServiceIds,
        nextTaskTitle:
          form.followUpTaskTitle.trim() ||
          defaultFollowUpTitle(contactName, pName),
        nextTaskDueAt: new Date(form.followUpTaskDueAt).toISOString(),
        lastActivityAt: activityTimestamp,
        activityCount: 1,
      };
      const dealRow = await createDealApi(dealPayload);

      setLastSavedLead({
        practiceId,
        companyId,
        contactId,
        dealId: dealRow.id,
        practiceName: pName,
        companyName:
          form.companyRelation === "new"
            ? form.companyName
            : "Selected Company",
        contactName: contactName,
        dealStage: "PROSPECTING",
        savedAt: activityTimestamp,
      });

      resetForm();
      toast.success("Lead created successfully.");

      if (autoRedirect) {
          navigate(`/agreements/all-agreements?practiceId=${practiceId}&dealId=${dealRow.id}&autoOpen=true`);
      }
    } catch (error) {
      console.error(error);
      toast.error(buildErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoadingServices(true);
        const [serviceList, userList] = await Promise.all([
          getAllServices(),
          getAllUsers(),
        ]);
        setServices(serviceList.filter((service) => service.isActive));
        setUsers(userList);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load services.";
        toast.error(message);
      } finally {
        setIsLoadingServices(false);
      }
    }

    loadInitialData();
  }, []);

  const updateField = useCallback(
    <K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const updateTaxId = (
    index: number,
    field: keyof TaxIdFormState,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      taxIds: current.taxIds.map((taxId, taxIndex) =>
        taxIndex === index ? { ...taxId, [field]: value } : taxId,
      ),
    }));
  };

  const addTaxId = () => {
    setForm((current) => ({
      ...current,
      taxIds: [...current.taxIds, { ...initialTaxId }],
    }));
  };

  const removeTaxId = (index: number) => {
    setForm((current) => ({
      ...current,
      taxIds:
        current.taxIds.length === 1
          ? [{ ...initialTaxId }]
          : current.taxIds.filter((_, taxIndex) => taxIndex !== index),
    }));
  };

  const toggleService = (serviceId: string) => {
    setForm((current) => ({
      ...current,
      interestedServiceIds: current.interestedServiceIds.includes(serviceId)
        ? current.interestedServiceIds.filter((id) => id !== serviceId)
        : [...current.interestedServiceIds, serviceId],
    }));
  };

  const resetForm = () => {
    setForm(initialFormState);
  };

  // Search Functions
  const handleSearchCompanies = async (
    query: string,
  ): Promise<SearchSelectOption[]> => {
    const view = await getCompaniesView({
      search: query || undefined,
      limit: 10,
    });
    return view.rows.map((row) => ({
      label: row.values.name as string,
      value: row.id,
      subLabel: `${row.values.industry} • ${row.values.city}, ${row.values.state}`,
    }));
  };

  const handleSearchPractices = async (
    query: string,
  ): Promise<SearchSelectOption[]> => {
    const view = await getPracticesView({
      search: query || undefined,
      limit: 10,
      companyId: form.selectedCompanyId || undefined,
    });
    return view.rows.map((row) => ({
      label: row.values.name as string,
      value: row.id,
      subLabel: `NPI: ${row.values.npi} • ${row.values.region}`,
    }));
  };

  const handleSearchPersons = async (
    query: string,
  ): Promise<SearchSelectOption[]> => {
    const view = await getPersonsView({
      search: query || undefined,
      limit: 10,
      practiceId: form.selectedPracticeId || undefined,
    });
    return view.rows.map((row) => ({
      label: row.values.fullName as string,
      value: row.id,
      subLabel: `${row.values.role} • ${row.values.email}`,
    }));
  };

  const handleSearchChannelPartners = async (
    query: string,
  ): Promise<SearchSelectOption[]> => {
    const view = await getCompaniesView({
      search: query || undefined,
      limit: 10,
      status: "PARTNER",
    });
    return view.rows.map((row) => ({
      label: row.values.name as string,
      value: row.id,
      subLabel: row.values.industry as string,
    }));
  };

  async function handleSaveLead(event: React.FormEvent) {
    event.preventDefault();

    // Validations
    if (form.companyRelation === "new") {
      if (!form.companyName.trim()) {
        toast.error("Company name is required.");
        return;
      }
      if (!form.companyIndustry.trim()) {
        toast.error("Company industry is required.");
        return;
      }
    } else {
      if (!form.selectedCompanyId) {
        toast.error("Please select an existing company.");
        return;
      }
    }

    if (form.practiceRelation === "new") {
      if (!form.practiceName.trim()) {
        toast.error("Practice name is required.");
        return;
      }
      if (!form.practiceNpi.trim()) {
        toast.error("Practice NPI is required.");
        return;
      }
    } else {
      if (!form.selectedPracticeId) {
        toast.error("Please select an existing practice.");
        return;
      }
    }

    if (form.contactRelation === "new") {
      if (!form.primaryContactName.trim()) {
        toast.error("Contact name is required.");
        return;
      }
      if (!form.primaryContactEmail.trim()) {
        toast.error("Contact email is required.");
        return;
      }
    } else {
      if (!form.selectedContactId) {
        toast.error("Please select an existing contact.");
        return;
      }
    }

    if (!form.estimatedValue) {
      toast.error("Estimated deal value is required.");
      return;
    }
    if (!form.followUpTaskDueAt) {
      toast.error("Follow-up due date is required.");
      return;
    }

    // If services are selected, show modal first
    if (form.interestedServiceIds.length > 0) {
        setShowAgreementModal(true);
    } else {
        // No services, just create immediately
        performLeadCreation(false);
    }
  }

  const handleConfirmWithAgreements = () => {
      performLeadCreation(true);
  };

  const handleConfirmLeadOnly = () => {
      performLeadCreation(false);
  };

  const selectedServices = services.filter((service) =>
    form.interestedServiceIds.includes(service.id),
  );

  const navbarActions: NavbarAction[] = [LOGOUT_ACTION];

  return (
    <AppLayout
      title="Create Lead"
      activeModule="Leads"
      activeSubItem="Create Lead"
      navbarIcon={<Target className="h-4 w-4 text-slate-500" />}
      navbarActions={navbarActions}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4 pb-8">
          <section className="app-panel rounded-2xl border border-[#f0ece6] bg-white shadow-sm overflow-hidden">
            <div className="border-b border-[#f0ece6] px-6 py-4 flex items-center justify-between bg-slate-50/30">
              <div>
                <h1 className="text-[18px] font-semibold text-slate-800">
                  Lead Creation Flow
                </h1>
                <p className="mt-1 text-[13px] text-slate-500">
                  Follow the steps to link existing records or create new ones
                  for this lead.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveLead} className="p-6 space-y-8">
              {/* Step 1: Company */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-[#4f63ea]" />
                    <h2 className="text-[16px] font-semibold text-slate-800">
                      Company / Client
                    </h2>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateField("companyRelation", "existing")}
                      className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
                        form.companyRelation === "existing"
                          ? "bg-white text-[#4f63ea] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField("companyRelation", "new")}
                      className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
                        form.companyRelation === "new"
                          ? "bg-white text-[#4f63ea] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      New
                    </button>
                  </div>
                </div>

                {form.companyRelation === "existing" ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block">
                      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
                        Search Existing Company
                      </span>
                      <SearchSelect
                        value={form.selectedCompanyId}
                        onChange={(val) =>
                          updateField("selectedCompanyId", val)
                        }
                        onSearch={handleSearchCompanies}
                        placeholder="Search by company name, city, or industry..."
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 p-4 rounded-xl border border-[#f0ece6] bg-[#fafafa] animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-slate-700">
                        Company Name *
                      </span>
                      <input
                        type="text"
                        value={form.companyName}
                        onChange={(e) =>
                          updateField("companyName", e.target.value)
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        placeholder="e.g. Acme Medical Group"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-slate-700">
                        Industry *
                      </span>
                      <input
                        type="text"
                        value={form.companyIndustry}
                        onChange={(e) =>
                          updateField("companyIndustry", e.target.value)
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        placeholder="e.g. Healthcare Services"
                      />
                    </label>
                    <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-[13px] font-medium text-slate-700">
                          Size
                        </span>
                        <input
                          type="number"
                          value={form.companySize}
                          onChange={(e) =>
                            updateField("companySize", e.target.value)
                          }
                          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[13px] font-medium text-slate-700">
                          Phone
                        </span>
                        <input
                          type="text"
                          value={form.companyPhone}
                          onChange={(e) =>
                            updateField("companyPhone", e.target.value)
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
                          onChange={(e) =>
                            updateField("companyEmail", e.target.value)
                          }
                          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Practice */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 text-[#4f63ea]" />
                    <h2 className="text-[16px] font-semibold text-slate-800">
                      Practice Details
                    </h2>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() =>
                        updateField("practiceRelation", "existing")
                      }
                      className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
                        form.practiceRelation === "existing"
                          ? "bg-white text-[#4f63ea] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField("practiceRelation", "new")}
                      className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
                        form.practiceRelation === "new"
                          ? "bg-white text-[#4f63ea] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      New
                    </button>
                  </div>
                </div>

                {form.practiceRelation === "existing" ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block">
                      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
                        Search Existing Practice
                      </span>
                      <SearchSelect
                        value={form.selectedPracticeId}
                        onChange={(val) =>
                          updateField("selectedPracticeId", val)
                        }
                        onSearch={handleSearchPractices}
                        placeholder={
                          form.selectedCompanyId
                            ? "Search practices for selected company..."
                            : "Search all practices..."
                        }
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 p-4 rounded-xl border border-[#f0ece6] bg-[#fafafa] animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-slate-700">
                        Practice Name *
                      </span>
                      <input
                        type="text"
                        value={form.practiceName}
                        onChange={(e) =>
                          updateField("practiceName", e.target.value)
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-slate-700">
                        NPI *
                      </span>
                      <input
                        type="text"
                        value={form.practiceNpi}
                        onChange={(e) =>
                          updateField("practiceNpi", e.target.value)
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </label>
                    <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-[13px] font-medium text-slate-700">
                          Region
                        </span>
                        <input
                          type="text"
                          value={form.practiceRegion}
                          onChange={(e) =>
                            updateField("practiceRegion", e.target.value)
                          }
                          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          placeholder="e.g. Northeast"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[13px] font-medium text-slate-700">
                          Lead Source
                        </span>
                        <select
                          value={form.practiceSource}
                          onChange={(e) =>
                            updateField(
                              "practiceSource",
                              e.target.value as PracticeSource,
                            )
                          }
                          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        >
                          {practiceSourceOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[13px] font-medium text-slate-700">
                          Bucket / Specialty
                        </span>
                        <input
                          type="text"
                          value={form.practiceBucket}
                          onChange={(e) =>
                            updateField("practiceBucket", e.target.value)
                          }
                          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          placeholder="e.g. Radiology"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Contact */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCircle2 className="h-5 w-5 text-[#4f63ea]" />
                    <h2 className="text-[16px] font-semibold text-slate-800">
                      Primary Contact
                    </h2>
                  </div>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateField("contactRelation", "existing")}
                      className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
                        form.contactRelation === "existing"
                          ? "bg-white text-[#4f63ea] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField("contactRelation", "new")}
                      className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
                        form.contactRelation === "new"
                          ? "bg-white text-[#4f63ea] shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      New
                    </button>
                  </div>
                </div>

                {form.contactRelation === "existing" ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block">
                      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
                        Search Existing Person
                      </span>
                      <SearchSelect
                        value={form.selectedContactId}
                        onChange={(val) =>
                          updateField("selectedContactId", val)
                        }
                        onSearch={handleSearchPersons}
                        placeholder={
                          form.selectedPracticeId
                            ? "Search contacts for selected practice..."
                            : "Search all persons..."
                        }
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 p-4 rounded-xl border border-[#f0ece6] bg-[#fafafa] animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-slate-700">
                        Contact Name *
                      </span>
                      <input
                        type="text"
                        value={form.primaryContactName}
                        onChange={(e) =>
                          updateField("primaryContactName", e.target.value)
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-slate-700">
                        Email *
                      </span>
                      <input
                        type="email"
                        value={form.primaryContactEmail}
                        onChange={(e) =>
                          updateField("primaryContactEmail", e.target.value)
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-slate-700">
                        Phone
                      </span>
                      <input
                        type="text"
                        value={form.primaryContactPhone}
                        onChange={(e) =>
                          updateField("primaryContactPhone", e.target.value)
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-slate-700">
                        Designation
                      </span>
                      <input
                        type="text"
                        value={form.primaryContactDesignation}
                        onChange={(e) =>
                          updateField(
                            "primaryContactDesignation",
                            e.target.value,
                          )
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Deal Section */}
              <div className="space-y-6 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#4f63ea]" />
                  <h2 className="text-[16px] font-semibold text-slate-800">
                    Deal / Opportunity Setup
                  </h2>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Estimated Value *
                    </span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[13px] font-medium">
                        $
                      </span>
                      <input
                        type="number"
                        value={form.estimatedValue}
                        onChange={(e) =>
                          updateField("estimatedValue", e.target.value)
                        }
                        className="app-control w-full rounded-md pl-7 pr-3 py-2 text-[13px]"
                        placeholder="0"
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Probability (%)
                    </span>
                    <input
                      type="number"
                      value={form.probability}
                      onChange={(e) =>
                        updateField("probability", e.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Follow-Up Due *
                    </span>
                    <input
                      type="date"
                      value={form.followUpTaskDueAt}
                      onChange={(e) =>
                        updateField("followUpTaskDueAt", e.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    />
                  </label>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Assigned Owner
                    </span>
                    <select
                      value={form.assignedOwnerId}
                      onChange={(e) =>
                        updateField("assignedOwnerId", e.target.value)
                      }
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                    >
                      <option value="">Select Owner</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-slate-700">
                      Channel Partner (if applicable)
                    </span>
                    <SearchSelect
                      value={form.channelPartnerId}
                      onChange={(val) => updateField("channelPartnerId", val)}
                      onSearch={handleSearchChannelPartners}
                      placeholder="Search channel partners..."
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <span className="text-[13px] font-medium text-slate-700">
                    Interested Services
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((service) => {
                      const isSelected = form.interestedServiceIds.includes(
                        service.id,
                      );
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleService(service.id)}
                          className={`flex items-start gap-3 p-3 text-left rounded-xl border transition-all ${
                            isSelected
                              ? "border-[#4f63ea] bg-[#4f63ea]/5 shadow-sm"
                              : "border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200"
                          }`}
                        >
                          <div
                            className={`mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center ${
                              isSelected
                                ? "bg-[#4f63ea] border-[#4f63ea]"
                                : "bg-white border-slate-300"
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle2 className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`text-[13px] font-semibold ${isSelected ? "text-[#4f63ea]" : "text-slate-700"}`}
                            >
                              {service.name}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {service.category || "General Service"}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-[13px] font-medium text-slate-700">
                    Internal Notes
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={4}
                    className="app-control w-full rounded-xl px-4 py-3 text-[13px] bg-slate-50/50"
                    placeholder="Enter lead context, timeline, or specific requirements..."
                  />
                </label>
              </div>

              <div className="pt-6 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 text-[14px] font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-[#4f63ea] text-white text-[14px] font-semibold hover:bg-[#3d4ecf] shadow-lg shadow-[#4f63ea]/20 transition-all disabled:opacity-50 disabled:shadow-none"
                >
                  {isSaving ? (
                    <>
                      <Search className="h-4 w-4 animate-spin" />
                      Creating Lead...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Create Lead
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>

        <aside className="flex flex-col gap-4 sticky top-0">
          <section className="app-panel rounded-2xl border border-[#f0ece6] bg-white p-5 shadow-sm">
            <h2 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Submission Summary
            </h2>
            <div className="mt-5 space-y-4">
              <div className="flex gap-3">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                    form.companyRelation === "existing" &&
                    form.selectedCompanyId
                      ? "bg-green-100 text-green-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {form.companyRelation === "existing" &&
                  form.selectedCompanyId ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <Building2 className="h-3.5 w-3.5" />
                  )}
                </div>
                <div>
                  <div className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                    Company
                  </div>
                  <div className="text-[13px] text-slate-500 mt-0.5">
                    {form.companyRelation === "existing"
                      ? form.selectedCompanyId
                        ? "Link to existing"
                        : "Select a company"
                      : form.companyName || "Create new company"}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                    form.practiceRelation === "existing" &&
                    form.selectedPracticeId
                      ? "bg-green-100 text-green-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {form.practiceRelation === "existing" &&
                  form.selectedPracticeId ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <LayoutGrid className="h-3.5 w-3.5" />
                  )}
                </div>
                <div>
                  <div className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                    Practice
                  </div>
                  <div className="text-[13px] text-slate-500 mt-0.5">
                    {form.practiceRelation === "existing"
                      ? form.selectedPracticeId
                        ? "Link to existing"
                        : "Select a practice"
                      : form.practiceName || "Create new practice"}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                    form.contactRelation === "existing" &&
                    form.selectedContactId
                      ? "bg-green-100 text-green-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {form.contactRelation === "existing" &&
                  form.selectedContactId ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <UserCircle2 className="h-3.5 w-3.5" />
                  )}
                </div>
                <div>
                  <div className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                    Primary Contact
                  </div>
                  <div className="text-[13px] text-slate-500 mt-0.5">
                    {form.contactRelation === "existing"
                      ? form.selectedContactId
                        ? "Link to existing"
                        : "Select a contact"
                      : form.primaryContactName || "Create new contact"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {lastSavedLead && (
            <div className="app-panel rounded-2xl border border-green-100 bg-green-50/50 p-5 shadow-sm animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[14px] font-bold text-green-800">
                  Recently Created
                </h2>
                <button
                  onClick={() => setLastSavedLead(null)}
                  className="text-green-600 hover:text-green-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-green-600/70">Practice</span>
                  <span className="font-semibold text-green-800">
                    {lastSavedLead.practiceName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-green-600/70">Deal Stage</span>
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                    {lastSavedLead.dealStage}
                  </span>
                </div>
                <button className="w-full mt-2 py-2 rounded-lg bg-green-600 text-white text-[12px] font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                  View Deal <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          <section className="app-panel rounded-2xl border border-[#f0ece6] bg-slate-50 p-5 shadow-sm">
            <h2 className="text-[14px] font-bold text-slate-800 mb-3">
              System Behavior
            </h2>
            <ul className="space-y-3">
              {[
                "Creates or links Company/Client record",
                "Creates or links Practice profile",
                "Establishes primary contact relationship",
                "Generates CRM Deal in Prospecting stage",
                "Logs initial discovery activity",
                "Sets up follow-up task for owner",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-[12px] text-slate-500"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <ConfirmModal
        isOpen={showAgreementModal}
        onClose={() => setShowAgreementModal(false)}
        onConfirm={handleConfirmWithAgreements}
        onSecondaryConfirm={handleConfirmLeadOnly}
        title="Create Lead & Send Agreements?"
        message="You have selected interested services for this lead. Would you like to create the lead and proceed to the agreements section to send documents now, or just create the lead?"
        confirmLabel="Create & Send Agreements"
        secondaryLabel="Create Lead Only"
        cancelLabel="Cancel"
        type="primary"
      />
    </AppLayout>
  );
}

export default CreateLeadPage;
