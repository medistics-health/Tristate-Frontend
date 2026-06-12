import { Plus, Trash2 } from "lucide-react";
import type { PricingModel } from "../../services/operations/agreements";
import type { PricingConfigShape, CptCodeRow, HybridComponent } from "../../services/operations/pricingEngine";
import { PRICING_MODEL_OPTIONS } from "../../services/operations/pricingEngine";
import DatePicker from "../shared/DatePicker";
import Select from "../shared/Select";

const HYBRID_TYPES = ["% Collections","Monthly Minimum","Per Encounter","Fixed Monthly","Per Patient"];

// Field component defined at MODULE level — avoids focus loss on state update
type FProps = { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean; };
export function Field({ label, value, onChange, type = "text", placeholder = "", required = false }: FProps) {
  return (
    <div>
      <label className="mb-1 block text-[13px] font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="app-control w-full rounded-md px-3 py-2 text-[13px]"
      />
    </div>
  );
}

type Props = { model: PricingModel; cfg: PricingConfigShape; upd: (p: Partial<PricingConfigShape>) => void };

export function RateFormFields({ model, cfg, upd }: Props) {
  const label = PRICING_MODEL_OPTIONS.find((o) => o.value === model)?.label ?? model;
  const today = new Date().toISOString().split("T")[0];

  const dates = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">
          Effective Start Date <span className="text-red-500">*</span>
        </label>
        <DatePicker value={cfg.effectiveStartDate ?? ""} onChange={(v) => upd({ effectiveStartDate: v })} />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-slate-700">
          Effective End Date <span className="text-red-500">*</span>
        </label>
        <DatePicker value={cfg.effectiveEndDate ?? ""} onChange={(v) => upd({ effectiveEndDate: v })} minDate={today} />
      </div>
    </div>
  );

  if (["FIXED_MONTHLY","RETAINER","FIXED_ONE_TIME"].includes(model)) {
    return (
      <div className="space-y-4">
        <h3 className="text-[15px] font-semibold text-slate-700">{label}</h3>
        <Field label={model === "FIXED_ONE_TIME" ? "One-Time Amount (USD)" : "Monthly Amount (USD)"}
          type="number" value={cfg.amount ?? ""} onChange={(v) => upd({ amount: v })} placeholder="0.00" required />
        {dates}
      </div>
    );
  }

  if (["PERCENT_COLLECTIONS","PERCENT_REVENUE","SUCCESS_FEE"].includes(model)) {
    return (
      <div className="space-y-4">
        <h3 className="text-[15px] font-semibold text-slate-700">{label}</h3>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Percentage (%)"    type="number" value={cfg.percentage ?? ""}  onChange={(v) => upd({ percentage: v })}  placeholder="e.g. 6" required />
          <Field label="Minimum Fee (USD)" type="number" value={cfg.minimumFee ?? ""}  onChange={(v) => upd({ minimumFee: v })}  placeholder="0.00" />
          <Field label="Maximum Fee (USD)" type="number" value={cfg.maximumFee ?? ""}  onChange={(v) => upd({ maximumFee: v })}  placeholder="0.00" />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Collection Source <span className="text-red-500">*</span>
          </label>
          <Select
            value={cfg.collectionSource ?? "PM System"}
            onChange={(v) => upd({ collectionSource: v })}
            options={["PM System","Manual Upload","EHR Export"].map(s => ({ label: s, value: s }))}
          />
        </div>
        {dates}
      </div>
    );
  }

  if (["PER_ENCOUNTER","PER_PATIENT","PER_PROVIDER","PER_SITE","PER_UNIT"].includes(model)) {
    return (
      <div className="space-y-4">
        <h3 className="text-[15px] font-semibold text-slate-700">{label}</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rate per Unit (USD)" type="number" value={cfg.unitRate ?? ""}    onChange={(v) => upd({ unitRate: v })}    placeholder="0.00" required />
          <Field label="Minimum Fee (USD)"   type="number" value={cfg.minimumFee ?? ""}  onChange={(v) => upd({ minimumFee: v })}  placeholder="0.00" />
        </div>
        {dates}
      </div>
    );
  }

  if (model === "PER_CPT_CODE") {
    const codes: CptCodeRow[] = cfg.cptCodes ?? [{ code: "", description: "", rate: "" }];
    return (
      <div className="space-y-4">
        <h3 className="text-[15px] font-semibold text-slate-700">CPT Code Pricing</h3>
        <div className="overflow-hidden rounded-xl border border-[#f0ece6]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#f0ece6] bg-[#faf9f7]">
                <th className="px-3 py-2 text-left font-medium text-slate-500">CPT Code <span className="text-red-500">*</span></th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Description</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Rate (USD) <span className="text-red-500">*</span></th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c, i) => (
                <tr key={i} className="border-b border-[#f0ece6]">
                  <td className="px-3 py-2">
                    <input value={c.code} placeholder="99490"
                      onChange={(e) => { const n=[...codes]; n[i]={...n[i],code:e.target.value}; upd({cptCodes:n}); }}
                      className="app-control w-full rounded px-2 py-1.5 text-[12px]" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={c.description} placeholder="CCM"
                      onChange={(e) => { const n=[...codes]; n[i]={...n[i],description:e.target.value}; upd({cptCodes:n}); }}
                      className="app-control w-full rounded px-2 py-1.5 text-[12px]" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" value={c.rate} placeholder="28.00"
                      onChange={(e) => { const n=[...codes]; n[i]={...n[i],rate:e.target.value}; upd({cptCodes:n}); }}
                      className="app-control w-full rounded px-2 py-1.5 text-[12px]" />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button type="button" onClick={() => upd({cptCodes:codes.filter((_,j)=>j!==i)})} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => upd({cptCodes:[...codes,{code:"",description:"",rate:""}]})}
          className="inline-flex items-center gap-1 text-[12px] text-[#4f63ea] hover:underline">
          <Plus className="h-3.5 w-3.5" /> Add CPT Code
        </button>
        {dates}
      </div>
    );
  }

  if (model === "HYBRID") {
    const comps: HybridComponent[] = cfg.components ?? [{ type: HYBRID_TYPES[0], value: "" }];
    return (
      <div className="space-y-4">
        <h3 className="text-[15px] font-semibold text-slate-700">Hybrid / Multi-Component Pricing</h3>
        <div className="space-y-2">
          {comps.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={c.type}
                  onChange={(v) => { const n=[...comps]; n[i]={...n[i],type:v}; upd({components:n}); }}
                  options={HYBRID_TYPES.filter(t => {
                    const selectedByOther = comps.some((comp, idx) => idx !== i && comp.type === t);
                    if (selectedByOther) return false;
                    if (t === "Fixed Monthly" && comps.some((comp, idx) => idx !== i && comp.type === "Monthly Minimum")) return false;
                    if (t === "Monthly Minimum" && comps.some((comp, idx) => idx !== i && comp.type === "Fixed Monthly")) return false;
                    return true;
                  }).map(t => ({ label: t, value: t }))}
                />
              </div>
              <input type="number" value={c.value} placeholder="Value"
                onChange={(e) => { const n=[...comps]; n[i]={...n[i],value:e.target.value}; upd({components:n}); }}
                className="app-control w-32 rounded-md px-3 py-2 text-[13px]" />
              <button type="button" onClick={() => upd({components:comps.filter((_,j)=>j!==i)})} className="shrink-0 text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {comps.length < 4 && (
            <button type="button" onClick={() => {
              const selectedTypes = comps.map(c => c.type);
              const firstAvailable = HYBRID_TYPES.find(t => {
                if (selectedTypes.includes(t)) return false;
                if (t === "Fixed Monthly" && selectedTypes.includes("Monthly Minimum")) return false;
                if (t === "Monthly Minimum" && selectedTypes.includes("Fixed Monthly")) return false;
                return true;
              }) || HYBRID_TYPES[0];
              upd({components:[...comps,{type:firstAvailable,value:""}]});
            }}
              className="inline-flex items-center gap-1 text-[12px] text-[#4f63ea] hover:underline">
              <Plus className="h-3.5 w-3.5" /> Add Component
            </button>
          )}
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            Collection Source <span className="text-red-500">*</span>
          </label>
          <Select
            value={cfg.collectionSource ?? "PM System"}
            onChange={(v) => upd({ collectionSource: v })}
            options={["PM System","Manual Upload","EHR Export"].map(s => ({ label: s, value: s }))}
          />
        </div>
        {dates}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[15px] font-semibold text-slate-700">{label}</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rate / Amount (USD)" type="number" value={cfg.amount ?? ""}     onChange={(v) => upd({ amount: v })}     placeholder="0.00" required />
        <Field label="Minimum Fee (USD)"   type="number" value={cfg.minimumFee ?? ""} onChange={(v) => upd({ minimumFee: v })} placeholder="0.00" />
      </div>
      {dates}
    </div>
  );
}
