import { useEffect, useState } from "react";

export type SigningOrder =
  | ["First Party", "Second Party"]
  | ["Second Party", "First Party"];

export const TRISTATE_FIRST_ORDER: SigningOrder = [
  "First Party",
  "Second Party",
];

export const CLIENT_FIRST_ORDER: SigningOrder = [
  "Second Party",
  "First Party",
];

type SigningOrderPromptProps = {
  open: boolean;
  confirmLabel?: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: (signingOrder: SigningOrder) => void;
};

export default function SigningOrderPrompt({
  open,
  confirmLabel = "Send agreement",
  isSubmitting = false,
  onCancel,
  onConfirm,
}: SigningOrderPromptProps) {
  const [signingOrder, setSigningOrder] =
    useState<SigningOrder>(TRISTATE_FIRST_ORDER);

  useEffect(() => {
    if (open) {
      setSigningOrder(TRISTATE_FIRST_ORDER);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-[#f0ece6] bg-white p-5 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signing-order-title"
      >
        <h2
          id="signing-order-title"
          className="text-[15px] font-semibold text-slate-800"
        >
          Who should sign first?
        </h2>
        <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
        Choose who signs first. The second signer is emailed once the first has signed.
        </p>

        <div className="mt-4 space-y-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-3">
            <input
              type="radio"
              name="signingOrder"
              className="mt-1"
              checked={signingOrder[0] === "First Party"}
              onChange={() => setSigningOrder(TRISTATE_FIRST_ORDER)}
            />
            <span>
              <span className="block text-[13px] font-medium text-slate-700">
              Tristate signs first, then the client
              </span>
              <span className="block text-[12px] text-slate-500">
              Your authorized signer signs first, then the practice contact.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-3">
            <input
              type="radio"
              name="signingOrder"
              className="mt-1"
              checked={signingOrder[0] === "Second Party"}
              onChange={() => setSigningOrder(CLIENT_FIRST_ORDER)}
            />
            <span>
              <span className="block text-[13px] font-medium text-slate-700">
              Client signs first, then Tristate
              </span>
              <span className="block text-[12px] text-slate-500">
              The practice contact signs first, then your authorized signer.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-md border border-[#ece8e1] px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(signingOrder)}
            disabled={isSubmitting}
            className="rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1] disabled:opacity-50"
          >
            {isSubmitting ? "Sending..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
