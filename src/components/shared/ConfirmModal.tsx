import React from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle } from "lucide-react";

type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  onSecondaryConfirm?: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  confirmLabel?: string;
  secondaryLabel?: string;
  cancelLabel?: string;
  type?: "primary" | "danger" | "success";
  isConfirming?: boolean;
  closeOnConfirm?: boolean;
};

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  onSecondaryConfirm,
  title,
  message,
  children,
  confirmLabel = "Confirm",
  secondaryLabel,
  cancelLabel = "Cancel",
  type = "primary",
  isConfirming = false,
  closeOnConfirm = true,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const typeStyles = {
    primary: "bg-[#4f63ea] hover:bg-[#3d4ecf] text-white disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200",
    danger: "bg-red-600 hover:bg-red-700 text-white disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200",
    success: "bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-200 disabled:text-slate-500 disabled:hover:bg-slate-200",
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose}
      />
      <div className="relative w-full max-w-md scale-100 animate-in zoom-in-95 duration-200 overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-slate-400" />
            <h3 className="text-[16px] font-bold text-slate-800">{title}</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-6">
          {children ? (
            children
          ) : (
            <p className="text-[14px] text-slate-500 leading-relaxed">
              {message}
            </p>
          )}
        </div>
        <div className="flex items-center justify-end gap-3 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            {cancelLabel}
          </button>
          
          {onSecondaryConfirm && secondaryLabel && (
            <button
                onClick={() => {
                    onSecondaryConfirm();
                    onClose();
                }}
                className="px-4 py-2 text-[13px] font-bold text-[#4f63ea] hover:bg-indigo-50 rounded-xl transition-all"
            >
                {secondaryLabel}
            </button>
          )}

          <button
            disabled={isConfirming}
            onClick={async () => {
              await onConfirm();
              if (closeOnConfirm) {
                onClose();
              }
            }}
            className={`rounded-xl px-6 py-2 text-[13px] font-bold transition-all shadow-sm disabled:cursor-not-allowed ${typeStyles[type]}`}
          >
            {isConfirming ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
