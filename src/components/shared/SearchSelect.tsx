import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search, Loader2 } from "lucide-react";

export type SearchSelectOption = {
  label: string;
  value: string;
  subLabel?: string;
};

type SearchSelectProps = {
  value: string;
  onChange: (value: string, option?: SearchSelectOption) => void;
  onSearch: (query: string) => Promise<SearchSelectOption[]>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearOnSelect?: boolean;
};

export default function SearchSelect({
  value,
  onChange,
  onSearch,
  placeholder = "Search and select...",
  className = "",
  disabled = false,
  clearOnSelect = false,
}: SearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchSelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const [selectedOption, setSelectedOption] = useState<SearchSelectOption | null>(null);

  // Initial search or search on query change
  useEffect(() => {
    if (!isOpen) return;

    // If query is empty and just opened, fetch immediately
    if (query === "") {
        setIsLoading(true);
        onSearch("").then(results => {
            setOptions(results);
            setIsLoading(false);
        }).catch(err => {
            console.error("SearchSelect error:", err);
            setIsLoading(false);
        });
        return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await onSearch(query);
        setOptions(results);
      } catch (error) {
        console.error("SearchSelect error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, isOpen, onSearch]);

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

  // Update coords when opening
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSelect = (option: SearchSelectOption) => {
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
      className="absolute z-[9999] max-h-72 overflow-hidden flex flex-col rounded-xl border border-[#ece8e1] bg-white shadow-xl font-app-sans"
      style={{ top: coords.top, left: coords.left, width: coords.width }}
    >
      <div className="p-2 border-b border-[#f0ece6] bg-slate-50/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-white border border-[#ece8e1] rounded-lg pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:border-[#4f63ea] focus:ring-1 focus:ring-[#4f63ea]/10"
            placeholder="Type to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[50px] max-h-52">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 text-[#4f63ea] animate-spin" />
          </div>
        ) : options.length === 0 ? (
          <div className="px-4 py-6 text-[13px] text-slate-400 text-center">
            {query.length > 0 ? "No results found" : "Start typing to search"}
          </div>
        ) : (
          options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full flex flex-col items-start px-3 py-2.5 text-left transition-colors border-b border-slate-50 last:border-0 ${
                  isSelected
                    ? "bg-[#f0f2fe] text-[#4f63ea]"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[13px] ${isSelected ? "font-semibold" : "font-medium"}`}>
                    {opt.label}
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#4f63ea]" />}
                </div>
                {opt.subLabel && (
                  <span className={`text-[11px] mt-0.5 ${isSelected ? "text-[#4f63ea]/70" : "text-slate-400"}`}>
                    {opt.subLabel}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between app-control rounded-md px-3 py-2 text-[13px] bg-white transition-all select-none ${
          disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:border-slate-300"
        } ${isOpen ? "border-[#4f63ea] ring-1 ring-[#4f63ea]/20" : ""} ${className}`}
      >
        <span className={`truncate ${value || selectedOption ? "text-slate-800 font-medium" : "text-slate-400"}`}>
          {selectedOption?.label || placeholder}
        </span>
        <div className="flex items-center gap-1.5 ml-2">
            {isLoading && isOpen && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4f63ea]" />}
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </div>

      {createPortal(dropdownContent, document.body)}
    </div>
  );
}
