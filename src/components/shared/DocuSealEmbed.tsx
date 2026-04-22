import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DocusealForm } from "@docuseal/react";

type DocuSealEmbedProps = {
  formId: string;
  formSlug?: string;
  signerEmail?: string;
  signerName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSigned?: (data: {
    signatureId: string;
    documentId: string;
    slug: string;
    submitterUuid?: string;
  }) => void;
  onDeclined?: (data: { reason?: string }) => void;
  onSubmitted?: () => void;
  onLoad?: () => void;
  disabledSign?: boolean;
};

export function DocuSealEmbed({
  formId,
  formSlug,
  signerEmail,
  signerName,
  isOpen,
  onClose,
  onSigned,
  onDeclined,
  onSubmitted,
  onLoad,
  disabledSign = false,
}: DocuSealEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleSigned = (event: Event) => {
      const customEvent = event as CustomEvent;
      onSigned?.({
        signatureId: customEvent.detail?.id?.toString() || "",
        documentId: customEvent.detail?.document_id?.toString() || "",
        slug: formSlug || "",
        submitterUuid: customEvent.detail?.submitter_uuid,
      });
    };

    const handleDeclined = (event: Event) => {
      const customEvent = event as CustomEvent;
      onDeclined?.({ reason: customEvent.detail?.reason });
    };

    const handleSubmitted = () => {
      onSubmitted?.();
    };

    document.addEventListener("signed", handleSigned);
    document.addEventListener("declined", handleDeclined);
    document.addEventListener("submitted", handleSubmitted);

    return () => {
      document.removeEventListener("signed", handleSigned);
      document.removeEventListener("declined", handleDeclined);
      document.removeEventListener("submitted", handleSubmitted);
    };
  }, [isOpen, formSlug, onSigned, onDeclined, onSubmitted]);

  if (!isOpen) return null;

  const formUrl = formSlug
    ? `https://docuseal.com/d/${formSlug}`
    : `https://docuseal.com/d/${formId}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative flex h-[90vh] w-[90vw] max-w-6xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#f0ece6] px-4 py-3">
          <h2 className="text-[15px] font-semibold text-slate-700">
            Sign Document
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex-1 overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4f63ea] border-t-transparent" />
            </div>
          )}

          <DocusealForm
            src={formUrl}
            email={signerEmail}
            name={signerName}
            disabledSign={disabledSign}
            onLoad={() => {
              setIsLoading(false);
              onLoad?.();
            }}
          />
        </div>
      </div>
    </div>
  );
}

type DocuSealButtonProps = {
  formId?: string;
  formSlug?: string;
  signerEmail?: string;
  signerName?: string;
  buttonText?: string;
  onSigned?: (data: {
    signatureId: string;
    documentId: string;
    slug: string;
    submitterUuid?: string;
  }) => void;
  onDeclined?: (data: { reason?: string }) => void;
  onSubmitted?: () => void;
  variant?: "primary" | "secondary" | "outline";
  className?: string;
  disabledSign?: boolean;
};

export function DocuSealButton({
  formId,
  formSlug,
  signerEmail,
  signerName,
  buttonText = "Sign Document",
  onSigned,
  onDeclined,
  onSubmitted,
  variant = "primary",
  className = "",
  disabledSign = false,
}: DocuSealButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const baseClasses =
    "inline-flex items-center gap-2 rounded-md px-4 py-2 text-[13px] font-medium transition-colors";

  const variantClasses = {
    primary: "bg-[#4f63ea] text-white hover:bg-[#3d4ed1]",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    outline: "border border-[#ece8e1] text-slate-600 hover:bg-[#f7f5f1]",
  };

  const handleSigned = (data: {
    signatureId: string;
    documentId: string;
    slug: string;
    submitterUuid?: string;
  }) => {
    onSigned?.(data);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        disabled={!formId && !formSlug}
      >
        {buttonText}
      </button>

      <DocuSealEmbed
        formId={formId || ""}
        formSlug={formSlug}
        signerEmail={signerEmail}
        signerName={signerName}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSigned={handleSigned}
        onDeclined={onDeclined}
        onSubmitted={onSubmitted}
        disabledSign={disabledSign}
      />
    </>
  );
}