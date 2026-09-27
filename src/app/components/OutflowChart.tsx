"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import CalendarRangePicker from "./CalendarRangePicker";
import ClockRangePicker from "./ClockRangePicker";
import { isSameDay } from "@/lib/dateUtils";

export interface OutflowPoint {
  hour: string;
  value: number;
  dateStr?: string;
}

interface OutflowChartProps {
  damName: string;
  dateStr?: string;
  timeRange?: string;
  outflowHourly: OutflowPoint[];
  currentStatus?: "Hijau" | "Kuning" | "Merah" | "Normal";
  // Filter Props
  availableDams?: string[];
  selectedDam?: string;
  onSelectDam?: (dam: string) => void;
  showDamFilter?: boolean;
  availableDates?: string[];
  // Date Range Props
  startDate?: Date | null;
  endDate?: Date | null;
  isAllDates?: boolean;
  onDateRangeChange?: (start: Date | null, end: Date | null, isAll: boolean) => void;
  // Time Range Props
  startHour?: string;
  endHour?: string;
  onTimeRangeChange?: (start: string, end: string) => void;
  onResetFilter?: () => void;
  defaultDateLabel?: string;
}

export default function OutflowChart({
  damName,
  dateStr,
  timeRange,
  outflowHourly,
  currentStatus = "Normal",
  availableDams = [],
  selectedDam = "ALL",
  onSelectDam,
  showDamFilter = false,
  availableDates = [],
  startDate,
  endDate,
  isAllDates = false,
  onDateRangeChange,
  startHour = "00.00",
  endHour = "23.59",
  onTimeRangeChange,
  onResetFilter,
  defaultDateLabel = "Hari Ini",
}: OutflowChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    hour: string;
    value: number;
    x: number;
    y: number;
    dateStr?: string;
  } | null>(null);

  // Ambang batas siaga banjir sesuai warna siaga
  const thresholds = [
    { label: "AWAS", val: 1000, color: "#dc2626", textClass: "text-rose-600" },
    { label: "SIAGA", val: 900, color: "#d97706", textClass: "text-amber-600" },
    { label: "WASPADA", val: 800, color: "#059669", textClass: "text-emerald-600" },
  ];



  // Dimensi SVG
  const width = 640;
  const height = 280;
  const padLeft = 60;
  const padRight = 35;
  const padTop = 32;
  const padBottom = 55;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const values = outflowHourly.map((d) => d.value);
  const maxVal = values.length > 0 ? Math.max(...values) : 0;

  /**
   * Skala Y Bersegmen / Jump Axis:
   * Menampilkan data debit aktual (misal: 0 - 50 m³/det) pada area bawah,
   * lalu melompat dengan break/zigzag symbol langsung ke zona ambang batas Siaga Banjir (800, 900, 1000).
   * Dengan cara ini, kurva variasi aktual per jam tetap terlihat jelas dan dinamis,
   * sementara garis Waspada (800), Siaga (900), dan Awas (1000) selalu tetap tampil di atas.
   */
  const actualUpper = Math.max(50, Math.ceil((maxVal * 1.3) / 10) * 10);
  const breakYPosition = padTop + chartH * 0.46; // garis putus/zigzag pemisah
  const thresholdZoneHeight = chartH * 0.40; // area atas untuk 800 - 1050
  const actualZoneHeight = chartH * 0.46;    // area bawah untuk 0 - actualUpper

  const getY = (val: number) => {
    if (val >= 750) {
      // Zona atas: 750 s/d 1050
      const ratio = Math.max(0, Math.min(1, (val - 750) / (1050 - 750)));
      return padTop + thresholdZoneHeight * (1 - ratio);
    } else {
      // Zona bawah: 0 s/d actualUpper
      const ratio = Math.max(0, Math.min(1, val / actualUpper));
      return padTop + chartH - actualZoneHeight * ratio;
    }
  };

  // Pastikan data selalu terurut kronologis jam dari kiri ke kanan
  const sortedOutflowHourly = [...outflowHourly].sort((a, b) => {
    const parseMins = (str: string) => {
      if (!str) return 0;
      const parts = str.replace("WIB", "").trim().replace(".", ":").split(":");
      return (parseInt(parts[0] || "0", 10) * 60) + parseInt(parts[1] || "0", 10);
    };
    return parseMins(a.hour) - parseMins(b.hour);
  });

  const getX = (index: number) => {
    if (sortedOutflowHourly.length <= 1) return padLeft + chartW / 2;
    return padLeft + (index / (sortedOutflowHourly.length - 1)) * chartW;
  };

  // Koordinat titik data
  const points = sortedOutflowHourly.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
    hour: d.hour,
    value: d.value,
    dateStr: d.dateStr,
  }));

  const linePath = points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, "");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x},${padTop + chartH} L ${points[0].x},${padTop + chartH} Z`
      : "";

  // Ticks sumbu Y aktual di bagian bawah
  const actualTicks = [0, Math.round(actualUpper / 2), actualUpper];

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm transition-all">
      {/* Header Kartu Mirip Contoh Gambar AWLR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/70 flex items-center justify-center flex-shrink-0 shadow-xs">
            <svg
              className="w-6 h-6 stroke-current stroke-[2.2] fill-none"
              viewBox="0 0 24 24"
            >
              <polyline points="22 12 16 12 14 17 10 7 8 12 2 12" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400">
                GRAFIK
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  currentStatus === "Merah"
                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                    : currentStatus === "Kuning"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : currentStatus === "Hijau"
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {currentStatus === "Normal" ? "STATUS NORMAL" : `STATUS: ${currentStatus.toUpperCase()}`}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight">
              {damName}
            </h3>
          </div>
        </div>

        {/* Integrated Filter Bar: Bendungan, Kalender Rentang Tanggal & Jam Clock Picker */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          {/* Filter Bendungan (Multi-Bendung) - Hanya jika diaktifkan via props */}
          {showDamFilter && availableDams.length > 0 && (
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs shadow-2xs">
              <span className="text-slate-400 text-[10px] font-semibold uppercase">Bendung:</span>
              <select
                value={selectedDam}
                onChange={(e) => onSelectDam?.(e.target.value)}
                className="bg-transparent text-slate-700 font-semibold text-xs focus:outline-none cursor-pointer max-w-[140px] truncate"
              >
                <option value="ALL">Semua Bendungan</option>
                {availableDams.map((dam) => (
                  <option key={dam} value={dam}>
                    {dam}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Kalender Filter Rentang Tanggal */}
          <CalendarRangePicker
            startDate={startDate ?? null}
            endDate={endDate ?? null}
            isAllDates={isAllDates}
            availableDateStrings={availableDates}
            onChange={(start, end, all) => {
              onDateRangeChange?.(start, end, all);
            }}
            defaultDateLabel={defaultDateLabel}
          />

          {/* Clock Filter Rentang Jam */}
          <ClockRangePicker
            startHour={startHour}
            endHour={endHour}
            onChange={(start, end) => {
              onTimeRangeChange?.(start, end);
            }}
          />

          {/* Tombol Reset jika filter aktif */}
          {(selectedDam !== "ALL" || isAllDates || (startDate && !isSameDay(startDate, new Date())) || startHour !== "00.00" || (endHour !== "23.59" && endHour !== "23.00")) && (
            <button
              onClick={() => onResetFilter?.()}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 font-semibold px-2 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Kembalikan semua filter ke kondisi awal"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Subtitle Tengah */}
      <div className="text-center mt-3 mb-1">
        <h4 className="text-sm md:text-base font-bold text-slate-800">
          Data Debit Outflow Per Jam {timeRange ? `(${timeRange} WIB)` : ""}
        </h4>
        <p className="text-[11px] text-slate-500">
          {dateStr ? `${dateStr} • ` : ""}Satuan Debit: m³/det
        </p>
      </div>

      {/* SVG Container Grafik */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            {/* Gradien biru lembut gaya Clean Light Theme */}
            <linearGradient id="lightOutflowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.03" />
            </linearGradient>

            <filter id="lightGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0284c7" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Grid Garis Sumbu Y Aktual (Bawah) */}
          {actualTicks.map((val) => {
            const y = getY(val);
            return (
              <g key={`act-${val}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[11px] font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Simbol Axis Break / Lompatan Sumbu Y */}
          <g className="transition-opacity">
            <line
              x1={padLeft - 8}
              y1={breakYPosition - 4}
              x2={padLeft + 8}
              y2={breakYPosition + 4}
              stroke="#94a3b8"
              strokeWidth="2"
            />
            <line
              x1={padLeft - 8}
              y1={breakYPosition - 8}
              x2={padLeft + 8}
              y2={breakYPosition}
              stroke="#94a3b8"
              strokeWidth="2"
            />
            {/* Garis halus pembatas lompatan axis */}
            <line
              x1={padLeft}
              y1={breakYPosition - 4}
              x2={width - padRight}
              y2={breakYPosition - 4}
              stroke="#cbd5e1"
              strokeDasharray="2 4"
              strokeOpacity="0.7"
            />
            <text
              x={padLeft - 12}
              y={breakYPosition}
              textAnchor="end"
              className="fill-slate-400 text-[9px] font-semibold italic"
            >
              lompat
            </text>
          </g>

          {/* Sumbu Utama X dan Y */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={padLeft}
            y2={padTop + chartH}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={width - padRight}
            y2={padTop + chartH}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          {/* Label Sumbu Y (Debit Q Outflow m³/det) */}
          <text
            x={16}
            y={padTop + chartH / 2}
            textAnchor="middle"
            transform={`rotate(-90 16 ${padTop + chartH / 2})`}
            className="fill-slate-500 text-[11px] font-medium tracking-wide"
          >
            Debit Q (m³/det)
          </text>

          {/* Garis Ambang Batas Siaga Banjir (AWAS, SIAGA, WASPADA) di Area Atas */}
          {thresholds.map((th) => {
            const lineY = getY(th.val);
            return (
              <g key={th.label}>
                <line
                  x1={padLeft}
                  y1={lineY}
                  x2={width - padRight}
                  y2={lineY}
                  stroke={th.color}
                  strokeWidth="1.6"
                  strokeDasharray="5 4"
                  strokeOpacity="0.9"
                />
                {/* Teks Label Nilai Y di Kiri */}
                <text
                  x={padLeft - 8}
                  y={lineY + 3.5}
                  textAnchor="end"
                  fill={th.color}
                  className="text-[10.5px] font-mono font-semibold"
                >
                  {th.val}
                </text>

                {/* Badge Label AWAS / SIAGA / WASPADA */}
                <rect
                  x={padLeft + 8}
                  y={lineY - 14}
                  width={68}
                  height={13}
                  rx={3}
                  fill="#ffffff"
                  fillOpacity="0.92"
                />
                <text
                  x={padLeft + 10}
                  y={lineY - 4}
                  fill={th.color}
                  className="text-[9.5px] font-extrabold uppercase tracking-wider"
                >
                  {th.label}
                </text>
              </g>
            );
          })}

          {/* Area Warna Gradien di Bawah Garis Data */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#lightOutflowGradient)"
              className="transition-all duration-300"
            />
          )}

          {/* Garis Data Outflow Aktual */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#lightGlow)"
              className="transition-all duration-300"
            />
          )}

          {/* Tampilan jika data kosong / tidak ada data sesuai filter */}
          {points.length === 0 && (
            <g transform={`translate(${padLeft + chartW / 2}, ${padTop + chartH / 2})`}>
              <circle r="24" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
              <text
                x="0"
                y="-2"
                textAnchor="middle"
                className="fill-slate-400 text-lg select-none"
              >
                📊
              </text>
              <text
                x="0"
                y="38"
                textAnchor="middle"
                className="fill-slate-500 text-xs font-semibold select-none"
              >
                Tidak ada data debit outflow untuk rentang filter ini
              </text>
              <text
                x="0"
                y="52"
                textAnchor="middle"
                className="fill-slate-400 text-[10px] select-none"
              >
                Coba pilih &quot;Semua Hari&quot; atau sesuaikan filter jam/bendungan
              </text>
            </g>
          )}

          {/* Titik Data & Label Sumbu X */}
          {points.map((pt, idx) => (
            <g key={idx} className="cursor-pointer">
              {/* Tick Vertikal Sumbu X */}
              <line
                x1={pt.x}
                y1={padTop + chartH}
                x2={pt.x}
                y2={padTop + chartH + 6}
                stroke="#94a3b8"
                strokeWidth="1.5"
              />

              {/* Label Jam Sumbu X (Miring) */}
              <g transform={`translate(${pt.x}, ${padTop + chartH + 16})`}>
                <text
                  x="0"
                  y="0"
                  textAnchor="end"
                  transform="rotate(-35)"
                  className="fill-slate-600 text-[10px] font-mono font-medium"
                >
                  {pt.hour.includes("WIB") ? pt.hour : `${pt.hour} WIB`}
                </text>
              </g>

              {/* Titik Bulat */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4.5"
                fill="#ffffff"
                stroke="#0284c7"
                strokeWidth="2.5"
                className="transition-all hover:r-6"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              />

              {/* Nilai kecil di atas titik */}
              <text
                x={pt.x}
                y={pt.y - 8}
                textAnchor="middle"
                className="fill-slate-700 text-[9.5px] font-mono font-semibold select-none pointer-events-none"
              >
                {pt.value}
              </text>
            </g>
          ))}

          {/* Tooltip Hover Pop-up */}
          {hoveredPoint && (
            <g
              transform={`translate(${Math.min(
                width - 130,
                Math.max(padLeft + 10, hoveredPoint.x - 60)
              )}, ${Math.max(10, hoveredPoint.y - 50)})`}
              className="pointer-events-none transition-all duration-150"
            >
              <rect
                width="120"
                height={hoveredPoint.dateStr ? "48" : "38"}
                rx="8"
                fill="#0f172a"
                filter="url(#lightGlow)"
              />
              {hoveredPoint.dateStr && (
                <text x="60" y="14" textAnchor="middle" fill="#64748b" className="text-[8.5px] font-mono">
                  {hoveredPoint.dateStr}
                </text>
              )}
              <text
                x="60"
                y={hoveredPoint.dateStr ? "27" : "15"}
                textAnchor="middle"
                fill="#94a3b8"
                className="text-[9.5px] font-mono"
              >
                Pukul {hoveredPoint.hour} WIB
              </text>
              <text
                x="60"
                y={hoveredPoint.dateStr ? "41" : "30"}
                textAnchor="middle"
                fill="#38bdf8"
                className="text-[11px] font-bold font-mono"
              >
                {hoveredPoint.value} m³/det
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Legend & Informasi Ambang Siaga di Bagian Bawah */}
      <div className="mt-2 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-sky-500 rounded-full inline-block" />
            <span className="text-slate-600 text-[11px]">Q Outflow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 border-t border-dashed border-emerald-600 inline-block" />
            <span className="text-slate-600 text-[11px]">🟩 Waspada (≥800)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 border-t border-dashed border-amber-600 inline-block" />
            <span className="text-slate-600 text-[11px]">🟨 Siaga (≥900)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 border-t border-dashed border-rose-600 inline-block" />
            <span className="text-slate-600 text-[11px]">🟥 Awas (≥1000)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          Rata-rata:{" "}
          <strong className="text-slate-800">
            {values.length > 0
              ? `${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)} m³/det`
              : "-"}
          </strong>
        </div>
      </div>
    </div>
  );
}
