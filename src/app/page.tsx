"use client";

import { useState, useEffect } from "react";
import { parseDamReport } from "@/lib/parser";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { DamMonitoringData } from "@/types/dam";
import {
  Waves,
  Calendar,
  Clock,
  CloudSun,
  ShieldCheck,
  AlertTriangle,
  Users,
  Database,
  Send,
  Trash2,
  RefreshCw,
  Info,
  CheckCircle,
  BarChart3
} from "lucide-react";

const SAMPLE_TEXT = `Bendung Mrican		
==============		
Tanggal :	14 September 2026	
Pukul     : 07.00 – 09.00 WIB		
Kondisi  : Normal		
__________		
POLA DKD II		
Q Inflow (m³/det) :		91,499
Q Outflow (m³/det) :		69,082
Mrican Kiri Waru (m³/det) :		12,136
Mrican Kanan Turi (m³/det) :		10,281
__________		
Siaga Banjir		
🟩 Hijau ≥ 800 m³/det		
🟨 Kuning ≥ 900 m³/det		
🟥 Merah ≥ 1000 m³/det		
_________
Q Outflow		
07.00 =	29,98	m³/det
08.00 =	29,98	m³/det
09.00 =	29,98	m³/det
		
__________		
Out Rata² :	-	m³/det
Elv Aktual :	57,30	m
Cuaca : Cerah		
__________		
Petugas Shift I		
M. Derryl		
Robert T`;

export default function DamDashboard() {
  const [inputText, setInputText] = useState(SAMPLE_TEXT);
  const [previewData, setPreviewData] = useState<DamMonitoringData | null>(null);
  const [history, setHistory] = useState<DamMonitoringData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [configured, setConfigured] = useState<boolean>(false);

  useEffect(() => {
    setConfigured(isSupabaseConfigured());
    // Parse the initial sample text
    try {
      setPreviewData(parseDamReport(SAMPLE_TEXT));
    } catch {
      // ignore
    }
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports");
      const json = await res.json();
      if (json.success && json.data) {
        // Map Prisma camelCase back to UI format
        const mapped: DamMonitoringData[] = json.data.map((item: any) => ({
          id: item.id,
          created_at: item.createdAt,
          dam_name: item.damName,
          date_str: item.dateStr,
          time_range: item.timeRange,
          condition: item.condition,
          q_inflow_dkd: item.qInflowDkd ? Number(item.qInflowDkd) : null,
          q_outflow_dkd: item.qOutflowDkd ? Number(item.qOutflowDkd) : null,
          mrican_kiri: item.mricanKiri ? Number(item.mricanKiri) : null,
          mrican_kanan: item.mricanKanan ? Number(item.mricanKanan) : null,
          siaga_status: item.siagaStatus,
          outflow_hourly: item.outflowHourly || [],
          out_average: item.outAverage ? Number(item.outAverage) : null,
          elv_aktual: item.elvAktual ? Number(item.elvAktual) : null,
          cuaca: item.cuaca,
          shift_info: item.shiftInfo,
          officers: item.officers || [],
          raw_text: item.rawText,
        }));
        setHistory(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessText = () => {
    if (!inputText.trim()) {
      setMessage({ text: "Harap masukkan teks laporan terlebih dahulu.", type: "error" });
      return;
    }
    try {
      const parsed = parseDamReport(inputText);
      setPreviewData(parsed);
      setMessage({ text: "Teks berhasil diproses dan diekstraksi!", type: "success" });
    } catch {
      setMessage({ text: "Gagal memproses teks. Pastikan format teks sesuai.", type: "error" });
    }
  };

  const handleSaveToSupabase = async () => {
    if (!previewData) {
      setMessage({ text: "Proses teks terlebih dahulu sebelum menyimpan.", type: "error" });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewData),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Gagal menyimpan");
      }

      setMessage({ text: "Berhasil menyimpan laporan ke database Supabase via Prisma!", type: "success" });
      fetchReports();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setMessage({ text: `Gagal menyimpan: ${errMsg}`, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    try {
      await fetch(`/api/reports?id=${id}`, { method: "DELETE" });
      setHistory((prev) => prev.filter((item) => item.id !== id));
      setMessage({ text: "Laporan berhasil dihapus.", type: "info" });
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                <Waves className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                  Dashboard Monitoring Bendungan
                </h1>
                <p className="text-slate-400 text-sm">
                  Otomasi Ekstraksi Laporan & Penyimpanan Memori ke Supabase (Vercel Ready)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-2 ${
              configured 
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/60" 
                : "bg-amber-950/40 text-amber-300 border-amber-800/60"
            }`}>
              <Database className="w-3.5 h-3.5" />
              {configured ? "Supabase Connected" : "Local Demo Mode (Supabase not configured)"}
            </div>
          </div>
        </header>

        {/* Status Notification */}
        {message && (
          <div className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
            message.type === "success"
              ? "bg-emerald-950/30 border-emerald-700/50 text-emerald-200"
              : message.type === "error"
              ? "bg-rose-950/30 border-rose-700/50 text-rose-200"
              : "bg-blue-950/30 border-blue-700/50 text-blue-200"
          }`}>
            <div className="flex items-center gap-3">
              {message.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
              {message.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />}
              {message.type === "info" && <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-200 font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Main Grid: Input & Parsed Data */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Text Input Area */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 backdrop-blur-sm flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <span>Input Teks Laporan Bendungan</span>
                </label>
                <button
                  onClick={() => setInputText(SAMPLE_TEXT)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition underline underline-offset-4"
                >
                  Reset Sample
                </button>
              </div>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={16}
                placeholder="Tempel teks laporan bendungan di sini..."
                className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl p-3.5 text-xs md:text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition resize-none flex-grow"
              />

              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  onClick={handleProcessText}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-98 transition rounded-xl font-medium text-sm text-white shadow-lg shadow-blue-600/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  Olah & Ekstraksi Teks
                </button>
                <button
                  onClick={handleSaveToSupabase}
                  disabled={isSaving || !previewData}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-xl font-medium text-sm text-white shadow-lg shadow-emerald-600/20"
                >
                  <Send className="w-4 h-4" />
                  {isSaving ? "Menyimpan..." : "Simpan ke Supabase"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Parsed Display / Live Preview */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {previewData ? (
              <div className="space-y-6">
                {/* Status Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
                    <span className="text-xs text-slate-400">Lokasi / Bendung</span>
                    <p className="text-lg font-bold text-white mt-1 truncate">{previewData.dam_name}</p>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
                    <span className="text-xs text-slate-400">Kondisi</span>
                    <p className="text-lg font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      {previewData.condition}
                    </p>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
                    <span className="text-xs text-slate-400">Siaga Banjir</span>
                    <p className={`text-lg font-bold mt-1 ${
                      previewData.siaga_status === "Merah" 
                        ? "text-rose-400" 
                        : previewData.siaga_status === "Kuning" 
                        ? "text-amber-400" 
                        : previewData.siaga_status === "Hijau"
                        ? "text-emerald-400"
                        : "text-slate-300"
                    }`}>
                      {previewData.siaga_status}
                    </p>
                  </div>
                  <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl">
                    <span className="text-xs text-slate-400">Cuaca</span>
                    <p className="text-lg font-bold text-amber-300 mt-1 flex items-center gap-1.5">
                      <CloudSun className="w-4 h-4" />
                      {previewData.cuaca}
                    </p>
                  </div>
                </div>

                {/* DKD II Flow Rates */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    Pola Debit DKD II & Saluran Irigasi
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400">Q Inflow</span>
                      <p className="text-xl font-bold text-blue-400 mt-1">
                        {previewData.q_inflow_dkd ?? "-"} <span className="text-xs font-normal text-slate-400">m³/det</span>
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400">Q Outflow</span>
                      <p className="text-xl font-bold text-teal-400 mt-1">
                        {previewData.q_outflow_dkd ?? "-"} <span className="text-xs font-normal text-slate-400">m³/det</span>
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400">Mrican Kiri Waru</span>
                      <p className="text-xl font-bold text-indigo-400 mt-1">
                        {previewData.mrican_kiri ?? "-"} <span className="text-xs font-normal text-slate-400">m³/det</span>
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400">Mrican Kanan Turi</span>
                      <p className="text-xl font-bold text-purple-400 mt-1">
                        {previewData.mrican_kanan ?? "-"} <span className="text-xs font-normal text-slate-400">m³/det</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Hourly Outflow & Technical Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Hourly breakdown */}
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5">
                    <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      Q Outflow Per Jam ({previewData.time_range})
                    </h3>
                    <div className="space-y-2">
                      {previewData.outflow_hourly.length > 0 ? (
                        previewData.outflow_hourly.map((h, i) => (
                          <div key={i} className="flex justify-between items-center py-1.5 px-3 bg-slate-900/50 rounded-lg text-sm border border-slate-800/80">
                            <span className="text-slate-300 font-mono">{h.hour} WIB</span>
                            <span className="font-semibold text-teal-400">{h.value} m³/det</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">Tidak ada rincian per jam</p>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-700 text-sm font-bold">
                        <span className="text-slate-300">Outflow Rata-rata</span>
                        <span className="text-teal-300">{previewData.out_average ?? "-"} m³/det</span>
                      </div>
                    </div>
                  </div>

                  {/* Elevation & Officers */}
                  <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        Detail Teknis & Petugas
                      </h3>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Elevasi Aktual</span>
                          <span className="font-bold text-amber-400">{previewData.elv_aktual ?? "-"} m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tanggal</span>
                          <span className="text-slate-200 font-medium">{previewData.date_str}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Shift</span>
                          <span className="text-slate-200 font-medium">{previewData.shift_info}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/60">
                      <span className="text-xs text-slate-400 block mb-1">Petugas Jaga:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {previewData.officers.length > 0 ? (
                          previewData.officers.map((officer, idx) => (
                            <span key={idx} className="text-xs px-2.5 py-1 bg-slate-700/60 rounded-md text-slate-200 border border-slate-600/40">
                              {officer}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-12 text-center text-slate-400">
                Tekan tombol &quot;Olah & Ekstraksi Teks&quot; untuk menampilkan visualisasi data.
              </div>
            )}
          </div>
        </div>

        {/* Stored Memory / History Section */}
        <div className="pt-6 border-t border-slate-800">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Memori Tersimpan (Database Supabase)</h2>
            </div>
            <button
              onClick={fetchReports}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Muat Ulang
            </button>
          </div>

          {history.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
              Belum ada data riwayat tersimpan di database. Klik &quot;Simpan ke Supabase&quot; untuk menyimpan data hasil pengolahan teks.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 hover:border-slate-600 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-white text-base">{item.dam_name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        item.siaga_status === "Merah" ? "bg-rose-900/60 text-rose-300" :
                        item.siaga_status === "Kuning" ? "bg-amber-900/60 text-amber-300" :
                        item.siaga_status === "Hijau" ? "bg-emerald-900/60 text-emerald-300" :
                        "bg-slate-700 text-slate-300"
                      }`}>
                        {item.siaga_status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.date_str || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{item.time_range || "-"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2.5 rounded-lg text-xs mb-3">
                      <div>
                        <span className="text-slate-400 block">Q Inflow:</span>
                        <span className="font-semibold text-blue-400">{item.q_inflow_dkd ?? "-"} m³/det</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Q Outflow:</span>
                        <span className="font-semibold text-teal-400">{item.q_outflow_dkd ?? "-"} m³/det</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Elevasi:</span>
                        <span className="font-semibold text-amber-400">{item.elv_aktual ?? "-"} m</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Cuaca:</span>
                        <span className="font-semibold text-slate-300">{item.cuaca || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/50 text-xs">
                    <span className="text-slate-500 text-[11px]">
                      {item.shift_info} ({item.officers?.join(", ") || "-"})
                    </span>
                    {item.id && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-500 hover:text-rose-400 transition p-1"
                        title="Hapus data"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
