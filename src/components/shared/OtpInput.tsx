import React, { useRef, useEffect } from "react";

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
};

export default function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  const digits = Array.from({ length }, (_, i) => value[i] || "");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const rawVal = e.target.value;
    const numericVal = rawVal.replace(/\D/g, "");

    if (!numericVal) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      onChange(nextDigits.join(""));
      return;
    }

    if (numericVal.length === 1) {
      const nextDigits = [...digits];
      nextDigits[index] = numericVal;
      const combined = nextDigits.join("");
      onChange(combined);

      if (index < length - 1 && inputsRef.current[index + 1]) {
        inputsRef.current[index + 1]?.focus();
      }
    } else {
      const pastedDigits = numericVal.slice(0, length).split("");
      const nextDigits = Array.from({ length }, (_, i) => pastedDigits[i] || digits[i] || "");
      const combined = nextDigits.join("");
      onChange(combined);

      const nextFocusIndex = Math.min(pastedDigits.length, length - 1);
      inputsRef.current[nextFocusIndex]?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pastedData) return;

    const nextDigits = Array.from({ length }, (_, i) => pastedData[i] || "");
    onChange(nextDigits.join(""));

    const focusIndex = Math.min(pastedData.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  }

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => { inputsRef.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[index]}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border-2 border-slate-200 bg-white text-center text-xl sm:text-2xl font-bold font-mono text-slate-800 outline-none transition-all focus:border-[#4f63ea] focus:ring-2 focus:ring-[#4f63ea]/20 shadow-sm"
        />
      ))}
    </div>
  );
}
