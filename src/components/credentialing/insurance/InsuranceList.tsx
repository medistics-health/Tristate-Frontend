import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../../layout/AppLayout";
import ConfirmModal from "../../shared/ConfirmModal";
import Select from "../../shared/Select";
import {
  createInsuranceCarrierApi,
  createInsurancePlansApi,
  deleteInsuranceCarrierApi,
  deleteInsurancePlanApi,
  getInsuranceCarrierOptionsApi,
  getInsuranceCarriersApi,
  updateInsuranceCarrierApi,
  updateInsurancePlanApi,
} from "../../../services/operations/insurance";
import {
  carrierTypeOptions,
  contactRoleOptions,
  createCarrierFormState,
  createEmptyAddress,
  createEmptyContact,
  createEmptyPlan,
  createEmptyTelecom,
  createPlanCreateFormState,
  insuranceStatusOptions,
  planTypeOptions,
  telecomSystemOptions,
  type AddressValue,
  type CarrierContact,
  type InsuranceCarrierFormState,
  type InsuranceCarrierOption,
  type InsuranceCarrierRecord,
  type InsurancePlanCreateFormState,
  type InsurancePlanFormState,
  type InsurancePlanRecord,
  type TelecomEntry,
} from "./types";

type ModalMode = "create" | "edit" | "view";
type ModalEntity = "selector" | "carrier" | "plan";
type DeleteTarget =
  | { type: "carrier"; carrier: InsuranceCarrierRecord }
  | { type: "plan"; plan: InsurancePlanRecord };
type ErrorMap = Record<string, string>;

function formatDateLabel(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function statusBadgeClass(status: string) {
  return status === "Active"
    ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
    : "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
}

function typeBadgeClass(type: string) {
  const normalized = type.toLowerCase();
  if (normalized.includes("commercial")) return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
  if (normalized.includes("medicare")) return "bg-violet-100 text-violet-700 ring-1 ring-violet-200";
  if (normalized.includes("medicaid")) return "bg-cyan-100 text-cyan-700 ring-1 ring-cyan-200";
  if (normalized.includes("government")) return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return /^\+?[0-9()\-\s]{7,20}$/.test(value);
}

function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidPostalCode(value: string) {
  return /^[A-Za-z0-9 -]{3,10}$/.test(value);
}

function fieldClass(hasError: boolean, readOnly = false) {
  return `app-control w-full rounded-xl px-3 py-2 text-[13px] ${
    hasError
      ? "border-red-400 bg-red-50 text-red-900 focus:border-red-500"
      : ""
  } ${readOnly ? "bg-slate-50" : ""}`;
}

function errorText(message?: string) {
  return message ? <p className="mt-1 text-[11px] text-red-600">{message}</p> : null;
}

function sanitizeAddress(address: AddressValue) {
  return {
    line: address.line.map((line) => line.trim()).filter(Boolean),
    city: address.city.trim(),
    state: address.state.trim(),
    postalCode: address.postalCode.trim(),
    country: address.country.trim(),
  };
}

function hasAddressValue(address: AddressValue | null | undefined) {
  if (!address) return false;
  const normalized = sanitizeAddress(address);
  return Boolean(
    normalized.line.length ||
      normalized.city ||
      normalized.state ||
      normalized.postalCode ||
      normalized.country,
  );
}

function sanitizeTelecomList(telecom: TelecomEntry[]) {
  return telecom
    .map((entry) => ({
      system: entry.system,
      value: entry.value.trim(),
      use: entry.use?.trim() || "",
    }))
    .filter((entry) => entry.value)
    .map((entry) => ({
      ...entry,
      use: entry.use || undefined,
    }));
}

function sanitizeContact(contact: CarrierContact) {
  return {
    role: contact.role || undefined,
    name: contact.name.trim(),
    telecom: sanitizeTelecomList(contact.telecom),
    address: hasAddressValue(contact.address) ? sanitizeAddress(contact.address) : undefined,
  };
}

function normalizeCarrierPayload(form: InsuranceCarrierFormState) {
  return {
    carrierName: form.carrierName.trim(),
    carrierCode: form.carrierCode.trim(),
    carrierType: form.carrierType,
    status: form.status,
    website: form.website.trim(),
    telecom: sanitizeTelecomList(form.telecom),
    address: hasAddressValue(form.address) ? sanitizeAddress(form.address) : undefined,
    notes: form.notes.trim(),
    contacts: form.contacts.map(sanitizeContact).filter((contact) => contact.name),
    plans: form.plans.map((plan) => ({
      id: plan.id,
      planName: plan.planName.trim(),
      planCode: plan.planCode.trim(),
      planType: plan.planType,
      status: plan.status,
      address: hasAddressValue(plan.address) ? sanitizeAddress(plan.address) : undefined,
      notes: plan.notes.trim(),
    })),
  };
}

function normalizePlanPayload(form: InsurancePlanCreateFormState) {
  return {
    carrierId: form.carrierId,
    plans: form.plans.map((plan) => ({
      id: plan.id,
      planName: plan.planName.trim(),
      planCode: plan.planCode.trim(),
      planType: plan.planType,
      status: plan.status,
      address: hasAddressValue(plan.address) ? sanitizeAddress(plan.address) : undefined,
      notes: plan.notes.trim(),
    })),
  };
}

function validateTelecomEntry(entry: TelecomEntry, key: string, errors: ErrorMap) {
  const value = entry.value.trim();
  const use = entry.use?.trim() || "";
  if (!value) {
    errors[`${key}.value`] = "Value is required.";
    return;
  }
  if (entry.system === "Email" && !isValidEmail(value)) {
    errors[`${key}.value`] = "Enter a valid email.";
  }
  if ((entry.system === "Phone" || entry.system === "Mobile" || entry.system === "Fax") && !isValidPhone(value)) {
    errors[`${key}.value`] = "Enter a valid number.";
  }
  if (entry.system === "Website" && !isValidUrl(value)) {
    errors[`${key}.value`] = "Enter a valid URL.";
  }
  if (use && use.length > 50) {
    errors[`${key}.use`] = "Use must be under 50 characters.";
  }
}

function validateAddress(address: AddressValue, key: string, errors: ErrorMap) {
  if (address.postalCode.trim() && !isValidPostalCode(address.postalCode.trim())) {
    errors[`${key}.postalCode`] = "Enter a valid postal code.";
  }
  if (address.country.trim() && address.country.trim().length < 2) {
    errors[`${key}.country`] = "Enter a valid country.";
  }
}

function validatePlanRow(plan: InsurancePlanFormState, key: string, errors: ErrorMap) {
  if (!plan.planName.trim()) errors[`${key}.planName`] = "Plan name is required.";
  if (!plan.planCode.trim()) errors[`${key}.planCode`] = "Plan code is required.";
  validateAddress(plan.address, `${key}.address`, errors);
}

function validateCarrierForm(form: InsuranceCarrierFormState) {
  const errors: ErrorMap = {};
  if (!form.carrierName.trim()) errors.carrierName = "Carrier name is required.";
  if (!form.carrierCode.trim()) errors.carrierCode = "Carrier code is required.";
  if (form.website.trim() && !isValidUrl(form.website.trim())) {
    errors.website = "Enter a valid URL.";
  }
  form.telecom.forEach((entry, index) => validateTelecomEntry(entry, `telecom.${index}`, errors));
  validateAddress(form.address, "address", errors);
  form.contacts.forEach((contact, index) => {
    const hasAnyContactValue =
      contact.name.trim() ||
      contact.role ||
      contact.telecom.length ||
      hasAddressValue(contact.address);
    if (!hasAnyContactValue) return;
    if (!contact.name.trim()) errors[`contacts.${index}.name`] = "Name is required.";
    if (!contact.role) errors[`contacts.${index}.role`] = "Role is required.";
    contact.telecom.forEach((entry, telecomIndex) =>
      validateTelecomEntry(entry, `contacts.${index}.telecom.${telecomIndex}`, errors),
    );
    validateAddress(contact.address, `contacts.${index}.address`, errors);
  });
  form.plans.forEach((plan, index) => validatePlanRow(plan, `plans.${index}`, errors));
  return errors;
}

function validatePlanCreateForm(form: InsurancePlanCreateFormState) {
  const errors: ErrorMap = {};
  if (!form.carrierId) errors.carrierId = "Carrier is required.";
  form.plans.forEach((plan, index) => validatePlanRow(plan, `plans.${index}`, errors));
  return errors;
}

function LoadingSkeletonTable() {
  return (
    <div className="px-6 py-4">
      <div className="overflow-hidden">
        <div className="grid grid-cols-[48px_2fr_1.1fr_1fr_1fr_1fr_140px] gap-3 border-b border-[#ebe7e0] bg-[#fbfaf8] px-4 py-3">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-4 animate-pulse rounded bg-slate-200/80" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-[48px_2fr_1.1fr_1fr_1fr_1fr_140px] gap-3 border-b border-[#f1ede6] px-4 py-4"
          >
            {Array.from({ length: 7 }).map((_, colIndex) => (
              <div
                key={colIndex}
                className={`animate-pulse rounded bg-slate-200/80 ${
                  colIndex === 1 ? "h-6" : "h-4"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type CarrierQueryParams = {
  search?: string;
  status?: string;
  carrierType?: string;
};

function AddressEditor({
  value,
  onChange,
  readOnly,
  errors,
  errorKey,
}: {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  readOnly: boolean;
  errors: ErrorMap;
  errorKey: string;
}) {
  function updateLine(index: number, nextValue: string) {
    const nextLines = [...value.line];
    nextLines[index] = nextValue;
    onChange({ ...value, line: nextLines });
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#ece8e1] bg-[#faf9f7] p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-semibold text-slate-700">Address</h4>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onChange({ ...value, line: [...value.line, ""] })}
            className="text-[12px] font-medium text-[#4f63ea]"
          >
            Add line
          </button>
        )}
      </div>
      <div className="space-y-2">
        {value.line.map((line, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={line}
              readOnly={readOnly}
              onChange={(event) => updateLine(index, event.target.value)}
              className={fieldClass(false, readOnly)}
              placeholder={`Address line ${index + 1}`}
            />
            {!readOnly && value.line.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    line: value.line.filter((_, currentIndex) => currentIndex !== index),
                  })
                }
                className="rounded-lg p-2 text-slate-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[
          ["city", "City"],
          ["state", "State"],
          ["postalCode", "Postal Code"],
          ["country", "Country"],
        ].map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-[12px] font-medium text-slate-500">{label}</span>
            <input
              type="text"
              value={value[key as keyof AddressValue] as string}
              readOnly={readOnly}
              onChange={(event) => onChange({ ...value, [key]: event.target.value })}
              className={fieldClass(Boolean(errors[`${errorKey}.${key}`]), readOnly)}
            />
            {errorText(errors[`${errorKey}.${key}`])}
          </label>
        ))}
      </div>
    </div>
  );
}

function TelecomEditor({
  value,
  onChange,
  readOnly,
  errors,
  errorKey,
}: {
  value: TelecomEntry[];
  onChange: (next: TelecomEntry[]) => void;
  readOnly: boolean;
  errors: ErrorMap;
  errorKey: string;
}) {
  function updateEntry(index: number, next: Partial<TelecomEntry>) {
    const rows = [...value];
    rows[index] = { ...rows[index], ...next };
    onChange(rows);
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#ece8e1] bg-[#faf9f7] p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-semibold text-slate-700">Telecom</h4>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onChange([...value, createEmptyTelecom()])}
            className="text-[12px] font-medium text-[#4f63ea]"
          >
            Add telecom
          </button>
        )}
      </div>
      {value.length === 0 ? (
        <p className="text-[12px] italic text-slate-400">No telecom added.</p>
      ) : (
        <div className="space-y-2">
          {value.map((entry, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-xl border border-[#ece8e1] bg-white p-3 md:grid-cols-[160px_1fr_1fr_auto]"
            >
              {readOnly ? (
                <>
                  <input type="text" value={entry.system} readOnly className={fieldClass(false, true)} />
                  <input type="text" value={entry.value} readOnly className={fieldClass(false, true)} />
                  <input type="text" value={entry.use || ""} readOnly className={fieldClass(false, true)} />
                </>
              ) : (
                <>
                  <div>
                    <Select
                      value={entry.system}
                      onChange={(system) => updateEntry(index, { system: system as TelecomEntry["system"] })}
                      options={telecomSystemOptions.map((option) => ({ label: option, value: option }))}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={entry.value}
                      onChange={(event) => updateEntry(index, { value: event.target.value })}
                      className={fieldClass(Boolean(errors[`${errorKey}.${index}.value`]))}
                      placeholder="Value"
                    />
                    {errorText(errors[`${errorKey}.${index}.value`])}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={entry.use || ""}
                      onChange={(event) => updateEntry(index, { use: event.target.value })}
                      className={fieldClass(Boolean(errors[`${errorKey}.${index}.use`]))}
                      placeholder="Use"
                    />
                    {errorText(errors[`${errorKey}.${index}.use`])}
                  </div>
                </>
              )}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, currentIndex) => currentIndex !== index))}
                  className="rounded-lg p-2 text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactEditor({
  value,
  onChange,
  readOnly,
  errors,
}: {
  value: CarrierContact[];
  onChange: (next: CarrierContact[]) => void;
  readOnly: boolean;
  errors: ErrorMap;
}) {
  function updateContact(index: number, next: Partial<CarrierContact>) {
    const contacts = [...value];
    contacts[index] = { ...contacts[index], ...next };
    onChange(contacts);
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#ece8e1] bg-[#faf9f7] p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-semibold text-slate-700">Contacts ({value.length})</h4>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onChange([...value, createEmptyContact()])}
            className="text-[12px] font-medium text-[#4f63ea]"
          >
            Add contact
          </button>
        )}
      </div>
      {value.length === 0 ? (
        <p className="text-[12px] italic text-slate-400">No contacts added.</p>
      ) : (
        <div className="space-y-3">
          {value.map((contact, index) => (
            <div key={index} className="rounded-xl border border-[#ece8e1] bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="text-[13px] font-semibold text-slate-700">Contact {index + 1}</h5>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((_, currentIndex) => currentIndex !== index))}
                    className="text-[12px] font-medium text-red-500"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">Role *</span>
                  {readOnly ? (
                    <input type="text" value={contact.role} readOnly className={fieldClass(false, true)} />
                  ) : (
                    <div>
                      <Select
                        value={contact.role}
                        onChange={(role) => updateContact(index, { role: role as CarrierContact["role"] })}
                        options={[
                          { label: "Select role", value: "" },
                          ...contactRoleOptions.map((option) => ({ label: option, value: option })),
                        ]}
                      />
                      {errorText(errors[`contacts.${index}.role`])}
                    </div>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1 block text-[12px] font-medium text-slate-500">Name</span>
                  <input
                    type="text"
                    value={contact.name}
                    readOnly={readOnly}
                    onChange={(event) => updateContact(index, { name: event.target.value })}
                    className={fieldClass(Boolean(errors[`contacts.${index}.name`]), readOnly)}
                  />
                  {errorText(errors[`contacts.${index}.name`])}
                </label>
              </div>
              <div className="mt-3">
                <TelecomEditor
                  value={contact.telecom}
                  onChange={(telecom) => updateContact(index, { telecom })}
                  readOnly={readOnly}
                  errors={errors}
                  errorKey={`contacts.${index}.telecom`}
                />
              </div>
              <div className="mt-3">
                <AddressEditor
                  value={contact.address}
                  onChange={(address) => updateContact(index, { address })}
                  readOnly={readOnly}
                  errors={errors}
                  errorKey={`contacts.${index}.address`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanEditor({
  value,
  onChange,
  readOnly,
  allowMultiple,
  errors,
}: {
  value: InsurancePlanFormState[];
  onChange: (next: InsurancePlanFormState[]) => void;
  readOnly: boolean;
  allowMultiple: boolean;
  errors: ErrorMap;
}) {
  function updatePlan(index: number, next: Partial<InsurancePlanFormState>) {
    const plans = [...value];
    plans[index] = { ...plans[index], ...next };
    onChange(plans);
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#ece8e1] bg-[#faf9f7] p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-semibold text-slate-700">Plans ({value.length})</h4>
        {!readOnly && allowMultiple && (
          <button
            type="button"
            onClick={() => onChange([...value, createEmptyPlan()])}
            className="text-[12px] font-medium text-[#4f63ea]"
          >
            Add plan
          </button>
        )}
      </div>
      <div className="space-y-3">
        {value.map((plan, index) => (
          <div key={plan.id || index} className="rounded-xl border border-[#ece8e1] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h5 className="text-[13px] font-semibold text-slate-700">Plan {index + 1}</h5>
              {!readOnly && allowMultiple && value.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, currentIndex) => currentIndex !== index))}
                  className="text-[12px] font-medium text-red-500"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">Plan Name</span>
                <input
                  type="text"
                  value={plan.planName}
                  readOnly={readOnly}
                  onChange={(event) => updatePlan(index, { planName: event.target.value })}
                  className={fieldClass(Boolean(errors[`plans.${index}.planName`]), readOnly)}
                />
                {errorText(errors[`plans.${index}.planName`])}
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">Plan Code</span>
                <input
                  type="text"
                  value={plan.planCode}
                  readOnly={readOnly}
                  onChange={(event) => updatePlan(index, { planCode: event.target.value })}
                  className={fieldClass(Boolean(errors[`plans.${index}.planCode`]), readOnly)}
                />
                {errorText(errors[`plans.${index}.planCode`])}
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">Plan Type</span>
                {readOnly ? (
                  <input type="text" value={plan.planType} readOnly className={fieldClass(false, true)} />
                ) : (
                  <Select
                    value={plan.planType}
                    onChange={(planType) => updatePlan(index, { planType: planType as InsurancePlanFormState["planType"] })}
                    options={planTypeOptions.map((option) => ({ label: option, value: option }))}
                  />
                )}
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-slate-500">Status</span>
                {readOnly ? (
                  <input type="text" value={plan.status} readOnly className={fieldClass(false, true)} />
                ) : (
                  <Select
                    value={plan.status}
                    onChange={(status) => updatePlan(index, { status: status as InsurancePlanFormState["status"] })}
                    options={insuranceStatusOptions.map((option) => ({ label: option, value: option }))}
                  />
                )}
              </label>
            </div>
            <div className="mt-3">
              <AddressEditor
                value={plan.address}
                onChange={(address) => updatePlan(index, { address })}
                readOnly={readOnly}
                errors={errors}
                errorKey={`plans.${index}.address`}
              />
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-[12px] font-medium text-slate-500">Notes</span>
              <textarea
                value={plan.notes}
                readOnly={readOnly}
                onChange={(event) => updatePlan(index, { notes: event.target.value })}
                className={fieldClass(false, readOnly)}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsuranceListPage() {
  const [loading, setLoading] = useState(true);
  const [carriers, setCarriers] = useState<InsuranceCarrierRecord[]>([]);
  const [carrierOptions, setCarrierOptions] = useState<InsuranceCarrierOption[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [modalEntity, setModalEntity] = useState<ModalEntity | null>(null);
  const [selectedCarrier, setSelectedCarrier] = useState<InsuranceCarrierRecord | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<InsurancePlanRecord | null>(null);
  const [carrierForm, setCarrierForm] = useState<InsuranceCarrierFormState>(createCarrierFormState());
  const [planForm, setPlanForm] = useState<InsurancePlanCreateFormState>(createPlanCreateFormState());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [carrierErrors, setCarrierErrors] = useState<ErrorMap>({});
  const [planErrors, setPlanErrors] = useState<ErrorMap>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const pageSize = 8;

  async function loadData(params?: CarrierQueryParams) {
    setLoading(true);
    try {
      const [nextCarriers, nextOptions] = await Promise.all([
        getInsuranceCarriersApi(params),
        getInsuranceCarrierOptionsApi(),
      ]);
      setCarriers(nextCarriers);
      setCarrierOptions(nextOptions);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load insurance module.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadData({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
      carrierType: typeFilter || undefined,
    });
  }, [debouncedSearch, statusFilter, typeFilter]);

  useEffect(() => {
    if (modalEntity === "carrier") setCarrierErrors(validateCarrierForm(carrierForm));
  }, [carrierForm, modalEntity]);

  useEffect(() => {
    if (modalEntity === "plan") setPlanErrors(validatePlanCreateForm(planForm));
  }, [planForm, modalEntity]);

  const totalPages = Math.max(1, Math.ceil(carriers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = carriers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const isViewMode = modalMode === "view";

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function resetModal() {
    setModalMode(null);
    setModalEntity(null);
    setSelectedCarrier(null);
    setSelectedPlan(null);
    setCarrierForm(createCarrierFormState());
    setPlanForm(createPlanCreateFormState());
    setCarrierErrors({});
    setPlanErrors({});
    setFormMessage("");
    setSaving(false);
  }

  function openCreateModal() {
    resetModal();
    setModalMode("create");
    setModalEntity("selector");
  }

  function openCarrierModal(mode: ModalMode, carrier?: InsuranceCarrierRecord) {
    setModalMode(mode);
    setModalEntity("carrier");
    setSelectedCarrier(carrier || null);
    setSelectedPlan(null);
    setCarrierForm(createCarrierFormState(carrier));
    setCarrierErrors(mode === "view" ? {} : validateCarrierForm(createCarrierFormState(carrier)));
  }

  function openPlanModal(mode: ModalMode, plan?: InsurancePlanRecord) {
    const nextForm = createPlanCreateFormState(plan);
    setModalMode(mode);
    setModalEntity("plan");
    setSelectedPlan(plan || null);
    setSelectedCarrier(null);
    setPlanForm(nextForm);
    setPlanErrors(mode === "view" ? {} : validatePlanCreateForm(nextForm));
  }

  async function refreshCarrierOptions() {
    const nextOptions = await getInsuranceCarrierOptionsApi();
    setCarrierOptions(nextOptions);
  }

  async function handleCarrierSubmit() {
    const errors = validateCarrierForm(carrierForm);
    setCarrierErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormMessage("Please fill the required values before saving the carrier.");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "edit" && selectedCarrier) {
        const updated = await updateInsuranceCarrierApi(selectedCarrier.id, carrierForm);
        setCarriers((current) => current.map((carrier) => (carrier.id === updated.id ? updated : carrier)));
        toast.success("Carrier updated successfully.");
      } else {
        const created = await createInsuranceCarrierApi(carrierForm);
        setCarriers((current) => [created, ...current]);
        toast.success("Carrier created successfully.");
      }
      await refreshCarrierOptions();
      await loadData({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        carrierType: typeFilter || undefined,
      });
      resetModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save carrier.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePlanSubmit() {
    const errors = validatePlanCreateForm(planForm);
    setPlanErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFormMessage("Please fill the required values before saving the plan.");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "edit" && selectedPlan) {
        const updated = await updateInsurancePlanApi(selectedPlan.id, {
          carrierId: planForm.carrierId,
          ...normalizePlanPayload(planForm).plans[0],
        });
        setCarriers((current) =>
          current.map((carrier) => {
            const nextPlans = carrier.plans.filter((plan) => plan.id !== updated.id);
            if (carrier.id === updated.carrierId) {
              nextPlans.push(updated);
            }
            return { ...carrier, plans: nextPlans.sort((a, b) => a.planName.localeCompare(b.planName)) };
          }),
        );
        toast.success("Plan updated successfully.");
      } else {
        const createdPlans = await createInsurancePlansApi(planForm);
        setCarriers((current) =>
          current.map((carrier) =>
            carrier.id === planForm.carrierId
              ? {
                  ...carrier,
                  plans: [...carrier.plans, ...createdPlans].sort((a, b) => a.planName.localeCompare(b.planName)),
                }
              : carrier,
          ),
        );
        toast.success("Plan created successfully.");
      }
      await loadData({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        carrierType: typeFilter || undefined,
      });
      resetModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save plan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "carrier") {
        await deleteInsuranceCarrierApi(deleteTarget.carrier.id);
        setCarriers((current) => current.filter((carrier) => carrier.id !== deleteTarget.carrier.id));
        setCarrierOptions((current) => current.filter((carrier) => carrier.id !== deleteTarget.carrier.id));
        toast.success("Carrier deleted successfully.");
      } else {
        await deleteInsurancePlanApi(deleteTarget.plan.id);
        setCarriers((current) =>
          current.map((carrier) =>
            carrier.id === deleteTarget.plan.carrierId
              ? { ...carrier, plans: carrier.plans.filter((plan) => plan.id !== deleteTarget.plan.id) }
              : carrier,
          ),
        );
        toast.success("Plan deleted successfully.");
      }
      await loadData({
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        carrierType: typeFilter || undefined,
      });
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout
      title="Insurance"
      activeModule="Master"
      activeSubItem="Insurance"
      navbarIcon={<LayoutGrid className="h-4 w-4 text-slate-500" />}
    >
      <div className="flex h-full font-app-sans">
        <section className="app-panel min-h-0 min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-[#f0ece6] bg-gradient-to-r from-white via-[#fcfbf8] to-[#f7f3eb] px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Insurance Carriers & Plans</h2>
                <p className="text-[13px] text-slate-500">Manage carrier master data and plan records from one module.</p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-xl bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
              >
                <Plus className="h-4 w-4" />
                Add Carrier/Plan
              </button>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search carrier, code, plan..."
                  className="app-control w-full rounded-xl py-2 pl-10 pr-3 text-[13px]"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                options={[{ label: "All Status", value: "" }, ...insuranceStatusOptions.map((option) => ({ label: option, value: option }))]}
              />
              <Select
                value={typeFilter}
                onChange={(value) => {
                  setTypeFilter(value);
                  setPage(1);
                }}
                options={[{ label: "All Carrier Types", value: "" }, ...carrierTypeOptions.map((option) => ({ label: option, value: option }))]}
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-[#f0ece6] px-6 py-4 text-[13px] text-slate-500">
            <span>{carriers.length} carriers</span>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setTypeFilter("");
                setPage(1);
              }}
              className="font-medium text-slate-500 hover:text-slate-700"
            >
              Reset filters
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <LoadingSkeletonTable />
            ) : pageRows.length === 0 ? (
              <div className="px-6 py-10 text-[13px] text-slate-400">No insurance carriers match the current filters.</div>
            ) : (
              <div>
                <div className="overflow-hidden">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead className="bg-[#fbfaf8] text-left text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      <tr>
                        <th className="w-12 px-4 py-3" />
                        <th className="px-4 py-3">Carrier</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Plans</th>
                        <th className="px-4 py-3">Updated</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((carrier) => {
                        const expanded = expandedIds.has(carrier.id);
                        return (
                          <>
                            <tr key={carrier.id} className="text-[13px] text-slate-700 hover:bg-[#fcfbf9]">
                              <td className="border-b border-[#f1ede6] px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedIds((current) => {
                                      const next = new Set(current);
                                      if (next.has(carrier.id)) next.delete(carrier.id);
                                      else next.add(carrier.id);
                                      return next;
                                    })
                                  }
                                  className="rounded-lg p-2 text-slate-500 hover:bg-[#f3f0ea]"
                                >
                                  <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                                </button>
                              </td>
                              <td className="border-b border-[#f1ede6] px-4 py-3">
                                <div className="font-semibold text-slate-800">{carrier.carrierName}</div>
                                <div className="mt-1 text-[12px] text-slate-500">{carrier.carrierCode}</div>
                              </td>
                              <td className="border-b border-[#f1ede6] px-4 py-3">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${typeBadgeClass(carrier.carrierType)}`}>
                                  {carrier.carrierType}
                                </span>
                              </td>
                              <td className="border-b border-[#f1ede6] px-4 py-3">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(carrier.status)}`}>
                                  {carrier.status}
                                </span>
                              </td>
                              <td className="border-b border-[#f1ede6] px-4 py-3">{carrier.plans.length}</td>
                              <td className="border-b border-[#f1ede6] px-4 py-3">{formatDateLabel(carrier.updatedAt)}</td>
                              <td className="border-b border-[#f1ede6] px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openCarrierModal("view", carrier)}
                                    className="rounded-lg p-2 text-slate-500 hover:bg-[#f3f0ea]"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openCarrierModal("edit", carrier)}
                                    className="rounded-lg p-2 text-slate-500 hover:bg-[#f3f0ea]"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  {/* <button
                                    type="button"
                                    onClick={() => setDeleteTarget({ type: "carrier", carrier })}
                                    className="rounded-lg p-2 text-slate-500 hover:bg-[#fff1f2] hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button> */}
                                </div>
                              </td>
                            </tr>
                            {expanded ? (
                              carrier.plans.length > 0 ? (
                                carrier.plans.map((plan) => (
                                  <tr key={plan.id} className="bg-[#f8f6f2] text-[13px] text-slate-700">
                                    <td className="border-b border-[#eee8de] px-4 py-3" />
                                    <td className="border-b border-[#eee8de] px-4 py-3 pl-7">
                                      <div className="flex items-center gap-3">
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                        <div>
                                          <div className="font-medium text-slate-800">{plan.planName}</div>
                                          <div className="mt-1 text-[12px] text-slate-500">{plan.planCode}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="border-b border-[#eee8de] px-4 py-3">
                                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${typeBadgeClass(plan.planType)}`}>
                                        {plan.planType}
                                      </span>
                                    </td>
                                    <td className="border-b border-[#eee8de] px-4 py-3">
                                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeClass(plan.status)}`}>
                                        {plan.status}
                                      </span>
                                    </td>
                                    <td className="border-b border-[#eee8de] px-4 py-3 text-slate-500">Plan</td>
                                    <td className="border-b border-[#eee8de] px-4 py-3">{formatDateLabel(plan.updatedAt)}</td>
                                    <td className="border-b border-[#eee8de] px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => openPlanModal("view", plan)}
                                          className="rounded-lg p-2 text-slate-500 hover:bg-[#f3f0ea]"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openPlanModal("edit", plan)}
                                          className="rounded-lg p-2 text-slate-500 hover:bg-[#f3f0ea]"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </button>
                                        {/* <button
                                          type="button"
                                          onClick={() => setDeleteTarget({ type: "plan", plan })}
                                          className="rounded-lg p-2 text-slate-500 hover:bg-[#fff1f2] hover:text-red-600"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button> */}
                                      </div>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr className="bg-[#f8f6f2] text-[13px] text-slate-500">
                                  <td className="border-b border-[#eee8de] px-4 py-3" />
                                  <td colSpan={6} className="border-b border-[#eee8de] px-4 py-3 pl-7 italic">
                                    No plans added for this carrier.
                                  </td>
                                </tr>
                              )
                            ) : null}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#f0ece6] px-6 py-4">
            <div className="text-[13px] text-slate-500">
              Showing {carriers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, carriers.length)} of {carriers.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-[#ece8e1] px-3 py-2 text-[13px] text-slate-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[13px] text-slate-500">Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="rounded-lg border border-[#ece8e1] px-3 py-2 text-[13px] text-slate-600 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {modalMode && modalEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#f0ece6] px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {modalEntity === "selector"
                    ? "What do you want to create?"
                    : modalEntity === "carrier"
                      ? modalMode === "create"
                        ? "Create Carrier"
                        : modalMode === "edit"
                          ? "Edit Carrier"
                          : "View Carrier"
                      : modalMode === "create"
                        ? "Create Plan"
                        : modalMode === "edit"
                          ? "Edit Plan"
                          : "View Plan"}
                </h2>
                {modalEntity === "plan" && modalMode === "create" ? (
                  <p className="text-[13px] text-slate-500">Select carrier first, then create one or multiple plans.</p>
                ) : null}
                {formMessage ? (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                    {formMessage}
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={resetModal} className="rounded-lg p-2 text-slate-500 hover:bg-[#f7f5f1]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
              {modalEntity === "selector" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => openCarrierModal("create")}
                    className="rounded-2xl border border-[#ece8e1] bg-[#faf9f7] p-6 text-left hover:border-[#4f63ea]"
                  >
                    <div className="text-[16px] font-semibold text-slate-800">Create Carrier</div>
                    <p className="mt-2 text-[13px] text-slate-500">Add carrier details and optionally create multiple plans in the same form.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => openPlanModal("create")}
                    className="rounded-2xl border border-[#ece8e1] bg-[#faf9f7] p-6 text-left hover:border-[#4f63ea]"
                  >
                    <div className="text-[16px] font-semibold text-slate-800">Create Plan</div>
                    <p className="mt-2 text-[13px] text-slate-500">Pick an existing carrier and create one or multiple plans.</p>
                  </button>
                </div>
              ) : modalEntity === "carrier" ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-[12px] font-medium text-slate-500">Carrier Name</span>
                      <input
                        type="text"
                        value={carrierForm.carrierName}
                        readOnly={isViewMode}
                        onChange={(event) => setCarrierForm((current) => ({ ...current, carrierName: event.target.value }))}
                        className={fieldClass(Boolean(carrierErrors.carrierName), isViewMode)}
                      />
                      {errorText(carrierErrors.carrierName)}
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] font-medium text-slate-500">Carrier Code</span>
                      <input
                        type="text"
                        value={carrierForm.carrierCode}
                        readOnly={isViewMode}
                        onChange={(event) => setCarrierForm((current) => ({ ...current, carrierCode: event.target.value }))}
                        className={fieldClass(Boolean(carrierErrors.carrierCode), isViewMode)}
                      />
                      {errorText(carrierErrors.carrierCode)}
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] font-medium text-slate-500">Carrier Type</span>
                      {isViewMode ? (
                        <input type="text" value={carrierForm.carrierType} readOnly className={fieldClass(false, true)} />
                      ) : (
                        <Select
                          value={carrierForm.carrierType}
                          onChange={(carrierType) =>
                            setCarrierForm((current) => ({ ...current, carrierType: carrierType as InsuranceCarrierFormState["carrierType"] }))
                          }
                          options={carrierTypeOptions.map((option) => ({ label: option, value: option }))}
                        />
                      )}
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[12px] font-medium text-slate-500">Status</span>
                      {isViewMode ? (
                        <input type="text" value={carrierForm.status} readOnly className={fieldClass(false, true)} />
                      ) : (
                        <Select
                          value={carrierForm.status}
                          onChange={(status) => setCarrierForm((current) => ({ ...current, status: status as InsuranceCarrierFormState["status"] }))}
                          options={insuranceStatusOptions.map((option) => ({ label: option, value: option }))}
                        />
                      )}
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-slate-500">Website</span>
                    <input
                      type="text"
                      value={carrierForm.website}
                      readOnly={isViewMode}
                      onChange={(event) => setCarrierForm((current) => ({ ...current, website: event.target.value }))}
                      className={fieldClass(Boolean(carrierErrors.website), isViewMode)}
                    />
                    {errorText(carrierErrors.website)}
                  </label>

                  <TelecomEditor
                    value={carrierForm.telecom}
                    onChange={(telecom) => setCarrierForm((current) => ({ ...current, telecom }))}
                    readOnly={isViewMode}
                    errors={carrierErrors}
                    errorKey="telecom"
                  />
                  <AddressEditor
                    value={carrierForm.address}
                    onChange={(address) => setCarrierForm((current) => ({ ...current, address }))}
                    readOnly={isViewMode}
                    errors={carrierErrors}
                    errorKey="address"
                  />
                  <ContactEditor
                    value={carrierForm.contacts}
                    onChange={(contacts) => setCarrierForm((current) => ({ ...current, contacts }))}
                    readOnly={isViewMode}
                    errors={carrierErrors}
                  />
                  <PlanEditor
                    value={carrierForm.plans}
                    onChange={(plans) => setCarrierForm((current) => ({ ...current, plans }))}
                    readOnly={isViewMode}
                    allowMultiple
                    errors={carrierErrors}
                  />
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-slate-500">Notes</span>
                    <textarea
                      value={carrierForm.notes}
                      readOnly={isViewMode}
                      onChange={(event) => setCarrierForm((current) => ({ ...current, notes: event.target.value }))}
                      className={fieldClass(false, isViewMode)}
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-slate-500">Carrier</span>
                    {isViewMode ? (
                      <input
                        type="text"
                        value={
                          selectedPlan
                            ? `${selectedPlan.carrierName} (${selectedPlan.carrierCode})`
                            : carrierOptions.find((carrier) => carrier.id === planForm.carrierId)
                              ? `${carrierOptions.find((carrier) => carrier.id === planForm.carrierId)?.carrierName} (${carrierOptions.find((carrier) => carrier.id === planForm.carrierId)?.carrierCode})`
                              : ""
                        }
                        readOnly
                        className={fieldClass(false, true)}
                      />
                    ) : (
                      <div>
                        <Select
                          value={planForm.carrierId}
                          onChange={(carrierId) => setPlanForm((current) => ({ ...current, carrierId }))}
                          options={carrierOptions.map((carrier) => ({
                            label: `${carrier.carrierName} (${carrier.carrierCode})`,
                            value: carrier.id,
                          }))}
                          placeholder="Select carrier"
                        />
                        {errorText(planErrors.carrierId)}
                      </div>
                    )}
                  </label>
                  <PlanEditor
                    value={planForm.plans}
                    onChange={(plans) => setPlanForm((current) => ({ ...current, plans }))}
                    readOnly={isViewMode}
                    allowMultiple={modalMode === "create"}
                    errors={planErrors}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#f0ece6] px-6 py-4">
              <button
                type="button"
                onClick={resetModal}
                disabled={saving}
                className="rounded-xl border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                {isViewMode ? "Close" : "Cancel"}
              </button>
              {isViewMode && modalEntity !== "selector" ? (
                <button
                  type="button"
                  onClick={() =>
                    modalEntity === "carrier"
                      ? openCarrierModal("edit", selectedCarrier || undefined)
                      : openPlanModal("edit", selectedPlan || undefined)
                  }
                  className="rounded-xl border border-[#4f63ea] px-4 py-2 text-[13px] font-medium text-[#4f63ea] hover:bg-[#f4f6ff]"
                >
                  Edit
                </button>
              ) : null}
              {!isViewMode && modalEntity !== "selector" && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={modalEntity === "carrier" ? handleCarrierSubmit : handlePlanSubmit}
                  className="rounded-xl bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-100"
                >
                  {saving ? "Saving..." : modalMode === "create" ? "Create" : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === "carrier" ? "Delete carrier?" : "Delete plan?"}
        message={
          deleteTarget?.type === "carrier"
            ? `Delete ${deleteTarget.carrier.carrierName} and all related plans?`
            : `Delete ${deleteTarget?.plan.planName}?`
        }
        confirmLabel="Delete"
        type="danger"
        isConfirming={deleting}
      />
    </AppLayout>
  );
}

export default InsuranceListPage;
