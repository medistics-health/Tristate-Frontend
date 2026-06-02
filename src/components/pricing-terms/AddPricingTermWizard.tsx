import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  PRICING_MODEL_OPTIONS, calcMarginPreview, emptyConfig,
  createPricingTerm, updatePricingTerm, getPricingTerms,
  type CptCodeRow,
  type HybridComponent,
  type PricingConfigShape,
  type VendorPricingShape,
} from "../../services/operations/pricingEngine";
import type { AgreementServiceTerm, PricingModel } from "../../services/operations/agreements";
import { RateFormFields } from "./RateFormFields";
import Select from "../shared/Select";

const STEPS = ["Service","Model","Rates","Vendor","Margin","Approval","Finalize"];

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

function buildMirroredVendorPricing(
  model: PricingModel,
  cfg: PricingConfigShape,
  existing?: VendorPricingShape | null,
): VendorPricingShape {
  const vendorPricing: VendorPricingShape = {
    pricingModel: model,
    collectionSource: existing?.collectionSource ?? cfg.collectionSource ?? "PM System",
  };

  if (["FIXED_MONTHLY", "RETAINER", "FIXED_ONE_TIME"].includes(model)) {
    vendorPricing.amount = existing?.amount ?? "0";
    return vendorPricing;
  }

  if (["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model)) {
    vendorPricing.percentage = existing?.percentage ?? "0";
    vendorPricing.minimumFee = existing?.minimumFee ?? "0";
    vendorPricing.maximumFee = existing?.maximumFee ?? "0";
    return vendorPricing;
  }

  if (["PER_ENCOUNTER", "PER_PATIENT", "PER_PROVIDER", "PER_SITE", "PER_UNIT"].includes(model)) {
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

function getPricingAmount(model: PricingModel, config?: Partial<PricingConfigShape> | VendorPricingShape | null): number | null {
  if (!config) return null;
  if (["FIXED_MONTHLY", "RETAINER", "FIXED_ONE_TIME"].includes(model)) {
    return parseAmount(config.amount);
  }
  if (["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model)) {
    const percent = parseAmount(config.percentage);
    const minFee = parseAmount(config.minimumFee);
    const maxFee = parseAmount(config.maximumFee);
    return [percent, minFee, maxFee].reduce((sum, value) => sum + (value ?? 0), 0);
  }
  if (["PER_ENCOUNTER", "PER_PATIENT", "PER_PROVIDER", "PER_SITE", "PER_UNIT"].includes(model)) {
    return (parseAmount(config.unitRate) ?? 0) + (parseAmount(config.minimumFee) ?? 0);
  }
  if (model === "PER_CPT_CODE") {
    return (config.cptCodes ?? []).reduce((sum, row) => sum + (parseAmount(row.rate) ?? 0), 0);
  }
  if (model === "HYBRID") {
    return (config.components ?? []).reduce((sum, comp) => sum + (parseAmount(comp.value) ?? 0), 0);
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

type Props = {
  agreementId: string;
  agreementVersionId: string;
  services: { id: string; name: string }[];
  vendors:  { id: string; name: string }[];
  editingTerm: AgreementServiceTerm | null;
  defaultSignerEmail?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddPricingTermWizard({
  agreementId, agreementVersionId, services, vendors, editingTerm, defaultSignerEmail, onClose, onSaved,
}: Props) {
  const editingConfig = editingTerm?.pricingConfig as PricingConfigShape | undefined;
  const [step, setStep]           = useState(0);
  const [serviceId, setSvc]       = useState(editingTerm?.serviceId ?? "");
  const [model, setModel]         = useState<PricingModel>(editingTerm?.pricingModel ?? "FIXED_MONTHLY");
  const [cfg, setCfg]             = useState<PricingConfigShape>(
    editingTerm ? (editingTerm.pricingConfig as PricingConfigShape) : emptyConfig()
  );
  const [hasVendor, setHasVendor] = useState(!!editingTerm?.vendorId);
  const [vendorId, setVId]        = useState(editingTerm?.vendorId ?? "");
  const [vendorCfg, setVendorCfg] = useState<VendorPricingShape>(
    buildMirroredVendorPricing(
      editingTerm?.pricingModel ?? "FIXED_MONTHLY",
      editingConfig ?? emptyConfig(),
      editingConfig?.vendorPricing,
    ),
  );
  const [approvalNotes, setNotes] = useState("");
  const [signerEmail, setEmail]   = useState(
    editingConfig?.signerEmails?.join(", ")
      ?? editingTerm?.externalReference
      ?? (defaultSignerEmail ?? ""),
  );
  const [saving, setSaving]       = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasVendor) {
      setVId("");
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

  const upd = (p: Partial<PricingConfigShape>) => setCfg((prev) => ({ ...prev, ...p }));

  const validateRates = () => {
    if (["FIXED_MONTHLY", "RETAINER", "FIXED_ONE_TIME"].includes(model)) {
      if (!isNonNegative(cfg.amount)) {
        return { valid: false, message: "Amount is required and must be 0 or greater." };
      }
    }

    if (["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model)) {
      if (!isNonNegative(cfg.percentage)) {
        return { valid: false, message: "Percentage is required and must be 0 or greater." };
      }
    }

    if (["PER_ENCOUNTER", "PER_PATIENT", "PER_PROVIDER", "PER_SITE", "PER_UNIT"].includes(model)) {
      if (!isNonNegative(cfg.unitRate)) {
        return { valid: false, message: "Rate per unit is required and must be 0 or greater." };
      }
    }

    if (model === "PER_CPT_CODE") {
      const codes = cfg.cptCodes ?? [];
      if (codes.length === 0) {
        return { valid: false, message: "At least one CPT code is required." };
      }
      const invalidRow = codes.find((row) => !row.code?.trim() || !isNonNegative(row.rate));
      if (invalidRow) {
        return { valid: false, message: "Each CPT entry must include a code and a non-negative rate." };
      }
    }

    if (model === "HYBRID") {
      const comps = cfg.components ?? [];
      if (comps.length === 0) {
        return { valid: false, message: "At least one hybrid component is required." };
      }
      const invalidComponent = comps.find((comp) => comp.value?.toString().trim() === "" || !isNonNegative(comp.value));
      if (invalidComponent) {
        return { valid: false, message: "Each hybrid component must have a non-negative value." };
      }
    }

    return { valid: true };
  };

  const validateVendor = () => {
    if (!hasVendor) return { valid: true };
    if (!vendorId) {
      return { valid: false, message: "Vendor is required when a subcontractor is selected." };
    }

    if (["FIXED_MONTHLY", "RETAINER", "FIXED_ONE_TIME"].includes(model)) {
      if (!isNonNegative(vendorCfg.amount)) {
        return { valid: false, message: "Vendor amount is required and must be 0 or greater." };
      }
    }

    if (["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model)) {
      const hasPercentFields =
        isNonNegative(vendorCfg.percentage) &&
        isNonNegative(vendorCfg.minimumFee) &&
        isNonNegative(vendorCfg.maximumFee);
      if (!hasPercentFields) {
        return { valid: false, message: "Vendor percentage, minimum fee, and maximum fee must be 0 or greater." };
      }
    }

    if (["PER_ENCOUNTER", "PER_PATIENT", "PER_PROVIDER", "PER_SITE", "PER_UNIT"].includes(model)) {
      if (!isNonNegative(vendorCfg.unitRate) || !isNonNegative(vendorCfg.minimumFee)) {
        return { valid: false, message: "Vendor unit rate and minimum fee must be 0 or greater." };
      }
    }

    if (model === "PER_CPT_CODE") {
      const vendorRows = vendorCfg.cptCodes ?? [];
      if (vendorRows.length === 0) {
        return { valid: false, message: "Vendor CPT rows are required." };
      }
      const invalidRow = vendorRows.find((row) => !row.code?.trim() || !isNonNegative(row.rate));
      if (invalidRow) {
        return { valid: false, message: "Each vendor CPT row must include a code and a non-negative rate." };
      }
    }

    if (model === "HYBRID") {
      const vendorComponents = vendorCfg.components ?? [];
      if (vendorComponents.length === 0) {
        return { valid: false, message: "Vendor components are required." };
      }
      const invalidComponent = vendorComponents.find((component) => component.value?.toString().trim() === "" || !isNonNegative(component.value));
      if (invalidComponent) {
        return { valid: false, message: "Each vendor component must have a non-negative value." };
      }
    }

    const clientAmount = getPricingAmount(model, cfg);
    const vendorAmount = getPricingAmount(model, vendorCfg);
    if (clientAmount !== null && vendorAmount !== null && clientAmount === vendorAmount) {
      return { valid: false, message: "Client and vendor totals cannot be exactly equal. 0% margin is not allowed when both rates are entered." };
    }

    return { valid: true };
  };

  const validateAll = () => {
    if (!serviceId) return { valid: false, message: "Service selection is required." };
    if (!model) return { valid: false, message: "Pricing model is required." };
    const ratesResult = validateRates();
    if (!ratesResult.valid) return ratesResult;
    const vendorResult = validateVendor();
    if (!vendorResult.valid) return vendorResult;
    const signerResult = validateSignerEmails();
    if (!signerResult.valid) return signerResult;
    return { valid: true };
  };

  const validateSignerEmails = () => {
    const emails = parseEmailList(signerEmail);
    const invalidEmail = emails.find((email) => !isValidEmail(email));
    if (invalidEmail) {
      return { valid: false, message: `Invalid signer email: ${invalidEmail}` };
    }
    return { valid: true };
  };

  const clientAmount = getPricingAmount(model, cfg);
  const vendorAmount = hasVendor ? getPricingAmount(model, vendorCfg) : 0;
  const preview = calcMarginPreview(String(clientAmount ?? ""), String(vendorAmount ?? 0));

  const buildPricingConfigPayload = () => {
    const nextConfig: PricingConfigShape & Record<string, unknown> = {
      ...cfg,
      approvalNotes,
      signerEmails: parseEmailList(signerEmail),
    };

    if (["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model)) {
      nextConfig.ratePercent = cfg.percentage ?? "";
    }

    if (["PER_ENCOUNTER", "PER_PATIENT", "PER_PROVIDER", "PER_SITE", "PER_UNIT"].includes(model)) {
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
    !saving;

  const handleNext = () => {
    setStepError(null);
    if (step === 0 && !serviceId) {
      setStepError("Service selection is required.");
      return;
    }
    if (step === 1 && !model) {
      setStepError("Pricing model is required.");
      return;
    }
    if (step === 2) {
      const result = validateRates();
      if (!result.valid) { setStepError(result.message ?? "Please fix the rate inputs before continuing."); return; }
    }
    if (step === 3) {
      const result = validateVendor();
      if (!result.valid) { setStepError(result.message ?? "Please fix the vendor inputs before continuing."); return; }
    }
    if (step === 5 || step === 6) {
      const result = validateSignerEmails();
      if (!result.valid) { setStepError(result.message ?? "Please fix the signer emails before continuing."); return; }
    }
    setStep((current) => current + 1);
  };

  async function submit() {
    const validation = validateAll();
    if (!validation.valid) {
      setStepError(validation.message ?? "Please fix the form before saving.");
      return;
    }
    if (!agreementId || !agreementVersionId || !serviceId || !model) {
      toast.error("Agreement, version, service and model are required");
      return;
    }

    // Check for overlapping ACTIVE pricing terms for the same agreement/service/vendor/model
    try {
      const existing = await getPricingTerms({ agreementId, agreementVersionId, serviceId });
      const startA = cfg.effectiveStartDate ? new Date(cfg.effectiveStartDate) : null;
      const endA = cfg.effectiveEndDate ? new Date(cfg.effectiveEndDate) : null;
      const conflicts = (existing.terms || []).filter((t) => {
        if (editingTerm && t.id === editingTerm.id) return false;
        if (!t.isActive) return false;
        if (t.pricingModel !== model) return false;
        const tVendor = t.vendorId ?? null;
        const vId = hasVendor && vendorId ? vendorId : null;
        if ((tVendor ?? null) !== (vId ?? null)) return false;
        // date overlap logic: open ranges count as overlap
        const s = t.effectiveDate ? new Date(t.effectiveDate) : null;
        const e = t.endDate ? new Date(t.endDate) : null;
        const overlap = (aStart: Date | null, aEnd: Date | null, bStart: Date | null, bEnd: Date | null) => {
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
        setStepError("An active pricing term with overlapping effective dates already exists for this Agreement+Service+Vendor+Model. Adjust dates or supersede the existing term.");
        return;
      }
    } catch (err) {
      // non-fatal — allow submit but warn in console
      console.warn("Warning: unable to validate overlapping terms", err);
    }
    setSaving(true);
    try {
      const payload = {
        agreementId, agreementVersionId, serviceId, pricingModel: model,
        pricingConfig: buildPricingConfigPayload() as Record<string, unknown>,
        vendorId: hasVendor && vendorId ? vendorId : null,
        minimumFee: hasVendor ? (vendorAmount ?? 0) : null,
        effectiveDate: cfg.effectiveStartDate || undefined,
        endDate: cfg.effectiveEndDate || undefined,
        externalReference: parseEmailList(signerEmail).join(", ") || undefined,
        currency: "USD", isActive: true,
      };
      if (editingTerm) { await updatePricingTerm(editingTerm.id, payload); toast.success("Updated"); }
      else             { await createPricingTerm(payload);                  toast.success("Created"); }
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally     { setSaving(false); }
  }

  const svcName    = services.find((s) => s.id === serviceId)?.name ?? "-";
  const modelLabel = PRICING_MODEL_OPTIONS.find((o) => o.value === model)?.label ?? model;
  const vendorFieldsReadOnly = !!editingTerm;

  const updateVendorCfg = (patch: Partial<VendorPricingShape>) => {
    setVendorCfg((prev) => ({ ...prev, ...patch }));
  };

  const renderVendorTable = (rows: CptCodeRow[]) => (
    <div className="overflow-hidden rounded-xl border border-[#f0ece6]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[#f0ece6] bg-white">
            <th className="px-3 py-2 text-left font-medium text-slate-500">Code</th>
            <th className="px-3 py-2 text-left font-medium text-slate-500">Description</th>
            <th className="px-3 py-2 text-right font-medium text-slate-500">Vendor Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.code}-${index}`} className="border-b border-[#f0ece6] last:border-b-0">
              <td className="px-3 py-2 text-slate-700">{row.code || "-"}</td>
              <td className="px-3 py-2 text-slate-500">{row.description || "-"}</td>
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
                  className="app-control w-full rounded-md px-3 py-2 text-right text-[13px]"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderVendorComponents = (rows: HybridComponent[]) => (
    <div className="space-y-2">
      {rows.map((component, index) => (
        <div key={`${component.type}-${index}`} className="grid grid-cols-[1fr_140px] gap-3">
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
            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
          />
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-2xl"
        style={{ maxHeight: "92vh" }}>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0ece6] px-6 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-800">
              {editingTerm ? "Edit Pricing Term" : "Add Pricing Term"}
            </h2>
            <p className="text-[12px] text-slate-400 mt-0.5">Step {step+1} of {STEPS.length} — {STEPS[step]}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step pills */}
        <div className="flex gap-1.5 border-b border-[#f0ece6] px-6 py-2.5 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button key={s} type="button"
              onClick={() => i < step && setStep(i)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                i === step ? "bg-[#4f63ea] text-white" :
                i <  step  ? "cursor-pointer bg-emerald-100 text-emerald-700" :
                             "bg-slate-100 text-slate-400"}`}>
              {i+1}. {s}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-5 space-y-4 text-[13px]">
          {stepError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {stepError}
            </div>
          ) : null}

          {/* Step 0 — Service */}
          {step === 0 && (
            <div className="space-y-3">
              <h3 className="text-[15px] font-semibold text-slate-700">Select Service</h3>
              <div className="grid grid-cols-2 gap-2">
                {services.map((svc) => (
                  <button key={svc.id} type="button" onClick={() => setSvc(svc.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-[13px] font-medium transition-all ${
                      serviceId === svc.id ? "border-[#4f63ea] bg-[#f0f2fe] text-[#4f63ea]" :
                      "border-[#f0ece6] text-slate-700 hover:border-[#c7cdf5] hover:bg-[#f7f8fe]"}`}>
                    {svc.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Model */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-slate-700">Select Pricing Model</h3>
              {["Flat","Variable","Per Unit","Advanced"].map((group) => (
                <div key={group}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PRICING_MODEL_OPTIONS.filter((o) => o.group === group).map((opt) => (
                      <button key={opt.value} type="button" onClick={() => setModel(opt.value)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13px] transition-all ${
                          model === opt.value ? "border-[#4f63ea] bg-[#f0f2fe] text-[#4f63ea] font-medium" :
                          "border-[#f0ece6] text-slate-600 hover:border-[#c7cdf5]"}`}>
                        <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${model === opt.value ? "border-[#4f63ea] bg-[#4f63ea]" : "border-slate-300"}`} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 2 — Rates (uses external component — no focus loss) */}
          {step === 2 && <RateFormFields model={model} cfg={cfg} upd={upd} />}

          {/* Step 3 — Vendor */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-slate-700">Vendor Pricing</h3>
              <p className="text-slate-500">Does this service have a vendor / subcontractor?</p>
              <div className="flex gap-3">
                {[true,false].map((v) => (
                  <button key={String(v)} type="button" onClick={() => setHasVendor(v)}
                    className={`flex-1 rounded-xl border py-3 text-[13px] font-medium transition-all ${
                      hasVendor === v ? "border-[#4f63ea] bg-[#f0f2fe] text-[#4f63ea]" :
                      "border-[#f0ece6] text-slate-500 hover:border-slate-300"}`}>
                    {v ? "Yes" : "No"}
                  </button>
                ))}
              </div>
              {hasVendor && (
                <div className="space-y-3 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-4">
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">Vendor <span className="text-red-500">*</span></label>
                    <Select
                      value={vendorId}
                      onChange={setVId}
                      placeholder="Select Vendor"
                      options={vendors.map(v => ({ label: v.name, value: v.id }))}
                    />
                  </div>
                  <div className="rounded-xl border border-dashed border-[#d7d2cb] bg-white p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-700">Vendor rates follow the selected pricing model</p>
                        <p className="text-[12px] text-slate-400">
                          Default values start at 0. Existing vendor values stay read-only.
                        </p>
                      </div>
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500">
                        {modelLabel}
                      </div>
                    </div>

                    {["FIXED_MONTHLY", "RETAINER", "FIXED_ONE_TIME"].includes(model) && (
                      <div>
                        <label className="mb-1 block font-medium text-slate-700">Vendor Amount (USD)</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          readOnly={vendorFieldsReadOnly}
                          value={vendorCfg.amount ?? "0"}
                          onChange={(e) => updateVendorCfg({ amount: e.target.value })}
                          className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                        />
                      </div>
                    )}

                    {["PERCENT_COLLECTIONS", "PERCENT_REVENUE", "SUCCESS_FEE"].includes(model) && (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">Vendor %</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            readOnly={vendorFieldsReadOnly}
                            value={vendorCfg.percentage ?? "0"}
                            onChange={(e) => updateVendorCfg({ percentage: e.target.value })}
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">Vendor Min Fee</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            readOnly={vendorFieldsReadOnly}
                            value={vendorCfg.minimumFee ?? "0"}
                            onChange={(e) => updateVendorCfg({ minimumFee: e.target.value })}
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">Vendor Max Fee</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            readOnly={vendorFieldsReadOnly}
                            value={vendorCfg.maximumFee ?? "0"}
                            onChange={(e) => updateVendorCfg({ maximumFee: e.target.value })}
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </div>
                      </div>
                    )}

                    {["PER_ENCOUNTER", "PER_PATIENT", "PER_PROVIDER", "PER_SITE", "PER_UNIT"].includes(model) && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">Vendor Rate per Unit</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            readOnly={vendorFieldsReadOnly}
                            value={vendorCfg.unitRate ?? "0"}
                            onChange={(e) => updateVendorCfg({ unitRate: e.target.value })}
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block font-medium text-slate-700">Vendor Minimum Fee</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            readOnly={vendorFieldsReadOnly}
                            value={vendorCfg.minimumFee ?? "0"}
                            onChange={(e) => updateVendorCfg({ minimumFee: e.target.value })}
                            className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                          />
                        </div>
                      </div>
                    )}

                    {model === "PER_CPT_CODE" && renderVendorTable(vendorCfg.cptCodes ?? [])}
                    {model === "HYBRID" && renderVendorComponents(vendorCfg.components ?? [])}

                    <div className="flex items-center justify-between rounded-lg bg-[#faf9f7] px-3 py-2 text-[12px]">
                      <span className="font-medium text-slate-500">Vendor Total</span>
                      <span className="font-semibold text-slate-700">
                        ${Number(vendorAmount ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4 — Margin */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-slate-700">Margin Preview</h3>
              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Est. Client Revenue", `$${preview.clientRevenue.toLocaleString()}`, "text-[#4f63ea]"],
                  ["Est. Vendor Cost",    `$${preview.vendorCost.toLocaleString()}`,    "text-red-500"],
                  ["Est. Gross Margin",   `$${preview.grossMargin.toLocaleString()}`,   "text-emerald-600"],
                  ["Margin %",           `${toFixedDisplay(preview.marginPct)}%`,       preview.marginPct < 20 ? "text-amber-600" : "text-emerald-600"],
                ] as const).map(([k, v, color]) => (
                  <div key={k} className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{k}</p>
                    <p className={`mt-1 text-[22px] font-bold ${color}`}>{v}</p>
                  </div>
                ))}
              </div>
              {preview.requiresApproval && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Low Margin — Approval Required</p>
                    <p className="text-[12px] mt-0.5">Margin {toFixedDisplay(preview.marginPct)}% is below the 20% threshold. Proceed to step 6 to add approval notes.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5 — Internal Approval */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-slate-700">Internal Approval</h3>
              {preview.requiresApproval ? (
                <>
                  <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">⚠ Approval Required</p>
                      <p className="text-[12px] mt-0.5">Margin is {toFixedDisplay(preview.marginPct)}%, below the minimum 20% threshold. Please request manager approval before finalizing.</p>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">Approval Notes / Justification</label>
                    <textarea rows={4} value={approvalNotes} onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe the business justification for this margin exception…"
                      className="app-control w-full rounded-md px-3 py-2 text-[13px] resize-none" />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                  <div>
                    <p className="font-semibold">No Approval Needed</p>
                    <p className="text-[12px] mt-0.5">Margin of {toFixedDisplay(preview.marginPct)}% meets the minimum threshold. You can proceed to finalize.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 6 — Finalize */}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-[15px] font-semibold text-slate-700">Finalize Rate Packet</h3>

              {/* Summary */}
              <div className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-4 space-y-2.5">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Included Services</p>
                {[
                  ["Service",       svcName],
                  ["Pricing Model", modelLabel],
                  ["Client Rate",   `$${preview.clientRevenue.toLocaleString()}`],
                  ...(hasVendor ? [
                    ["Vendor",      vendors.find((v) => v.id === vendorId)?.name ?? "-"],
                    ["Vendor Total", `$${preview.vendorCost.toLocaleString()}`],
                  ] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400">{k}</span>
                    <span className="font-medium text-slate-700">{v}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-[#f0ece6] pt-2.5">
                  <span className="font-semibold text-slate-700">Pricing Summary — Gross Margin</span>
                  <span className={`font-bold text-[15px] ${preview.marginPct < 20 ? "text-amber-600" : "text-emerald-600"}`}>
                    ${preview.grossMargin.toLocaleString()} ({toFixedDisplay(preview.marginPct)}%)
                  </span>
                </div>
              </div>

              {/* Signer email */}
              <div>
                <label className="mb-1 block font-medium text-slate-700">Signer Email <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="text" value={signerEmail} onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com, owner@example.com"
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]" />
                <p className="mt-1 text-[12px] text-slate-400">Emails from the related people are auto-filled. Use comma-separated emails for multiple signers.</p>
              </div>

              {preview.requiresApproval && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Approval required — ensure manager sign-off before activating this term
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#f0ece6] px-6 py-4">
          <button type="button"
            onClick={() => step > 0 ? setStep(step-1) : onClose()}
            className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]">
            {step === 0 ? "Cancel" : "← Back"}
          </button>
          {step < STEPS.length-1 ? (
            <button type="button" onClick={handleNext} disabled={!canNext}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#4f63ea] px-5 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-40">
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button type="button" onClick={submit} disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-40">
              {saving ? "Saving…" : "✓ Generate Packet"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
