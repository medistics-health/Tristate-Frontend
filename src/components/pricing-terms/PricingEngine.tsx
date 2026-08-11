import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  Circle,
  DollarSign,
  LayoutList,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  GripVertical,
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import {
  getAllPractices,
  getPractice,
} from "../../services/operations/practices";
import { getAllServices } from "../../services/operations/services";
import { getAllVendorsApi } from "../../services/operations/vendors";
import type { Practice } from "../practices/types";
import type { Service } from "../services/types";
import {
  PRICING_MODEL_OPTIONS,
  calcMarginPreview,
  deletePricingTerm,
  getPricingTerms,
  type PricingConfigShape,
  type VendorPricingShape,
} from "../../services/operations/pricingEngine";
import type {
  AgreementServiceTerm,
  PricingModel,
} from "../../services/operations/agreements";
import {
  getAgreementsView,
  getAgreementVersions,
  type AgreementVersion,
  updateAgreementServiceTermApi,
} from "../../services/operations/agreements";
import AddPricingTermWizard from "./AddPricingTermWizard";
import Select from "../shared/Select";

// ─── helpers ──────────────────────────────────────────────────────────────────

const MODEL_COLOR: Record<string, string> = {
  FIXED_MONTHLY: "bg-blue-100 text-blue-700",
  FIXED_ONE_TIME: "bg-slate-100 text-slate-700",
  RETAINER: "bg-indigo-100 text-indigo-700",
  PERCENT_COLLECTIONS: "bg-amber-100 text-amber-700",
  PERCENT_REVENUE: "bg-orange-100 text-orange-700",
  SUCCESS_FEE: "bg-green-100 text-green-700",
  PER_ENCOUNTER: "bg-teal-100 text-teal-700",
  PER_PATIENT: "bg-cyan-100 text-cyan-700",
  PER_PROVIDER: "bg-violet-100 text-violet-700",
  PER_SITE: "bg-purple-100 text-purple-700",
  PER_CPT_CODE: "bg-rose-100 text-rose-700",
  PER_UNIT: "bg-pink-100 text-pink-700",
  HYBRID: "bg-fuchsia-100 text-fuchsia-700",
  TIERED_VOLUME: "bg-lime-100 text-lime-700",
  CUSTOM_ATTACHMENT_DEFINED: "bg-zinc-100 text-zinc-600",
};

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

// ✅ NEW: Helper to check if pricing model is percentage-based
function isPercentageBasedModel(model: PricingModel | string): boolean {
  return [
    "PERCENT_COLLECTIONS",
    "PERCENT_REVENUE",
    "PERCENT_PROFIT",
    "SUCCESS_FEE",
  ].includes(model as PricingModel);
}

function fmtModel(m: string) {
  return (
    PRICING_MODEL_OPTIONS.find((o) => o.value === m)?.label ??
    m.replace(/_/g, " ")
  );
}

function fmtMoney(v?: number | string | null) {
  if (v === undefined || v === null || v === "") return "-";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function fmtPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

// ✅ NEW: Format value based on pricing model
function fmtModelValue(
  value: number | null | undefined,
  model: PricingModel | string,
): string {
  if (value === null || value === undefined) return "-";
  const n = Number(value);
  if (isNaN(n)) return "-";

  if (isPercentageBasedModel(model)) {
    return fmtPercent(n);
  }
  return fmtMoney(n);
}

function pickDefaultSignerEmail(practice?: Practice) {
  const people = practice?.persons ?? [];
  const rolePriority = [
    "authorized official",
    "signer",
    "owner",
    "ceo",
    "administrator",
    "admin",
    "billing",
  ];

  const ordered = [...people].sort((a, b) => {
    const aRole = a.role?.toLowerCase() ?? "";
    const bRole = b.role?.toLowerCase() ?? "";
    const aIndex = rolePriority.findIndex((role) => aRole.includes(role));
    const bIndex = rolePriority.findIndex((role) => bRole.includes(role));
    const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return safeA - safeB;
  });

  const emails = ordered
    .map((person) => person.email?.trim() ?? "")
    .filter(Boolean);

  return Array.from(new Set(emails)).join(", ");
}

function extractClientRate(term: AgreementServiceTerm): number {
  const c = term.pricingConfig as PricingConfigShape;
  return sumPricingConfig(c, term.pricingModel);
}

function extractVendorRate(term: AgreementServiceTerm): number {
  const config = term.pricingConfig as PricingConfigShape;
  const vendorPricing = (config?.vendorPricing ??
    null) as VendorPricingShape | null;

  // Get vendor model from vendor pricing or use main model
  const vendorModel =
    (vendorPricing?.pricingModel as PricingModel) ?? term.pricingModel;
  const nestedVendorTotal = sumPricingConfig(vendorPricing, vendorModel);
  if (nestedVendorTotal > 0) return nestedVendorTotal;

  const raw = term.minimumFee;
  if (raw === null || raw === undefined) return 0;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  return isNaN(n) ? 0 : n;
}

// ✅ UPDATED: Accept pricing model to handle percentage-based models
function sumPricingConfig(
  config?: Partial<PricingConfigShape> | VendorPricingShape | null,
  model?: PricingModel | string,
): number {
  if (!config) return 0;

  // For percentage-based models, return percentage value
  if (model && isPercentageBasedModel(model)) {
    if (config.percentage) return parseFloat(config.percentage) || 0;
  }

  if (config.amount) return parseFloat(config.amount) || 0;
  if (config.unitRate) return parseFloat(config.unitRate) || 0;
  if (config.percentage) return parseFloat(config.percentage) || 0;
  if (config.cptCodes?.length) {
    return config.cptCodes.reduce(
      (sum, row) => sum + (parseFloat(row.rate || "0") || 0),
      0,
    );
  }
  if (config.components?.length) {
    return config.components.reduce(
      (sum, component) => sum + (parseFloat(component.value || "0") || 0),
      0,
    );
  }
  return 0;
}

// ✅ FIXED: Default to PENDING instead of APPROVED
function getApprovalStatuses(term: AgreementServiceTerm): {
  clientApprovalStatus: ApprovalStatus;
  internalApprovalStatus: ApprovalStatus;
} {
  const config = term.pricingConfig as any;
  return {
    clientApprovalStatus: config?.clientApprovalStatus ?? "PENDING", // ✅ DEFAULT TO PENDING
    internalApprovalStatus: config?.internalApprovalStatus ?? "PENDING", // ✅ DEFAULT TO PENDING
  };
}

function getOverallStatus(term: AgreementServiceTerm): string {
  const { clientApprovalStatus, internalApprovalStatus } =
    getApprovalStatuses(term);

  // If either is rejected, overall is rejected
  if (
    clientApprovalStatus === "REJECTED" ||
    internalApprovalStatus === "REJECTED"
  ) {
    return "REJECTED";
  }

  // If either is pending, overall is pending
  if (
    clientApprovalStatus === "PENDING" ||
    internalApprovalStatus === "PENDING"
  ) {
    return "PENDING";
  }

  // Both approved
  if (
    clientApprovalStatus === "APPROVED" &&
    internalApprovalStatus === "APPROVED"
  ) {
    return term.isActive ? "ACTIVE" : "INACTIVE";
  }

  return "INACTIVE";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-slate-200 ${className}`} />
  );
}

function SkeletonSummaryCards() {
  return (
    <div className="grid grid-cols-4 gap-3 border-b border-[#f0ece6] p-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 space-y-2"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

function SkeletonTableRows() {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-[#f0ece6] bg-[#faf9f7]">
          {[
            "Service",
            "Pricing Model",
            "Client Rate",
            "Vendor Rate",
            "Margin",
            "Vendor",
            "Status",
          ].map((h) => (
            <th
              key={h}
              className="px-4 py-2.5 text-left text-[12px] font-medium text-slate-500"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[1, 2, 3, 4, 5].map((i) => (
          <tr key={i} className="border-b border-[#f0ece6]">
            <td className="px-4 py-3">
              <Skeleton className="h-4 w-24" />
            </td>
            <td className="px-4 py-3">
              <Skeleton className="h-5 w-28 rounded-full" />
            </td>
            <td className="px-4 py-3">
              <Skeleton className="h-4 w-16 ml-auto" />
            </td>
            <td className="px-4 py-3">
              <Skeleton className="h-4 w-14 ml-auto" />
            </td>
            <td className="px-4 py-3">
              <Skeleton className="h-4 w-10 ml-auto" />
            </td>
            <td className="px-4 py-3">
              <Skeleton className="h-4 w-16" />
            </td>
            <td className="px-4 py-3">
              <Skeleton className="h-5 w-12 rounded-full" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PricingEnginePage() {
  const [searchParams] = useSearchParams();
  const profilePracticeId = searchParams.get("practiceId") || "";
  const profileAgreementId = searchParams.get("agreementId") || "";
  const profileVersionId = searchParams.get("versionId") || "";
  const profileAction = searchParams.get("action") || "";

  const [practices, setPractices] = useState<Practice[]>([]);
  const [selectedPractice, setSelectedPractice] = useState<Practice | null>(
    null,
  );
  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [agreements, setAgreements] = useState<{ id: string; label: string }[]>(
    [],
  );
  const [versions, setVersions] = useState<AgreementVersion[]>([]);

  const [selectedPracticeId, setSelectedPracticeId] = useState("");
  const [selectedAgreementId, setSelectedAgreementId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [terms, setTerms] = useState<AgreementServiceTerm[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [showWizard, setShowWizard] = useState(false);
  const [profileCreateHandled, setProfileCreateHandled] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AgreementServiceTerm | null>(
    null,
  );
  const [showDetail, setShowDetail] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<AgreementServiceTerm | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // ✅ Load initial data (practices, services, vendors)
  useEffect(() => {
    Promise.all([getAllPractices(), getAllServices(), getAllVendorsApi()])
      .then(([p, s, v]) => {
        setPractices(p);
        setServices(s);
        setVendors(v);
      })
      .catch(console.error);
  }, []);

  const activeServices = services.filter((svc) => svc.isActive);

  useEffect(() => {
    if (!profilePracticeId) return;
    setSelectedPracticeId(profilePracticeId);
  }, [profilePracticeId]);

  // ✅ STEP 1: Load agreements when practice changes (FILTERED BY PRACTICE)
  useEffect(() => {
    if (!selectedPracticeId) {
      // Reset everything when no practice is selected
      setAgreements([]);
      setSelectedAgreementId("");
      setVersions([]);
      setSelectedVersionId("");
      setTerms([]);
      return;
    }

    // Load ONLY agreements for this specific practice
    setIsLoading(true);
    getAgreementsView({ practiceId: selectedPracticeId, limit: 100 })
      .then((d) => {
        const practiceAgreements = d.rows.map((r) => ({
          id: r.id,
          label: String(r.values.name || r.id),
        }));
        const nextAgreementId =
          profileAgreementId &&
          practiceAgreements.some(
            (agreement) => agreement.id === profileAgreementId,
          )
            ? profileAgreementId
            : "";
        setAgreements(practiceAgreements);

        // Reset downstream selections
        setSelectedAgreementId(nextAgreementId);
        setVersions([]);
        setSelectedVersionId("");
        setTerms([]);
      })
      .catch((error) => {
        console.error("Failed to load agreements:", error);
        toast.error("Failed to load agreements for this practice");
      })
      .finally(() => setIsLoading(false));
  }, [selectedPracticeId, profileAgreementId]);

  // ✅ Load practice details
  useEffect(() => {
    if (!selectedPracticeId) {
      setSelectedPractice(null);
      return;
    }

    getPractice(selectedPracticeId)
      .then(setSelectedPractice)
      .catch((error) => {
        console.error("Failed to load practice details:", error);
        // Fallback to basic practice data
        setSelectedPractice(
          practices.find((practice) => practice.id === selectedPracticeId) ??
            null,
        );
      });
  }, [selectedPracticeId, practices]);

  // ✅ STEP 2: Load versions when agreement changes (FILTERED BY AGREEMENT)
  useEffect(() => {
    if (!selectedAgreementId) {
      // Reset when no agreement is selected
      setVersions([]);
      setSelectedVersionId("");
      setTerms([]);
      return;
    }

    // Load ONLY versions for this specific agreement
    setIsLoading(true);
    getAgreementVersions({ agreementId: selectedAgreementId, limit: 50 })
      .then((d) => {
        setVersions(d.versions);

        // Auto-select current version or first version
        const requestedVersion = d.versions.find(
          (v) => v.id === profileVersionId,
        );
        const current = d.versions.find((v) => v.isCurrent) ?? d.versions[0];
        const nextVersion = requestedVersion ?? current;
        if (nextVersion) {
          setSelectedVersionId(nextVersion.id);
        } else {
          setSelectedVersionId("");
          setTerms([]);
        }
      })
      .catch((error) => {
        console.error("Failed to load versions:", error);
        toast.error("Failed to load agreement versions");
        setVersions([]);
        setSelectedVersionId("");
        setTerms([]);
      })
      .finally(() => setIsLoading(false));
  }, [selectedAgreementId, profileVersionId]);

  useEffect(() => {
    if (profileCreateHandled || profileAction !== "create") return;
    if (!selectedPracticeId || !selectedAgreementId || !selectedVersionId) {
      return;
    }

    setEditingTerm(null);
    setShowWizard(true);
    setProfileCreateHandled(true);
  }, [
    profileAction,
    profileCreateHandled,
    selectedPracticeId,
    selectedAgreementId,
    selectedVersionId,
  ]);

  // ✅ STEP 3: Load terms when version changes (FILTERED BY VERSION)
  useEffect(() => {
    if (!selectedVersionId || !selectedAgreementId) {
      setTerms([]);
      return;
    }
    loadTerms();
  }, [selectedVersionId, selectedAgreementId]);

  async function loadTerms() {
    if (!selectedVersionId || !selectedAgreementId) return;

    setIsLoading(true);
    try {
      const d = await getPricingTerms({
        agreementId: selectedAgreementId,
        agreementVersionId: selectedVersionId,
        limit: 100,
      });
      setTerms(d.terms || []);
    } catch (e) {
      console.error("Failed to load pricing terms:", e);
      toast.error(
        e instanceof Error ? e.message : "Failed to load pricing terms",
      );
      setTerms([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggingIndex(index);
    e.dataTransfer.setData("text/plain", index.toString());
  }
  function handleDragEnd() {
    setDraggingIndex(null);
  }
  async function handleDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData("text/plain"));
    if (isNaN(dragIndex) || dragIndex === targetIndex) return;

    const reordered = [...terms];
    const [draggedItem] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, draggedItem);

    // Optimistically update the UI
    setTerms(reordered);

    try {
      // Save priorities in parallel (priority is 1-indexed)
      await Promise.all(
        reordered.map((term, index) =>
          updateAgreementServiceTermApi(term.id, { priority: index + 1 }),
        ),
      );
      toast.success("Pricing terms order updated successfully");
    } catch (err) {
      console.error("Failed to update pricing term order:", err);
      toast.error("Failed to save pricing terms order");
      // Reload original terms
      await loadTerms();
    }
  }

  async function handleDelete() {
    if (!selectedTerm) return;
    if (!window.confirm("Delete this pricing term?")) return;
    setIsDeleting(true);
    try {
      await deletePricingTerm(selectedTerm.id);
      toast.success("Pricing term deleted");
      setShowDetail(false);
      setSelectedTerm(null);
      await loadTerms();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  }

  // ✅ Check if we have any percentage-based models
  const hasPercentageModel = terms.some((t) =>
    isPercentageBasedModel(t.pricingModel),
  );

  // ✅ Calculate summary totals
  const totalClient = terms.reduce((s, t) => s + extractClientRate(t), 0);
  const totalVendor = terms.reduce((s, t) => s + extractVendorRate(t), 0);
  const totalMargin = totalClient - totalVendor;
  const marginPct =
    totalClient > 0
      ? Number(((totalMargin / totalClient) * 100).toFixed(2))
      : 0;

  const canAddTerm = !!selectedAgreementId && !!selectedVersionId;

  return (
    <AppLayout
      title="Pricing Engine"
      activeModule="Pricing Engine"
      activeSubItem="Rate Finalization"
      navbarIcon={<DollarSign className="h-4 w-4 text-slate-500" />}
      navbarActions={
        canAddTerm
          ? [
              {
                label: "Add Pricing Term",
                icon: <Plus className="h-4 w-4" />,
                onClick: () => {
                  setEditingTerm(null);
                  setShowWizard(true);
                },
              },
            ]
          : []
      }
    >
      <div className="app-split">
        {/* ── Main table panel ── */}
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white">
          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700">
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              Rate Finalization
            </span>
            {selectedPracticeId && (
              <span className="text-[12px] text-slate-400">
                {practices.find((p) => p.id === selectedPracticeId)?.name ||
                  "Practice"}
                {selectedAgreementId && agreements.length > 0 && (
                  <>
                    {" "}
                    →{" "}
                    {agreements.find((a) => a.id === selectedAgreementId)
                      ?.label || "Agreement"}
                  </>
                )}
                {selectedVersionId && versions.length > 0 && (
                  <>
                    {" "}
                    → v
                    {versions.find((v) => v.id === selectedVersionId)
                      ?.versionNumber || "?"}
                  </>
                )}
              </span>
            )}
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] px-4 py-3">
            {/* ✅ STEP 1: Practice Selection */}
            <div className="w-84">
              <Select
                value={selectedPracticeId}
                onChange={(value) => {
                  setSelectedPracticeId(value);
                  // Reset downstream when practice changes
                  setSelectedAgreementId("");
                  setSelectedVersionId("");
                }}
                placeholder="Select Practice"
                options={practices.map((p) => ({ label: p.name, value: p.id }))}
              />
            </div>

            {/* ✅ STEP 2: Agreement Selection (Only shows if practice is selected) */}
            {selectedPracticeId && agreements.length > 0 && (
              <div className="w-84">
                <Select
                  value={selectedAgreementId}
                  onChange={(value) => {
                    setSelectedAgreementId(value);
                    // Reset version when agreement changes
                    setSelectedVersionId("");
                  }}
                  placeholder={`Select Agreement (${agreements.length})`}
                  options={agreements.map((a) => ({
                    label: a.label,
                    value: a.id,
                  }))}
                />
              </div>
            )}

            {/* ✅ STEP 3: Version Selection (Only shows if agreement is selected) */}
            {selectedAgreementId && versions.length > 0 && (
              <div className="w-42">
                <Select
                  value={selectedVersionId}
                  onChange={setSelectedVersionId}
                  placeholder={`Select Version (${versions.length})`}
                  options={versions.map((v) => ({
                    label: `v${v.versionNumber}${v.isCurrent ? " (current)" : ""}`,
                    value: v.id,
                  }))}
                />
              </div>
            )}

            {canAddTerm && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadTerms}
                  disabled={isLoading}
                  title="Refresh Pricing Terms"
                  className="inline-flex items-center justify-center rounded-md border border-[#ece8e1] bg-white p-1.5 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTerm(null);
                    setShowWizard(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#4f63ea] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#3d4ed1] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Pricing Term
                </button>
                {/* {terms.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowFinalizeConfirm(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Finalize
                  </button>
                )} */}
              </div>
            )}
          </div>

          {/* Summary cards */}
          {/* {isLoading && selectedVersionId ? (
            <SkeletonSummaryCards />
          ) : terms.length > 0 ? (
            <div className="grid grid-cols-4 gap-3 border-b border-[#f0ece6] p-4">
              {[
                {
                  label: hasPercentageModel
                    ? "Total Client Rate"
                    : "Client Revenue",
                  value: hasPercentageModel
                    ? fmtPercent(totalClient)
                    : fmtMoney(totalClient),
                  color: "text-[#4f63ea]",
                },
                {
                  label: hasPercentageModel
                    ? "Total Vendor Rate"
                    : "Vendor Cost",
                  value: hasPercentageModel
                    ? fmtPercent(totalVendor)
                    : fmtMoney(totalVendor),
                  color: "text-red-500",
                },
                {
                  label: "Gross Margin",
                  value: hasPercentageModel
                    ? fmtPercent(totalMargin)
                    : fmtMoney(totalMargin),
                  color: "text-emerald-600",
                },
                {
                  label: "Margin %",
                  value: fmtPercent(marginPct),
                  color: marginPct < 20 ? "text-amber-600" : "text-emerald-600",
                },
              ].map((c) => (
                <div
                  key={c.label}
                  className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3"
                >
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    {c.label}
                  </div>
                  <div className={`mt-1 text-[20px] font-semibold ${c.color}`}>
                    {c.value}
                  </div>
                </div>
              ))}
            </div>
          ) : null} */}

          {/* Table / empty states */}
          <div className="flex-1 overflow-auto">
            {!selectedPracticeId ? (
              <EmptyHint
                icon={<TrendingUp className="h-8 w-8 opacity-30" />}
                text="Select a practice to view pricing terms"
              />
            ) : !selectedAgreementId ? (
              <EmptyHint
                icon={<TrendingUp className="h-8 w-8 opacity-30" />}
                text={
                  agreements.length === 0
                    ? "No agreements found for this practice"
                    : "Select an agreement to configure pricing"
                }
              />
            ) : !selectedVersionId ? (
              <EmptyHint
                icon={<TrendingUp className="h-8 w-8 opacity-30" />}
                text={
                  versions.length === 0
                    ? "No versions found for this agreement"
                    : "Select an agreement version"
                }
              />
            ) : isLoading ? (
              <SkeletonTableRows />
            ) : terms.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                <DollarSign className="h-8 w-8 opacity-30" />
                <p className="text-[14px]">No pricing terms yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTerm(null);
                    setShowWizard(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#4f63ea] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
                >
                  <Plus className="h-4 w-4" /> Add First Pricing Term
                </button>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#f0ece6] bg-[#faf9f7] text-[12px] font-medium text-slate-500">
                    <th className="px-2 py-2 text-center"></th>
                    <th className="px-4 py-2.5 text-left">Service</th>
                    <th className="px-4 py-2.5 text-left">Pricing Model</th>
                    <th className="px-4 py-2.5 text-right">Client Rate</th>
                    <th className="px-4 py-2.5 text-right">Vendor Rate</th>
                    <th className="px-4 py-2.5 text-right">Margin</th>
                    <th className="px-4 py-2.5 text-left">Vendor</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map((term, index) => {
                    const cl = extractClientRate(term);
                    const vn = extractVendorRate(term);
                    const mg = cl - vn;
                    const mp =
                      cl > 0 ? Number(((mg / cl) * 100).toFixed(2)) : 0;
                    const overallStatus = getOverallStatus(term);

                    return (
                      <tr
                        key={term.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => void handleDrop(e, index)}
                        onClick={() => {
                          setSelectedTerm(term);
                          setShowDetail(true);
                        }}
                        className={`
        border-b border-[#f0ece6]
        transition-all duration-200
        ${draggingIndex === index ? "opacity-50 bg-blue-50 scale-[1.01]" : ""}
    `}
                      >
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-2">
                            <GripVertical
                              size={16}
                              className="text-slate-400 cursor-grab active:cursor-grabbing shrink-0"
                            />
                            {/* <span>{index + 1}</span> */}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-700">
                          {term.service?.name ?? "-"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MODEL_COLOR[term.pricingModel] ?? "bg-slate-100 text-slate-600"}`}
                          >
                            {fmtModel(term.pricingModel)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {term.pricingModel === "HYBRID"
                            ? "- "
                            : fmtModelValue(cl, term.pricingModel)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-500">
                          {term.pricingModel === "HYBRID"
                            ? "-"
                            : term.vendorId
                              ? fmtModelValue(vn, term.pricingModel)
                              : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {term.pricingModel === "HYBRID" ? (
                            "- "
                          ) : cl > 0 ? (
                            <span
                              className={
                                mp < 20
                                  ? "text-amber-600 font-medium"
                                  : "text-emerald-600 font-medium"
                              }
                            >
                              {fmtPercent(mp)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">
                          {term.vendor?.name ?? "Vendor not available"}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={overallStatus} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* ── Detail side panel ── */}
        {showDetail && selectedTerm && (
          <TermDetailPanel
            term={selectedTerm}
            onClose={() => {
              setShowDetail(false);
              setSelectedTerm(null);
            }}
            onEdit={() => {
              setEditingTerm(selectedTerm);
              setShowDetail(false);
              setShowWizard(true);
            }}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        )}
      </div>

      {/* ── Wizard MODAL overlay ── */}
      {showWizard && (
        <AddPricingTermWizard
          agreementId={selectedAgreementId}
          agreementVersionId={selectedVersionId}
          services={activeServices}
          vendors={vendors}
          editingTerm={editingTerm}
          defaultSignerEmail={pickDefaultSignerEmail(
            selectedPractice ??
              practices.find((p) => p.id === selectedPracticeId),
          )}
          onClose={() => {
            setShowWizard(false);
            setEditingTerm(null);
          }}
          onSaved={async () => {
            setShowWizard(false);
            setEditingTerm(null);
            await loadTerms();
          }}
        />
      )}

      {/* ── Finalize Confirmation MODAL ── */}
      {showFinalizeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-2xl">
            <div className="px-6 py-5">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="mb-2 text-center text-[18px] font-semibold text-slate-800">
                Finalize Rate Packet
              </h3>
              <p className="text-center text-[14px] leading-relaxed text-slate-500">
                Are you sure you want to finalize this rate packet? This will
                lock the current terms and initiate the signing process.
              </p>
            </div>
            <div className="flex gap-3 bg-[#faf9f7] px-6 py-4">
              <button
                type="button"
                onClick={() => setShowFinalizeConfirm(false)}
                className="flex-1 rounded-xl border border-[#ece8e1] bg-white py-2.5 text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFinalizeConfirm(false);
                  toast.success(
                    "Rate packet finalized and sent for signature.",
                  );
                }}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-[14px] font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Yes, Finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ─── Status Badge Component ────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" />
        Rejected
      </span>
    );
  }
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
      Inactive
    </span>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function EmptyHint({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
      {icon}
      <p className="text-[14px]">{text}</p>
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function TermDetailPanel({
  term,
  onClose,
  onEdit,
  onDelete,
  isDeleting,
}: {
  term: AgreementServiceTerm;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const cfg = term.pricingConfig as PricingConfigShape;
  const client = extractClientRate(term);
  const vendor = extractVendorRate(term);
  const preview = calcMarginPreview(String(client), String(vendor));
  if (term.pricingModel === "HYBRID") {
    const comps = cfg.components ?? [];
    const vendorComps = cfg.vendorPricing?.components ?? [];
    preview.requiresApproval = comps.some((c, idx) => {
      const clientVal = parseFloat(c.value) || 0;
      const vendorVal = term.vendorId
        ? parseFloat(vendorComps[idx]?.value) || 0
        : 0;
      const marginVal = clientVal - vendorVal;
      const marginPct = clientVal > 0 ? (marginVal / clientVal) * 100 : 0;
      return clientVal > 0 && marginPct < 20;
    });
  }
  const { clientApprovalStatus, internalApprovalStatus } =
    getApprovalStatuses(term);
  const isPercentageBased = isPercentageBasedModel(term.pricingModel);

  function InfoRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-[#f0ece6] bg-white p-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <span className="text-[13px] font-medium text-slate-700 break-words whitespace-pre-wrap">
          {value}
        </span>
      </div>
    );
  }

  function ApprovalStatusBadge({
    status,
    label,
    note,
  }: {
    status: ApprovalStatus;
    label: string;
    note?: string | null;
  }) {
    const config = {
      PENDING: { bg: "bg-amber-100", text: "text-amber-700", icon: Clock },
      APPROVED: {
        bg: "bg-green-100",
        text: "text-green-700",
        icon: CheckCircle2,
      },
      REJECTED: { bg: "bg-red-100", text: "text-red-700", icon: XCircle },
    };

    const { bg, text, icon: Icon } = config[status];

    return (
      <div className="flex flex-col gap-1 rounded-lg border border-[#f0ece6] bg-white p-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
          {label}
        </span>
        <div className="flex flex-col gap-1.5">
          <span
            className={`inline-flex items-center gap-1 self-start rounded-full ${bg} px-2 py-0.5 text-xs font-medium ${text}`}
          >
            <Icon className="h-3 w-3" />
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </span>
          {note && (
            <p className="text-[12px] text-slate-500 mt-1 leading-relaxed break-words whitespace-pre-wrap">
              {note}
            </p>
          )}
        </div>
      </div>
    );
  }

  function formatVendorPricing(pricing: any): string {
    if (!pricing) return "-";
    if (typeof pricing === "string") return pricing;

    // ✅ UPDATED: Handle percentage-based models
    if (isPercentageBased) {
      if (pricing.percentage)
        return `${parseFloat(pricing.percentage).toFixed(2)}%`;
    }

    if (pricing.amount) return `$${parseFloat(pricing.amount).toFixed(2)}`;
    if (pricing.percentage)
      return `${parseFloat(pricing.percentage).toFixed(2)}%`;
    if (pricing.unitRate) return `$${parseFloat(pricing.unitRate).toFixed(2)}`;
    if (Array.isArray(pricing.cptCodes))
      return `${pricing.cptCodes.length} CPT code${pricing.cptCodes.length === 1 ? "" : "s"}`;
    if (Array.isArray(pricing.components))
      return `${pricing.components.length} component${pricing.components.length === 1 ? "" : "s"}`;
    return "-";
  }

  function formatSigners(signers?: string | string[] | null): string | null {
    if (!signers) return null;
    if (Array.isArray(signers)) {
      const list = signers.filter(Boolean).map(String);
      return list.length > 0 ? list.join(", ") : null;
    }
    return String(signers).trim() || null;
  }

  const signerEmailsText = formatSigners((cfg as any)?.signerEmails);

  return (
    <aside className="app-panel app-detail-panel flex w-full max-w-full lg:w-[400px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Circle className="h-4 w-4 text-slate-300" />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
          {term.service?.name ?? "Pricing Term"}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md p-1 text-slate-400 hover:text-[#4f63ea]"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Basic Information */}
        <div className="space-y-2">
          <h4 className="text-[13px] font-semibold text-slate-700 mb-3">
            Basic Information
          </h4>

          <div className="flex flex-col gap-1 rounded-lg border border-[#f0ece6] bg-white p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Pricing Model
            </span>
            <span
              className={`inline-flex self-start rounded-full px-2 py-0.5 text-xs font-medium ${MODEL_COLOR[term.pricingModel] ?? "bg-slate-100 text-slate-600"}`}
            >
              {fmtModel(term.pricingModel)}
            </span>
          </div>

          <InfoRow
            label="Vendor"
            value={term.vendor?.name ?? "Vendor not available"}
          />

          <ApprovalStatusBadge
            status={clientApprovalStatus}
            label="Client Approval Status"
            note={cfg.clientApprovalNote}
          />
          <ApprovalStatusBadge
            status={internalApprovalStatus}
            label="Internal Approval Status"
            note={cfg.internalApprovalNote}
          />

          <div className="flex flex-col gap-1 rounded-lg border border-[#f0ece6] bg-white p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Term Status
            </span>
            <span className="text-[13px] font-medium text-slate-700">
              {term.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <InfoRow
            label="Effective Start Date"
            value={
              term.effectiveDate
                ? new Date(term.effectiveDate).toLocaleDateString()
                : undefined
            }
          />
          <InfoRow
            label="Effective End Date"
            value={
              term.endDate
                ? new Date(term.endDate).toLocaleDateString()
                : undefined
            }
          />
          {(cfg.collectionSource || cfg.vendorPricing?.collectionSource) && (
            <InfoRow
              label="Collection Source"
              value={
                cfg.collectionSource ?? cfg.vendorPricing?.collectionSource
              }
            />
          )}
        </div>

        {/* Rate Configuration */}
        {term.pricingModel !== "HYBRID" && (
          <div className="space-y-2">
            <h4 className="text-[13px] font-semibold text-slate-700 mb-3">
              Rate Configuration
            </h4>

            {/* ✅ UPDATED: Use model-aware formatting */}
            <div className="flex flex-col gap-1 rounded-lg border border-[#f0ece6] bg-white p-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {isPercentageBased ? "Client Rate" : "Client Amount"}
              </span>
              <span className="text-[15px] font-semibold text-[#4f63ea] break-words">
                {fmtModelValue(client, term.pricingModel)}
              </span>
            </div>

            {signerEmailsText && (
              <div className="flex flex-col gap-1 rounded-lg border border-[#f0ece6] bg-white p-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Signer Emails
                </span>
                <span className="text-[13px] font-medium text-slate-700 break-words whitespace-pre-wrap leading-relaxed">
                  {signerEmailsText}
                </span>
              </div>
            )}

            {cfg.approvalNotes && (
              <div className="flex flex-col gap-1 rounded-lg border border-[#f0ece6] bg-white p-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Justification / Approval Notes
                </span>
                <span className="text-[13px] font-medium text-slate-700 break-words whitespace-pre-wrap leading-relaxed">
                  {cfg.approvalNotes}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Vendor Pricing */}
        {term.pricingModel !== "HYBRID" && cfg?.vendorPricing && (
          <div className="space-y-2">
            <h4 className="text-[13px] font-semibold text-slate-700 mb-3">
              Vendor Pricing
            </h4>

            {/* ✅ UPDATED: Use model-aware formatting */}
            <div className="flex flex-col gap-1 rounded-lg border border-[#f0ece6] bg-white p-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                {isPercentageBased ? "Vendor Rate" : "Vendor Amount"}
              </span>
              <span className="text-[15px] font-semibold text-red-600 break-words">
                {formatVendorPricing(cfg.vendorPricing)}
              </span>
            </div>

            {cfg.vendorPricing?.collectionSource && (
              <InfoRow
                label="Vendor Collection Source"
                value={cfg.vendorPricing.collectionSource}
              />
            )}
          </div>
        )}

        {/* CPT codes */}
        {(cfg?.cptCodes?.filter((c) => c.code)?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <h4 className="text-[13px] font-semibold text-slate-700 mb-3">
              CPT Codes
            </h4>
            <div className="space-y-2">
              {cfg
                .cptCodes!.filter((c) => c.code)
                .map((c, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 rounded-lg border border-[#f0ece6] bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-[13px] font-semibold text-slate-700">
                        {c.code}
                      </span>
                      <span className="text-[14px] font-semibold text-slate-700 whitespace-nowrap">
                        {fmtMoney(parseFloat(c.rate))}
                      </span>
                    </div>
                    {c.description && (
                      <span className="text-[12px] text-slate-500 break-words">
                        {c.description}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Margin preview */}
        <div className="space-y-2">
          <h4 className="text-[13px] font-semibold text-slate-700 mb-3">
            Margin Preview
          </h4>

          {term.pricingModel === "HYBRID" ? (
            <div className="space-y-3">
              {(cfg.components ?? []).map((component, idx) => {
                const clientVal = parseFloat(component.value) || 0;
                const vendorComp = cfg.vendorPricing?.components?.[idx];
                const vendorVal = vendorComp
                  ? parseFloat(vendorComp.value) || 0
                  : 0;
                const marginVal = clientVal - vendorVal;
                const marginPct =
                  clientVal > 0 ? (marginVal / clientVal) * 100 : 0;
                const isPercent = component.type === "% Collections";

                const formatVal = (val: number) => {
                  if (isPercent) return `${val.toFixed(2)}%`;
                  return `$${val.toFixed(2)}`;
                };

                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-[#f0ece6] bg-[#faf9f7] p-3 space-y-1.5 text-[13px]"
                  >
                    <div className="font-semibold text-slate-700">
                      {component.type || `Component ${idx + 1}`}
                    </div>
                    <div className="flex justify-between text-slate-500 pl-2">
                      <span>Client Rate</span>
                      <span className="font-semibold text-[#4f63ea]">
                        {formatVal(clientVal)}
                      </span>
                    </div>
                    {term.vendorId && (
                      <>
                        <div className="flex justify-between text-slate-500 pl-2">
                          <span>Vendor Rate</span>
                          <span className="font-semibold text-red-500">
                            {formatVal(vendorVal)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-dashed border-[#ece8e1] pt-1 pl-2 font-medium">
                          <span className="text-slate-600">Gross Margin</span>
                          <span
                            className={
                              marginPct < 20
                                ? "text-amber-600 font-semibold"
                                : "text-emerald-600 font-semibold"
                            }
                          >
                            {formatVal(marginVal)} ({marginPct.toFixed(2)}%)
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
              {/* ✅ UPDATED: Use model-aware labels and formatting */}
              <div className="flex flex-col gap-1 rounded-lg border border-[#f0ece6] bg-white p-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {isPercentageBased
                    ? "Est. Client Rate"
                    : "Est. Client Revenue"}
                </span>
                <span className="text-[15px] font-semibold text-[#4f63ea] break-words">
                  {fmtModelValue(preview.clientRevenue, term.pricingModel)}
                </span>
              </div>

              <div className="flex flex-col gap-1 rounded-lg border border-[#f0ece6] bg-white p-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {isPercentageBased ? "Est. Vendor Rate" : "Est. Vendor Cost"}
                </span>
                <span className="text-[15px] font-semibold text-red-600 break-words">
                  {fmtModelValue(preview.vendorCost, term.pricingModel)}
                </span>
              </div>

              <div className="flex flex-col gap-1 rounded-lg border border-[#f0ece6] bg-white p-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Est. Gross Margin
                </span>
                <span className="text-[15px] font-semibold text-emerald-600 break-words">
                  {fmtModelValue(preview.grossMargin, term.pricingModel)}
                </span>
              </div>

              <div className="flex flex-col gap-1 rounded-lg border border-[#f0ece6] bg-white p-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Margin %
                </span>
                <span
                  className={`text-[15px] font-semibold ${preview.marginPct < 20 ? "text-amber-600" : "text-emerald-600"}`}
                >
                  {fmtPercent(preview.marginPct)}
                </span>
              </div>
            </>
          )}

          {preview.requiresApproval && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="break-words">
                {term.pricingModel === "HYBRID"
                  ? "One or more hybrid components has a margin below the 20% threshold"
                  : `Margin below threshold (${preview.marginPct.toFixed(2)}%)`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center gap-1.5 text-[13px] text-red-500 hover:text-red-700 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#4f63ea] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit Term
        </button>
      </div>
    </aside>
  );
}
