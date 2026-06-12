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
  CheckCircle2,
  X,
  FileText,
  Clock,
} from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { LOGOUT_ACTION, type NavbarAction } from "../layout/Navbar";
import type { CompanyBody, Company } from "../companies/types";
import type { PersonBody, PersonRole } from "../contact/types";
import type { DealApiError, DealBody } from "../../services/operations/deals";
import {
  createCompanyApi,
  deleteCompanyApi,
  getCompany,
  getCompaniesView,
} from "../../services/operations/companies";
import { createDealApi, deleteDealApi } from "../../services/operations/deals";
import {
  createPersonApi,
  deletePersonApi,
  getPerson,
  getPersonsView,
  updatePersonApi,
} from "../../services/operations/persons";
import {
  createPracticeApi,
  deletePracticeApi,
  getPractice,
  getPracticesView,
} from "../../services/operations/practices";
import {
  createAgreementApi,
  deleteAgreementApi,
  getDocusealTemplates,
  getAgreementsByPractice,
  type Agreement,
  type DocusealTemplate,
} from "../../services/operations/agreements";
import { activatePracticeWithAgreementEmail } from "../../services/operations/practiceActivation";
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
import { hasAdminAccess, readStoredUser } from "../../utils/auth";
import {
  buildTemplateFieldValues,
  getDocusealFieldInputType,
  getDocusealFieldLabel,
  getDocusealFieldValue,
  getMissingRequiredDocusealFields,
  getTemplateSubmitterGroups,
  isEditableDocusealField,
  type DocusealField,
} from "../../utils/docuseal";

type TaxIdFormState = {
  taxIdNumber: string;
  legalEntityName: string;
  notes: string;
};

type RelationType = "existing" | "new";

type IntegratedAgreementState = {
  action: "none" | "link" | "create";
  existingAgreementId: string;
  type: string;
  effectiveDate: string;
  renewalDate: string;
  templateIds: string[];
  docusealFieldValues: Record<string, Record<string, string>>;
};

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
  practiceTaxIdKey: string;

  // Contact
  contactRelation: RelationType;
  selectedContactId: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  primaryContactDesignation: string;
  primaryContactRole: PersonRole;
  contactPracticeIds: { id: string; name: string }[];
  contactCompanyIds: { id: string; name: string }[];

  // Practice Group NPIs
  practiceGroupNpis: {
    groupNpiNumber: string;
    groupName: string;
    status: string;
    notes: string;
  }[];

  // Deal
  interestedServiceIds: string[];
  estimatedValue: string;
  probability: string;
  followUpTaskTitle: string;
  followUpTaskDueAt: string;
  assignedOwnerId: string;
  channelPartnerId: string;
  notes: string;

  // Integrated Agreement
  agreement: IntegratedAgreementState;
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
  practiceTaxIdKey: "",

  contactRelation: "new",
  selectedContactId: "",
  primaryContactName: "",
  primaryContactEmail: "",
  primaryContactPhone: "",
  primaryContactDesignation: "",
  primaryContactRole: "ADMIN",
  contactPracticeIds: [],
  contactCompanyIds: [],
  practiceGroupNpis: [],

  interestedServiceIds: [],
  estimatedValue: "",
  probability: "10",
  followUpTaskTitle: "",
  followUpTaskDueAt: "",
  assignedOwnerId: "",
  channelPartnerId: "",
  notes: "",

  agreement: {
    action: "create",
    existingAgreementId: "",
    type: "MSA",
    effectiveDate: new Date().toISOString().split("T")[0],
    renewalDate: "",
    templateIds: [],
    docusealFieldValues: {},
  },
};
const agreementTypeOptions = ["MSA", "SOW", "RENEWAL", "ADDENDUM"];

const AUTO_INCLUDE_TEMPLATE_NAMES = [
  "Master Service Agreement",
  "BAA",
  "Credentialing Exhibit",
  "Exhibit P",
];

const personRoleOptions: PersonRole[] = [
  "OWNER",
  "ADMIN",
  "FINANCE",
  "OPERATIONS",
  "CLINICAL",
  "PROCUREMENT",
  "OTHER",
];

function isClientNameField(field: DocusealField) {
  return /client\s*name/i.test(field.name || "");
}

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

function buildLeadAgreementDocusealPrefillValues(
  template: DocusealTemplate | undefined,
  form: LeadFormState,
) {
  const values: Record<string, string> = {};
  if (!template) return values;

  const practiceName = form.practiceName.trim();
  const practiceNpi = form.practiceNpi.trim();
  const companyName = form.companyName.trim();
  const contactName = form.primaryContactName.trim();
  const contactEmail = form.primaryContactEmail.trim();
  const effectiveDate = form.agreement.effectiveDate || "";

  for (const field of template.fields || []) {
    if (!isEditableDocusealField(field)) continue;

    const fieldName = (field.name || "").toLowerCase();
    let value = "";

    if (
      fieldName.includes("client") ||
      fieldName.includes("practice") ||
      fieldName.includes("clinic")
    ) {
      value = practiceName || companyName;
    } else if (fieldName.includes("company")) {
      value = companyName;
    } else if (fieldName.includes("npi")) {
      value = practiceNpi;
    } else if (fieldName.includes("contact") || fieldName.includes("name")) {
      value = contactName;
    } else if (fieldName.includes("email")) {
      value = contactEmail;
    } else if (fieldName.includes("effective")) {
      value = effectiveDate;
    } else if (field.type === "date" && fieldName.includes("date")) {
      value = effectiveDate;
    }

    if (value) {
      values[field.uuid] = value;
    }
  }

  return values;
}

function formatTaxIdLabel(taxId?: {
  taxIdNumber: string;
  legalEntityName: string;
}) {
  if (!taxId) return "";
  return `${taxId.taxIdNumber} - ${taxId.legalEntityName}`;
}

function getNewCompanyTaxIdKey(index: number) {
  return `new:${index}`;
}

function CreateLeadPage() {
  const navigate = useNavigate();
  const isAdmin = hasAdminAccess(readStoredUser()?.role as string | undefined);
  const [form, setForm] = useState<LeadFormState>(initialFormState);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<DocusealTemplate[]>([]);
  const [existingAgreements, setExistingAgreements] = useState<Agreement[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedPracticeLabel, setSelectedPracticeLabel] = useState("");
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Template search state
  const [templateSearch, setTemplateSearch] = useState("");
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const templateDropdownRef = useRef<HTMLDivElement>(null);

  // Agreement Redirect State
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  const companyTaxIdOptions =
    form.companyRelation === "existing"
      ? (selectedCompany?.taxIds ?? [])
          .filter((taxId) => taxId.status !== "INACTIVE")
          .map((taxId) => ({
            key: taxId.id,
            label: formatTaxIdLabel(taxId),
          }))
      : form.taxIds
          .map((taxId, index) => ({
            key: getNewCompanyTaxIdKey(index),
            label: formatTaxIdLabel(taxId),
          }))
          .filter((option) => Boolean(option.label));

  const selectedCompanyTaxIdLabel =
    companyTaxIdOptions.find((option) => option.key === form.practiceTaxIdKey)
      ?.label ||
    companyTaxIdOptions[0]?.label ||
    "";

  const primaryLinkedCompanyName =
    form.companyRelation === "existing" ? selectedCompany?.name || "" : "";
  const primaryLinkedPracticeName =
    form.practiceRelation === "existing" && form.selectedPracticeId
      ? selectedPracticeLabel || form.selectedPracticeId
      : "";
  const linkedCompanyLabels = [
    ...(primaryLinkedCompanyName
      ? [
          {
            id: form.selectedCompanyId || "primary-company",
            name: primaryLinkedCompanyName,
            removable: false,
          },
        ]
      : []),
    ...form.contactCompanyIds
      .filter((company) => company.id !== form.selectedCompanyId)
      .map((company) => ({
        id: company.id,
        name: company.name,
        removable: true,
      })),
  ];
  const linkedPracticeLabels = [
    ...(primaryLinkedPracticeName
      ? [
          {
            id: form.selectedPracticeId || "primary-practice",
            name: primaryLinkedPracticeName,
            removable: false,
          },
        ]
      : []),
    ...form.contactPracticeIds
      .filter((practice) => practice.id !== form.selectedPracticeId)
      .map((practice) => ({
        id: practice.id,
        name: practice.name,
        removable: true,
      })),
  ];

  const performLeadCreation = async (withAgreement: boolean = false) => {
    setIsSaving(true);
    let createdCompanyId: string | undefined;
    let createdPracticeId: string | undefined;
    let createdContactId: string | undefined;
    let createdDealId: string | undefined;
    let createdAgreementId: string | undefined;
    let agreementSendWarning: string | null = null;

    try {
      let companyId = form.selectedCompanyId;
      let practiceId = form.selectedPracticeId;
      let contactId = form.selectedContactId;

      // 1. Handle Company
      if (form.companyRelation === "new" && form.companyName.trim()) {
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
        createdCompanyId = companyRow.id;
      }

      const savedCompany = companyId
        ? await getCompany(companyId).catch(() => null)
        : null;
      const selectedNewCompanyTaxIdIndex = form.practiceTaxIdKey.startsWith(
        "new:",
      )
        ? Number(form.practiceTaxIdKey.replace("new:", ""))
        : -1;
      const selectedNewCompanyTaxId =
        selectedNewCompanyTaxIdIndex >= 0
          ? form.taxIds[selectedNewCompanyTaxIdIndex]
          : undefined;
      const companyTaxIdId =
        form.companyRelation === "existing"
          ? savedCompany?.taxIds?.find(
              (taxId) => taxId.id === form.practiceTaxIdKey,
            )?.id || savedCompany?.taxIds?.[0]?.id
          : savedCompany?.taxIds?.find(
              (taxId) =>
                taxId.taxIdNumber ===
                  selectedNewCompanyTaxId?.taxIdNumber.trim() &&
                taxId.legalEntityName ===
                  selectedNewCompanyTaxId?.legalEntityName.trim(),
            )?.id ||
            savedCompany?.taxIds?.[selectedNewCompanyTaxIdIndex]?.id ||
            savedCompany?.taxIds?.[0]?.id;

      // 2. Handle Practice
      if (form.practiceRelation === "new") {
        const validGroupNpis = form.practiceGroupNpis.filter(
          (g) => g.groupNpiNumber.trim() && g.groupName.trim(),
        );
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
          companyId: companyId || undefined,
          ...(validGroupNpis.length > 0 && {
            groupNpis: validGroupNpis.map((g) => ({
              groupNpiNumber: g.groupNpiNumber.trim(),
              groupName: g.groupName.trim(),
              status: g.status || "ACTIVE",
              notes: g.notes || "",
              taxId: companyTaxIdId || "",
            })),
          }),
          taxIdId: companyTaxIdId,
        };
        const practiceRow = await createPracticeApi(practicePayload);
        practiceId = practiceRow.id;
        createdPracticeId = practiceRow.id;
      }

      // 3. Handle Contact
      if (form.contactRelation === "new") {
        const parsedContact = parseContactName(form.primaryContactName);
        const mergedPracticeIds = [
          ...new Set(
            [practiceId, ...form.contactPracticeIds.map((p) => p.id)].filter(
              Boolean,
            ),
          ),
        ];
        const mergedCompanyIds = [
          ...new Set(
            [
              ...(companyId ? [companyId] : []),
              ...form.contactCompanyIds.map((c) => c.id),
            ].filter(Boolean),
          ),
        ];
        const personPayload: PersonBody = {
          firstName: parsedContact.firstName,
          lastName: parsedContact.lastName,
          role: form.primaryContactRole,
          influence: "HIGH",
          email: form.primaryContactEmail.trim(),
          phone: form.primaryContactPhone.trim() || undefined,
          designation: form.primaryContactDesignation.trim() || undefined,
          practiceIds: mergedPracticeIds,
          companyIds: mergedCompanyIds,
        };
        const personRow = await createPersonApi(personPayload);
        contactId = personRow.id;
        createdContactId = personRow.id;
      } else if (contactId) {
        try {
          const existingPerson = await getPerson(contactId);
          const nextPracticeIds = [
            ...new Set(
              [
                practiceId,
                ...form.contactPracticeIds.map((p) => p.id),
                ...(existingPerson.practices?.map((p) => p.practice.id) ?? []),
              ].filter(Boolean),
            ),
          ];
          const nextCompanyIds = [
            ...new Set(
              [
                ...(companyId ? [companyId] : []),
                ...form.contactCompanyIds.map((c) => c.id),
                ...(existingPerson.companies?.map((c) => c.company.id) ?? []),
              ].filter(Boolean),
            ),
          ];

          await updatePersonApi(contactId, {
            practiceIds: nextPracticeIds,
            companyIds: nextCompanyIds,
          });
        } catch (error) {
          agreementSendWarning =
            error instanceof Error
              ? `Lead was created, but selected contact could not be linked: ${error.message}`
              : "Lead was created, but selected contact could not be linked.";
        }
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
        companyId: companyId || null,
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
      createdDealId = dealRow.id;

      // 5. Handle Agreement (if requested)
      let agreementId: string | undefined = undefined;
      if (withAgreement && form.agreement.action !== "none") {
        if (form.agreement.action === "create") {
          const autoIncludeIds = templates
            .filter((t) =>
              AUTO_INCLUDE_TEMPLATE_NAMES.some((name) =>
                t.name.toLowerCase().includes(name.toLowerCase()),
              ),
            )
            .map((t) => String(t.id));

          const allSelectedIds =
            form.agreement.type === "MSA"
              ? [...new Set([...form.agreement.templateIds, ...autoIncludeIds])]
              : form.agreement.templateIds;

          const submissions = allSelectedIds.map((id) => {
            const template = templates.find((t) => t.id === Number(id));
            return {
              externalId: Number(id),
              status: "PENDING",
              templateId: Number(id),
              url: template?.documents?.[0]?.url || undefined,
              slug: template?.slug,
              fieldValues: {
                ...buildTemplateFieldValues(template),
                ...buildLeadAgreementDocusealPrefillValues(template, form),
                ...(form.agreement.docusealFieldValues[id] || {}),
              },
              submitters: template?.submitters?.map((init: any) => ({
                role: init.name,
                uuid: init.uuid,
              })),
            };
          });

          const agreementApprovalStatus = isAdmin
            ? "APPROVED"
            : "PENDING_APPROVAL";
          const agreementPayload = {
            practiceId: practiceId,
            dealId: dealRow.id,
            type: form.agreement.type,
            status: "DRAFT",
            approvalStatus: agreementApprovalStatus,
            effectiveDate: form.agreement.effectiveDate
              ? new Date(form.agreement.effectiveDate).toISOString()
              : undefined,
            renewalDate: form.agreement.renewalDate
              ? new Date(form.agreement.renewalDate).toISOString()
              : undefined,
            docusealSubmissions:
              submissions.length > 0 ? submissions : undefined,
          };
          const agreementRow = await createAgreementApi(
            agreementPayload as any,
          );
          agreementId = agreementRow.id;
          createdAgreementId = agreementRow.id;

          // Send signature requests if templates selected
          // if (allSelectedIds.length > 0) {
          //   await createDocusealSubmissionApi({
          //     agreementId: agreementId,
          //     personId: contactId,
          //     templateId: allSelectedIds.map(Number),
          //   });
          //   await sendAgreementEmailApi({
          //     agreementId: agreementId,
          //     personId: contactId,
          //   });
          // }

          if (isAdmin) {
            try {
              await activatePracticeWithAgreementEmail(practiceId, {
                status: "ACTIVE",
              });
            } catch (error) {
              agreementSendWarning =
                error instanceof Error
                  ? error.message
                  : "Agreement was created, but practice activation or company status update could not be completed.";
            }
          }
        } else if (form.agreement.action === "link") {
          agreementId = form.agreement.existingAgreementId;
          if (isAdmin) {
            try {
              await activatePracticeWithAgreementEmail(practiceId, {
                status: "ACTIVE",
              });
            } catch (error) {
              agreementSendWarning =
                error instanceof Error
                  ? error.message
                  : "Lead was created, but practice activation or company status update could not be completed.";
            }
          }

          // Potentially update dealId on existing agreement if needed
          // await createAgreementApi({
          //   id: agreementId,
          //   dealId: dealRow.id,
          // } as any);
        }
      }

      resetForm();
      if (agreementSendWarning) {
        toast.success(
          agreementId
            ? isAdmin
              ? "Lead and agreement created successfully."
              : "Lead created and agreement sent for approval."
            : "Lead created successfully.",
        );
        toast.error(agreementSendWarning);
      } else {
        toast.success(
          agreementId
            ? isAdmin
              ? "Lead and agreement created successfully."
              : "Lead created and agreement sent for approval."
            : "Lead created successfully.",
        );
      }
    } catch (error) {
      console.error(error);
      const cleanupTasks: Array<Promise<unknown>> = [];
      if (createdAgreementId)
        cleanupTasks.push(deleteAgreementApi(createdAgreementId));
      if (createdDealId) cleanupTasks.push(deleteDealApi(createdDealId));
      if (createdContactId)
        cleanupTasks.push(deletePersonApi(createdContactId));
      if (createdPracticeId)
        cleanupTasks.push(deletePracticeApi(createdPracticeId));
      if (createdCompanyId)
        cleanupTasks.push(deleteCompanyApi(createdCompanyId));

      if (cleanupTasks.length > 0) {
        const cleanupResults = await Promise.allSettled(cleanupTasks);
        cleanupResults.forEach((result) => {
          if (result.status === "rejected") {
            console.error("Lead creation rollback failed:", result.reason);
          }
        });
      }
      toast.error(buildErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        templateDropdownRef.current &&
        !templateDropdownRef.current.contains(event.target as Node)
      ) {
        setShowTemplateDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setIsLoadingServices(true);
        const [serviceList, userList, templateRes] = await Promise.all([
          getAllServices(),
          getAllUsers(),
          getDocusealTemplates(),
        ]);
        setServices(serviceList.filter((service) => service.isActive));
        setUsers(userList);
        setTemplates(templateRes.templates.data);
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

  useEffect(() => {
    if (
      form.agreement.action !== "create" ||
      form.agreement.type !== "MSA" ||
      templates.length === 0
    ) {
      return;
    }

    const autoSelectIds = templates
      .filter((template) =>
        AUTO_INCLUDE_TEMPLATE_NAMES.some((name) =>
          template.name.toLowerCase().includes(name.toLowerCase()),
        ),
      )
      .map((template) => String(template.id));

    if (
      autoSelectIds.length === 0 ||
      autoSelectIds.every((id) => form.agreement.templateIds.includes(id))
    ) {
      return;
    }

    setAgreementTemplateIds([...form.agreement.templateIds, ...autoSelectIds]);
  }, [
    form.agreement.action,
    form.agreement.templateIds,
    form.agreement.type,
    templates,
  ]);

  // Fetch existing agreements when practice changes
  useEffect(() => {
    if (form.selectedPracticeId) {
      getAgreementsByPractice(form.selectedPracticeId)
        .then((res) => {
          setExistingAgreements(res);
          if (res.length > 0) {
            setForm((prev) => ({
              ...prev,
              agreement: {
                ...prev.agreement,
                action: "link",
                existingAgreementId: res[0].id,
              },
            }));
          } else {
            setForm((prev) => ({
              ...prev,
              agreement: {
                ...prev.agreement,
                action: "create",
                existingAgreementId: "",
              },
            }));
          }
        })
        .catch((err) => console.error("Error fetching agreements:", err));
    } else {
      setExistingAgreements([]);
      setForm((prev) => ({
        ...prev,
        agreement: {
          ...prev.agreement,
          action: "create",
          existingAgreementId: "",
        },
      }));
    }
  }, [form.selectedPracticeId]);

  useEffect(() => {
    const selectedKeyStillExists = companyTaxIdOptions.some(
      (option) => option.key === form.practiceTaxIdKey,
    );
    const nextKey = selectedKeyStillExists
      ? form.practiceTaxIdKey
      : (companyTaxIdOptions[0]?.key ?? "");

    if (nextKey !== form.practiceTaxIdKey) {
      setForm((current) => ({ ...current, practiceTaxIdKey: nextKey }));
    }
  }, [companyTaxIdOptions, form.practiceTaxIdKey]);

  const updateField = useCallback(
    <K extends keyof LeadFormState>(field: K, value: LeadFormState[K]) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const setCompanyRelation = (relation: RelationType) => {
    setForm((current) => ({
      ...current,
      companyRelation: relation,
      selectedCompanyId: relation === "new" ? "" : current.selectedCompanyId,
    }));
    if (relation === "new") {
      setSelectedCompany(null);
    }
  };

  const setPracticeRelation = (relation: RelationType) => {
    setForm((current) => ({
      ...current,
      practiceRelation: relation,
      selectedPracticeId: relation === "new" ? "" : current.selectedPracticeId,
      agreement:
        relation === "new"
          ? {
              ...current.agreement,
              action: "create",
              existingAgreementId: "",
            }
          : current.agreement,
    }));

    if (relation === "new") {
      setSelectedPracticeLabel("");
      setExistingAgreements([]);
    }
  };

  const setContactRelation = (relation: RelationType) => {
    setForm((current) => ({
      ...current,
      contactRelation: relation,
      selectedContactId: relation === "new" ? "" : current.selectedContactId,
    }));
  };

  const updateAgreementField = <K extends keyof IntegratedAgreementState>(
    field: K,
    value: IntegratedAgreementState[K],
  ) => {
    setForm((prev) => ({
      ...prev,
      agreement: { ...prev.agreement, [field]: value },
    }));
  };

  const setAgreementTemplateIds = (templateIds: string[]) => {
    setForm((prev) => {
      const nextIds = [...new Set(templateIds)];
      const nextFieldValues = { ...prev.agreement.docusealFieldValues };

      for (const templateId of Object.keys(nextFieldValues)) {
        if (!nextIds.includes(templateId)) {
          delete nextFieldValues[templateId];
        }
      }

      for (const templateId of nextIds) {
        const template = templates.find((t) => String(t.id) === templateId);
        nextFieldValues[templateId] = {
          ...(nextFieldValues[templateId] || {}),
          ...buildTemplateFieldValues(template),
          ...buildLeadAgreementDocusealPrefillValues(template, prev),
        };
      }

      return {
        ...prev,
        agreement: {
          ...prev.agreement,
          templateIds: nextIds,
          docusealFieldValues: nextFieldValues,
        },
      };
    });
  };

  const addAgreementTemplate = (templateId: string) => {
    setAgreementTemplateIds([...form.agreement.templateIds, templateId]);
  };

  const removeAgreementTemplate = (templateId: string) => {
    setAgreementTemplateIds(
      form.agreement.templateIds.filter((id) => id !== templateId),
    );
  };

  const updateAgreementTemplateFieldValue = (
    templateId: string,
    fieldUuid: string,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      agreement: {
        ...prev.agreement,
        docusealFieldValues: {
          ...prev.agreement.docusealFieldValues,
          [templateId]: {
            ...(prev.agreement.docusealFieldValues[templateId] || {}),
            [fieldUuid]: value,
          },
        },
      },
    }));
  };

  const validateAgreementTemplateFieldValues = () => {
    for (const templateId of form.agreement.templateIds) {
      const template = templates.find((t) => String(t.id) === templateId);
      if (!template) continue;

      const fieldValues = form.agreement.docusealFieldValues[templateId] || {};
      const missingRequiredField = getMissingRequiredDocusealFields(
        template,
        fieldValues,
      )[0];

      if (missingRequiredField) {
        return {
          templateName: template.name,
          fieldName: getDocusealFieldLabel(missingRequiredField, 0),
        };
      }

      const clientNameField = (template.fields || []).find(
        (field) => isEditableDocusealField(field) && isClientNameField(field),
      );

      if (
        clientNameField &&
        !getDocusealFieldValue(fieldValues, clientNameField).trim()
      ) {
        return {
          templateName: template.name,
          fieldName: getDocusealFieldLabel(clientNameField, 0),
        };
      }
    }

    return null;
  };

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

  const updateGroupNpi = (index: number, field: string, value: string) => {
    setForm((current) => ({
      ...current,
      practiceGroupNpis: current.practiceGroupNpis.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  const addGroupNpi = () => {
    setForm((current) => ({
      ...current,
      practiceGroupNpis: [
        ...current.practiceGroupNpis,
        { groupNpiNumber: "", groupName: "", status: "ACTIVE", notes: "" },
      ],
    }));
  };

  const removeGroupNpi = (index: number) => {
    setForm((current) => ({
      ...current,
      practiceGroupNpis: current.practiceGroupNpis.filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const addContactCompanyId = (id: string, option?: SearchSelectOption) => {
    setForm((current) => ({
      ...current,
      contactCompanyIds: current.contactCompanyIds.some((c) => c.id === id)
        ? current.contactCompanyIds
        : [...current.contactCompanyIds, { id, name: option?.label || id }],
    }));
  };

  const removeContactCompanyId = (id: string) => {
    setForm((current) => ({
      ...current,
      contactCompanyIds: current.contactCompanyIds.filter((c) => c.id !== id),
    }));
  };

  const addContactPracticeId = (id: string, option?: SearchSelectOption) => {
    setForm((current) => ({
      ...current,
      contactPracticeIds: current.contactPracticeIds.some((p) => p.id === id)
        ? current.contactPracticeIds
        : [...current.contactPracticeIds, { id, name: option?.label || id }],
    }));
  };

  const removeContactPracticeId = (id: string) => {
    setForm((current) => ({
      ...current,
      contactPracticeIds: current.contactPracticeIds.filter((p) => p.id !== id),
    }));
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

  const handleCompanySelect = async (companyId: string) => {
    updateField("selectedCompanyId", companyId);
    if (!companyId) {
      setSelectedCompany(null);
      return;
    }

    try {
      setSelectedCompany(await getCompany(companyId));
    } catch {
      setSelectedCompany(null);
    }
  };

  const handleSearchPractices = async (
    query: string,
  ): Promise<SearchSelectOption[]> => {
    // Only show practices that are NOT active (LEAD, PROSPECTING, etc.)
    const view = await getPracticesView({
      search: query || undefined,
      limit: 10,
      status: "LEAD", // Filter for Lead status as requested
    });
    return view.rows.map((row) => ({
      label: row.values.name as string,
      value: row.id,
      subLabel: `NPI: ${row.values.npi} • ${row.values.region}`,
    }));
  };

  const handleSearchAllPractices = async (
    query: string,
  ): Promise<SearchSelectOption[]> => {
    const view = await getPracticesView({
      search: query || undefined,
      limit: 10,
    });
    return view.rows.map((row) => ({
      label: row.values.name as string,
      value: row.id,
      subLabel: `NPI: ${row.values.npi} • ${row.values.status}`,
    }));
  };

  const handlePracticeSelect = async (
    practiceId: string,
    option?: SearchSelectOption,
  ) => {
    updateField("selectedPracticeId", practiceId);
    setSelectedPracticeLabel(option?.label || "");
    if (!practiceId) {
      return;
    }

    try {
      const fullPractice = await getPractice(practiceId);
      setSelectedPracticeLabel(fullPractice.name || "");
      if (form.companyRelation === "existing") {
        if (fullPractice.companyId) {
          updateField("selectedCompanyId", fullPractice.companyId);
          setSelectedCompany(await getCompany(fullPractice.companyId));
        } else {
          updateField("selectedCompanyId", "");
          setSelectedCompany(null);
        }
      }
    } catch (err) {
      console.error("Error syncing company from practice:", err);
    }
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
    if (form.companyRelation === "new" && form.companyName.trim()) {
      if (!form.companyIndustry.trim()) {
        toast.error("Company industry is required.");
        return;
      }
      if (
        form.companyEmail.trim() &&
        !/^[^\s@]+@[^\s@]+\.com$/i.test(form.companyEmail.trim())
      ) {
        toast.error("Company email must include @ and end with .com.");
        return;
      }
    }
    // No mandatory selectedCompanyId for 'existing' if they want an individual practice

    if (form.practiceRelation === "new") {
      if (!form.practiceName.trim()) {
        toast.error("Practice name is required.");
        return;
      }
      if (!form.practiceNpi.trim()) {
        toast.error("Practice NPI is required.");
        return;
      }
      if (!/^\d{10}$/.test(form.practiceNpi.trim())) {
        toast.error("Practice NPI must be exactly 10 digits.");
        return;
      }
      if (!form.practiceRegion.trim()) {
        toast.error("Practice region is required.");
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
      if (!form.primaryContactRole) {
        toast.error("Contact role is required.");
        return;
      }
      if (
        form.primaryContactEmail.trim() &&
        !/^[^\s@]+@[^\s@]+\.com$/i.test(form.primaryContactEmail.trim())
      ) {
        toast.error("Contact email must include @ and end with .com.");
        return;
      }
    }

    // Validate phone formats
    if (
      form.companyPhone.trim() &&
      !/^\d{10}$/.test(form.companyPhone.trim())
    ) {
      toast.error("Company phone must be exactly 10 digits.");
      return;
    }
    if (
      form.primaryContactPhone.trim() &&
      !/^\d{10}$/.test(form.primaryContactPhone.trim())
    ) {
      toast.error("Contact phone must be exactly 10 digits.");
      return;
    }

    // Validate NPI format
    if (
      form.practiceRelation === "new" &&
      !/^\d{10}$/.test(form.practiceNpi.trim())
    ) {
      toast.error("Practice NPI must be exactly 10 digits.");
      return;
    }

    // Validate Group NPI format
    if (form.practiceRelation === "new") {
      for (const entry of form.practiceGroupNpis) {
        if (!entry.groupNpiNumber.trim() || !entry.groupName.trim()) {
          toast.error(
            "Each added Group NPI must include both Group NPI Number and Group Name.",
          );
          return;
        }
        if (
          entry.groupNpiNumber.trim() &&
          !/^\d{10}$/.test(entry.groupNpiNumber.trim())
        ) {
          toast.error("Each Group NPI must be exactly 10 digits.");
          return;
        }
      }
    }

    // Validate Company ZIP format
    if (form.companyZip.trim() && !/^\d{5,9}$/.test(form.companyZip.trim())) {
      toast.error("Company ZIP must be 5 to 9 digits.");
      return;
    }

    if (form.contactRelation !== "new" && !form.selectedContactId) {
      toast.error("Please select an existing contact.");
      return;
    }

    if (!form.estimatedValue) {
      toast.error("Estimated deal value is required.");
      return;
    }
    if (!form.followUpTaskDueAt) {
      toast.error("Follow-up due date is required.");
      return;
    }

    const shouldValidateAgreement =
      form.interestedServiceIds.length > 0 &&
      form.agreement.action === "create";

    if (shouldValidateAgreement && form.agreement.templateIds.length === 0) {
      toast.error("Please select at least one agreement template.");
      return;
    }

    if (shouldValidateAgreement && !form.agreement.effectiveDate) {
      toast.error("Agreement effective date is required.");
      return;
    }

    if (shouldValidateAgreement && !form.agreement.renewalDate) {
      toast.error("Agreement renewal date is required.");
      return;
    }

    if (
      shouldValidateAgreement &&
      form.agreement.effectiveDate &&
      form.agreement.renewalDate &&
      new Date(form.agreement.renewalDate) <=
        new Date(form.agreement.effectiveDate)
    ) {
      toast.error("Renewal date must be greater than effective date");
      return;
    }

    if (shouldValidateAgreement) {
      const missingField = validateAgreementTemplateFieldValues();
      if (missingField) {
        toast.error(
          `${missingField.templateName}: ${missingField.fieldName} is required`,
        );
        return;
      }
    }

    setShowAgreementModal(true);
  }

  const handleConfirmWithAgreements = () => {
    performLeadCreation(form.interestedServiceIds.length > 0);
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
                      onClick={() => setCompanyRelation("existing")}
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
                      onClick={() => setCompanyRelation("new")}
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
                        onChange={(val) => handleCompanySelect(val)}
                        onSearch={handleSearchCompanies}
                        placeholder="Search by company name, city, or industry..."
                        clearable
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
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          pattern="[0-9]{10}"
                          value={form.companyPhone}
                          onChange={(e) =>
                            updateField(
                              "companyPhone",
                              e.target.value.replace(/\D/g, "").slice(0, 10),
                            )
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
                          pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                          title="Must include @ and .com (e.g. user@example.com)"
                          value={form.companyEmail}
                          onChange={(e) =>
                            updateField("companyEmail", e.target.value)
                          }
                          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        />
                      </label>
                    </div>
                    <label className="block md:col-span-2">
                      <span className="mb-1 block text-[13px] font-medium text-slate-700">
                        Website
                      </span>
                      <input
                        type="url"
                        value={form.companyWebsite}
                        onChange={(e) =>
                          updateField("companyWebsite", e.target.value)
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        placeholder="https://example.com"
                      />
                    </label>
                    <div className="md:col-span-2 border-t border-[#e8e4dc] pt-3">
                      <span className="mb-2 block text-[12px] font-medium text-slate-600">
                        Address
                      </span>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-[12px] text-slate-500">
                            Street
                          </span>
                          <input
                            type="text"
                            value={form.companyStreet}
                            onChange={(e) =>
                              updateField("companyStreet", e.target.value)
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[12px] text-slate-500">
                            City
                          </span>
                          <input
                            type="text"
                            value={form.companyCity}
                            onChange={(e) =>
                              updateField("companyCity", e.target.value)
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[12px] text-slate-500">
                            State
                          </span>
                          <input
                            type="text"
                            value={form.companyState}
                            onChange={(e) =>
                              updateField("companyState", e.target.value)
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-[12px] text-slate-500">
                            ZIP
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={9}
                            pattern="[0-9]{5,9}"
                            value={form.companyZip}
                            onChange={(e) =>
                              updateField(
                                "companyZip",
                                e.target.value.replace(/\D/g, "").slice(0, 9),
                              )
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </label>
                        <label className="block md:col-span-2">
                          <span className="mb-1 block text-[12px] text-slate-500">
                            Country
                          </span>
                          <input
                            type="text"
                            value={form.companyCountry}
                            onChange={(e) =>
                              updateField("companyCountry", e.target.value)
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </label>
                      </div>
                    </div>
                    <div className="md:col-span-2 border-t border-[#e8e4dc] pt-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="block text-[12px] font-medium text-slate-600">
                          Tax IDs
                        </span>
                        <button
                          type="button"
                          onClick={addTaxId}
                          className="flex items-center gap-1 text-[12px] text-[#4f63ea] hover:text-[#3d4ed1]"
                        >
                          <Plus className="h-3 w-3" />
                          Add Tax ID
                        </button>
                      </div>
                      {form.taxIds.map((taxId, index) => (
                        <div
                          key={index}
                          className="mb-2 rounded-lg border border-[#e8e4dc] bg-white p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-slate-500">
                              Tax ID {index + 1}
                            </span>
                            {form.taxIds.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTaxId(index)}
                                className="text-[11px] text-red-500 hover:text-red-700"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={taxId.taxIdNumber}
                              onChange={(e) =>
                                updateTaxId(
                                  index,
                                  "taxIdNumber",
                                  e.target.value.replace(/\D/g, ""),
                                )
                              }
                              placeholder="9-digit Tax ID"
                              inputMode="numeric"
                              maxLength={9}
                              className="app-control w-full rounded-md px-2 py-1.5 text-[12px]"
                            />
                            <input
                              type="text"
                              value={taxId.legalEntityName}
                              onChange={(e) =>
                                updateTaxId(
                                  index,
                                  "legalEntityName",
                                  e.target.value,
                                )
                              }
                              placeholder="Legal Entity Name"
                              className="app-control w-full rounded-md px-2 py-1.5 text-[12px]"
                            />
                            <input
                              type="text"
                              value={taxId.notes}
                              onChange={(e) =>
                                updateTaxId(index, "notes", e.target.value)
                              }
                              placeholder="Notes (optional)"
                              className="app-control w-full rounded-md px-2 py-1.5 text-[12px] col-span-2"
                            />
                          </div>
                        </div>
                      ))}
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
                      onClick={() => setPracticeRelation("existing")}
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
                      onClick={() => setPracticeRelation("new")}
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
                        onChange={(val, opt) => handlePracticeSelect(val, opt)}
                        onSearch={handleSearchPractices}
                        placeholder={
                          form.selectedCompanyId
                            ? "Search all lead practices..."
                            : "Search all leads/prospective practices..."
                        }
                        clearable
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
                        inputMode="numeric"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        value={form.practiceNpi}
                        onChange={(e) =>
                          updateField(
                            "practiceNpi",
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </label>
                    <div className="md:col-span-2 grid gap-4 md:grid-cols-3">
                      <label className="block">
                        <span className="mb-1 block text-[13px] font-medium text-slate-700">
                          Tax ID - Legal Entity Name
                        </span>
                        {companyTaxIdOptions.length > 1 ? (
                          <select
                            value={form.practiceTaxIdKey}
                            onChange={(e) =>
                              updateField("practiceTaxIdKey", e.target.value)
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          >
                            {companyTaxIdOptions.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={
                              selectedCompanyTaxIdLabel ||
                              "No company Tax ID selected"
                            }
                            readOnly
                            className="app-control w-full rounded-md bg-slate-100 px-3 py-2 text-[13px] text-slate-500"
                          />
                        )}
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[13px] font-medium text-slate-700">
                          Region *
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
                    <div className="md:col-span-2 border-t border-[#e8e4dc] pt-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="block text-[12px] font-medium text-slate-600">
                          Group NPIs
                        </span>
                        <button
                          type="button"
                          onClick={addGroupNpi}
                          className="flex items-center gap-1 text-[12px] text-[#4f63ea] hover:text-[#3d4ed1]"
                        >
                          <Plus className="h-3 w-3" />
                          Add Group NPI
                        </button>
                      </div>
                      {form.practiceGroupNpis.map((entry, index) => (
                        <div
                          key={index}
                          className="mb-2 rounded-lg border border-[#e8e4dc] bg-white p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-slate-500">
                              Group NPI {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeGroupNpi(index)}
                              className="text-[11px] text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={10}
                              pattern="[0-9]{10}"
                              value={entry.groupNpiNumber}
                              onChange={(e) =>
                                updateGroupNpi(
                                  index,
                                  "groupNpiNumber",
                                  e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 10),
                                )
                              }
                              placeholder="Group NPI Number"
                              className="app-control w-full rounded-md px-2 py-1.5 text-[12px]"
                            />
                            <input
                              type="text"
                              value={entry.groupName}
                              onChange={(e) =>
                                updateGroupNpi(
                                  index,
                                  "groupName",
                                  e.target.value,
                                )
                              }
                              placeholder="Group Name"
                              className="app-control w-full rounded-md px-2 py-1.5 text-[12px]"
                            />
                          </div>
                        </div>
                      ))}
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
                      onClick={() => setContactRelation("existing")}
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
                      onClick={() => setContactRelation("new")}
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
                        clearable
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
                        pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                        title="Must include @ and .com (e.g. user@example.com)"
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
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        value={form.primaryContactPhone}
                        onChange={(e) =>
                          updateField(
                            "primaryContactPhone",
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[13px] font-medium text-slate-700">
                        Role *
                      </span>
                      <select
                        value={form.primaryContactRole}
                        onChange={(e) =>
                          updateField(
                            "primaryContactRole",
                            e.target.value as PersonRole,
                          )
                        }
                        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                      >
                        {personRoleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
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
              <div className="rounded-xl border border-[#f0ece6] bg-[#fafafa] p-4">
                <div className="mb-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <span className="mb-2 block text-[12px] font-medium text-slate-600">
                      Link to Companies
                    </span>
                    <SearchSelect
                      value=""
                      onChange={(val, opt) => addContactCompanyId(val, opt)}
                      onSearch={handleSearchCompanies}
                      placeholder="Search and select companies..."
                      clearOnSelect
                    />
                  </div>
                  <div>
                    <span className="mb-2 block text-[12px] font-medium text-slate-600">
                      Link to Practices
                    </span>
                    <SearchSelect
                      value=""
                      onChange={(val, opt) => addContactPracticeId(val, opt)}
                      onSearch={handleSearchAllPractices}
                      placeholder="Search and select practices..."
                      clearOnSelect
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Person will link to companies
                    </span>
                    {linkedCompanyLabels.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {linkedCompanyLabels.map((company) => (
                          <span
                            key={company.id}
                            className="inline-flex items-center gap-1 rounded-md bg-[#e8f5e9] px-2 py-1 text-[12px] text-[#2e7d32]"
                          >
                            {company.name}
                            {company.removable ? (
                              <button
                                type="button"
                                onClick={() =>
                                  removeContactCompanyId(company.id)
                                }
                                className="hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[12px] text-slate-500">
                        Select or create a company.
                      </p>
                    )}
                  </div>
                  <div>
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Person will link to practices
                    </span>
                    {linkedPracticeLabels.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {linkedPracticeLabels.map((practice) => (
                          <span
                            key={practice.id}
                            className="inline-flex items-center gap-1 rounded-md bg-[#e8e5f9] px-2 py-1 text-[12px] text-[#4f63ea]"
                          >
                            {practice.name}
                            {practice.removable ? (
                              <button
                                type="button"
                                onClick={() =>
                                  removeContactPracticeId(practice.id)
                                }
                                className="hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            ) : null}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-[12px] text-slate-500">
                        Select or create a practice.
                      </p>
                    )}
                  </div>
                </div>
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

              {/* Integrated Agreement Section */}
              {form.interestedServiceIds.length > 0 && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-6 border-t border-slate-200 pt-6 duration-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      <h2 className="text-[16px] font-semibold text-slate-800">
                        Agreement Setup
                      </h2>
                    </div>
                    <div className="flex rounded-lg bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => updateAgreementField("action", "create")}
                        className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
                          form.agreement.action === "create"
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        Create New
                      </button>
                      {existingAgreements.length > 0 && (
                        <button
                          type="button"
                          onClick={() => updateAgreementField("action", "link")}
                          className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
                            form.agreement.action === "link"
                              ? "bg-white text-indigo-600 shadow-sm"
                              : "text-slate-500"
                          }`}
                        >
                          Link Existing
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => updateAgreementField("action", "none")}
                        className={`px-3 py-1 text-[12px] font-medium rounded-md transition-all ${
                          form.agreement.action === "none"
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        Skip for Now
                      </button>
                    </div>
                  </div>

                  {existingAgreements.length === 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-800">
                      No agreements found for selected/new practice.
                    </div>
                  )}

                  {form.agreement.action === "link" &&
                    existingAgreements.length > 0 && (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                        <label className="block">
                          <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
                            Select Existing Agreement
                          </span>
                          <select
                            value={form.agreement.existingAgreementId}
                            onChange={(e) =>
                              updateAgreementField(
                                "existingAgreementId",
                                e.target.value,
                              )
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          >
                            {existingAgreements.map((ag) => (
                              <option key={ag.id} value={ag.id}>
                                {ag.practice.name} - {ag.type} - Created{" "}
                                {new Date(ag.createdAt).toLocaleDateString()}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}

                  {form.agreement.action === "create" && (
                    <div className="grid gap-6 rounded-2xl border border-slate-100 bg-slate-50/50 p-5 md:grid-cols-2">
                      <div className="space-y-6">
                        <label className="block">
                          <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
                            Agreement Type *
                          </span>
                          <select
                            value={form.agreement.type}
                            onChange={(e) => {
                              const newType = e.target.value;
                              updateAgreementField("type", newType);
                              if (newType === "MSA") {
                                const autoSelectIds = templates
                                  .filter((t) =>
                                    AUTO_INCLUDE_TEMPLATE_NAMES.some((name) =>
                                      t.name
                                        .toLowerCase()
                                        .includes(name.toLowerCase()),
                                    ),
                                  )
                                  .map((t) => String(t.id));
                                setAgreementTemplateIds([
                                  ...new Set([
                                    ...form.agreement.templateIds,
                                    ...autoSelectIds,
                                  ]),
                                ]);
                              }
                            }}
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          >
                            {agreementTypeOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
                            Effective Date *
                          </span>
                          <input
                            type="date"
                            value={form.agreement.effectiveDate}
                            onChange={(e) =>
                              updateAgreementField(
                                "effectiveDate",
                                e.target.value,
                              )
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
                            Renewal Date *
                          </span>
                          <input
                            type="date"
                            value={form.agreement.renewalDate}
                            onChange={(e) =>
                              updateAgreementField(
                                "renewalDate",
                                e.target.value,
                              )
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </label>
                      </div>

                      <div className="flex flex-col h-full">
                        <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
                          DocuSeal Templates *
                        </span>

                        {form.agreement.templateIds.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {form.agreement.templateIds.map(
                              (templateId: string) => {
                                const template = templates.find(
                                  (t) => String(t.id) === templateId,
                                );
                                const isAutoInclude = template
                                  ? AUTO_INCLUDE_TEMPLATE_NAMES.some((name) =>
                                      template.name
                                        .toLowerCase()
                                        .includes(name.toLowerCase()),
                                    )
                                  : false;
                                return (
                                  <span
                                    key={templateId}
                                    className="inline-flex items-center gap-1 rounded-md bg-[#f0f2fe] px-2 py-1 text-[12px] text-[#4f63ea]"
                                  >
                                    {template?.name || templateId}
                                    {!isAutoInclude && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          removeAgreementTemplate(templateId)
                                        }
                                        className="hover:text-red-500"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </span>
                                );
                              },
                            )}
                          </div>
                        )}

                        <div className="relative" ref={templateDropdownRef}>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={templateSearch}
                              onChange={(e) => {
                                setTemplateSearch(e.target.value);
                                if (!showTemplateDropdown)
                                  setShowTemplateDropdown(true);
                              }}
                              onFocus={() => setShowTemplateDropdown(true)}
                              placeholder="Search templates..."
                              className="app-control w-full rounded-md py-2 pl-8 pr-3 text-[13px]"
                            />
                          </div>

                          {showTemplateDropdown && (
                            <div className="absolute z-10 mt-1 max-h-[200px] w-full overflow-y-auto rounded-md border border-[#ece8e1] bg-white shadow-lg">
                              {templates.length === 0 ? (
                                <div className="flex items-center justify-center py-6 text-[13px] text-slate-400">
                                  Loading...
                                </div>
                              ) : (
                                (() => {
                                  const filtered = templateSearch
                                    ? templates.filter((t) =>
                                        t.name
                                          .toLowerCase()
                                          .includes(
                                            templateSearch.toLowerCase(),
                                          ),
                                      )
                                    : templates;
                                  return filtered.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-[13px] text-slate-400">
                                      No templates match
                                    </div>
                                  ) : (
                                    filtered.map((template) => {
                                      const templateId = String(template.id);
                                      const isSelected =
                                        form.agreement.templateIds.includes(
                                          templateId,
                                        );
                                      const isAutoInclude =
                                        form.agreement.type === "MSA" &&
                                        AUTO_INCLUDE_TEMPLATE_NAMES.some(
                                          (name) =>
                                            template.name
                                              .toLowerCase()
                                              .includes(name.toLowerCase()),
                                        );
                                      const isDisabled =
                                        isSelected || isAutoInclude;
                                      return (
                                        <button
                                          key={template.id}
                                          type="button"
                                          onClick={() => {
                                            if (isDisabled) return;
                                            addAgreementTemplate(templateId);
                                            setTemplateSearch("");
                                          }}
                                          className={`w-full px-3 py-2 text-left text-[13px] hover:bg-[#faf9f7] ${
                                            isDisabled
                                              ? "cursor-not-allowed text-slate-400"
                                              : "text-slate-700"
                                          }`}
                                          disabled={isDisabled}
                                        >
                                          {template.name}
                                          {isAutoInclude && (
                                            <span className="ml-1 text-xs text-slate-400">
                                              (required)
                                            </span>
                                          )}
                                          {isSelected && !isAutoInclude && (
                                            <span className="ml-1 text-xs text-[#4f63ea]">
                                              (selected)
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })
                                  );
                                })()
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {form.agreement.templateIds.length > 0 && (
                        <div className="space-y-4 rounded-xl border border-dashed border-indigo-100 bg-indigo-50/30 p-4 md:col-span-2">
                          <div>
                            <h3 className="text-[13px] font-semibold text-slate-700">
                              Template Fields
                            </h3>
                            <p className="mt-1 text-[12px] text-slate-500">
                              Complete the template inputs now so the agreement
                              can be pre-populated before sending.
                            </p>
                          </div>

                          <div className="space-y-4">
                            {form.agreement.templateIds.map(
                              (templateId: string) => {
                                const template = templates.find(
                                  (t) => String(t.id) === templateId,
                                );
                                if (!template) return null;

                                const editableFields = (
                                  template.fields || []
                                ).filter(isEditableDocusealField);
                                const templateFieldValues =
                                  form.agreement.docusealFieldValues[
                                    templateId
                                  ] || {};
                                const submitterGroups =
                                  getTemplateSubmitterGroups(
                                    template,
                                    templateFieldValues,
                                  );

                                return (
                                  <div
                                    key={templateId}
                                    className="rounded-lg border border-indigo-100 bg-white p-3 shadow-sm"
                                  >
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                      <div>
                                        <div className="text-[13px] font-medium text-slate-700">
                                          {template.name}
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                          {editableFields.length} fillable field
                                          {editableFields.length === 1
                                            ? ""
                                            : "s"}
                                        </div>
                                      </div>
                                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                                        DocuSeal
                                      </span>
                                    </div>

                                    {editableFields.length === 0 ? (
                                      <p className="rounded-md bg-slate-50 px-3 py-2 text-[12px] text-slate-500">
                                        This template has no editable fields.
                                      </p>
                                    ) : (
                                      <div className="space-y-4">
                                        {submitterGroups.map((group) =>
                                          group.fields.length > 0 ? (
                                            <div key={group.submitterUuid}>
                                              <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                                                {group.submitterName}
                                              </div>
                                              <div className="grid gap-3 md:grid-cols-2">
                                                {group.fields.map(
                                                  (field, fieldIndex) => {
                                                    const inputType =
                                                      getDocusealFieldInputType(
                                                        field,
                                                      );
                                                    const value =
                                                      templateFieldValues[
                                                        field.uuid
                                                      ] ||
                                                      templateFieldValues[
                                                        field.name
                                                      ] ||
                                                      "";

                                                    return (
                                                      <label
                                                        key={field.uuid}
                                                        className={`block ${
                                                          group.fields.length %
                                                            2 ===
                                                            1 &&
                                                          fieldIndex ===
                                                            group.fields
                                                              .length -
                                                              1
                                                            ? "md:col-span-2"
                                                            : ""
                                                        }`}
                                                      >
                                                        <span className="mb-1 block text-[12px] font-medium text-slate-700">
                                                          {getDocusealFieldLabel(
                                                            field,
                                                            fieldIndex,
                                                          )}
                                                          {field.required && (
                                                            <span className="ml-1 text-red-500">
                                                              *
                                                            </span>
                                                          )}
                                                        </span>
                                                        <input
                                                          type={inputType}
                                                          value={value}
                                                          required={
                                                            field.required
                                                          }
                                                          onChange={(event) =>
                                                            updateAgreementTemplateFieldValue(
                                                              templateId,
                                                              field.uuid,
                                                              event.target
                                                                .value,
                                                            )
                                                          }
                                                          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                                                          placeholder={`Enter ${getDocusealFieldLabel(
                                                            field,
                                                            fieldIndex,
                                                          )}`}
                                                        />
                                                      </label>
                                                    );
                                                  },
                                                )}
                                              </div>
                                            </div>
                                          ) : null,
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-3 text-blue-700 md:col-span-2">
                        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                        <p className="text-[12px] leading-relaxed">
                          <strong>Signature Workflow:</strong> Saving this lead
                          will automatically create the agreement and{" "}
                          {isAdmin
                            ? "send signature request emails"
                            : "send it for admin approval"}{" "}
                          for{" "}
                          <strong>{form.agreement.templateIds.length}</strong>{" "}
                          selected template(s)
                          {isAdmin ? " to " : "."}
                          {isAdmin ? (
                            <strong>
                              {form.contactRelation === "new"
                                ? form.primaryContactName ||
                                  "the primary contact"
                                : "the selected contact"}
                            </strong>
                          ) : null}
                          {isAdmin ? "." : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              {form.interestedServiceIds.length > 0 && (
                <div className="flex gap-3">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                      form.agreement.action === "none"
                        ? "bg-slate-100 text-slate-400"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    {form.agreement.action === "none" ? (
                      <FileText className="h-3.5 w-3.5" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-slate-700 uppercase tracking-wider">
                      Agreement
                    </div>
                    <div className="text-[13px] text-slate-500 mt-0.5">
                      {form.agreement.action === "create"
                        ? `Generate New ${form.agreement.type}`
                        : form.agreement.action === "link"
                          ? "Link to Existing"
                          : "Skip creation"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <ConfirmModal
        isOpen={showAgreementModal}
        onClose={() => setShowAgreementModal(false)}
        onConfirm={handleConfirmWithAgreements}
        title={
          form.interestedServiceIds.length === 0
            ? "Create Lead?"
            : form.agreement.action === "create"
              ? isAdmin
                ? "Create Lead & Send Agreement?"
                : "Create Lead & Send Agreement for Approval?"
              : form.agreement.action === "link"
                ? "Create Lead & Link Agreement?"
                : "Create Lead?"
        }
        message={
          form.interestedServiceIds.length === 0
            ? "No interested services were selected. Would you like to create this lead without an agreement?"
            : form.agreement.action === "create"
              ? isAdmin
                ? `You have configured a new ${form.agreement.type} agreement. Would you like to create the lead and trigger the signature request now?`
                : `You have configured a new ${form.agreement.type} agreement. Would you like to create the lead and send the agreement for admin approval?`
              : form.agreement.action === "link"
                ? "Would you like to create the lead and link it to the selected existing agreement?"
                : "Would you like to create the lead without creating or linking an agreement?"
        }
        confirmLabel={
          form.interestedServiceIds.length === 0
            ? "Create Lead"
            : form.agreement.action === "create"
              ? isAdmin
                ? "Create & Send Now"
                : "Create & Send for Approval"
              : form.agreement.action === "link"
                ? "Create & Link"
                : "Create Lead"
        }
        cancelLabel="Cancel"
        type="primary"
      />
    </AppLayout>
  );
}

export default CreateLeadPage;
