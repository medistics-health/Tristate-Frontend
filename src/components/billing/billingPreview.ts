import type { AgreementServiceTerm } from "../../services/operations/agreements";
import type { BillingSnapshotInput } from "../../services/operations/billings";
import { PRICING_MODEL_OPTIONS } from "../../services/operations/pricingEngine";

// ── Types ──────────────────────────────────────────────────────────────────

export type TermInputValues = {
  quantity?: string;
  cptQuantities?: Record<string, string>;
  baseAmount?: string;
  collectionsBase?: string;
  encountersQty?: string;
  patientsQty?: string;
  collectionsLines?: Array<{ id: string; label: string; amount: string }>;
};

export type TermPreview = {
  clientAmount: number;
  vendorAmount: number | null;
  marginAmount: number | null;
};

// ── Constants ──────────────────────────────────────────────────────────────

export const DEFAULT_METRIC_KEYS: Record<string, string[]> = {
  PER_UNIT: ["units", "unit_count"],
  PER_ENCOUNTER: ["encounters", "encounter_count"],
  PER_PATIENT: ["patients", "patient_count"],
  PER_PROVIDER: ["providers", "provider_count"],
  PER_SITE: ["sites", "site_count"],
  PERCENT_COLLECTIONS: ["collections", "total_collections"],
  PERCENT_REVENUE: ["revenue", "total_revenue"],
  PERCENT_PROFIT: ["profit", "total_profit"],
  SUCCESS_FEE: ["collections", "total_collections"],
  TIERED_VOLUME: ["units", "unit_count"],
  CUSTOM_ATTACHMENT_DEFINED: ["value"],
};

// ── Helpers ────────────────────────────────────────────────────────────────

export function roundMoneyClient(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizePercentClient(rate: number) {
  return rate > 1 ? rate / 100 : rate;
}

export function modelNeedsInput(model: string): boolean {
  return !["FIXED_MONTHLY", "FIXED_ONE_TIME", "RETAINER"].includes(model);
}

export function getModelInputLabel(model: string): string {
  switch (model) {
    case "PER_UNIT":
      return "Units";
    case "PER_ENCOUNTER":
      return "Encounters";
    case "PER_PATIENT":
      return "Patients";
    case "PER_PROVIDER":
      return "Providers";
    case "PER_SITE":
      return "Sites";
    case "PERCENT_COLLECTIONS":
      return "Total Collections ($)";
    case "PERCENT_REVENUE":
      return "Total Revenue ($)";
    case "PERCENT_PROFIT":
      return "Total Profit ($)";
    case "SUCCESS_FEE":
      return "Total Collections ($)";
    case "TIERED_VOLUME":
      return "Total Volume";
    case "MONTHLY_MINIMUM":
      return "Base Metric Value";
    default:
      return "Value";
  }
}

export function getModelLabel(model: string): string {
  const found = PRICING_MODEL_OPTIONS.find((opt) => opt.value === model);
  return found?.label || model.replace(/_/g, " ");
}

// ── Client-side pricing preview (mirrors server computePricingFromModel) ──

export function computePricingFromModelClient(
  pricingModel: string,
  config: Record<string, any>,
  inputs: TermInputValues,
  minimumFee: number | null = null,
  maximumFee: number | null = null,
): number {
  let clientAmount = 0;

  switch (pricingModel) {
    case "FIXED_MONTHLY":
    case "FIXED_ONE_TIME":
    case "RETAINER": {
      clientAmount = parseFloat(config.amount) || parseFloat(config.rate) || 0;
      break;
    }
    case "PER_UNIT":
    case "PER_ENCOUNTER":
    case "PER_PATIENT":
    case "PER_PROVIDER":
    case "PER_SITE": {
      const rate = parseFloat(config.rate) || parseFloat(config.unitRate) || 0;
      const quantity = parseFloat(inputs.quantity || "0");
      clientAmount = quantity * rate;
      break;
    }
    case "PER_CPT_CODE": {
      const cptCodes = Array.isArray(config.cptCodes) ? config.cptCodes : [];
      for (const cpt of cptCodes) {
        const code = String(cpt?.code || "").trim();
        const rate = parseFloat(cpt?.rate || "0");
        const qty = parseFloat(inputs.cptQuantities?.[code] || "0");
        if (code && !isNaN(rate)) clientAmount += qty * rate;
      }
      break;
    }
    case "PERCENT_COLLECTIONS":
    case "PERCENT_REVENUE":
    case "PERCENT_PROFIT":
    case "SUCCESS_FEE": {
      const rate =
        parseFloat(config.percentage) ||
        parseFloat(config.ratePercent) ||
        parseFloat(config.rate) ||
        0;
      const normalizedRate = normalizePercentClient(rate);
      const baseAmount = parseFloat(inputs.baseAmount || "0");
      clientAmount = baseAmount * normalizedRate;
      break;
    }
    case "TIERED_VOLUME": {
      const quantity = parseFloat(inputs.quantity || "0");
      const tiers = Array.isArray(config.tiers) ? config.tiers : [];
      let remaining = quantity;
      let previousUpperBound = 0;
      for (const tier of tiers) {
        if (!tier || typeof tier !== "object") continue;
        const from = parseFloat(tier.from) || previousUpperBound;
        const to =
          tier.to !== undefined && tier.to !== null
            ? parseFloat(tier.to)
            : null;
        const rate = parseFloat(tier.rate);
        if (isNaN(rate) || quantity <= from) {
          previousUpperBound = to ?? previousUpperBound;
          continue;
        }
        const upperBound = to ?? quantity;
        const billableUnits = Math.max(
          0,
          Math.min(quantity, upperBound) - Math.max(previousUpperBound, from),
        );
        if (billableUnits <= 0) {
          previousUpperBound = upperBound;
          continue;
        }
        clientAmount += billableUnits * rate;
        remaining -= billableUnits;
        previousUpperBound = upperBound;
      }
      if (remaining > 0 && tiers.length > 0) {
        const lastTier = tiers[tiers.length - 1];
        const fallbackRate = lastTier ? parseFloat(lastTier.rate) : NaN;
        if (!isNaN(fallbackRate)) clientAmount += remaining * fallbackRate;
      }
      if (tiers.length === 0) {
        const rateVal =
          config.amount !== undefined && config.amount !== null && config.amount !== ""
            ? parseFloat(config.amount)
            : config.rate !== undefined && config.rate !== null && config.rate !== ""
            ? parseFloat(config.rate)
            : config.unitRate !== undefined && config.unitRate !== null && config.unitRate !== ""
            ? parseFloat(config.unitRate)
            : NaN;
        if (!isNaN(rateVal)) {
          clientAmount = quantity * rateVal;
        }
      }
      break;
    }
    case "MONTHLY_MINIMUM": {
      clientAmount =
        parseFloat(config.minimumAmount) || parseFloat(config.amount) || 0;
      break;
    }
    case "HYBRID":
    case "MULTI_COMPONENT": {
      const components = Array.isArray(config.components) ? config.components : [];
      let monthlyMinimumVal = 0;
      let totalVariableCharges = 0;

      for (const comp of components) {
        const type = comp.type;
        const val = parseFloat(comp.value) || 0;

        if (type === "% Collections") {
          const collectionsBase = parseFloat(inputs.collectionsBase || "0");
          totalVariableCharges += collectionsBase * normalizePercentClient(val);
        } else if (type === "Per Encounter") {
          const encountersQty = parseFloat(inputs.encountersQty || "0");
          totalVariableCharges += encountersQty * val;
        } else if (type === "Per Patient") {
          const patientsQty = parseFloat(inputs.patientsQty || "0");
          totalVariableCharges += patientsQty * val;
        } else if (type === "Fixed Monthly") {
          totalVariableCharges += val;
        } else if (type === "Monthly Minimum") {
          monthlyMinimumVal = val;
        }
      }

      clientAmount = Math.max(monthlyMinimumVal, totalVariableCharges);
      break;
    }
    case "CUSTOM_ATTACHMENT_DEFINED": {
      const quantity = parseFloat(inputs.quantity || "0");
      const rateVal =
        config.amount !== undefined && config.amount !== "" && config.amount !== null
          ? parseFloat(config.amount)
          : config.rate !== undefined && config.rate !== "" && config.rate !== null
          ? parseFloat(config.rate)
          : config.unitRate !== undefined && config.unitRate !== "" && config.unitRate !== null
          ? parseFloat(config.unitRate)
          : NaN;
      if (!isNaN(rateVal)) {
        clientAmount = quantity * rateVal;
      }
      break;
    }
    default:
      break;
  }

  clientAmount = roundMoneyClient(clientAmount);

  if (minimumFee !== null && clientAmount < minimumFee) {
    clientAmount = minimumFee;
  }

  if (maximumFee !== null && clientAmount > maximumFee) {
    clientAmount = maximumFee;
  }

  return clientAmount;
}

export function computeTermPreview(
  term: AgreementServiceTerm,
  inputs: TermInputValues,
): TermPreview {
  const config = (term.pricingConfig || {}) as Record<string, any>;
  
  // 1. Calculate client amount
  const clientMinFee = config.minimumFee !== undefined && config.minimumFee !== null && config.minimumFee !== ""
    ? Number(config.minimumFee)
    : null;
  const clientMaxFee = config.maximumFee !== undefined && config.maximumFee !== null && config.maximumFee !== ""
    ? Number(config.maximumFee)
    : null;

  const clientAmount = computePricingFromModelClient(
    term.pricingModel,
    config,
    inputs,
    clientMinFee,
    clientMaxFee,
  );

  // 2. Calculate vendor amount (mirrors server computeVendorAmount)
  let vendorAmount: number | null = null;
  if (term.vendorId) {
    const vp = config.vendorPricing;
    if (vp && typeof vp === "object" && Object.keys(vp).length > 0) {
      const nestedModel = vp.pricingModel || term.pricingModel;
      const vendorMinFee = vp.minimumFee !== undefined && vp.minimumFee !== null && vp.minimumFee !== ""
        ? Number(vp.minimumFee)
        : null;
      const vendorMaxFee = vp.maximumFee !== undefined && vp.maximumFee !== null && vp.maximumFee !== ""
        ? Number(vp.maximumFee)
        : null;
      vendorAmount = computePricingFromModelClient(nestedModel, vp, inputs, vendorMinFee, vendorMaxFee);
    }

    if (vendorAmount === null && config.vendorFlatAmount !== undefined && config.vendorFlatAmount !== null) {
      const val = parseFloat(config.vendorFlatAmount);
      if (!isNaN(val)) {
        vendorAmount = roundMoneyClient(val);
      }
    }

    if (vendorAmount === null && config.vendorPercentOfClient !== undefined && config.vendorPercentOfClient !== null) {
      const val = parseFloat(config.vendorPercentOfClient);
      if (!isNaN(val)) {
        vendorAmount = roundMoneyClient(
          clientAmount * normalizePercentClient(val),
        );
      }
    }

    if (vendorAmount === null && config.vendorRate !== undefined && config.vendorRate !== null) {
      const val = parseFloat(config.vendorRate);
      if (!isNaN(val)) {
        const qty = parseFloat(inputs.quantity || "0");
        vendorAmount = roundMoneyClient(qty * val);
      }
    }
  }

  const marginAmount =
    vendorAmount !== null
      ? roundMoneyClient(clientAmount - vendorAmount)
      : null;

  return { clientAmount, vendorAmount, marginAmount };
}

// ── Build snapshots from user inputs (for API submission) ──────────────────

export function buildSnapshotsFromInputs(
  terms: AgreementServiceTerm[],
  inputs: Record<string, TermInputValues>,
): BillingSnapshotInput[] {
  const snapshots: BillingSnapshotInput[] = [];

  for (const term of terms) {
    const termInput = inputs[term.id];
    if (!termInput) continue;

    // biome-ignore lint: using any for flexible config access
    const config = (term.pricingConfig || {}) as Record<string, any>;

    switch (term.pricingModel) {
      case "FIXED_MONTHLY":
      case "FIXED_ONE_TIME":
      case "RETAINER":
        // No snapshots needed for fixed-price models
        break;

      case "PER_UNIT":
      case "PER_ENCOUNTER":
      case "PER_PATIENT":
      case "PER_PROVIDER":
      case "PER_SITE": {
        const keys = DEFAULT_METRIC_KEYS[term.pricingModel] || [];
        if (termInput.quantity && parseFloat(termInput.quantity) > 0) {
          snapshots.push({
            metricKey: keys[0] || term.pricingModel.toLowerCase(),
            metricValue: Number(termInput.quantity),
            serviceId: term.serviceId,
            sourceType: "billing_run_input",
            sourceReference: term.id,
          });
        }
        break;
      }

      case "PER_CPT_CODE": {
        const cptCodes = Array.isArray(config.cptCodes) ? config.cptCodes : [];
        for (const cpt of cptCodes) {
          const code = String(cpt?.code || "").trim();
          const qty = termInput.cptQuantities?.[code];
          if (code && qty && parseFloat(qty) > 0) {
            snapshots.push({
              metricKey: code,
              metricValue: Number(qty),
              serviceId: term.serviceId,
              sourceType: "billing_run_input",
              sourceReference: term.id,
            });
          }
        }
        break;
      }

      case "PERCENT_COLLECTIONS":
      case "PERCENT_REVENUE":
      case "PERCENT_PROFIT":
      case "SUCCESS_FEE": {
        const keys =
          DEFAULT_METRIC_KEYS[term.pricingModel] ||
          DEFAULT_METRIC_KEYS.PERCENT_COLLECTIONS ||
          [];
        if (term.pricingModel === "PERCENT_COLLECTIONS" && termInput.collectionsLines && termInput.collectionsLines.length > 0) {
          for (const line of termInput.collectionsLines) {
            const amt = parseFloat(line.amount);
            if (line.label && amt > 0) {
              snapshots.push({
                metricKey: keys[0] || "collections",
                metricValue: amt,
                metricTextValue: line.label,
                serviceId: term.serviceId,
                sourceType: "billing_run_input",
                sourceReference: term.id,
              });
            }
          }
        } else {
          if (termInput.baseAmount && parseFloat(termInput.baseAmount) > 0) {
            snapshots.push({
              metricKey: keys[0] || "collections",
              metricValue: Number(termInput.baseAmount),
              serviceId: term.serviceId,
              sourceType: "billing_run_input",
              sourceReference: term.id,
            });
          }
        }
        break;
      }

      case "TIERED_VOLUME": {
        const keys = DEFAULT_METRIC_KEYS.PER_UNIT || [];
        if (termInput.quantity && parseFloat(termInput.quantity) > 0) {
          snapshots.push({
            metricKey: keys[0] || "units",
            metricValue: Number(termInput.quantity),
            serviceId: term.serviceId,
            sourceType: "billing_run_input",
            sourceReference: term.id,
          });
        }
        break;
      }

      case "CUSTOM_ATTACHMENT_DEFINED": {
        const keys = DEFAULT_METRIC_KEYS.CUSTOM_ATTACHMENT_DEFINED || [];
        if (termInput.quantity && parseFloat(termInput.quantity) > 0) {
          snapshots.push({
            metricKey: keys[0] || "value",
            metricValue: Number(termInput.quantity),
            serviceId: term.serviceId,
            sourceType: "billing_run_input",
            sourceReference: term.id,
          });
        }
        break;
      }

      case "HYBRID":
      case "MULTI_COMPONENT": {
        if (termInput.collectionsBase && parseFloat(termInput.collectionsBase) > 0) {
          snapshots.push({
            metricKey: "collections",
            metricValue: Number(termInput.collectionsBase),
            serviceId: term.serviceId,
            sourceType: "billing_run_input",
            sourceReference: term.id,
          });
        }
        if (termInput.encountersQty && parseFloat(termInput.encountersQty) > 0) {
          snapshots.push({
            metricKey: "encounters",
            metricValue: Number(termInput.encountersQty),
            serviceId: term.serviceId,
            sourceType: "billing_run_input",
            sourceReference: term.id,
          });
        }
        if (termInput.patientsQty && parseFloat(termInput.patientsQty) > 0) {
          snapshots.push({
            metricKey: "patients",
            metricValue: Number(termInput.patientsQty),
            serviceId: term.serviceId,
            sourceType: "billing_run_input",
            sourceReference: term.id,
          });
        }
        break;
      }

      default:
        break;
    }
  }

  return snapshots;
}
