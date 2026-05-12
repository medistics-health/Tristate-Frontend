import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, X } from "lucide-react";
import toast from "react-hot-toast";
import {
  PRICING_MODEL_OPTIONS, calcMarginPreview, emptyConfig,
  createPricingTerm, updatePricingTerm,
  type PricingConfigShape,
} from "../../services/operations/pricingEngine";
import type { AgreementServiceTerm, PricingModel } from "../../services/operations/agreements";
import { RateFormFields } from "./RateFormFields";
import Select from "../shared/Select";

const STEPS = ["Service","Model","Rates","Vendor","Margin","Approval","Finalize"];

type Props = {
  agreementId: string;
  agreementVersionId: string;
  services: { id: string; name: string }[];
  vendors:  { id: string; name: string }[];
  editingTerm: AgreementServiceTerm | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddPricingTermWizard({
  agreementId, agreementVersionId, services, vendors, editingTerm, onClose, onSaved,
}: Props) {
  const [step, setStep]           = useState(0);
  const [serviceId, setSvc]       = useState(editingTerm?.serviceId ?? "");
  const [model, setModel]         = useState<PricingModel>(editingTerm?.pricingModel ?? "FIXED_MONTHLY");
  const [cfg, setCfg]             = useState<PricingConfigShape>(
    editingTerm ? (editingTerm.pricingConfig as PricingConfigShape) : emptyConfig()
  );
  const [hasVendor, setHasVendor] = useState(!!editingTerm?.vendorId);
  const [vendorId, setVId]        = useState(editingTerm?.vendorId ?? "");
  const [vendorRate, setVRate]    = useState(editingTerm?.minimumFee != null ? String(editingTerm.minimumFee) : "");
  const [approvalNotes, setNotes] = useState("");
  const [signerEmail, setEmail]   = useState("");
  const [saving, setSaving]       = useState(false);

  const upd = (p: Partial<PricingConfigShape>) => setCfg((prev) => ({ ...prev, ...p }));
  const clientStr = cfg.amount ?? cfg.unitRate ?? cfg.percentage ?? "";
  const preview   = calcMarginPreview(clientStr, vendorRate);

  const canNext = step === 0 ? !!serviceId : step === 1 ? !!model : true;

  async function submit() {
    if (!agreementId || !agreementVersionId || !serviceId || !model) {
      toast.error("Agreement, version, service and model are required"); return;
    }
    setSaving(true);
    try {
      const payload = {
        agreementId, agreementVersionId, serviceId, pricingModel: model,
        pricingConfig: { ...cfg, approvalNotes } as Record<string, unknown>,
        vendorId: hasVendor && vendorId ? vendorId : null,
        minimumFee: hasVendor && vendorRate ? parseFloat(vendorRate) : null,
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
                  <div>
                    <label className="mb-1 block font-medium text-slate-700">Vendor Rate (USD)</label>
                    <input type="number" value={vendorRate} placeholder="0.00"
                      onChange={(e) => setVRate(e.target.value)}
                      className="app-control w-full rounded-md px-3 py-2 text-[13px]" />
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
                  ["Margin %",           `${preview.marginPct}%`,                       preview.marginPct < 20 ? "text-amber-600" : "text-emerald-600"],
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
                    <p className="text-[12px] mt-0.5">Margin {preview.marginPct}% is below the 20% threshold. Proceed to step 6 to add approval notes.</p>
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
                      <p className="text-[12px] mt-0.5">Margin is {preview.marginPct}%, below the minimum 20% threshold. Please request manager approval before finalizing.</p>
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
                    <p className="text-[12px] mt-0.5">Margin of {preview.marginPct}% meets the minimum threshold. You can proceed to finalize.</p>
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
                    ["Vendor Rate", `$${preview.vendorCost.toLocaleString()}`],
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
                    ${preview.grossMargin.toLocaleString()} ({preview.marginPct}%)
                  </span>
                </div>
              </div>

              {/* Signer email */}
              <div>
                <label className="mb-1 block font-medium text-slate-700">Signer Email <span className="text-slate-400 font-normal">(optional)</span></label>
                <input type="email" value={signerEmail} onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="app-control w-full rounded-md px-3 py-2 text-[13px]" />
                <p className="mt-1 text-[12px] text-slate-400">If provided, the rate packet will be sent to this email for signature.</p>
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
            <button type="button" onClick={() => canNext && setStep(step+1)} disabled={!canNext}
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
