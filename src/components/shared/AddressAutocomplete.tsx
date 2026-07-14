import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Search,
  Loader2,
  X,
  MapPin,
  Navigation,
} from "lucide-react";

export type AddressData = {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  label: string;
  lat: number;
  lon: number;
};

type PhotonFeature = {
  type: "Feature";
  geometry: { type: string; coordinates: [number, number] };
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
    type?: string;
    osm_key?: string;
    osm_value?: string;
    extent?: number[];
  };
};

type PhotonResponse = {
  type: "FeatureCollection";
  features: PhotonFeature[];
};

type AddressAutocompleteProps = {
  onSelect: (address: AddressData) => void;
  value?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
  countryCode?: string;
};

function buildLabel(props: PhotonFeature["properties"]): string {
  const parts: string[] = [];
  const street = [props.street, props.housenumber].filter(Boolean).join(" ");
  if (street) parts.push(street);
  if (props.city) parts.push(props.city);
  if (props.state) parts.push(props.state);
  if (props.postcode) parts.push(props.postcode);
  if (props.country) parts.push(props.country);
  return parts.join(", ");
}

function mapFeature(feature: PhotonFeature): AddressData {
  const p = feature.properties;
  const [lon, lat] = feature.geometry.coordinates;
  return {
    street: [p.street, p.housenumber].filter(Boolean).join(" ") || "",
    city: p.city || "",
    state: p.state || "",
    zip: p.postcode || "",
    country: p.country || "",
    label: buildLabel(p),
    lat,
    lon,
  };
}

export default function AddressAutocomplete({
  onSelect,
  value = "",
  placeholder = "Search address...",
  className = "",
  disabled = false,
  clearable = false,
  countryCode = "us",
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AddressData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const fetchAddresses = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        setOptions([]);
        setIsLoading(false);
        return;
      }
      try {
        const params = new URLSearchParams({
          q: searchQuery.trim(),
          limit: "8",
          lang: "en",
        });
        if (countryCode) params.set("countrycode", countryCode);

        const res = await fetch(
          `https://photon.komoot.io/api/?${params.toString()}`,
        );
        if (!res.ok) return;
        const data: PhotonResponse = await res.json();
        setOptions(data.features.map(mapFeature));
      } catch (err) {
        console.error("Address autocomplete error:", err);
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [countryCode],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (query.trim().length < 2) {
      setOptions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(() => fetchAddresses(query), 300);
    return () => clearTimeout(timer);
  }, [query, isOpen, fetchAddresses]);

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

  useEffect(() => {
    setHighlightIndex(-1);
  }, [query]);

  const handleSelect = (address: AddressData) => {
    onSelect(address);
    setQuery(address.label);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < options.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : options.length - 1,
      );
    } else if (e.key === "Enter" && highlightIndex >= 0 && options[highlightIndex]) {
      e.preventDefault();
      handleSelect(options[highlightIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const dropdownContent = isOpen ? (
    <div
      ref={dropdownRef}
      className="absolute z-[12050] max-h-80 overflow-hidden flex flex-col rounded-xl border border-[#ece8e1] bg-white shadow-xl font-app-sans"
      style={{ top: coords.top, left: coords.left, width: coords.width }}
    >
      <div className="p-2 border-b border-[#f0ece6] bg-slate-50/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-white border border-[#ece8e1] rounded-lg pl-8 pr-3 py-1.5 text-[13px] focus:outline-none focus:border-[#4f63ea] focus:ring-1 focus:ring-[#4f63ea]/10"
            placeholder="Type an address..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-[50px] max-h-60">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 text-[#4f63ea] animate-spin" />
          </div>
        ) : options.length === 0 ? (
          <div className="px-4 py-6 text-[13px] text-slate-400 text-center">
            {query.length < 2
              ? "Type at least 2 characters to search"
              : "No addresses found"}
          </div>
        ) : (
          options.map((addr, idx) => {
            const isSelected = addr.label === value;
            const isHighlighted = idx === highlightIndex;
            return (
              <button
                key={`${addr.lat}-${addr.lon}-${idx}`}
                type="button"
                onClick={() => handleSelect(addr)}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors border-b border-slate-50 last:border-0 ${
                  isSelected
                    ? "bg-[#f0f2fe] text-[#4f63ea]"
                    : isHighlighted
                      ? "bg-slate-50"
                      : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <MapPin
                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                    isSelected ? "text-[#4f63ea]" : "text-slate-400"
                  }`}
                />
                <div className="flex flex-col min-w-0">
                  {addr.street && (
                    <span className="text-[13px] font-medium text-slate-800 truncate">
                      {addr.street}
                    </span>
                  )}
                  <span className="text-[12px] text-slate-500 truncate">
                    {[addr.city, addr.state, addr.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="px-3 py-1.5 border-t border-[#f0ece6] bg-slate-50/50">
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Navigation className="h-2.5 w-2.5" />
          Powered by OpenStreetMap
        </span>
      </div>
    </div>
  ) : null;

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between app-control rounded-md px-3 py-2 text-[13px] bg-white transition-all select-none ${
          disabled
            ? "opacity-60 cursor-not-allowed"
            : "cursor-pointer hover:border-slate-300"
        } ${isOpen ? "border-[#4f63ea] ring-1 ring-[#4f63ea]/20" : ""}`}
      >
        <span className={`truncate ${value ? "text-slate-800 font-medium" : "text-slate-400"}`}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1.5 ml-2">
          {isLoading && isOpen && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#4f63ea]" />
          )}
          {clearable && value ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setQuery("");
                setOptions([]);
                onSelect({
                  street: "",
                  city: "",
                  state: "",
                  zip: "",
                  country: "",
                  label: "",
                  lat: 0,
                  lon: 0,
                });
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
