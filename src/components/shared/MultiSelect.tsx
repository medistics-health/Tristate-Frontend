import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import type { SelectOption } from "./Select";

type MultiSelectProps = {
  value: string[];
  onChange: (value: string[]) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  placement?: "auto" | "top" | "bottom";
};

export default function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select options",
  className = "",
  disabled = false,
  placement = "auto",
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    isTop?: boolean;
  } | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
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
    const gap = 6;
    const dropdownHeight = Math.min(options.length * 36 + 12, 240);
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let openUp = placement === "top";
    if (placement === "auto") {
      openUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    }

    setCoords({
      top: openUp ? rect.top - gap - dropdownHeight : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      isTop: openUp,
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

  const selectedOptions = options.filter((option) =>
    value.includes(option.value),
  );

  function toggleValue(nextValue: string) {
    if (value.includes(nextValue)) {
      onChange(value.filter((item) => item !== nextValue));
      return;
    }
    onChange([...value, nextValue]);
  }

  const summary =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length <= 2
        ? selectedOptions.map((option) => option.label).join(", ")
        : `${selectedOptions[0].label}, ${selectedOptions[1].label} +${
            selectedOptions.length - 2
          }`;

  const dropdownContent =
    isOpen && coords ? (
      <div
        ref={dropdownRef}
        className="fixed z-[11050] max-h-60 overflow-y-auto rounded-xl border border-[#ece8e1] bg-white py-1 shadow-lg font-app-sans custom-scrollbar"
        style={{ top: coords.top, left: coords.left, width: coords.width }}
      >
        {options.length === 0 ? (
          <div className="px-4 py-3 text-center text-[13px] text-slate-400">
            No options available
          </div>
        ) : (
          options.map((opt) => {
            const isSelected = value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleValue(opt.value)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-[13px] transition-colors ${
                  isSelected
                    ? "bg-[#f0f2fe] font-medium text-[#4f63ea]"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected ? (
                  <Check className="h-4 w-4 shrink-0 text-[#4f63ea]" />
                ) : null}
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
        className={`flex items-center justify-between app-control rounded-md bg-white px-3 py-2 text-[13px] transition-colors select-none ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${isOpen ? "border-[#4f63ea] ring-1 ring-[#4f63ea]/20" : ""} ${className}`}
      >
        <span
          className={`min-w-0 truncate ${
            selectedOptions.length > 0
              ? "font-medium text-slate-800"
              : "text-slate-400"
          }`}
        >
          {summary}
        </span>
        <div className="ml-2 flex shrink-0 items-center gap-1">
          {selectedOptions.length > 0 ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onChange([]);
              }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear service lines"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {dropdownContent ? createPortal(dropdownContent, document.body) : null}
    </div>
  );
}
