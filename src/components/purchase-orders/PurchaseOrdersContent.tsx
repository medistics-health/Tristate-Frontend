import { LayersPlus } from "lucide-react";

function PurchaseOrdersContent() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#ece8e1] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
        <button className="flex h-5 w-5 items-center justify-center rounded border border-[#ece8e1] text-[11px] text-slate-400">
          /
        </button>
        <button className="flex h-5 w-5 items-center justify-center rounded border border-[#ece8e1] text-slate-400">
          @
        </button>
        <span className="ml-2 text-[15px] font-medium text-slate-700">
          Unpaid POs
        </span>
        <span className="text-[14px] text-slate-400">· 0</span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-400">
          <path
            d="M5 7.5L10 12.5L15 7.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="ml-auto flex items-center gap-6 text-[14px] text-slate-500">
          <button>Filter</button>
          <button>Sort</button>
          <button>Options</button>
        </div>
      </div>

      <div className="border-b border-[#f0ece6] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-md bg-[#eef3ff] px-3 py-1.5 text-[13px] font-medium text-[#5b71ad]">
            <span className="text-[11px]">123</span>
            <span>Status: APPROVED</span>
            <button className="text-[#8393c0]">×</button>
          </div>
          <button className="text-[14px] text-slate-500">+ Add filter</button>
        </div>
      </div>

      <div className="flex items-center gap-5 border-b border-[#f7f2ec] px-5 py-3 text-slate-300">
        <span className="flex h-4 w-4 rounded border border-[#e9e4dc]" />
        <span className="text-lg leading-none">+</span>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        <div className="absolute inset-y-0 left-0 w-px bg-[#f7f2ec]" />

        <div className="flex max-w-md flex-col items-center px-6 text-center">
          <div className="mb-3 ">
            <LayersPlus className="h-10 w-10" />
          </div>

          <h1 className="text-xl font-semibold tracking-[-0.03em] text-slate-700">
            Add your first Purchase Order
          </h1>
          <p className="mt-2 text-lg text-slate-400">
            Use our API or add your first Purchase Order manually
          </p>
          <button className="mt-6 rounded-md cursor-pointer border border-[#e8e3db] bg-white px-3 py-2 text-md font-medium text-slate-700 shadow-sm">
            + Add a Purchase Order
          </button>
        </div>
      </div>
    </div>
  );
}

export default PurchaseOrdersContent;
