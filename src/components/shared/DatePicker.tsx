import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function DatePicker({ value, onChange, placeholder = "Select date", className = "" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

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

  // Update coords when opening or resizing
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    }
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
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const selectedDateStr = value; // YYYY-MM-DD
  let displayStr = "";
  if (value) {
    const [y, m, d] = value.split("-");
    if (y && m && d) {
      displayStr = `${m}/${d}/${y}`; // US format MM/DD/YYYY for display
    }
  }

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

    days.push(
      <button
        key={day}
        type="button"
        onClick={() => handleSelectDate(day)}
        className={`w-8 h-8 flex items-center justify-center rounded-full text-[13px] transition-colors ${
          isSelected
            ? "bg-[#4f63ea] text-white font-medium shadow-sm"
            : isToday
            ? "bg-[#f0f2fe] text-[#4f63ea] font-medium"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        {day}
      </button>
    );
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const popupContent = isOpen ? (
    <div 
      ref={popupRef}
      className="absolute z-[9999] mt-1 w-64 rounded-xl border border-[#ece8e1] bg-white p-3 shadow-xl font-app-sans"
      style={{ top: coords.top, left: coords.left }}
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
  ) : null;

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between cursor-pointer app-control rounded-md px-3 py-2 text-[13px] bg-white transition-colors ${
          isOpen ? "border-[#4f63ea] ring-1 ring-[#4f63ea]/20" : ""
        } ${className}`}
      >
        <span className={displayStr ? "text-slate-800" : "text-slate-400"}>
          {displayStr || placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 text-slate-400" />
      </div>

      {/* Render popup at root level so it isn't clipped by overflow-auto containers */}
      {isOpen && createPortal(popupContent, document.body)}
    </div>
  );
}
