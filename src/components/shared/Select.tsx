import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export type SelectOption = {
  label: string;
  value: string;
};

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
  disabled = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function updateCoords() {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const gap = 8;
    setCoords({
      top: rect.bottom + gap,
      left: rect.left,
      width: rect.width,
    });
  }

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
    } else {
      setCoords(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleUpdate() {
      updateCoords();
    }
    window.addEventListener("scroll", handleUpdate, true);
    window.addEventListener("resize", handleUpdate);
    return () => {
      window.removeEventListener("scroll", handleUpdate, true);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);

  const dropdownContent = isOpen && coords ? (
    <div
      ref={dropdownRef}
      className="fixed z-[11050] max-h-60 overflow-y-auto rounded-xl border border-[#ece8e1] bg-white py-1 shadow-lg font-app-sans custom-scrollbar"
      style={{ top: coords.top, left: coords.left, width: coords.width }}
    >
      {options.length === 0 ? (
        <div className="px-4 py-3 text-[13px] text-slate-400 text-center">No options available</div>
      ) : (
        options.map((opt) => {
          const isSelected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 text-left text-[13px] transition-colors ${
                isSelected
                  ? "bg-[#f0f2fe] text-[#4f63ea] font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {isSelected && <Check className="h-4 w-4 shrink-0 text-[#4f63ea]" />}
            </button>
          );
        })
      )}
    </div>
  ) : null;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between app-control rounded-md px-3 py-2 text-[13px] bg-white transition-colors select-none ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
        } ${isOpen ? "border-[#4f63ea] ring-1 ring-[#4f63ea]/20" : ""} ${className}`}
      >
        <span className={`truncate ${selectedOption ? "text-slate-800 font-medium" : "text-slate-400"}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </div>

      {dropdownContent ? createPortal(dropdownContent, document.body) : null}
    </div>
  );
}
