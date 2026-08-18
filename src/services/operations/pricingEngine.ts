import axios from "axios";
import { apiConnector } from "../apiConnector";
import { agreementServiceTermEndpoints } from "../apis";
import type {
  AgreementServiceTerm,
  AgreementServiceTermBody,
  PricingModel,
} from "./agreements";

export type { AgreementServiceTerm, AgreementServiceTermBody, PricingModel };

// ── helpers ────────────────────────────────────────────────────────────────

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const msg = (error.response?.data as { message?: string } | undefined)?.message;
    return msg ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

// ── types ──────────────────────────────────────────────────────────────────

export type PricingModelMeta = {
  value: PricingModel;
  label: string;
  group: string;
};

export const PRICING_MODEL_OPTIONS: PricingModelMeta[] = [
  { value: "FIXED_MONTHLY",            label: "Fixed Monthly",            group: "Flat" },
  { value: "FIXED_ONE_TIME",           label: "One-Time Fee",             group: "Flat" },
  { value: "RETAINER",                 label: "Retainer",                 group: "Flat" },
  { value: "PERCENT_COLLECTIONS",      label: "Percent of Collections",   group: "Variable" },
  { value: "PERCENT_REVENUE",          label: "Percent of Revenue",       group: "Variable" },
  { value: "SUCCESS_FEE",              label: "Success Fee",              group: "Variable" },
  { value: "PER_ENCOUNTER",            label: "Per Encounter",            group: "Per Unit" },
  { value: "PER_PATIENT",              label: "Per Patient",              group: "Per Unit" },
  { value: "PER_PROVIDER",             label: "Per Provider",             group: "Per Unit" },
  { value: "PER_SITE",                 label: "Per Site",                 group: "Per Unit" },
  { value: "PER_CPT_CODE",             label: "Per CPT Code",             group: "Per Unit" },
  { value: "PER_UNIT",                 label: "Per Unit (Custom)",        group: "Per Unit" },
  { value: "HYBRID",                   label: "Hybrid / Multi-Component", group: "Advanced" },
  { value: "TIERED_VOLUME",            label: "Tiered Volume",            group: "Advanced" },
  { value: "CUSTOM_ATTACHMENT_DEFINED",label: "Custom",                   group: "Advanced" },
];

// Margin threshold below which approval is required
export const MARGIN_THRESHOLD_PCT = 20;

// ── pricingConfig shape helpers ────────────────────────────────────────────

export type CptCodeRow = {
  code: string;
  description: string;
  rate: string;
};

export type HybridComponent = {
  type: string;
  value: string;
};

export type VendorPricingShape = {
  amount?: string;
  percentage?: string;
  minimumFee?: string;
  maximumFee?: string;
  collectionSource?: string;
  unitRate?: string;
  cptCodes?: CptCodeRow[];
  components?: HybridComponent[];
  pricingModel?: PricingModel;
};

export type PricingConfigShape = {
  // FIXED_MONTHLY / RETAINER / FIXED_ONE_TIME
  amount?: string;
  // PERCENT_*
  percentage?: string;
  minimumFee?: string;
  maximumFee?: string;
  collectionSource?: string;
  // PER_* simple
  unitRate?: string;
  // PER_CPT_CODE
  cptCodes?: CptCodeRow[];
  // HYBRID
  components?: HybridComponent[];
  // Vendor pricing mirrors selected model structure
  vendorPricing?: VendorPricingShape;
  signerEmails?: string[];
  approvalNotes?: string;
  clientApprovalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  internalApprovalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  clientApprovalNote?: string | null;
  internalApprovalNote?: string | null;
  // effective dates (all models)
  effectiveStartDate?: string;
  effectiveEndDate?: string;
};

export function emptyConfig(): PricingConfigShape {
  return {
    amount: "",
    percentage: "",
    minimumFee: "",
    maximumFee: "",
    collectionSource: "PM System",
    unitRate: "",
    cptCodes: [{ code: "", description: "", rate: "" }],
    components: [{ type: "% Collections", value: "" }],
    effectiveStartDate: "",
    effectiveEndDate: "",
  };
}

// ── margin calculation ─────────────────────────────────────────────────────

export type MarginPreview = {
  clientRevenue: number;
  vendorCost: number;
  grossMargin: number;
  marginPct: number;
  requiresApproval: boolean;
};

export function calcMarginPreview(
  clientRate: string,
  vendorRate: string,
): MarginPreview {
  const client = parseFloat(clientRate) || 0;
  const vendor = parseFloat(vendorRate) || 0;
  const gross = client - vendor;
  const pct = client > 0 ? parseFloat(((gross / client) * 100).toFixed(2)) : 0;
  return {
    clientRevenue: client,
    vendorCost: vendor,
    grossMargin: gross,
    marginPct: pct,
    requiresApproval: client > 0 && pct < MARGIN_THRESHOLD_PCT,
  };
}

// ── API calls (delegate to existing service-terms endpoints) ───────────────

export type PricingTermsParams = {
  agreementId?: string;
  agreementVersionId?: string;
  serviceId?: string;
  search?: string;
  pricingModel?: string;
  vendorId?: string;
  approvalStatus?: string;
  clientApprovalStatus?: string;
  internalApprovalStatus?: string;
  termStatus?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export async function getPricingTerms(params?: PricingTermsParams): Promise<{
  terms: AgreementServiceTerm[];
  pagination: { totalRecords: number; totalPages: number; currentPage: number; limit: number };
}> {
  try {
    const qs = new URLSearchParams();
    if (params?.agreementId) qs.set("agreementId", params.agreementId);
    if (params?.agreementVersionId) qs.set("agreementVersionId", params.agreementVersionId);
    if (params?.serviceId) qs.set("serviceId", params.serviceId);
    if (params?.search) qs.set("search", params.search);
    if (params?.pricingModel) qs.set("pricingModel", params.pricingModel);
    if (params?.vendorId) qs.set("vendorId", params.vendorId);
    if (params?.approvalStatus) qs.set("approvalStatus", params.approvalStatus);
    if (params?.clientApprovalStatus) qs.set("clientApprovalStatus", params.clientApprovalStatus);
    if (params?.internalApprovalStatus) qs.set("internalApprovalStatus", params.internalApprovalStatus);
    if (params?.termStatus) qs.set("termStatus", params.termStatus);
    if (params?.sortBy) qs.set("sortBy", params.sortBy);
    if (params?.sortOrder) qs.set("sortOrder", params.sortOrder);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));

    const url = qs.toString()
      ? `${agreementServiceTermEndpoints.LIST}?${qs.toString()}`
      : agreementServiceTermEndpoints.LIST;

    const res = await apiConnector({ method: "GET", url, credentials: true });
    return res.data as any;
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to fetch pricing terms."));
  }
}

export async function createPricingTerm(
  data: AgreementServiceTermBody,
): Promise<AgreementServiceTerm> {
  try {
    const res = await apiConnector({
      method: "POST",
      url: agreementServiceTermEndpoints.CREATE,
      body: data,
      credentials: true,
    });
    return (res.data as { term: AgreementServiceTerm }).term;
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to create pricing term."));
  }
}

export async function updatePricingTerm(
  id: string,
  data: Partial<AgreementServiceTermBody>,
): Promise<AgreementServiceTerm> {
  try {
    const res = await apiConnector({
      method: "PATCH",
      url: agreementServiceTermEndpoints.UPDATE(id),
      body: data,
      credentials: true,
    });
    return (res.data as { term: AgreementServiceTerm }).term;
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to update pricing term."));
  }
}

export async function deletePricingTerm(id: string): Promise<void> {
  try {
    await apiConnector({
      method: "DELETE",
      url: agreementServiceTermEndpoints.DELETE(id),
      credentials: true,
    });
  } catch (e) {
    throw new Error(getErrorMessage(e, "Unable to delete pricing term."));
  }
}
