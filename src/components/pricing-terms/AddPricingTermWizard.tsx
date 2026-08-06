import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  PRICING_MODEL_OPTIONS,
  calcMarginPreview,
  emptyConfig,
  createPricingTerm,
  updatePricingTerm,
  getPricingTerms,
  type CptCodeRow,
  type HybridComponent,
  type PricingConfigShape,
  type VendorPricingShape,
} from "../../services/operations/pricingEngine";
import type {
  AgreementServiceTerm,
  PricingModel,
} from "../../services/operations/agreements";
import type { Service } from "../services/types";
import { RateFormFields } from "./RateFormFields";

const STEPS = [
  "Service",
  "Model",
  "Rates",
  "Vendor",
  "Margin",
  "Approval",
  "Finalize",
];

// ✅ NEW: Helper to check if pricing model is percentage-based
function isPercentageBasedModel(model: PricingModel): boolean {
  return [
    "PERCENT_COLLECTIONS",
    "PERCENT_REVENUE",
    "PERCENT_PROFIT",
    "SUCCESS_FEE",
  ].includes(model);
}

type FieldErrors = {
  service?: string;
  model?: string;
  amount?: string;
  percentage?: string;
  unitRate?: string;
  cptCodes?: string;
  components?: string;
  vendor?: string;
  vendorAmount?: string;
  vendorPercentage?: string;
  vendorUnitRate?: string;
  vendorMinimumFee?: string;
  vendorMaximumFee?: string;
  vendorCptCodes?: string;
  vendorComponents?: string;
  approvalNotes?: string;
  signerEmails?: string;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  minimumFee?: string;
  maximumFee?: string;
  collectionSource?: string;
};

function toFixedDisplay(value: number) {
  return value.toFixed(2);
}

function parseAmount(value?: string | null): number | null {
  if (!value || value.toString().trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isNonNegative(value?: string | null) {
  const num = parseAmount(value);
  return num !== null && num >= 0;
}

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMirroredVendorPricing(
  model: PricingModel,
  cfg: PricingConfigShape,
  existing?: VendorPricingShape | null,
): VendorPricingShape {
  const vendorPricing: VendorPricingShape = {
    pricingModel: model,
    collectionSource:
      existing?.collectionSource ?? cfg.collectionSource ?? "PM System",
  };

  if (
    [
      "FIXED_MONTHLY",
      "RETAINER",
      "FIXED_ONE_TIME",
      "TIERED_VOLUME",
      "CUSTOM_ATTACHMENT_DEFINED",
    ].includes(model)
  ) {
    vendorPricing.amount = existing?.amount ?? "0";
    return vendorPricing;
  }

  if (
    ["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model)
  ) {
    vendorPricing.percentage = existing?.percentage ?? "0";
    vendorPricing.minimumFee = existing?.minimumFee ?? "0";
    vendorPricing.maximumFee = existing?.maximumFee ?? "0";
    return vendorPricing;
  }

  if (
    [
      "PER_ENCOUNTER",
      "PER_PATIENT",
      "PER_PROVIDER",
      "PER_SITE",
      "PER_UNIT",
    ].includes(model)
  ) {
    vendorPricing.unitRate = existing?.unitRate ?? "0";
    vendorPricing.minimumFee = existing?.minimumFee ?? "0";
    return vendorPricing;
  }

  if (model === "PER_CPT_CODE") {
    const sourceRows = cfg.cptCodes ?? [];
    vendorPricing.cptCodes = sourceRows.map((row, index) => ({
      code: row.code,
      description: row.description,
      rate: existing?.cptCodes?.[index]?.rate ?? "0",
    }));
    return vendorPricing;
  }

  if (model === "HYBRID") {
    const sourceRows = cfg.components ?? [];
    vendorPricing.components = sourceRows.map((component, index) => ({
      type: component.type,
      value: existing?.components?.[index]?.value ?? "0",
    }));
    return vendorPricing;
  }

  vendorPricing.amount = existing?.amount ?? "0";
  return vendorPricing;
}

function getPricingAmount(
  model: PricingModel,
  config?: Partial<PricingConfigShape> | VendorPricingShape | null,
): number | null {
  if (!config) return null;

  if (["FIXED_MONTHLY", "RETAINER", "FIXED_ONE_TIME"].includes(model)) {
    return parseAmount(config.amount);
  }

  if (
    ["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model)
  ) {
    return parseAmount(config.percentage);
  }

  if (
    [
      "PER_ENCOUNTER",
      "PER_PATIENT",
      "PER_PROVIDER",
      "PER_SITE",
      "PER_UNIT",
    ].includes(model)
  ) {
    return parseAmount(config.unitRate);
  }

  if (model === "PER_CPT_CODE") {
    return (config.cptCodes ?? []).reduce(
      (sum, row) => sum + (parseAmount(row.rate) ?? 0),
      0,
    );
  }

  if (model === "HYBRID") {
    return (config.components ?? []).reduce(
      (sum, comp) => sum + (parseAmount(comp.value) ?? 0),
      0,
    );
  }

  return parseAmount(config.amount);
}

function parseEmailList(value: string) {
  return value
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type PreviewDetailCard = {
  label: string;
  clientValue: string;
  vendorValue: string;
  marginValue: string;
  marginPct?: number;
};

type ApprovalBasis = {
  label: string;
  preview: ReturnType<typeof calcMarginPreview>;
};

// ✅ UPDATED: Format based on pricing model
function formatDisplayValue(
  label: string,
  value: number | null,
  isPercent = false,
) {
  const numeric = value ?? 0;
  if (isPercent) return `${numeric.toFixed(2)}%`;
  return `$${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ✅ NEW: Format value based on pricing model context
function formatModelValue(model: PricingModel, value: number | null): string {
  const numeric = value ?? 0;
  if (isPercentageBasedModel(model)) {
    return `${numeric.toFixed(2)}%`;
  }
  return `$${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Props = {
  agreementId: string;
  agreementVersionId: string;
  services: Service[];
  vendors: { id: string; name: string }[];
  editingTerm: AgreementServiceTerm | null;
  defaultSignerEmail?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-red-600">
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export default function AddPricingTermWizard({
  agreementId,
  agreementVersionId,
  services,
  vendors,
  editingTerm,
  defaultSignerEmail,
  onClose,
  onSaved,
}: Props) {
  const editingConfig = editingTerm?.pricingConfig as
    | PricingConfigShape
    | undefined;
  const [step, setStep] = useState(0);
  const [serviceId, setSvc] = useState(editingTerm?.serviceId ?? "");
  const [model, setModelState] = useState<PricingModel>(
    editingTerm?.pricingModel ?? "FIXED_MONTHLY",
  );
  const [cfg, setCfg] = useState<PricingConfigShape>(
    editingTerm
      ? (editingTerm.pricingConfig as PricingConfigShape)
      : emptyConfig(),
  );
  const [vendorCfg, setVendorCfg] = useState<VendorPricingShape>(
    buildMirroredVendorPricing(
      editingTerm?.pricingModel ?? "FIXED_MONTHLY",
      editingConfig ?? emptyConfig(),
      editingConfig?.vendorPricing,
    ),
  );
  const [approvalNotes, setApprovalNotes] = useState("");
  const [signerEmail, setEmail] = useState(
    editingConfig?.signerEmails?.join(", ") ??
      editingTerm?.externalReference ??
      defaultSignerEmail ??
      "",
  );
  const [saving, setSaving] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const selectedService = services.find((service) => service.id === serviceId) ?? null;
  const serviceVendor = selectedService?.vendor ?? null;
  const serviceVendorId = selectedService?.vendorId ?? null;
  const resolvedVendorId = editingTerm?.vendorId ?? serviceVendorId ?? null;
  const resolvedVendorName =
    editingTerm?.vendor?.name ??
    serviceVendor?.name ??
    vendors.find((vendor) => vendor.id === resolvedVendorId)?.name ??
    null;
  const hasVendor = Boolean(resolvedVendorId);

  const setModel = (nextModel: PricingModel) => {
    setModelState(nextModel);
    setCfg(emptyConfig());
    setApprovalNotes("");
    setVendorCfg(buildMirroredVendorPricing(nextModel, emptyConfig(), null));
    setFieldErrors({});
  };

  useEffect(() => {
    if (!hasVendor) {
      setVendorCfg(buildMirroredVendorPricing(model, cfg, null));
    }
  }, [hasVendor, model, cfg]);

  useEffect(() => {
    setVendorCfg((current) => buildMirroredVendorPricing(model, cfg, current));
  }, [model, cfg]);

  useEffect(() => {
    if (editingTerm) return;
    setEmail((current) => current.trim() || (defaultSignerEmail ?? ""));
  }, [defaultSignerEmail, editingTerm]);

  const upd = (p: Partial<PricingConfigShape>) => {
    setCfg((prev) => ({ ...prev, ...p }));
    const keys = Object.keys(p);
    setFieldErrors((prev) => {
      const next = { ...prev };
      keys.forEach((key) => {
        if (key in next) delete next[key as keyof FieldErrors];
      });
      return next;
    });
  };

  const validateRates = (): { valid: boolean; errors: FieldErrors } => {
    const errors: FieldErrors = {};

    if (!cfg.effectiveStartDate) {
      errors.effectiveStartDate = "Effective start date is required";
    }

    if (!cfg.effectiveEndDate) {
      errors.effectiveEndDate = "Effective end date is required";
    }

    if (cfg.effectiveStartDate && cfg.effectiveEndDate) {
      const start = new Date(cfg.effectiveStartDate);
      const end = new Date(cfg.effectiveEndDate);
      if (start >= end) {
        errors.effectiveEndDate = "End date must be greater than start date";
      }
    }

    if (cfg.effectiveEndDate && cfg.effectiveEndDate < todayIso()) {
      errors.effectiveEndDate = "Effective end date must be today or later";
    }

    if (["FIXED_MONTHLY", "RETAINER", "FIXED_ONE_TIME"].includes(model)) {
      if (!isNonNegative(cfg.amount)) {
        errors.amount = "Amount is required and must be 0 or greater";
      }
    }

    if (
      ["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model)
    ) {
      if (!isNonNegative(cfg.percentage)) {
        errors.percentage = "Percentage is required and must be 0 or greater";
      }
    }

    if (
      [
        "PER_ENCOUNTER",
        "PER_PATIENT",
        "PER_PROVIDER",
        "PER_SITE",
        "PER_UNIT",
      ].includes(model)
    ) {
      if (!isNonNegative(cfg.unitRate)) {
        errors.unitRate = "Rate per unit is required and must be 0 or greater";
      }
    }

    if (model === "PER_CPT_CODE") {
      const codes = cfg.cptCodes ?? [];
      if (codes.length === 0) {
        errors.cptCodes = "At least one CPT code is required";
      } else {
        const invalidRow = codes.find(
          (row) => !row.code?.trim() || !isNonNegative(row.rate),
        );
        if (invalidRow) {
          errors.cptCodes =
            "Each CPT entry must include a code and a non-negative rate";
        }
      }
    }

    if (model === "HYBRID") {
      const comps = cfg.components ?? [];
      if (comps.length === 0) {
        errors.components = "At least one hybrid component is required";
      } else {
        const invalidComponent = comps.find(
          (comp) =>
            comp.value?.toString().trim() === "" || !isNonNegative(comp.value),
        );
        if (invalidComponent) {
          errors.components =
            "Each hybrid component must have a non-negative value";
        }
        const types = comps.map(c => c.type);
        const hasMonthlyMin = types.includes("Monthly Minimum");
        const hasFixedMonthly = types.includes("Fixed Monthly");
        if (hasMonthlyMin && hasFixedMonthly) {
          errors.components = "Cannot have both Monthly Minimum and Fixed Monthly components";
        }
        const hasDuplicates = types.some((t, idx) => types.indexOf(t) !== idx);
        if (hasDuplicates) {
          errors.components = "Duplicate component types are not allowed";
        }
      }
    }

    if (["TIERED_VOLUME", "CUSTOM_ATTACHMENT_DEFINED"].includes(model)) {
      if (!isNonNegative(cfg.amount)) {
        errors.amount = "Amount is required and must be 0 or greater";
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  const validateVendor = (): { valid: boolean; errors: FieldErrors } => {
    const errors: FieldErrors = {};

    if (!hasVendor) return { valid: true, errors };

    if (!resolvedVendorId) {
      errors.vendor = "Vendor is required when a subcontractor is selected";
    }

    if (["FIXED_MONTHLY", "RETAINER", "FIXED_ONE_TIME"].includes(model)) {
      if (!isNonNegative(vendorCfg.amount)) {
        errors.vendorAmount =
          "Vendor amount is required and must be 0 or greater";
      }
    }

    if (["TIERED_VOLUME", "CUSTOM_ATTACHMENT_DEFINED"].includes(model)) {
      if (!isNonNegative(vendorCfg.amount)) {
        errors.vendorAmount =
          "Vendor amount is required and must be 0 or greater";
      }
    }

    if (
      ["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model)
    ) {
      if (!isNonNegative(vendorCfg.percentage)) {
        errors.vendorPercentage =
          "Vendor percentage is required and must be 0 or greater";
      }
      if (!isNonNegative(vendorCfg.minimumFee)) {
        errors.vendorMinimumFee = "Vendor minimum fee must be 0 or greater";
      }
      if (!isNonNegative(vendorCfg.maximumFee)) {
        errors.vendorMaximumFee = "Vendor maximum fee must be 0 or greater";
      }
    }

    if (
      [
        "PER_ENCOUNTER",
        "PER_PATIENT",
        "PER_PROVIDER",
        "PER_SITE",
        "PER_UNIT",
      ].includes(model)
    ) {
      if (!isNonNegative(vendorCfg.unitRate)) {
        errors.vendorUnitRate =
          "Vendor unit rate is required and must be 0 or greater";
      }
      if (!isNonNegative(vendorCfg.minimumFee)) {
        errors.vendorMinimumFee = "Vendor minimum fee must be 0 or greater";
      }
    }

    if (model === "PER_CPT_CODE") {
      const vendorRows = vendorCfg.cptCodes ?? [];
      if (vendorRows.length === 0) {
        errors.vendorCptCodes = "Vendor CPT rows are required";
      } else {
        const invalidRow = vendorRows.find(
          (row) => !row.code?.trim() || !isNonNegative(row.rate),
        );
        if (invalidRow) {
          errors.vendorCptCodes =
            "Each vendor CPT row must include a code and a non-negative rate";
        }
      }
    }

    if (model === "HYBRID") {
      const vendorComponents = vendorCfg.components ?? [];
      if (vendorComponents.length === 0) {
        errors.vendorComponents = "Vendor components are required";
      } else {
        const invalidComponent = vendorComponents.find(
          (component) =>
            component.value?.toString().trim() === "" ||
            !isNonNegative(component.value),
        );
        if (invalidComponent) {
          errors.vendorComponents =
            "Each vendor component must have a non-negative value";
        }
        const types = vendorComponents.map(c => c.type);
        const hasMonthlyMin = types.includes("Monthly Minimum");
        const hasFixedMonthly = types.includes("Fixed Monthly");
        if (hasMonthlyMin && hasFixedMonthly) {
          errors.vendorComponents = "Cannot have both Monthly Minimum and Fixed Monthly components";
        }
        const hasDuplicates = types.some((t, idx) => types.indexOf(t) !== idx);
        if (hasDuplicates) {
          errors.vendorComponents = "Duplicate component types are not allowed";
        }
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  const validateSignerEmails = (): { valid: boolean; errors: FieldErrors } => {
    const errors: FieldErrors = {};
    const emails = parseEmailList(signerEmail);
    const invalidEmail = emails.find((email) => !isValidEmail(email));
    if (invalidEmail) {
      errors.signerEmails = `Invalid email format: ${invalidEmail}`;
    }
    return { valid: Object.keys(errors).length === 0, errors };
  };

  const validateAll = () => {
    const errors: FieldErrors = {};

    if (!serviceId) errors.service = "Service selection is required";
    if (!model) errors.model = "Pricing model is required";

    const ratesResult = validateRates();
    Object.assign(errors, ratesResult.errors);

    const vendorResult = validateVendor();
    Object.assign(errors, vendorResult.errors);

    const signerResult = validateSignerEmails();
    Object.assign(errors, signerResult.errors);

    return { valid: Object.keys(errors).length === 0, errors };
  };

  const clientAmount = getPricingAmount(model, cfg);
  const vendorAmount = hasVendor ? getPricingAmount(model, vendorCfg) : 0;
  const preview = calcMarginPreview(
    String(clientAmount ?? ""),
    String(vendorAmount ?? 0),
  );

  if (model === "HYBRID") {
    const comps = cfg.components ?? [];
    const vendorComps = vendorCfg.components ?? [];
    preview.requiresApproval = comps.some((c, idx) => {
      const clientVal = parseAmount(c.value) ?? 0;
      const vendorVal = hasVendor ? (parseAmount(vendorComps[idx]?.value) ?? 0) : 0;
      if (clientVal <= 0) {
        return vendorVal > 0;
      }
      const marginVal = clientVal - vendorVal;
      const marginPct = (marginVal / clientVal) * 100;
      return marginPct < 20;
    });
  }

  // ✅ Track if model is percentage-based
  const isPercentageBased = isPercentageBasedModel(model);

  const buildPreviewDetailCards = (): PreviewDetailCard[] => {
    if (
      ["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model)
    ) {
      const rows = [
        {
          label: "Percentage",
          client: parseAmount(cfg.percentage),
          vendor: hasVendor ? parseAmount(vendorCfg.percentage) : 0,
          isPercent: true,
        },
        {
          label: "Minimum Fee",
          client: parseAmount(cfg.minimumFee),
          vendor: hasVendor ? parseAmount(vendorCfg.minimumFee) : 0,
          isPercent: false,
        },
        {
          label: "Maximum Fee",
          client: parseAmount(cfg.maximumFee),
          vendor: hasVendor ? parseAmount(vendorCfg.maximumFee) : 0,
          isPercent: false,
        },
      ];

      return rows.map((row) => {
        const clientValue = row.client ?? 0;
        const vendorValue = row.vendor ?? 0;
        const marginValue = clientValue - vendorValue;
        const marginPct =
          clientValue > 0
            ? Number(((marginValue / clientValue) * 100).toFixed(2))
            : undefined;
        return {
          label: row.label,
          clientValue: formatDisplayValue(
            row.label,
            clientValue,
            row.isPercent,
          ),
          vendorValue: formatDisplayValue(
            row.label,
            vendorValue,
            row.isPercent,
          ),
          marginValue: formatDisplayValue(
            row.label,
            marginValue,
            row.isPercent,
          ),
          marginPct,
        };
      });
    }

    if (
      [
        "PER_ENCOUNTER",
        "PER_PATIENT",
        "PER_PROVIDER",
        "PER_SITE",
        "PER_UNIT",
      ].includes(model)
    ) {
      const rows = [
        {
          label: "Rate per Unit",
          client: parseAmount(cfg.unitRate),
          vendor: hasVendor ? parseAmount(vendorCfg.unitRate) : 0,
        },
        {
          label: "Minimum Fee",
          client: parseAmount(cfg.minimumFee),
          vendor: hasVendor ? parseAmount(vendorCfg.minimumFee) : 0,
        },
      ];

      return rows.map((row) => {
        const clientValue = row.client ?? 0;
        const vendorValue = row.vendor ?? 0;
        const marginValue = clientValue - vendorValue;
        const marginPct =
          clientValue > 0
            ? Number(((marginValue / clientValue) * 100).toFixed(2))
            : undefined;
        return {
          label: row.label,
          clientValue: formatDisplayValue(row.label, clientValue),
          vendorValue: formatDisplayValue(row.label, vendorValue),
          marginValue: formatDisplayValue(row.label, marginValue),
          marginPct,
        };
      });
    }

    if (model === "PER_CPT_CODE") {
      return (cfg.cptCodes ?? []).map((row, index) => {
        const clientValue = parseAmount(row.rate) ?? 0;
        const vendorValue = hasVendor
          ? (parseAmount(vendorCfg.cptCodes?.[index]?.rate) ?? 0)
          : 0;
        const marginValue = clientValue - vendorValue;
        const marginPct =
          clientValue > 0
            ? Number(((marginValue / clientValue) * 100).toFixed(2))
            : undefined;
        return {
          label: row.code?.trim() ? `CPT ${row.code}` : `CPT Row ${index + 1}`,
          clientValue: formatDisplayValue(row.code, clientValue),
          vendorValue: formatDisplayValue(row.code, vendorValue),
          marginValue: formatDisplayValue(row.code, marginValue),
          marginPct,
        };
      });
    }

    if (model === "HYBRID") {
      return (cfg.components ?? []).map((component, index) => {
        const clientValue = parseAmount(component.value) ?? 0;
        const vendorValue = hasVendor
          ? (parseAmount(vendorCfg.components?.[index]?.value) ?? 0)
          : 0;
        const marginValue = clientValue - vendorValue;
        const marginPct =
          clientValue > 0
            ? Number(((marginValue / clientValue) * 100).toFixed(2))
            : undefined;
        return {
          label: component.type || `Component ${index + 1}`,
          clientValue: formatDisplayValue(component.type, clientValue),
          vendorValue: formatDisplayValue(component.type, vendorValue),
          marginValue: formatDisplayValue(component.type, marginValue),
          marginPct,
        };
      });
    }

    return [];
  };

  const previewDetailCards = buildPreviewDetailCards();
  const showDetailedPreview = previewDetailCards.length > 0;

  const getApprovalBasis = (): ApprovalBasis => {
    if (
      ["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model)
    ) {
      const client = parseAmount(cfg.percentage) ?? 0;
      const vendor = hasVendor ? (parseAmount(vendorCfg.percentage) ?? 0) : 0;
      return {
        label: "Percentage",
        preview: calcMarginPreview(String(client), String(vendor)),
      };
    }

    if (
      [
        "PER_ENCOUNTER",
        "PER_PATIENT",
        "PER_PROVIDER",
        "PER_SITE",
        "PER_UNIT",
      ].includes(model)
    ) {
      const client = parseAmount(cfg.unitRate) ?? 0;
      const vendor = hasVendor ? (parseAmount(vendorCfg.unitRate) ?? 0) : 0;
      return {
        label: "Rate per Unit",
        preview: calcMarginPreview(String(client), String(vendor)),
      };
    }

    if (model === "PER_CPT_CODE") {
      const client = (cfg.cptCodes ?? []).reduce(
        (sum, row) => sum + (parseAmount(row.rate) ?? 0),
        0,
      );
      const vendor = hasVendor
        ? (vendorCfg.cptCodes ?? []).reduce(
            (sum, row) => sum + (parseAmount(row.rate) ?? 0),
            0,
          )
        : 0;
      return {
        label: "CPT Rates",
        preview: calcMarginPreview(String(client), String(vendor)),
      };
    }

    if (model === "HYBRID") {
      const client = (cfg.components ?? []).reduce(
        (sum, component) => sum + (parseAmount(component.value) ?? 0),
        0,
      );
      const vendor = hasVendor
        ? (vendorCfg.components ?? []).reduce(
            (sum, component) => sum + (parseAmount(component.value) ?? 0),
            0,
          )
        : 0;
      const p = calcMarginPreview(String(client), String(vendor));
      const comps = cfg.components ?? [];
      const vendorComps = vendorCfg.components ?? [];
      p.requiresApproval = comps.some((c, idx) => {
        const clientVal = parseAmount(c.value) ?? 0;
        const vendorVal = hasVendor ? (parseAmount(vendorComps[idx]?.value) ?? 0) : 0;
        if (clientVal <= 0) {
          return vendorVal > 0;
        }
        const marginVal = clientVal - vendorVal;
        const marginPct = (marginVal / clientVal) * 100;
        return marginPct < 20;
      });
      return {
        label: "Hybrid Components",
        preview: p,
      };
    }

    return {
      label: "Overall",
      preview,
    };
  };

  const approvalBasis = getApprovalBasis();
  const approvalPreview = approvalBasis.preview;

  const buildPricingConfigPayload = () => {
    const nextConfig: PricingConfigShape & Record<string, unknown> = {
      ...cfg,
      approvalNotes,
      signerEmails: parseEmailList(signerEmail),
    };

    if (
      ["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model)
    ) {
      nextConfig.ratePercent = cfg.percentage ?? "";
    }

    if (
      [
        "PER_ENCOUNTER",
        "PER_PATIENT",
        "PER_PROVIDER",
        "PER_SITE",
        "PER_UNIT",
      ].includes(model)
    ) {
      nextConfig.rate = cfg.unitRate ?? "";
    }

    if (hasVendor) {
      nextConfig.vendorPricing = { ...vendorCfg, pricingModel: model };
    } else {
      delete nextConfig.vendorPricing;
    }

    return nextConfig;
  };

  const canNext =
    !saving &&
    !(step === 5 && preview.requiresApproval && approvalNotes.trim() === "");

  const handleNext = () => {
    setStepError(null);
    setFieldErrors({});

    if (step === 0) {
      if (!serviceId) {
        setFieldErrors({ service: "Service selection is required" });
        setStepError("Please select a service before continuing");
        return;
      }
    }

    if (step === 1) {
      if (!model) {
        setFieldErrors({ model: "Pricing model is required" });
        setStepError("Please select a pricing model before continuing");
        return;
      }
    }

    if (step === 2) {
      const result = validateRates();
      if (!result.valid) {
        setFieldErrors(result.errors);
        setStepError("Please fix the validation errors before continuing" + `${Object.keys(result.errors).length > 0 ? ": " + Object.values(result.errors).join("; ") : ""}`);
        return;
      }
    }

    if (step === 3) {
      const result = validateVendor();
      if (!result.valid) {
        setFieldErrors(result.errors);
        setStepError("Please fix the validation errors before continuing" + `${Object.keys(result.errors).length > 0 ? ": " + Object.values(result.errors).join("; ") : ""}`);
        return;
      }
    }

    if (step === 5 && preview.requiresApproval && approvalNotes.trim() === "") {
      setFieldErrors({
        approvalNotes: "Justification / Approval notes are required when margin is below 20%",
      });
      setStepError(
        "Justification / Approval Notes are required before continuing",
      );
      return;
    }

    if (step === 6) {
      const result = validateSignerEmails();
      if (!result.valid) {
        setFieldErrors(result.errors);
        setStepError("Please fix the email validation errors");
        return;
      }
    }

    setStep((current) => current + 1);
  };

  async function submit() {
    setSaving(true);
    const validation = validateAll();
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setStepError("Please fix all validation errors before saving");
      setStep(0);
      return;
    }

    if (!agreementId || !agreementVersionId || !serviceId || !model) {
      toast.error("Agreement, version, service and model are required");
      return;
    }

    if (preview.requiresApproval && approvalNotes.trim() === "") {
      setFieldErrors({ approvalNotes: "Justification / Approval notes are required" });
      setStepError(
        "Justification / Approval Notes are required when approval is triggered",
      );
      setStep(5);
      return;
    }

    try {
      const existing = await getPricingTerms({
        agreementId,
        agreementVersionId,
        serviceId,
      });
      const startA = cfg.effectiveStartDate
        ? new Date(cfg.effectiveStartDate)
        : null;
      const endA = cfg.effectiveEndDate ? new Date(cfg.effectiveEndDate) : null;
      const conflicts = (existing.terms || []).filter((t) => {
        if (editingTerm && t.id === editingTerm.id) return false;
        if (!t.isActive) return false;
        if (t.pricingModel !== model) return false;
        const tVendor = t.vendorId ?? null;
        if ((tVendor ?? null) !== (resolvedVendorId ?? null)) return false;
        const s = t.effectiveDate ? new Date(t.effectiveDate) : null;
        const e = t.endDate ? new Date(t.endDate) : null;
        const overlap = (
          aStart: Date | null,
          aEnd: Date | null,
          bStart: Date | null,
          bEnd: Date | null,
        ) => {
          if (!aStart && !aEnd) return true;
          if (!bStart && !bEnd) return true;
          const as = aStart ? aStart.getTime() : -Infinity;
          const ae = aEnd ? aEnd.getTime() : Infinity;
          const bs = bStart ? bStart.getTime() : -Infinity;
          const be = bEnd ? bEnd.getTime() : Infinity;
          return !(ae < bs || be < as);
        };
        return overlap(startA, endA, s, e);
      });
      if (conflicts.length > 0) {
        setStepError(
          "An active pricing term with overlapping effective dates already exists for this Agreement+Service+Vendor+Model",
        );
        return;
      }
    } catch (err) {
      console.warn("Warning: unable to validate overlapping terms", err);
    }

    
    try {
      const payload = {
        agreementId,
        agreementVersionId,
        serviceId,
        pricingModel: model,
        pricingConfig: buildPricingConfigPayload() as Record<string, unknown>,
        vendorId: hasVendor ? resolvedVendorId : null,
        minimumFee: hasVendor ? (vendorAmount ?? 0) : null,
        effectiveDate: cfg.effectiveStartDate || undefined,
        endDate: cfg.effectiveEndDate || undefined,
        externalReference: parseEmailList(signerEmail).join(", ") || undefined,
        currency: "USD",
        isActive: true,
      };
      if (editingTerm) {
        await updatePricingTerm(editingTerm.id, payload);
        toast.success("Updated");
      } else {
        await createPricingTerm(payload);
        toast.success("Created");
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const svcName = services.find((s) => s.id === serviceId)?.name ?? "-";
  const modelLabel =
    PRICING_MODEL_OPTIONS.find((o) => o.value === model)?.label ?? model;
  const vendorFieldsReadOnly = false;

  const updateVendorCfg = (patch: Partial<VendorPricingShape>) => {
    setVendorCfg((prev) => ({ ...prev, ...patch }));
    const keys = Object.keys(patch);
    setFieldErrors((prev) => {
      const next = { ...prev };
      keys.forEach((key) => {
        const vendorKey =
          `vendor${key.charAt(0).toUpperCase()}${key.slice(1)}` as keyof FieldErrors;
        if (vendorKey in next) delete next[vendorKey];
      });
      return next;
    });
  };

  const renderVendorTable = (rows: CptCodeRow[]) => (
    <div className="overflow-hidden rounded-xl border border-[#f0ece6]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[#f0ece6] bg-white">
            <th className="px-3 py-2 text-left font-medium text-slate-500">
              Code
            </th>
            <th className="px-3 py-2 text-left font-medium text-slate-500">
              Description
            </th>
            <th className="px-3 py-2 text-right font-medium text-slate-500">
              Vendor Rate
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.code}-${index}`}
              className="border-b border-[#f0ece6] last:border-b-0"
            >
              <td className="px-3 py-2 text-slate-700">{row.code || "-"}</td>
              <td className="px-3 py-2 text-slate-500">
                {row.description || "-"}
              </td>
              <td className="px-3 py-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  readOnly={vendorFieldsReadOnly}
                  value={row.rate}
                  onChange={(e) => {
                    const next = [...(vendorCfg.cptCodes ?? [])];
                    next[index] = { ...next[index], rate: e.target.value };
                    updateVendorCfg({ cptCodes: next });
                  }}
                  className={`app-control w-full rounded-md px-3 py-2 text-right text-[13px] ${
                    fieldErrors.vendorCptCodes
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <FieldError message={fieldErrors.vendorCptCodes} />
    </div>
  );

  const renderVendorComponents = (rows: HybridComponent[]) => (
    <div className="space-y-2">
      {rows.map((component, index) => (
        <div
          key={`${component.type}-${index}`}
          className="grid grid-cols-[1fr_140px] gap-3"
        >
          <div className="rounded-md border border-[#ece8e1] bg-white px-3 py-2 text-[13px] text-slate-700">
            {component.type}
          </div>
          <input
            type="number"
            min="0"
            step="any"
            readOnly={vendorFieldsReadOnly}
            value={component.value}
            onChange={(e) => {
              const next = [...(vendorCfg.components ?? [])];
              next[index] = { ...next[index], value: e.target.value };
              updateVendorCfg({ components: next });
            }}
            className={`app-control w-full rounded-md px-3 py-2 text-[13px] ${
              fieldErrors.vendorComponents
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : ""
            }`}
          />
        </div>
      ))}
      <FieldError message={fieldErrors.vendorComponents} />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-2xl"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0ece6] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-800">
              {editingTerm ? "Edit Pricing Term" : "Add Pricing Term"}
            </h2>
            <p className="text-[12px] text-slate-400 mt-0.5">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step pills */}
        <div className="flex gap-1.5 border-b border-[#f0ece6] px-6 py-2.5 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => i < step && setStep(i)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                i === step
                  ? "bg-[#4f63ea] text-white"
                  : i < step
                    ? "cursor-pointer bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {i + 1}. {s}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-5 space-y-4 text-[13px]">
          {stepError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{stepError}</span>
            </div>
          ) : null}

          {/* Step 0 — Service */}
          {step === 0 && (
            <div className="space-y-3">
              <h3 className="text-[15px] font-semibold text-slate-700">
                Select Service <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {services.map((svc) => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => {
                      setSvc(svc.id);
                      setFieldErrors((prev) => ({
                        ...prev,
                        service: undefined,
                      }));
                    }}
                    className={`rounded-xl border px-4 py-3 text-left text-[13px] font-medium transition-all ${
                      serviceId === svc.id
                        ? "border-[#4f63ea] bg-[#f0f2fe] text-[#4f63ea]"
                        : fieldErrors.service
                          ? "border-red-300"
                          : "border-[#f0ece6] text-slate-700 hover:border-[#c7cdf5] hover:bg-[#f7f8fe]"
                    }`}
                  >
                    {svc.name}
                  </button>
                ))}
              </div>
              <FieldError message={fieldErrors.service} />
            </div>
          )}

          {/* Step 1 — Model */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-slate-700">
                Select Pricing Model <span className="text-red-500">*</span>
              </h3>
              {["Flat", "Variable", "Per Unit", "Advanced"].map((group) => (
                <div key={group}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    {group}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {PRICING_MODEL_OPTIONS.filter((o) => o.group === group).map(
                      (opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setModel(opt.value);
                            setFieldErrors((prev) => ({
                              ...prev,
                              model: undefined,
                            }));
                          }}
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13px] transition-all ${
                            model === opt.value
                              ? "border-[#4f63ea] bg-[#f0f2fe] text-[#4f63ea] font-medium"
                              : "border-[#f0ece6] text-slate-600 hover:border-[#c7cdf5]"
                          }`}
                        >
                          <span
                            className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${model === opt.value ? "border-[#4f63ea] bg-[#4f63ea]" : "border-slate-300"}`}
                          />
                          {opt.label}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              ))}
              <FieldError message={fieldErrors.model} />
            </div>
          )}

          {/* Step 2 — Rates (uses external component — no focus loss) */}
          {step === 2 && <RateFormFields model={model} cfg={cfg} upd={upd} />}

          {/* Step 3 — Vendor */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-slate-700">
                Vendor Pricing
              </h3>
              {hasVendor ? (
                <div className="space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-4">
                  {resolvedVendorName ? (
                    <div className="rounded-xl border border-dashed border-[#d7d2cb] bg-white p-4">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        Vendor
                      </p>
                      <p className="mt-1 text-[14px] font-medium text-slate-700">
                        {resolvedVendorName}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-semibold">Vendor not available</p>
                        <p className="text-[12px] mt-0.5">
                          No service-linked vendor was found. Add the vendor in
                          Services before using vendor pricing here.
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl border border-dashed border-[#d7d2cb] bg-white p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-700">
                          Vendor rates follow the selected pricing model
                        </p>
                        <p className="text-[12px] text-slate-400">
                          Default values start at 0. Existing vendor values stay
                          read-only.
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                        {modelLabel}
                      </div>
                    </div>

                    {[
                      "FIXED_MONTHLY",
                      "RETAINER",
                      "FIXED_ONE_TIME",
                      "TIERED_VOLUME",
                      "CUSTOM_ATTACHMENT_DEFINED",
                    ].includes(
                      model,
                    ) && (
                      <div>
                        <label className="mb-1 block font-medium text-slate-700">
                          Vendor Amount (USD) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          readOnly={vendorFieldsReadOnly}
                          value={vendorCfg.amount ?? "0"}
                          onChange={(e) =>
                            updateVendorCfg({ amount: e.target.value })
                          }
                          className={`app-control w-full rounded-md px-3 py-2 text-[13px] ${
                            fieldErrors.vendorAmount
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                              : ""
                          }`}
                        />
                        <FieldError message={fieldErrors.vendorAmount} />
                      </div>
                    )}

                    {[
                      "PERCENT_COLLECTIONS",
                      "PERCENT_REVENUE",
                      "SUCCESS_FEE",
                    ].includes(model) && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">
                            Vendor % <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            readOnly={vendorFieldsReadOnly}
                            value={vendorCfg.percentage ?? "0"}
                            onChange={(e) =>
                              updateVendorCfg({ percentage: e.target.value })
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">
                            Vendor Min Fee
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            readOnly={vendorFieldsReadOnly}
                            value={vendorCfg.minimumFee ?? "0"}
                            onChange={(e) =>
                              updateVendorCfg({ minimumFee: e.target.value })
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">
                            Vendor Max Fee
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            readOnly={vendorFieldsReadOnly}
                            value={vendorCfg.maximumFee ?? "0"}
                            onChange={(e) =>
                              updateVendorCfg({ maximumFee: e.target.value })
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </div>
                      </div>
                    )}

                    {[
                      "PER_ENCOUNTER",
                      "PER_PATIENT",
                      "PER_PROVIDER",
                      "PER_SITE",
                      "PER_UNIT",
                    ].includes(model) && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">
                            Vendor Rate per Unit <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            readOnly={vendorFieldsReadOnly}
                            value={vendorCfg.unitRate ?? "0"}
                            onChange={(e) =>
                              updateVendorCfg({ unitRate: e.target.value })
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">
                            Vendor Minimum Fee
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            readOnly={vendorFieldsReadOnly}
                            value={vendorCfg.minimumFee ?? "0"}
                            onChange={(e) =>
                              updateVendorCfg({ minimumFee: e.target.value })
                            }
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </div>
                      </div>
                    )}

                    {model === "PER_CPT_CODE" &&
                      renderVendorTable(vendorCfg.cptCodes ?? [])}
                    {model === "HYBRID" &&
                      renderVendorComponents(vendorCfg.components ?? [])}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Vendor not available</p>
                    <p className="text-[12px] mt-0.5">
                      No vendor is linked to this service. Add the vendor in
                      Services, then return here to enter vendor pricing.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Margin */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-slate-700">
                Margin Preview
              </h3>
              {showDetailedPreview ? (
                <div
                  className={`grid gap-3 ${previewDetailCards.length >= 3 ? "grid-cols-3" : "grid-cols-2"}`}
                >
                  {previewDetailCards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-4"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        {card.label}
                      </p>
                      <div className="mt-3 space-y-2 text-[13px]">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-400">Rate</span>
                          <span className="font-semibold text-[#4f63ea]">
                            {card.clientValue}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-slate-400">Vendor</span>
                          <span className="font-semibold text-red-500">
                            {card.vendorValue}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-[#ece8e1] pt-2">
                          <span className="text-slate-500">Margin</span>
                          <span className="font-semibold text-emerald-600">
                            {card.marginValue}
                            {card.marginPct !== undefined
                              ? ` (${toFixedDisplay(card.marginPct)}%)`
                              : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {/* ✅ UPDATED: Use percentage-aware formatting */}
                  {(
                    [
                      [
                        isPercentageBased
                          ? "Est. Client Rate"
                          : "Est. Client Revenue",
                        formatModelValue(model, preview.clientRevenue),
                        "text-[#4f63ea]",
                      ],
                      [
                        isPercentageBased
                          ? "Est. Vendor Rate"
                          : "Est. Vendor Cost",
                        formatModelValue(model, preview.vendorCost),
                        "text-red-500",
                      ],
                      [
                        "Est. Gross Margin",
                        formatModelValue(model, preview.grossMargin),
                        "text-emerald-600",
                      ],
                      [
                        "Margin %",
                        `${toFixedDisplay(preview.marginPct)}%`,
                        preview.marginPct < 20
                          ? "text-amber-600"
                          : "text-emerald-600",
                      ],
                    ] as const
                  ).map(([k, v, color]) => (
                    <div
                      key={k}
                      className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-4"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        {k}
                      </p>
                      <p className={`mt-1 text-[22px] font-bold ${color}`}>
                        {v}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              {approvalPreview.requiresApproval && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      Low Margin — Approval Required
                    </p>
                    <p className="text-[12px] mt-0.5">
                      {model === "HYBRID"
                        ? "One or more hybrid components has a margin below the 20% threshold. Proceed to step 6 to add justification / approval notes."
                        : `${approvalBasis.label} margin ${toFixedDisplay(approvalPreview.marginPct)}% is below the 20% threshold. Proceed to step 6 to add justification / approval notes.`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5 — Internal Approval */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-slate-700">Internal Approval</h3>
              {approvalPreview.requiresApproval ? (
                <>
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">⚠ Approval Required</p>
                      <p className="text-[12px] mt-0.5">
                        {model === "HYBRID"
                          ? "One or more hybrid components has a margin below the minimum 20% threshold. Please request manager approval before finalizing."
                          : `${approvalBasis.label} margin is ${toFixedDisplay(approvalPreview.marginPct)}%, below the minimum 20% threshold. Please request manager approval before finalizing.`}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">Justification / Approval Notes</label>
                    <textarea rows={4} value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="Describe the business justification for this margin exception…"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px] resize-none" />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                  <div>
                    <p className="font-semibold">No Approval Needed</p>
                    <p className="text-[12px] mt-0.5">
                      {model === "HYBRID"
                        ? "All hybrid components margins meet the minimum threshold. You can proceed to finalize."
                        : `${approvalBasis.label} margin of ${toFixedDisplay(approvalPreview.marginPct)}% meets the minimum threshold. You can proceed to finalize.`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6 — Finalize */}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-slate-700">
                Finalize Rate Packet
              </h3>

              {/* Summary with percentage-aware formatting */}
              <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-4 space-y-2.5 text-[13px]">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Included Services
                </p>
                <div className="flex justify-between">
                  <span className="text-slate-400">Service</span>
                  <span className="font-medium text-slate-700">{svcName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pricing Model</span>
                  <span className="font-medium text-slate-700">{modelLabel}</span>
                </div>

                {model === "HYBRID" ? (
                  <div className="border-t border-[#f0ece6] pt-2.5 space-y-3">
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400">
                      Component Details
                    </p>
                    {(cfg.components ?? []).map((component, index) => {
                      const clientValue = parseAmount(component.value) ?? 0;
                      const vendorValue = hasVendor
                        ? (parseAmount(vendorCfg.components?.[index]?.value) ?? 0)
                        : 0;
                      const marginValue = clientValue - vendorValue;
                      const marginPct =
                        clientValue > 0
                          ? Number(((marginValue / clientValue) * 100).toFixed(2))
                          : 0;
                      
                      const isPercent = component.type === "% Collections";
                      const formatCompVal = (val: number) => {
                        if (isPercent) return `${val.toFixed(2)}%`;
                        return `$${val.toFixed(2)}`;
                      };

                      return (
                        <div key={index} className="rounded-lg border border-[#ece8e1] bg-white p-3 space-y-1.5 text-[13px]">
                          <div className="flex justify-between font-semibold text-slate-700">
                            <span>{component.type || `Component ${index + 1}`}</span>
                          </div>
                          <div className="flex justify-between text-slate-500 pl-2">
                            <span>Client Rate</span>
                            <span>{formatCompVal(clientValue)}</span>
                          </div>
                          {hasVendor && (
                            <>
                              <div className="flex justify-between text-slate-500 pl-2">
                                <span>Vendor Rate</span>
                                <span>{formatCompVal(vendorValue)}</span>
                              </div>
                              <div className="flex justify-between font-medium border-t border-dashed border-[#ece8e1] pt-1 pl-2">
                                <span className="text-slate-600">Gross Margin</span>
                                <span className={marginPct < 20 ? "text-amber-600" : "text-emerald-600"}>
                                  {formatCompVal(marginValue)} ({marginPct.toFixed(2)}%)
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {[
                      [
                        "Client Rate",
                        formatModelValue(model, preview.clientRevenue),
                      ],
                      ...(hasVendor
                        ? [
                            [
                              "Vendor",
                              resolvedVendorName ?? "Vendor not available",
                            ],
                            [
                              "Vendor Total",
                              formatModelValue(model, preview.vendorCost),
                            ],
                          ]
                        : []),
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-400">{k}</span>
                        <span className="font-medium text-slate-700">{v}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-[#f0ece6] pt-2.5">
                      <span className="font-semibold text-slate-700">
                        Pricing Summary — Gross Margin
                      </span>
                      <span
                        className={`font-bold text-[15px] ${preview.marginPct < 20 ? "text-amber-600" : "text-emerald-600"}`}
                      >
                        {formatModelValue(model, preview.grossMargin)} (
                        {toFixedDisplay(preview.marginPct)}%)
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Signer email */}
              <div>
                <label className="mb-1 block font-medium text-slate-700">
                  Signer Email{" "}
                  <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={signerEmail}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldErrors((prev) => ({
                      ...prev,
                      signerEmails: undefined,
                    }));
                  }}
                  placeholder="client@example.com, owner@example.com"
                  className={`app-control w-full rounded-md px-3 py-2 text-[13px] ${
                    fieldErrors.signerEmails
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : ""
                  }`}
                />
                <FieldError message={fieldErrors.signerEmails} />
                <p className="mt-1 text-[12px] text-slate-400">
                  Emails from the related people are auto-filled. Use
                  comma-separated emails for multiple signers.
                </p>
                {approvalPreview.requiresApproval && (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Approval required based on {model === "HYBRID" ? "individual component" : approvalBasis.label.toLowerCase()}{" "}
                    margin — ensure internal manager/admin sign-off to activate this term
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#f0ece6] px-6 py-4">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
            className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
          >
            {step === 0 ? "Cancel" : "← Back"}
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#4f63ea] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              {saving ? "Saving…" : "✓ Generate Packet"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
