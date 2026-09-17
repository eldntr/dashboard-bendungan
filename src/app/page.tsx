"use client";

import { useState, useEffect } from "react";
import { parseDamReports } from "@/lib/parser";
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
  BarChart3,
  FileText,
  LayoutDashboard,
  Filter
} from "lucide-react";
import OutflowChart, { OutflowPoint } from "@/app/components/OutflowChart";

const getSampleText = () => {
  let todayStr = "16 September 2026";
  try {
    todayStr = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date());
  } catch {}

  return `Bendung Mrican		
==============		
Tanggal :	${todayStr}	
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
};

export default function DamDashboard() {
  const [inputText, setInputText] = useState("");
  const [parsedReports, setParsedReports] = useState<DamMonitoringData[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"dashboard" | "input">("dashboard");
  const [history, setHistory] = useState<DamMonitoringData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [configured, setConfigured] = useState<boolean>(false);

  // Format Tanggal Hari Ini secara dinamis dari waktu sistem aktual
  const formatTodayIndo = () => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date());
    } catch {
      return "";
    }
  };

  // State Filter Grafik
  const [selectedDam, setSelectedDam] = useState<string>("ALL"); // "ALL" | specific damName
  const [selectedDate, setSelectedDate] = useState<string>("TODAY"); // "TODAY" | "ALL" | specific date
  const [startHour, setStartHour] = useState<string>("00.00");
  const [endHour, setEndHour] = useState<string>("23.59");

  useEffect(() => {
    // Check if configured via client env or by testing the API
    const isClientConfigured = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );
    setConfigured(isClientConfigured);
    fetchReports();
  }, []);

  // Kumpulan seluruh data (termasuk laporan yang sedang dipreview dan riwayat database)
  const combinedReports = parsedReports.length > 0 ? [...parsedReports, ...history] : history;

  // Daftar unik bendungan yang ada di data
  const availableDams = Array.from(
    new Set(
      combinedReports
        .map((r) => r.dam_name)
        .filter((name): name is string => Boolean(name && name.trim() !== ""))
    )
  );

  // Laporan yang relevan dengan bendungan yang sedang dipilih
  const damFilteredReports = selectedDam !== "ALL"
    ? combinedReports.filter((r) => r.dam_name === selectedDam)
    : combinedReports;

  // Gunakan laporan yang sedang diproses/sesuai bendungan yang dipilih
  const previewData = damFilteredReports[activeIndex] || damFilteredReports[0] || null;

  // Daftar unik tanggal yang ada di data
  const availableDates = Array.from(
    new Set(
      combinedReports
        .map((r) => r.date_str)
        .filter((d): d is string => Boolean(d && d.trim() !== "" && d !== "-"))
    )
  );

  // Tanggal dinamis hari ini
  const dynamicToday = formatTodayIndo();

  // Helper konversi jam (misal "07.00" atau "7:00" -> menit sejak 00:00)
  const parseHourToMinutes = (hStr: string) => {
    if (!hStr) return 0;
    const parts = hStr.replace("WIB", "").trim().replace(".", ":").split(":");
    const hours = parseInt(parts[0] || "0", 10);
    const mins = parseInt(parts[1] || "0", 10);
    return hours * 60 + mins;
  };

  // Kumpulan data outflow gabungan dengan stempel tanggal dan nama bendung
  interface ExtendedOutflowPoint extends OutflowPoint {
    damName?: string;
  }
  const allOutflowPoints: ExtendedOutflowPoint[] = [];
  const seenPointKeys = new Set<string>();

  // Urutkan laporan dari yang terlama ke terbaru (ascending) berdasarkan createdAt
  const sortedReports = [...combinedReports].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeA - timeB;
  });

  for (const report of sortedReports) {
    if (report.outflow_hourly && report.outflow_hourly.length > 0) {
      // Urutkan titik per jam di dalam laporan berdasarkan jam (ascending)
      const sortedHourly = [...report.outflow_hourly].sort(
        (a, b) => parseHourToMinutes(a.hour) - parseHourToMinutes(b.hour)
      );

      for (const item of sortedHourly) {
        const key = `${report.dam_name}_${report.date_str || "Hari Ini"}_${item.hour}`;
        if (!seenPointKeys.has(key)) {
          seenPointKeys.add(key);
          allOutflowPoints.push({
            hour: item.hour,
            value: item.value,
            dateStr: report.date_str || "",
            damName: report.dam_name,
          });
        }
      }
    }
  }

  // Filter titik data berdasarkan bendungan, tanggal dan rentang jam, dan pastikan terurut kronologis
  const filteredOutflowPoints = allOutflowPoints
    .filter((pt) => {
      // Filter Bendungan
      if (selectedDam !== "ALL" && pt.damName && pt.damName !== selectedDam) {
        return false;
      }

      // Filter Tanggal: "TODAY" (ketat hanya data hari ini sistem aktual), "ALL" (semua), atau tanggal spesifik
      if (selectedDate === "TODAY") {
        if (!pt.dateStr) return false;
        // Hanya lolos jika tanggal data persis sama dengan tanggal sistem hari ini
        const isExactToday = pt.dateStr.trim().toLowerCase() === dynamicToday.trim().toLowerCase();
        if (!isExactToday) {
          return false;
        }
      } else if (selectedDate !== "ALL") {
        if (pt.dateStr !== selectedDate) {
          return false;
        }
      }

      // Filter Jam (Format standar HH:MM atau HH.MM)
      const normPtHour = pt.hour.replace(".", ":");
      const normStart = startHour.replace(".", ":");
      const normEnd = endHour.replace(".", ":");

      if (normPtHour < normStart || normPtHour > normEnd) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // Urutkan kronologis jam (00:00 -> 23:59)
      return parseHourToMinutes(a.hour) - parseHourToMinutes(b.hour);
    });

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports");
      const json = await res.json();
      if (json.success && json.data) {
        setConfigured(true);
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

  const handleProcessText = (customText?: string) => {
    const textToParse = customText !== undefined ? customText : inputText;
    if (!textToParse.trim()) {
      setMessage({ text: "Harap masukkan teks laporan terlebih dahulu.", type: "error" });
      return null;
    }
    try {
      const list = parseDamReports(textToParse);
      setParsedReports(list);
      setActiveIndex(0);
      return list;
    } catch {
      setMessage({ text: "Gagal memproses teks. Pastikan format teks sesuai.", type: "error" });
      return null;
    }
  };

  const handleProcessAndSave = async () => {
    if (!inputText.trim()) {
      setMessage({ text: "Harap masukkan teks laporan terlebih dahulu.", type: "error" });
      return;
    }

    const list = handleProcessText(inputText);
    if (!list || list.length === 0) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(list),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Gagal menyimpan");
      }

      setMessage({
        text: `Berhasil mengolah dan menyimpan ${list.length} laporan ke database!`,
        type: "success",
      });
      fetchReports();
      setActiveTab("dashboard");
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
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200/80 shadow-xs">
                <Waves className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                  Dashboard Monitoring Bendungan
                </h1>
                <p className="text-slate-500 text-sm">
                  Otomasi Ekstraksi Laporan & Penyimpanan Memori ke Supabase (Vercel Ready)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-2 ${
              configured 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : "bg-amber-50 text-amber-700 border-amber-200"
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
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : message.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}>
            <div className="flex items-center gap-3">
              {message.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
              {message.type === "error" && <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
              {message.type === "info" && <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard & Visualisasi</span>
            {parsedReports.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                activeTab === "dashboard" ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {parsedReports.length} Sesi
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("input")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === "input"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Input Teks Laporan</span>
          </button>
        </div>

        {/* Tab 1: Input Teks Laporan */}
        {activeTab === "input" && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Input & Ekstraksi Teks Laporan
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tempel teks laporan harian/shift bendungan untuk diekstrak otomatis.
                  </p>
                </div>
                <button
                  onClick={() => setInputText(getSampleText())}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium transition underline underline-offset-4"
                >
                  Reset Sample
                </button>
              </div>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                rows={18}
                placeholder="Tempel teks laporan bendungan di sini..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs md:text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none"
              />

              <div className="mt-4">
                <button
                  onClick={handleProcessAndSave}
                  disabled={isSaving}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-xl font-semibold text-sm md:text-base text-white shadow-md shadow-blue-600/20"
                >
                  <Send className="w-4 h-4" />
                  {isSaving ? "Mengolah & Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Dashboard Visualisasi & Grafik */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">


            {/* Pemilih Lokasi / Bendung Utama (Dipisah tersendiri dengan pembatas) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 block">
                    PILIHAN BENDUNGAN
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {selectedDam === "ALL" ? "Semua Bendungan" : selectedDam}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <label htmlFor="select-main-dam" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                  Pilih Lokasi / Bendung:
                </label>
                <select
                  id="select-main-dam"
                  value={selectedDam}
                  onChange={(e) => {
                    setSelectedDam(e.target.value);
                    setActiveIndex(0);
                  }}
                  className="w-full sm:w-auto min-w-[200px] bg-slate-50 border border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl py-2 px-3 text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer transition shadow-2xs"
                >
                  <option value="ALL">Semua Bendungan</option>
                  {availableDams.map((dam) => (
                    <option key={dam} value={dam}>
                      {dam}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Garis Pembatas / Pemisah Antara Pemilih Bendung dan Dashboard */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/50 px-2 rounded">
                {selectedDam === "ALL" ? "Ringkasan Parameter Monitoring" : `Dashboard ${selectedDam}`}
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {previewData ? (
              <div className="space-y-6">
                {/* Status Cards (Kondisi, Siaga Banjir, Cuaca) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                    <span className="text-xs text-slate-400">Kondisi</span>
                    <p className="text-lg font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      {previewData.condition}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                    <span className="text-xs text-slate-400">Siaga Banjir</span>
                    <p className={`text-lg font-bold mt-1 ${
                      previewData.siaga_status === "Merah" 
                        ? "text-rose-600" 
                        : previewData.siaga_status === "Kuning" 
                        ? "text-amber-600" 
                        : previewData.siaga_status === "Hijau"
                        ? "text-emerald-600"
                        : "text-slate-700"
                    }`}>
                      {previewData.siaga_status}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
                    <span className="text-xs text-slate-400">Cuaca</span>
                    <p className="text-lg font-bold text-amber-600 mt-1 flex items-center gap-1.5">
                      <CloudSun className="w-4 h-4" />
                      {previewData.cuaca}
                    </p>
                  </div>
                </div>

                {/* DKD II Flow Rates */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    Pola Debit DKD II & Saluran Irigasi
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs text-slate-500">Q Inflow</span>
                      <p className="text-xl font-bold text-blue-600 mt-1">
                        {previewData.q_inflow_dkd ?? "-"} <span className="text-xs font-normal text-slate-500">m³/det</span>
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs text-slate-500">Q Outflow</span>
                      <p className="text-xl font-bold text-teal-600 mt-1">
                        {previewData.q_outflow_dkd ?? "-"} <span className="text-xs font-normal text-slate-500">m³/det</span>
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs text-slate-500">Mrican Kiri Waru</span>
                      <p className="text-xl font-bold text-indigo-600 mt-1">
                        {previewData.mrican_kiri ?? "-"} <span className="text-xs font-normal text-slate-500">m³/det</span>
                      </p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-xs text-slate-500">Mrican Kanan Turi</span>
                      <p className="text-xl font-bold text-purple-600 mt-1">
                        {previewData.mrican_kanan ?? "-"} <span className="text-xs font-normal text-slate-500">m³/det</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visualisasi Grafik Outflow: Jika 'Semua Bendungan', pisahkan menjadi satu kartu grafik per bendungan */}
                {selectedDam === "ALL" && availableDams.length > 0 ? (
                  <div className="space-y-6">
                    {availableDams.map((dam) => {
                      const damPoints = filteredOutflowPoints.filter((pt) => pt.damName === dam);
                      const matchingReport = combinedReports.find((r) => r.dam_name === dam);
                      return (
                        <OutflowChart
                          key={dam}
                          damName={dam}
                          dateStr={
                            selectedDate === "TODAY"
                              ? (matchingReport?.date_str || dynamicToday)
                              : selectedDate === "ALL"
                              ? "Gabungan Seluruh Hari"
                              : selectedDate
                          }
                          timeRange={`${startHour} - ${endHour}`}
                          outflowHourly={damPoints}
                          currentStatus={matchingReport?.siaga_status || "Normal"}
                          availableDams={availableDams}
                          selectedDam={dam}
                          onSelectDam={(d) => setSelectedDam(d)}
                          availableDates={availableDates}
                          selectedDate={selectedDate}
                          onSelectDate={(d) => setSelectedDate(d)}
                          startHour={startHour}
                          onSelectStartHour={(h) => setStartHour(h)}
                          endHour={endHour}
                          onSelectEndHour={(h) => setEndHour(h)}
                          onResetFilter={() => {
                            setSelectedDam("ALL");
                            setSelectedDate("TODAY");
                            setStartHour("00.00");
                            setEndHour("23.59");
                          }}
                          defaultDateLabel={dynamicToday || matchingReport?.date_str || "Terkini"}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <OutflowChart
                    damName={selectedDam !== "ALL" ? selectedDam : previewData.dam_name}
                    dateStr={
                      selectedDate === "TODAY"
                        ? (previewData.date_str || dynamicToday)
                        : selectedDate === "ALL"
                        ? "Gabungan Seluruh Hari"
                        : selectedDate
                    }
                    timeRange={`${startHour} - ${endHour}`}
                    outflowHourly={filteredOutflowPoints}
                    currentStatus={previewData.siaga_status}
                    availableDams={availableDams}
                    selectedDam={selectedDam}
                    onSelectDam={(dam) => setSelectedDam(dam)}
                    availableDates={availableDates}
                    selectedDate={selectedDate}
                    onSelectDate={(d) => setSelectedDate(d)}
                    startHour={startHour}
                    onSelectStartHour={(h) => setStartHour(h)}
                    endHour={endHour}
                    onSelectEndHour={(h) => setEndHour(h)}
                    onResetFilter={() => {
                      setSelectedDam("ALL");
                      setSelectedDate("TODAY");
                      setStartHour("00.00");
                      setEndHour("23.59");
                    }}
                    defaultDateLabel={dynamicToday || previewData.date_str || "Terkini"}
                  />
                )}

                {/* Hourly Outflow & Technical Info */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Hourly breakdown */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                    <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      Q Outflow Per Jam ({previewData.time_range})
                    </h3>
                    <div className="space-y-2">
                      {previewData.outflow_hourly.length > 0 ? (
                        [...previewData.outflow_hourly]
                          .sort((a, b) => parseHourToMinutes(a.hour) - parseHourToMinutes(b.hour))
                          .map((h, i) => (
                            <div key={i} className="flex justify-between items-center py-1.5 px-3 bg-slate-50 rounded-lg text-sm border border-slate-100">
                              <span className="text-slate-700 font-mono">{h.hour} WIB</span>
                              <span className="font-semibold text-teal-600">{h.value} m³/det</span>
                            </div>
                          ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">Tidak ada rincian per jam</p>
                      )}
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm font-bold">
                        <span className="text-slate-700">Outflow Rata-rata</span>
                        <span className="text-teal-600">{previewData.out_average ?? "-"} m³/det</span>
                      </div>
                    </div>
                  </div>

                  {/* Elevation & Officers */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        Detail Teknis & Petugas
                      </h3>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Elevasi Aktual</span>
                          <span className="font-bold text-amber-600">{previewData.elv_aktual ?? "-"} m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tanggal</span>
                          <span className="text-slate-800 font-medium">{previewData.date_str}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Shift</span>
                          <span className="text-slate-800 font-medium">{previewData.shift_info}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-xs text-slate-500 block mb-1">Petugas Jaga:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {previewData.officers.length > 0 ? (
                          previewData.officers.map((officer, idx) => (
                            <span key={idx} className="text-xs px-2.5 py-1 bg-slate-100 rounded-md text-slate-700 border border-slate-200">
                              {officer}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs max-w-xl mx-auto my-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Belum Ada Data Laporan
                </h3>
                <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                  Grafik dan ringkasan debit akan otomatis ditampilkan setelah Anda memasukkan teks laporan bendungan.
                </p>
                <button
                  onClick={() => setActiveTab("input")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Buka Tab Input Teks
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stored Memory / History Section */}
        <div className="pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-900">Memori Tersimpan (Database Supabase)</h2>
            </div>
            <button
              onClick={fetchReports}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 flex items-center gap-1.5 transition shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Muat Ulang
            </button>
          </div>

          {history.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-sm">
              Belum ada data riwayat tersimpan di database. Klik &quot;Simpan ke Supabase&quot; untuk menyimpan data hasil pengolahan teks.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-900 text-base">{item.dam_name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        item.siaga_status === "Merah" ? "bg-rose-100 text-rose-700 border border-rose-200" :
                        item.siaga_status === "Kuning" ? "bg-amber-100 text-amber-700 border border-amber-200" :
                        item.siaga_status === "Hijau" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
                        "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {item.siaga_status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 space-y-1 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.date_str || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{item.time_range || "-"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs mb-3 border border-slate-100">
                      <div>
                        <span className="text-slate-400 block">Q Inflow:</span>
                        <span className="font-semibold text-blue-600">{item.q_inflow_dkd ?? "-"} m³/det</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Q Outflow:</span>
                        <span className="font-semibold text-teal-600">{item.q_outflow_dkd ?? "-"} m³/det</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Elevasi:</span>
                        <span className="font-semibold text-amber-600">{item.elv_aktual ?? "-"} m</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Cuaca:</span>
                        <span className="font-semibold text-slate-700">{item.cuaca || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 text-[11px]">
                      {item.shift_info} ({item.officers?.join(", ") || "-"})
                    </span>
                    {item.id && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-400 hover:text-rose-600 transition p-1"
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
