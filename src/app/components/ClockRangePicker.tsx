"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Clock,
  ChevronDown,
  RotateCcw,
  Check,
  Sun,
  Sunset,
  Moon,
  Clock3,
} from "lucide-react";
import { parseHourToMinutes } from "@/lib/dateUtils";

export interface ClockRangePickerProps {
  startHour: string; // e.g. "00.00"
  endHour: string;   // e.g. "23.59"
  onChange: (start: string, end: string) => void;
}

const SHIFT_PRESETS = [
  { label: "24 Jam Penuh", start: "00.00", end: "23.59", icon: Clock },
  { label: "Shift I", start: "07.00", end: "15.00", icon: Sun },
  { label: "Shift II", start: "15.00", end: "23.00", icon: Sunset },
  { label: "Shift III", start: "23.00", end: "07.00", icon: Moon },
  { label: "Pagi", start: "06.00", end: "12.00", icon: Sun },
  { label: "Siang / Sore", start: "12.00", end: "18.00", icon: Sunset },
  { label: "Malam", start: "18.00", end: "23.59", icon: Moon },
];

export default function ClockRangePicker({
  startHour,
  endHour,
  onChange,
}: ClockRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tempStart, setTempStart] = useState(startHour);
  const [tempEnd, setTempEnd] = useState(endHour);

  // Sync temp state when props change or popover opens
  useEffect(() => {
    if (isOpen) {
      setTempStart(startHour);
      setTempEnd(endHour);
    }
  }, [isOpen, startHour, endHour]);

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

  const handleApplyPreset = (start: string, end: string) => {
    setTempStart(start);
    setTempEnd(end);
    onChange(start, end);
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    onChange(tempStart, tempEnd);
    setIsOpen(false);
  };

  const handleReset = () => {
    handleApplyPreset("00.00", "23.59");
  };

  // Calculate percentage of 24h for timeline bar
  const startMins = parseHourToMinutes(tempStart);
  const endMins = tempEnd === "23.59" ? 24 * 60 : parseHourToMinutes(tempEnd);
  const durationMinutes = Math.max(0, endMins - startMins);
  const durationHours = (durationMinutes / 60).toFixed(1);

  const startPercent = Math.min(100, Math.max(0, (startMins / (24 * 60)) * 100));
  const widthPercent = Math.min(100 - startPercent, Math.max(2, (durationMinutes / (24 * 60)) * 100));

  // Available hours for dropdowns
  const hourOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const h = i.toString().padStart(2, "0");
      return `${h}.00`;
    });
  }, []);

  const endHourOptions = useMemo(() => {
    const list = Array.from({ length: 24 }, (_, i) => {
      const h = i.toString().padStart(2, "0");
      return `${h}.00`;
    });
    list.push("23.59");
    return list;
  }, []);

  const isFullDay = startHour === "00.00" && (endHour === "23.59" || endHour === "24.00");

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition cursor-pointer select-none ${
          isOpen
            ? "bg-teal-50 border-teal-400 text-teal-700 ring-2 ring-teal-500/15"
            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
        }`}
        title="Pilih rentang jam dengan time picker"
      >
        <Clock className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
        <span className="font-mono" suppressHydrationWarning>
          {startHour} – {endHour} WIB
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[300px] sm:w-[330px] bg-white border border-slate-200/90 rounded-2xl shadow-xl p-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <Clock3 className="w-4 h-4 text-teal-600" />
              <span className="text-xs font-bold text-slate-800">Rentang Jam (WIB)</span>
            </div>
            {!isFullDay && (
              <button
                type="button"
                onClick={handleReset}
                className="text-[11px] text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset 24 Jam
              </button>
            )}
          </div>

          {/* Quick Presets */}
          <div className="py-2.5 border-b border-slate-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
              Preset Shift & Waktu
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {SHIFT_PRESETS.map((preset) => {
                const IconComponent = preset.icon;
                const isSelected = tempStart === preset.start && tempEnd === preset.end;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPreset(preset.start, preset.end)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition cursor-pointer border ${
                      isSelected
                        ? "bg-teal-50 border-teal-300 text-teal-800 font-semibold shadow-2xs"
                        : "bg-slate-50/70 hover:bg-slate-100 border-slate-200/70 text-slate-700"
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                    <div className="truncate">
                      <div className="text-[11px] leading-tight font-semibold">{preset.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {preset.start} - {preset.end}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Time Selectors */}
          <div className="py-3 space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Pilih Jam Kustom
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Jam Mulai (Dari)
                </label>
                <div className="relative">
                  <select
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer appearance-none pr-7"
                  >
                    {hourOptions.map((h) => (
                      <option key={h} value={h}>
                        {h} WIB
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-500 block mb-1">
                  Jam Selesai (Sampai)
                </label>
                <div className="relative">
                  <select
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer appearance-none pr-7"
                  >
                    {endHourOptions.map((h) => (
                      <option key={h} value={h}>
                        {h} WIB
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Visual 24h Timeline Bar */}
            <div className="pt-1">
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-1">
                <span>00:00</span>
                <span>12:00</span>
                <span>24:00</span>
              </div>
              <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="absolute h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-200"
                  style={{
                    left: `${startPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                />
              </div>
              <div className="text-center text-[10px] text-slate-500 mt-1.5 font-medium">
                Durasi Terpilih: <span className="text-teal-700 font-semibold">{durationHours} Jam</span> ({tempStart} s/d {tempEnd} WIB)
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApplyCustom}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
