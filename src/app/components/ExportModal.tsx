"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { DamMonitoringData } from "@/types/dam";
import {
  exportDamReportsToExcel,
  filterReportsForExport,
  ExportPeriod,
} from "@/lib/exportExcel";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: DamMonitoringData[];
  availableDams: string[];
  initialDam?: string;
  initialStartDate?: Date | null;
  initialEndDate?: Date | null;
}

export default function ExportModal({
  isOpen,
  onClose,
  reports,
  availableDams,
  initialDam = "ALL",
  initialStartDate,
  initialEndDate,
}: ExportModalProps) {
  const [period, setPeriod] = useState<ExportPeriod>("all");
  const [selectedDam, setSelectedDam] = useState<string>(initialDam);

  // Helper konversi Date ke format YYYY-MM-DD
  const formatInputDate = (d?: Date | null) => {
    if (!d || isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState<string>(() => formatInputDate(initialStartDate));
  const [endDate, setEndDate] = useState<string>(() => formatInputDate(initialEndDate));

  // Sync saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setSelectedDam(initialDam || "ALL");
      if (initialStartDate && initialEndDate) {
        setStartDate(formatInputDate(initialStartDate));
        setEndDate(formatInputDate(initialEndDate));
      }
    }
  }, [isOpen, initialDam, initialStartDate, initialEndDate]);

  // Hitung data yang terfilter secara reaktif
  const filteredReports = useMemo(() => {
    return filterReportsForExport(reports, {
      period,
      startDate: period === "custom" ? startDate : undefined,
      endDate: period === "custom" ? endDate : undefined,
      damName: selectedDam,
    });
  }, [reports, period, startDate, endDate, selectedDam]);

  if (!isOpen) return null;

  const handleExport = () => {
    if (filteredReports.length === 0) return;

    // Tentukan nama file yang deskriptif
    let periodLabel = "Seluruh_Data";
    if (period === "week") periodLabel = "1_Minggu";
    else if (period === "month") periodLabel = "1_Bulan";
    else if (period === "custom") {
      periodLabel = `${startDate || "awal"}_sd_${endDate || "akhir"}`;
    }

    const damLabel = selectedDam === "ALL" ? "Semua_Bendung" : selectedDam.replace(/\s+/g, "_");
    const filename = `Laporan_Bendung_${damLabel}_${periodLabel}`;
    const sheetName = selectedDam === "ALL" ? "Data Monitoring Bendung" : selectedDam.slice(0, 31);

    exportDamReportsToExcel(filteredReports, {
      filename,
      sheetName,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col scale-in-95 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Unduh Data Bendung ke Excel
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Format .xlsx (1 Sheet Rapi & Siap Cetak)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Pilihan Bendung */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Pilihan Bendung
            </label>
            <select
              value={selectedDam}
              onChange={(e) => setSelectedDam(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl py-2.5 px-3.5 text-xs md:text-sm font-semibold text-slate-800 outline-none transition cursor-pointer"
            >
              <option value="ALL">Semua Bendung ({reports.length} total laporan)</option>
              {availableDams.map((dam) => {
                const count = reports.filter((r) => r.dam_name === dam).length;
                return (
                  <option key={dam} value={dam}>
                    {dam} ({count} laporan)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Pilihan Periode Waktu */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Pilihan Periode Waktu
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: "all", label: "Seluruh Data", desc: "Semua riwayat pemantauan" },
                { id: "week", label: "1 Minggu Terakhir", desc: "7 hari terakhir" },
                { id: "month", label: "1 Bulan Terakhir", desc: "30 hari terakhir" },
                { id: "custom", label: "Rentang Hari", desc: "Pilih tanggal sendiri" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeriod(item.id as ExportPeriod)}
                  className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    period === item.id
                      ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950"
                      : "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <span className="text-xs font-bold flex items-center justify-between">
                    {item.label}
                    {period === item.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    )}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Tanggal Kustom (Jika memilih Rentang Hari) */}
          {period === "custom" && (
            <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <span className="text-xs font-semibold text-slate-700 block">
                Tentukan Rentang Hari:
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 block">
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500 block">
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pratinjau Jumlah Data */}
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
              filteredReports.length > 0
                ? "bg-emerald-50/50 border-emerald-200/70 text-emerald-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {filteredReports.length > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              )}
              <span>
                {filteredReports.length > 0
                  ? `Ditemukan ${filteredReports.length} laporan bendung siap diekspor`
                  : "Tidak ada data laporan bendung pada kriteria ini"}
              </span>
            </div>
            <span className="font-bold text-xs bg-white px-2 py-0.5 rounded-lg border border-slate-200 shadow-2xs">
              {filteredReports.length} baris
            </span>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={filteredReports.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Excel (.xlsx)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
