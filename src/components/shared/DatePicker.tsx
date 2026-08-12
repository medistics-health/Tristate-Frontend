import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
  disabled?: boolean;
};

export default function DatePicker({ value, onChange, placeholder = "Select date", className = "", minDate, disabled = false }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );
  const popupWidth = 256;
  const popupHeight = 316;

  // Parse value or use today
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popupRef.current && !popupRef.current.contains(target)
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
    const margin = 12;
    const gap = 8;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const shouldOpenAbove =
      spaceBelow < popupHeight && spaceAbove > spaceBelow;
    const top = shouldOpenAbove
      ? Math.max(margin, rect.top - popupHeight - gap)
      : Math.min(
          window.innerHeight - popupHeight - margin,
          rect.bottom + gap,
        );

    const rightAlignedLeft = rect.right - popupWidth;
    const left = Math.max(
      margin,
      Math.min(rightAlignedLeft, window.innerWidth - popupWidth - margin),
    );

    setCoords({
      top,
      left,
    });
  }

  // Measure before paint so the popup never flashes in the top-left corner.
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

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const handleSelectDate = (day: number) => {
    const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const nextValue = `${yyyy}-${mm}-${dd}`;
    if (minDate && nextValue < minDate) {
      return;
    }
    onChange(nextValue);
    setIsOpen(false);
  };

  let displayStr = "";
  if (value) {
    const [y, m, d] = value.split("-");
    if (y && m && d) {
      displayStr = `${m}-${d}-${y}`; 
    }
  }

  const [inputValue, setInputValue] = useState(displayStr);

  useEffect(() => {
    setInputValue(displayStr);
  }, [displayStr]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only keep digits
    let digits = e.target.value.replace(/\D/g, "");
    
    // Validate month
    if (digits.length >= 2) {
      let m = parseInt(digits.substring(0, 2), 10);
      if (m > 12) digits = "12" + digits.substring(2);
      if (m === 0) digits = "01" + digits.substring(2);
    }
    
    // Validate day
    if (digits.length >= 4) {
      let d = parseInt(digits.substring(2, 4), 10);
      if (d > 31) digits = digits.substring(0, 2) + "31" + digits.substring(4);
      if (d === 0) digits = digits.substring(0, 2) + "01" + digits.substring(4);
    }

    // Limit to 8 digits (MMDDYYYY)
    if (digits.length > 8) {
      digits = digits.substring(0, 8);
    }
    
    // Auto-format to MM-DD-YYYY
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `${digits.substring(0, 2)}-${digits.substring(2)}`;
    }
    if (digits.length > 4) {
      formatted = `${digits.substring(0, 2)}-${digits.substring(2, 4)}-${digits.substring(4)}`;
    }
    
    setInputValue(formatted);
    
    const match = formatted.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const [_, m, d, y] = match;
      const numM = Number(m);
      const numD = Number(d);
      const numY = Number(y);
      const newDate = new Date(numY, numM - 1, numD);
      
      // Strict date check (e.g. leap years, Feb 30, etc.)
      if (
        newDate.getFullYear() === numY &&
        newDate.getMonth() === numM - 1 &&
        newDate.getDate() === numD
      ) {
        const dateStr = `${y}-${m}-${d}`;
        if (!minDate || dateStr >= minDate) {
          onChange(dateStr);
          setCurrentMonth(newDate);
        }
      }
    } else if (digits === "") {
      onChange("");
    }
  };

  const handleBlur = () => {
    // Revert to the last valid value if the current input is not a full valid date
    const match = inputValue.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    let isValid = false;
    if (match) {
      const [_, m, d, y] = match;
      const newDate = new Date(Number(y), Number(m) - 1, Number(d));
      if (
        newDate.getFullYear() === Number(y) &&
        newDate.getMonth() === Number(m) - 1 &&
        newDate.getDate() === Number(d)
      ) {
        isValid = true;
      }
    }
    if (!isValid && inputValue !== "") {
      setInputValue(displayStr);
    }
  };

  const selectedDateStr = value; // YYYY-MM-DD
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const yyyy = currentMonth.getFullYear();
    const mm = String(currentMonth.getMonth() + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    
    const isSelected = selectedDateStr === dateStr;
    const isToday = new Date().toISOString().split("T")[0] === dateStr;
    const isDisabled = !!minDate && dateStr < minDate;

    days.push(
      <button
        key={day}
        type="button"
        onClick={() => handleSelectDate(day)}
        disabled={isDisabled}
        className={`w-8 h-8 flex items-center justify-center rounded-full text-[13px] transition-colors ${
          isSelected
            ? "bg-[#4f63ea] text-white font-medium shadow-sm"
            : isToday
            ? "bg-[#f0f2fe] text-[#4f63ea] font-medium"
            : isDisabled
            ? "cursor-not-allowed text-slate-300"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        {day}
      </button>
    );
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className={`flex items-center justify-between app-control rounded-md px-3 py-2 text-[13px] bg-white transition-colors ${
          disabled ? "cursor-not-allowed opacity-60" : ""
        } ${isOpen ? "border-[#4f63ea] ring-1 ring-[#4f63ea]/20" : ""} ${
          className
        }`}
      >
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onClick={() => {
            if (disabled) return;
            setIsOpen(true);
          }}
          placeholder={placeholder || "MM-DD-YYYY"}
          disabled={disabled}
          className="bg-transparent border-none outline-none w-full text-slate-800 placeholder-slate-400"
        />
        <CalendarIcon 
          className="h-4 w-4 text-slate-400 cursor-pointer ml-2 flex-shrink-0" 
          onClick={() => {
            if (disabled) return;
            setIsOpen(!isOpen);
          }}
        />
      </div>

      {/* Render popup at root level so it isn't clipped by overflow-auto containers */}
      {isOpen && coords && createPortal(
        <div className="fixed z-[11050]" style={{ top: coords.top, left: coords.left }}>
          <div
            ref={popupRef}
            className="w-64 rounded-xl border border-[#ece8e1] bg-white p-3 shadow-xl font-app-sans"
          >
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={prevMonth} className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="text-[13px] font-semibold text-slate-800">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </div>
              <button type="button" onClick={nextMonth} className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
                <div key={day} className="text-center text-[11px] font-medium text-slate-400">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {days}
            </div>
            
            <div className="mt-3 flex justify-between border-t border-[#ece8e1] pt-2">
              <button 
                type="button" 
                onClick={() => { onChange(""); setIsOpen(false); }}
                className="text-[12px] text-slate-500 hover:text-slate-800 font-medium"
              >
                Clear
              </button>
              <button 
                type="button" 
                onClick={() => {
                  const today = new Date();
                  const yyyy = today.getFullYear();
                  const mm = String(today.getMonth() + 1).padStart(2, "0");
                  const dd = String(today.getDate()).padStart(2, "0");
                  onChange(`${yyyy}-${mm}-${dd}`);
                  setIsOpen(false);
                }}
                className="text-[12px] text-[#4f63ea] hover:text-[#3d4ed1] font-medium"
              >
                Today
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
