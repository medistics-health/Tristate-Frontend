import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

export type SearchSelectOption = {
  label: string;
  value: string;
  subLabel?: string;
};

type SearchSelectProps = {
  value: string;
  onChange: (value: string, option?: SearchSelectOption) => void;
  onSearch: (query: string) => Promise<SearchSelectOption[]>;
  displayLabel?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearOnSelect?: boolean;
  clearable?: boolean;
  toggleOnSelectSame?: boolean;
};

export default function SearchSelect({
  value,
  onChange,
  onSearch,
  displayLabel,
  placeholder = "Search and select...",
  className = "",
  disabled = false,
  clearOnSelect = false,
  clearable = false,
  toggleOnSelectSame = false,
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchSelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<SearchSelectOption | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      return;
    }

    const match = options.find((option) => option.value === value);
    if (match) {
      setSelectedOption(match);
      return;
    }

    setSelectedOption((current) =>
      current?.value === value ? current : { label: value, value },
    );
  }, [value, options]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setIsLoading(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await onSearch(query);
        if (!active) return;
        setOptions(results);
      } catch (error) {
        console.error("SearchSelect error:", error);
        if (active) setOptions([]);
      } finally {
        if (active) setIsLoading(false);
      }
    }, query ? 250 : 0);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [query, isOpen, onSearch]);

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

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
    inputRef.current?.focus();
  }, [isOpen]);

  const displayedLabel = useMemo(() => {
    return displayLabel || selectedOption?.label || value || placeholder;
  }, [selectedOption, displayLabel, value, placeholder]);

  const handleSelect = (option: SearchSelectOption) => {
    if (toggleOnSelectSame && option.value === value) {
      setSelectedOption(null);
      setQuery("");
      onChange("");
      setIsOpen(false);
      return;
    }
    setSelectedOption(option);
    onChange(option.value, option);
    setIsOpen(false);
    if (clearOnSelect) {
      setQuery("");
    }
  };

  const dropdownContent = isOpen ? (
    <div
      ref={dropdownRef}
      className="absolute z-[12050] flex max-h-72 flex-col overflow-hidden rounded-xl border border-[#ece8e1] bg-white shadow-xl font-app-sans"
      style={{ top: coords.top, left: coords.left, width: coords.width }}
    >
      <div className="border-b border-[#f0ece6] bg-slate-50/50 p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            className="w-full rounded-lg border border-[#ece8e1] bg-white py-1.5 pl-8 pr-3 text-[13px] focus:border-[#4f63ea] focus:outline-none focus:ring-1 focus:ring-[#4f63ea]/10"
            placeholder="Type to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="min-h-[50px] max-h-52 flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-[#4f63ea]" />
          </div>
        ) : options.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-slate-400">
            {query ? "No results found" : "No options available"}
          </div>
        ) : (
          options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`flex w-full flex-col items-start border-b border-slate-50 px-3 py-2.5 text-left transition-colors last:border-0 ${
                  isSelected
                    ? "bg-[#f0f2fe] text-[#4f63ea]"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`text-[13px] ${
                      isSelected ? "font-semibold" : "font-medium"
                    }`}
                  >
                    {opt.label}
                  </span>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[#4f63ea]" />
                  ) : null}
                </div>
                {opt.subLabel ? (
                  <span
                    className={`mt-0.5 text-[11px] ${
                      isSelected ? "text-[#4f63ea]/70" : "text-slate-400"
                    }`}
                  >
                    {opt.subLabel}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        onClick={() => !disabled && setIsOpen((current) => !current)}
        className={`flex items-center justify-between rounded-md bg-white px-3 py-2 text-[13px] transition-all ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-slate-300"
        } app-control ${isOpen ? "border-[#4f63ea] ring-1 ring-[#4f63ea]/20" : ""} ${className}`}
      >
        <span
          className={`truncate ${
            value ? "font-medium text-slate-800" : "text-slate-400"
          }`}
        >
          {displayedLabel}
        </span>
        <div className="ml-2 flex items-center gap-1.5">
          {isLoading && isOpen ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4f63ea]" />
          ) : null}
          {clearable && value ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setQuery("");
                setSelectedOption(null);
                onChange("");
              }}
              className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {createPortal(dropdownContent, document.body)}
    </div>
  );
}
