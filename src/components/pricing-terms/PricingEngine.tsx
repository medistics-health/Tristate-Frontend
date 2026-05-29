import { useEffect, useState } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { getAllPractices } from "../../services/operations/practices";
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
} from "../../services/operations/pricingEngine";
import type { AgreementServiceTerm } from "../../services/operations/agreements";
import {
  getAgreementsView,
  getAgreementVersions,
  type AgreementVersion,
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

function fmtModel(m: string) {
  return PRICING_MODEL_OPTIONS.find((o) => o.value === m)?.label ?? m.replace(/_/g, " ");
}

function fmtMoney(v?: number | string | null) {
  if (v === undefined || v === null || v === "") return "-";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function extractClientRate(term: AgreementServiceTerm): number {
  const c = term.pricingConfig as PricingConfigShape;
  return parseFloat((c?.amount ?? c?.unitRate ?? c?.percentage ?? "") || "0") || 0;
}

function extractVendorRate(term: AgreementServiceTerm): number {
  // minimumFee can be a string (Prisma Decimal) or number
  const raw = term.minimumFee;
  if (raw === null || raw === undefined) return 0;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw));
  return isNaN(n) ? 0 : n;
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
        <div key={i} className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 space-y-2">
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
          {["Service", "Pricing Model", "Client Rate", "Vendor Rate", "Margin", "Vendor", "Status"].map((h) => (
            <th key={h} className="px-4 py-2.5 text-left text-[12px] font-medium text-slate-500">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[1, 2, 3, 4, 5].map((i) => (
          <tr key={i} className="border-b border-[#f0ece6]">
            <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
            <td className="px-4 py-3"><Skeleton className="h-5 w-28 rounded-full" /></td>
            <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
            <td className="px-4 py-3"><Skeleton className="h-4 w-14 ml-auto" /></td>
            <td className="px-4 py-3"><Skeleton className="h-4 w-10 ml-auto" /></td>
            <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
            <td className="px-4 py-3"><Skeleton className="h-5 w-12 rounded-full" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function PricingEnginePage() {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [agreements, setAgreements] = useState<{ id: string; label: string }[]>([]);
  const [versions, setVersions] = useState<AgreementVersion[]>([]);

  const [selectedPracticeId, setSelectedPracticeId] = useState("");
  const [selectedAgreementId, setSelectedAgreementId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [terms, setTerms] = useState<AgreementServiceTerm[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [showWizard, setShowWizard] = useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AgreementServiceTerm | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<AgreementServiceTerm | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load options on mount
  useEffect(() => {
    Promise.all([getAllPractices(), getAllServices(), getAllVendorsApi()])
      .then(([p, s, v]) => { setPractices(p); setServices(s); setVendors(v); })
      .catch(console.error);
  }, []);

  const activeServices = services.filter((svc) => svc.isActive);

  // Load agreements when practice changes
  useEffect(() => {
    if (!selectedPracticeId) { setAgreements([]); setSelectedAgreementId(""); setVersions([]); setSelectedVersionId(""); return; }
    getAgreementsView({ practiceId: selectedPracticeId, limit: 100 })
      .then((d) => setAgreements(d.rows.map((r) => ({ id: r.id, label: String(r.values.name || r.id) }))))
      .catch(console.error);
  }, [selectedPracticeId]);

  // Load versions when agreement changes
  useEffect(() => {
    if (!selectedAgreementId) { setVersions([]); setSelectedVersionId(""); setTerms([]); return; }
    getAgreementVersions({ agreementId: selectedAgreementId, limit: 50 })
      .then((d) => {
        setVersions(d.versions);
        // auto-select the current version
        const current = d.versions.find((v) => v.isCurrent) ?? d.versions[0];
        setSelectedVersionId(current?.id ?? "");
      })
      .catch(console.error);
  }, [selectedAgreementId]);

  // Load terms when version changes
  useEffect(() => {
    if (!selectedVersionId) { setTerms([]); return; }
    loadTerms();
  }, [selectedVersionId]);

  async function loadTerms() {
    if (!selectedVersionId) return;
    setIsLoading(true);
    try {
      const d = await getPricingTerms({ agreementId: selectedAgreementId, agreementVersionId: selectedVersionId, limit: 100 });
      setTerms(d.terms);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load terms");
    } finally {
      setIsLoading(false);
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

  // Summary totals
  const totalClient = terms.reduce((s, t) => s + extractClientRate(t), 0);
  const totalVendor = terms.reduce((s, t) => s + extractVendorRate(t), 0);
  const totalMargin = totalClient - totalVendor;
  const marginPct = totalClient > 0 ? Math.round((totalMargin / totalClient) * 100) : 0;

  const canAddTerm = !!selectedAgreementId && !!selectedVersionId;

  return (
    <AppLayout
      title="Pricing Engine"
      activeModule="Pricing Engine"
      activeSubItem="Rate Finalization"
      navbarIcon={<DollarSign className="h-4 w-4 text-slate-500" />}
      navbarActions={canAddTerm ? [{
        label: "Add Pricing Term",
        icon: <Plus className="h-4 w-4" />,
        onClick: () => { setEditingTerm(null); setShowWizard(true); },
      }] : []}
    >
      <div className="flex h-full gap-2">

        {/* ── Main table panel ── */}
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white">

          {/* Toolbar */}
          <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-700">
              <LayoutList className="h-3.5 w-3.5 text-slate-400" />
              Rate Finalization
            </span>
          </div>

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#f0ece6] px-4 py-3">
            <div className="w-84">
              <Select
                value={selectedPracticeId}
                onChange={setSelectedPracticeId}
                placeholder="Select Practice"
                options={practices.map(p => ({ label: p.name, value: p.id }))}
              />
            </div>

            {agreements.length > 0 && (
              <div className="w-84">
                <Select
                  value={selectedAgreementId}
                  onChange={setSelectedAgreementId}
                  placeholder="Select Agreement"
                  options={agreements.map(a => ({ label: a.label, value: a.id }))}
                />
              </div>
            )}

            {versions.length > 0 && (
              <div className="w-42">
                <Select
                  value={selectedVersionId}
                  onChange={setSelectedVersionId}
                  placeholder="Select Version"
                  options={versions.map(v => ({
                    label: `v${v.versionNumber}${v.isCurrent ? " (current)" : ""}`,
                    value: v.id
                  }))}
                />
              </div>
            )}

            {canAddTerm && (
              <div className="ml-auto flex items-center gap-2">
                <button type="button"
                  onClick={() => { setEditingTerm(null); setShowWizard(true); }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#4f63ea] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#3d4ed1] transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add Pricing Term
                </button>
                {terms.length > 0 && (
                  <button type="button"
                    onClick={() => setShowFinalizeConfirm(true)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Finalize
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Summary cards — skeleton while loading, real values when loaded */}
          {isLoading && selectedVersionId ? (
            <SkeletonSummaryCards />
          ) : terms.length > 0 ? (
            <div className="grid grid-cols-4 gap-3 border-b border-[#f0ece6] p-4">
              {[
                { label: "Client Revenue", value: fmtMoney(totalClient), color: "text-[#4f63ea]" },
                { label: "Vendor Cost", value: fmtMoney(totalVendor), color: "text-red-500" },
                { label: "Gross Margin", value: fmtMoney(totalMargin), color: "text-emerald-600" },
                { label: "Margin %", value: `${marginPct}%`, color: marginPct < 20 ? "text-amber-600" : "text-emerald-600" },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{c.label}</div>
                  <div className={`mt-1 text-[20px] font-semibold ${c.color}`}>{c.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Table / empty states */}
          <div className="flex-1 overflow-auto">
            {!selectedPracticeId ? (
              <EmptyHint icon={<TrendingUp className="h-8 w-8 opacity-30" />} text="Select a practice to view pricing terms" />
            ) : !selectedAgreementId ? (
              <EmptyHint icon={<TrendingUp className="h-8 w-8 opacity-30" />} text="Select an agreement to configure pricing" />
            ) : !selectedVersionId ? (
              <EmptyHint icon={<TrendingUp className="h-8 w-8 opacity-30" />} text="Select an agreement version" />
            ) : isLoading ? (
              <SkeletonTableRows />
            ) : terms.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                <DollarSign className="h-8 w-8 opacity-30" />
                <p className="text-[14px]">No pricing terms yet.</p>
                <button type="button" onClick={() => { setEditingTerm(null); setShowWizard(true); }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#4f63ea] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]">
                  <Plus className="h-4 w-4" /> Add First Pricing Term
                </button>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#f0ece6] bg-[#faf9f7] text-[12px] font-medium text-slate-500">
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
                  {terms.map((term) => {
                    const cl = extractClientRate(term);
                    const vn = extractVendorRate(term);
                    const mg = cl - vn;
                    const mp = cl > 0 ? Math.round((mg / cl) * 100) : 0;
                    return (
                      <tr key={term.id}
                        onClick={() => { setSelectedTerm(term); setShowDetail(true); }}
                        className="cursor-pointer border-b border-[#f0ece6] hover:bg-[#faf9f7] transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-700">{term.service?.name ?? "-"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MODEL_COLOR[term.pricingModel] ?? "bg-slate-100 text-slate-600"}`}>
                            {fmtModel(term.pricingModel)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">{cl > 0 ? fmtMoney(cl) : "-"}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500">{vn > 0 ? fmtMoney(vn) : "-"}</td>
                        <td className="px-4 py-2.5 text-right">
                          {cl > 0 ? <span className={mp < 20 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>{mp}%</span> : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500">{term.vendor?.name ?? "-"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${term.isActive ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-600"}`}>
                            {term.isActive ? "Active" : "Inactive"}
                          </span>
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
            onClose={() => { setShowDetail(false); setSelectedTerm(null); }}
            onEdit={() => { setEditingTerm(selectedTerm); setShowDetail(false); setShowWizard(true); }}
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
          defaultSignerEmail={practices.find((p) => p.id === selectedPracticeId)?.persons?.find(Boolean)?.email ?? null}
          onClose={() => { setShowWizard(false); setEditingTerm(null); }}
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
              <h3 className="mb-2 text-center text-[18px] font-semibold text-slate-800">Finalize Rate Packet</h3>
              <p className="text-center text-[14px] leading-relaxed text-slate-500">
                Are you sure you want to finalize this rate packet? This will lock the current terms and initiate the signing process.
              </p>
            </div>
            <div className="flex gap-3 bg-[#faf9f7] px-6 py-4">
              <button type="button" onClick={() => setShowFinalizeConfirm(false)}
                className="flex-1 rounded-xl border border-[#ece8e1] bg-white py-2.5 text-[14px] font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                Cancel
              </button>
              <button type="button"
                onClick={() => {
                  setShowFinalizeConfirm(false);
                  toast.success("Rate packet finalized and sent for signature.");
                }}
                className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-[14px] font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm">
                Yes, Finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
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
  term, onClose, onEdit, onDelete, isDeleting,
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

  function InfoRow({ label, value }: { label: string; value?: string | null }) {
    if (!value) return null;
    return (
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-slate-400">{label}</span>
        <span className="text-right font-medium text-slate-700">{value}</span>
      </div>
    );
  }

  return (
    <aside className="app-panel flex w-[360px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <Circle className="h-4 w-4 text-slate-300" />
        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-slate-700">
          {term.service?.name ?? "Pricing Term"}
        </span>
        <button type="button" onClick={onEdit} className="rounded-md p-1 text-slate-400 hover:text-[#4f63ea]">
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-2.5 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3">
          <InfoRow label="Pricing Model" value={fmtModel(term.pricingModel)} />
          <InfoRow label="Vendor" value={term.vendor?.name} />
          <InfoRow label="Currency" value={term.currency} />
          <InfoRow label="Status" value={term.isActive ? "Active" : "Inactive"} />
          <InfoRow label="Effective Date" value={term.effectiveDate ? new Date(term.effectiveDate).toLocaleDateString() : undefined} />
          <InfoRow label="End Date" value={term.endDate ? new Date(term.endDate).toLocaleDateString() : undefined} />
        </div>

        {/* Config values */}
        {Object.entries(cfg ?? {}).filter(([k, v]) => v && !["cptCodes", "components"].includes(k)).length > 0 && (
          <div>
            <h4 className="mb-2 text-[13px] font-medium text-slate-700">Rate Configuration</h4>
            <div className="space-y-2 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3">
              {Object.entries(cfg ?? {}).map(([k, v]) => {
                if (!v || ["cptCodes", "components"].includes(k)) return null;
                const label = k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                return <InfoRow key={k} label={label} value={String(v)} />;
              })}
            </div>
          </div>
        )}

        {/* CPT codes */}
        {(cfg?.cptCodes?.filter((c) => c.code)?.length ?? 0) > 0 && (
          <div>
            <h4 className="mb-2 text-[13px] font-medium text-slate-700">CPT Codes</h4>
            {cfg.cptCodes!.filter((c) => c.code).map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-[#f0ece6] px-3 py-2 mb-1 text-[13px]">
                <div><span className="font-mono font-medium text-slate-700">{c.code}</span><span className="ml-2 text-slate-400">{c.description}</span></div>
                <span className="text-slate-700">{fmtMoney(parseFloat(c.rate))}</span>
              </div>
            ))}
          </div>
        )}

        {/* Margin preview */}
        <div>
          <h4 className="mb-2 text-[13px] font-medium text-slate-700">Margin Preview</h4>
          <div className="space-y-2 rounded-xl border border-[#f0ece6] bg-[#faf9f7] p-3 text-[13px]">
            <InfoRow label="Est. Client Revenue" value={fmtMoney(preview.clientRevenue)} />
            <InfoRow label="Est. Vendor Cost" value={fmtMoney(preview.vendorCost)} />
            <InfoRow label="Est. Gross Margin" value={fmtMoney(preview.grossMargin)} />
            <div className="flex items-center justify-between border-t border-[#f0ece6] pt-2">
              <span className="text-slate-400">Margin %</span>
              <span className={`text-[15px] font-bold ${preview.marginPct < 20 ? "text-amber-600" : "text-emerald-600"}`}>{preview.marginPct}%</span>
            </div>
          </div>
          {preview.requiresApproval && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Margin below threshold — manager approval required
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
        <button type="button" onClick={onDelete} disabled={isDeleting}
          className="flex items-center gap-1.5 text-[13px] text-red-500 hover:text-red-700 disabled:opacity-50">
          <Trash2 className="h-4 w-4" />{isDeleting ? "Deleting…" : "Delete"}
        </button>
        <button type="button" onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#4f63ea] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]">
          <Pencil className="h-3.5 w-3.5" /> Edit Term
        </button>
      </div>
    </aside>
  );
}
