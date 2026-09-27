"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  formatDate,
  isSameDay,
  isDateInRange,
  parseDateString,
} from "@/lib/dateUtils";

export interface CalendarRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  isAllDates?: boolean;
  availableDateStrings?: string[];
  onChange: (start: Date | null, end: Date | null, isAll: boolean) => void;
  defaultDateLabel?: string;
}

export default function CalendarRangePicker({
  startDate,
  endDate,
  isAllDates = false,
  availableDateStrings = [],
  onChange,
  defaultDateLabel = "Hari Ini",
}: CalendarRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Month being viewed in calendar
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (startDate) return new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    // Jika ada tanggal data yang tersedia, gunakan tanggal data terbaru
    if (availableDateStrings.length > 0) {
      for (const dStr of availableDateStrings) {
        const parsed = parseDateString(dStr);
        if (parsed) return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
      }
    }
    return new Date();
  });

  // Intermediate selection while choosing range
  const [selectingStart, setSelectingStart] = useState<Date | null>(startDate);
  const [selectingEnd, setSelectingEnd] = useState<Date | null>(endDate);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Parse all available dates into Date objects for quick lookup
  const parsedAvailableDates = useMemo(() => {
    return availableDateStrings
      .map((d) => parseDateString(d))
      .filter((d): d is Date => d !== null);
  }, [availableDateStrings]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  // Update viewDate when opened if startDate exists
  useEffect(() => {
    if (isOpen) {
      if (startDate) {
        setViewDate(new Date(startDate.getFullYear(), startDate.getMonth(), 1));
        setSelectingStart(startDate);
        setSelectingEnd(endDate);
      } else if (parsedAvailableDates.length > 0) {
        const latest = parsedAvailableDates[0];
        setViewDate(new Date(latest.getFullYear(), latest.getMonth(), 1));
      }
    }
  }, [isOpen, startDate, endDate, parsedAvailableDates]);

  // Days in current view month
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Shift to start week on Monday (Indonesian standard: Sen = 0, Min = 6)
  const startingOffset = (firstDayOfWeek + 6) % 7;

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(year, month, day, 0, 0, 0, 0);

    // Jika belum ada pilihan atau sudah memilih rentang sebelumnya:
    if (!selectingStart || (selectingStart && selectingEnd && !isSameDay(selectingStart, selectingEnd))) {
      // Klik pertama: langsung terapkan satu hari ini
      setSelectingStart(clickedDate);
      setSelectingEnd(clickedDate);
      onChange(clickedDate, clickedDate, false);
    } else {
      // Klik kedua: bentuk rentang
      if (clickedDate.getTime() < selectingStart.getTime()) {
        setSelectingStart(clickedDate);
        setSelectingEnd(selectingStart);
        onChange(clickedDate, selectingStart, false);
      } else {
        setSelectingEnd(clickedDate);
        onChange(selectingStart, clickedDate, false);
      }
      setIsOpen(false);
    }
  };

  const handleApplyPreset = (type: "today" | "all" | "last7" | "specific", specificDate?: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (type === "today") {
      onChange(today, today, false);
      setSelectingStart(today);
      setSelectingEnd(today);
      setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
      setIsOpen(false);
    } else if (type === "all") {
      onChange(null, null, true);
      setSelectingStart(null);
      setSelectingEnd(null);
      setIsOpen(false);
    } else if (type === "last7") {
      const past = new Date(today);
      past.setDate(today.getDate() - 6);
      onChange(past, today, false);
      setSelectingStart(past);
      setSelectingEnd(today);
      setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
      setIsOpen(false);
    } else if (type === "specific" && specificDate) {
      onChange(specificDate, specificDate, false);
      setSelectingStart(specificDate);
      setSelectingEnd(specificDate);
      setViewDate(new Date(specificDate.getFullYear(), specificDate.getMonth(), 1));
      setIsOpen(false);
    }
  };

  // Label to show on the trigger button
  const triggerLabel = useMemo(() => {
    if (isAllDates) return "Semua Tanggal";
    if (startDate && endDate) {
      if (isSameDay(startDate, endDate)) {
        const today = new Date();
        if (isSameDay(startDate, today)) {
          return `Hari Ini (${formatDate(startDate, "short")})`;
        }
        return formatDate(startDate, "short");
      }
      return `${formatDate(startDate, "short")} – ${formatDate(endDate, "short")}`;
    }
    return defaultDateLabel;
  }, [startDate, endDate, isAllDates, defaultDateLabel]);

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition cursor-pointer select-none ${
          isOpen
            ? "bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-500/15"
            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
        }`}
        title="Pilih rentang tanggal melalui kalender"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
        <span className="truncate max-w-[170px] sm:max-w-[210px]" suppressHydrationWarning>{triggerLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 z-50 w-[320px] sm:w-[350px] bg-white border border-slate-200/90 rounded-2xl shadow-xl p-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => handleApplyPreset("today")}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg font-medium transition cursor-pointer"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("last7")}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg font-medium transition cursor-pointer"
            >
              7 Hari Terakhir
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset("all")}
              className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-lg font-medium transition cursor-pointer"
            >
              Semua Tanggal
            </button>
          </div>

          {/* Quick Dates with actual data */}
          {parsedAvailableDates.length > 0 && (
            <div className="py-2.5 border-b border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Tanggal Data Tersedia:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                {parsedAvailableDates.map((availDate, idx) => {
                  const isCurrent =
                    startDate && endDate && isSameDay(availDate, startDate) && isSameDay(availDate, endDate);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset("specific", availDate)}
                      className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border transition cursor-pointer ${
                        isCurrent
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-blue-50/80 hover:bg-blue-100 text-blue-700 border-blue-200/80"
                      }`}
                    >
                      {formatDate(availDate, "short")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Month / Year Navigator */}
          <div className="flex items-center justify-between pt-3 pb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition"
              aria-label="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-bold text-sm text-slate-800">
              {monthNames[month]} {year}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 text-slate-600 rounded-lg transition"
              aria-label="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Names Header */}
          <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-slate-400 py-1">
            {dayNames.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
            {/* Empty slots for starting offset */}
            {Array.from({ length: startingOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateObj = new Date(year, month, day, 0, 0, 0, 0);

              // Check if date has data in system
              const hasData = parsedAvailableDates.some((d) => isSameDay(d, dateObj));
              const isToday = isSameDay(dateObj, new Date());

              // Check selection
              const activeStart = selectingStart;
              const activeEnd = selectingEnd || hoverDate;

              const isStart = activeStart && isSameDay(dateObj, activeStart);
              const isEnd = activeEnd && isSameDay(dateObj, activeEnd);
              const inRange =
                activeStart &&
                activeEnd &&
                isDateInRange(dateObj, activeStart, activeEnd);

              return (
                <div
                  key={day}
                  className={`relative h-8 flex items-center justify-center ${
                    inRange ? "bg-blue-50/70" : ""
                  } ${isStart ? "rounded-l-lg" : ""} ${isEnd ? "rounded-r-lg" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => handleDayClick(day)}
                    onMouseEnter={() => {
                      if (selectingStart && !selectingEnd) {
                        setHoverDate(dateObj);
                      }
                    }}
                    className={`w-7 h-7 flex flex-col items-center justify-center rounded-lg text-xs font-medium transition cursor-pointer relative z-10 ${
                      isStart || isEnd
                        ? "bg-blue-600 text-white font-bold shadow-xs"
                        : inRange
                        ? "text-blue-900 font-semibold"
                        : hasData
                        ? "text-slate-900 font-bold hover:bg-blue-100"
                        : "text-slate-700 hover:bg-slate-100"
                    } ${isToday && !isStart && !isEnd ? "ring-1 ring-blue-500 font-bold" : ""}`}
                  >
                    <span>{day}</span>
                    {hasData && (
                      <span
                        className={`w-1 h-1 rounded-full -mt-0.5 ${
                          isStart || isEnd ? "bg-white" : "bg-blue-600"
                        }`}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Controls */}
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
              {selectingStart && !selectingEnd
                ? `Pilih tanggal akhir...`
                : isAllDates
                ? "Menampilkan seluruh tanggal"
                : selectingStart && selectingEnd
                ? `${formatDate(selectingStart, "short")} – ${formatDate(selectingEnd, "short")}`
                : "Klik tanggal awal"}
            </span>
            <button
              type="button"
              onClick={() => handleApplyPreset("today")}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Hari Ini
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
