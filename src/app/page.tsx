"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { DamMonitoringData } from "@/types/dam";
import {
  Waves,
  CloudSun,
  ShieldCheck,
  Database,
  RefreshCw,
  BarChart3,
  LayoutDashboard,
  FileText,
} from "lucide-react";
import OutflowChart, { OutflowPoint } from "@/app/components/OutflowChart";
import Footer from "@/app/components/Footer";
import {
  parseDateString,
  formatDate,
  isSameDay,
  isDateInRange,
} from "@/lib/dateUtils";

interface ApiDamReport {
  id: string;
  createdAt: string;
  damName: string;
  dateStr: string;
  timeRange: string;
  condition: string;
  qInflowDkd: number | null;
  qOutflowDkd: number | null;
  mricanKiri: number | null;
  mricanKanan: number | null;
  siagaStatus: "Hijau" | "Kuning" | "Merah" | "Normal";
  outflowHourly: { hour: string; value: number }[];
  outAverage: number | null;
  elvAktual: number | null;
  cuaca: string;
  shiftInfo: string;
  officers: string[];
  rawText?: string;
}

export default function DamDashboard() {
  const [history, setHistory] = useState<DamMonitoringData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const hasAutoSelectedDateRef = useRef(false);
  const [configured, setConfigured] = useState<boolean>(() => {
    return Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );
  });

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
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [endDate, setEndDate] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [isAllDates, setIsAllDates] = useState<boolean>(false);
  const [startHour, setStartHour] = useState<string>("00.00");
  const [endHour, setEndHour] = useState<string>("23.59");

  const mapReports = (data: ApiDamReport[]): DamMonitoringData[] => {
    return data.map((item) => ({
      id: item.id,
      created_at: item.createdAt,
      dam_name: item.damName,
      date_str: item.dateStr,
      time_range: item.timeRange,
      condition: item.condition,
      q_inflow_dkd: item.qInflowDkd !== null ? Number(item.qInflowDkd) : null,
      q_outflow_dkd: item.qOutflowDkd !== null ? Number(item.qOutflowDkd) : null,
      mrican_kiri: item.mricanKiri !== null ? Number(item.mricanKiri) : null,
      mrican_kanan: item.mricanKanan !== null ? Number(item.mricanKanan) : null,
      siaga_status: item.siagaStatus,
      outflow_hourly: item.outflowHourly || [],
      out_average: item.outAverage !== null ? Number(item.outAverage) : null,
      elv_aktual: item.elvAktual !== null ? Number(item.elvAktual) : null,
      cuaca: item.cuaca,
      shift_info: item.shiftInfo,
      officers: item.officers || [],
      raw_text: item.rawText,
    }));
  };

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/reports");
      const json = await res.json();
      if (json.success && json.data) {
        setConfigured(true);
        setHistory(mapReports(json.data));
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      try {
        const res = await fetch("/api/reports");
        const json = await res.json();
        if (isMounted && json.success && json.data) {
          setConfigured(true);
          setHistory(mapReports(json.data));
        }
      } catch (err) {
        console.error("Initial load error:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    loadInitial();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Data sumber laporan
  const combinedReports = history;

  // Jika hari ini belum memiliki data laporan di database pada saat muat awal,
  // inisialisasi default filter ke tanggal laporan terbaru agar grafik langsung terisi.
  // Gunakan ref agar HANYA dijalankan SEKALI saat awal, dan TIDAK me-reset ketika user memilih "Hari Ini".
  useEffect(() => {
    if (hasAutoSelectedDateRef.current) return;
    if (combinedReports.length > 0) {
      hasAutoSelectedDateRef.current = true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const hasTodayData = combinedReports.some((r) => {
        if (!r.date_str) return false;
        const d = parseDateString(r.date_str);
        return d && isSameDay(d, today);
      });

      if (!hasTodayData) {
        for (const r of combinedReports) {
          if (r.date_str) {
            const parsed = parseDateString(r.date_str);
            if (parsed) {
              setStartDate(parsed);
              setEndDate(parsed);
              break;
            }
          }
        }
      }
    }
  }, [combinedReports]);

  // Daftar unik bendung yang ada di data
  const availableDams = Array.from(
    new Set(
      combinedReports
        .map((r) => r.dam_name)
        .filter((name): name is string => Boolean(name && name.trim() !== ""))
    )
  );

  // Daftar bendung yang akan ditampilkan di dashboard
  const damsToDisplay = selectedDam === "ALL"
    ? availableDams
    : availableDams.includes(selectedDam)
    ? [selectedDam]
    : availableDams.slice(0, 1);

  // Helper format angka debit (m³/det)
  const formatFlowRate = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(Number(val))) return "-";
    const num = Number(val);
    return Number(num.toFixed(3)).toString();
  };

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

  // Helper konversi jam (misal "07.00" -> menit sejak 00:00)
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

  // Filter titik data berdasarkan bendung, rentang tanggal kalender dan rentang jam
  const filteredOutflowPoints = allOutflowPoints
    .filter((pt) => {
      // Filter Bendung
      if (selectedDam !== "ALL" && pt.damName && pt.damName !== selectedDam) {
        return false;
      }

      // Filter Tanggal
      if (!isAllDates) {
        if (!startDate || !endDate) return false;
        const ptDate = parseDateString(pt.dateStr);
        if (!ptDate) return false;
        if (!isDateInRange(ptDate, startDate, endDate)) {
          return false;
        }
      }

      // Filter Jam
      const normPtHour = pt.hour.replace(".", ":");
      const normStart = startHour.replace(".", ":");
      const normEnd = endHour.replace(".", ":");

      if (normPtHour < normStart || normPtHour > normEnd) {
        return false;
      }

      return true;
    })
    .sort((a, b) => parseHourToMinutes(a.hour) - parseHourToMinutes(b.hour));

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
                  Dashboard Monitoring Bendung
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={fetchReports}
              disabled={isMounted ? isLoading : false}
              title="Segarkan data monitoring"
              aria-label="Segarkan data monitoring"
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition shadow-2xs flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isMounted && isLoading ? "animate-spin" : ""}`} />
            </button>

            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs transition"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Admin / Input</span>
            </Link>

            <div className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-2 ${
              configured 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              <Database className="w-3.5 h-3.5" />
              {configured ? "Connected" : "Local Demo Mode (Supabase not configured)"}
            </div>
          </div>
        </header>

        {/* Dashboard Visualisasi & Grafik */}
        <div className="space-y-6">
          {/* Pemilih Lokasi / Bendung Utama */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 block">
                  PILIHAN BENDUNG
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {selectedDam === "ALL" ? "Semua Bendung" : selectedDam}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <label htmlFor="select-main-dam" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Pilih Lokasi / Bendung:
              </label>
              <select
                id="select-main-dam"
                value={selectedDam}
                onChange={(e) => setSelectedDam(e.target.value)}
                className="w-full sm:w-auto min-w-[200px] bg-slate-50 border border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl py-2 px-3 text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer transition shadow-2xs"
              >
                <option value="ALL">Semua Bendung</option>
                {availableDams.map((dam) => (
                  <option key={dam} value={dam}>
                    {dam}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Garis Pembatas Antara Pemilih Bendung dan Dashboard */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50/50 px-2 rounded">
              {selectedDam === "ALL"
                ? `Daftar Monitoring Seluruh Bendung (${availableDams.length} Lokasi)`
                : `Dashboard ${selectedDam}`}
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {damsToDisplay.length > 0 ? (
            <div className="space-y-8">
              {damsToDisplay.map((damName, damIdx) => {
                const damReports = combinedReports.filter((r) => r.dam_name === damName);
                const damData = damReports[0] || null;
                if (!damData) return null;

                const damPoints = filteredOutflowPoints.filter((pt) => pt.damName === damName);

                return (
                  <section
                    key={damName}
                    aria-label={`Monitoring ${damName}`}
                    className="bg-white border border-slate-200 rounded-3xl p-5 md:p-7 shadow-xs space-y-6"
                  >
                    {/* Header Kartu Bendung */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                          <Waves className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                              {selectedDam === "ALL" ? `Bendung #${damIdx + 1}` : "Monitoring Utama"}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                damData.siaga_status === "Merah"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : damData.siaga_status === "Kuning"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : damData.siaga_status === "Hijau"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {damData.siaga_status === "Normal" || !damData.siaga_status
                                ? "STATUS NORMAL"
                                : `STATUS: ${damData.siaga_status.toUpperCase()}`}
                            </span>
                          </div>
                          <h3 className="text-xl md:text-2xl font-bold text-slate-900 uppercase tracking-tight">
                            {damName}
                          </h3>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 font-medium">
                        Pembaruan: <span className="text-slate-800 font-semibold">{damData.date_str || dynamicToday}</span>{" "}
                        ({damData.time_range || "07.00 – 09.00 WIB"})
                      </div>
                    </div>

                    {/* Status Cards (Kondisi, Siaga Banjir, Cuaca) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl shadow-2xs">
                        <span className="text-xs text-slate-400">Kondisi</span>
                        <p className="text-lg font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" />
                          {damData.condition || "Normal"}
                        </p>
                      </div>
                      <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl shadow-2xs">
                        <span className="text-xs text-slate-400">Siaga Banjir</span>
                        <p
                          className={`text-lg font-bold mt-1 ${
                            damData.siaga_status === "Merah"
                              ? "text-rose-600"
                              : damData.siaga_status === "Kuning"
                              ? "text-amber-600"
                              : damData.siaga_status === "Hijau"
                              ? "text-emerald-600"
                              : "text-slate-700"
                          }`}
                        >
                          {damData.siaga_status || "Normal"}
                        </p>
                      </div>
                      <div className="bg-slate-50/70 border border-slate-200/80 p-4 rounded-xl shadow-2xs">
                        <span className="text-xs text-slate-400">Cuaca</span>
                        <p className="text-lg font-bold text-amber-600 mt-1 flex items-center gap-1.5">
                          <CloudSun className="w-4 h-4" />
                          {damData.cuaca || "Cerah"}
                        </p>
                      </div>
                    </div>

                    {/* Pola Debit DKD II & Saluran Irigasi */}
                    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
                      <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        Pola Debit DKD II & Saluran Irigasi — {damName}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                          <span className="text-xs text-slate-500">Q Inflow</span>
                          <p className="text-xl font-bold text-blue-600 mt-1">
                            {formatFlowRate(damData.q_inflow_dkd)}{" "}
                            <span className="text-xs font-normal text-slate-500">m³/det</span>
                          </p>
                        </div>
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                          <span className="text-xs text-slate-500">Q Outflow</span>
                          <p className="text-xl font-bold text-teal-600 mt-1">
                            {formatFlowRate(damData.q_outflow_dkd)}{" "}
                            <span className="text-xs font-normal text-slate-500">m³/det</span>
                          </p>
                        </div>
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                          <span className="text-xs text-slate-500">
                            {damName.toLowerCase().includes("mrican") ? "Mrican Kiri Waru" : "Saluran Kiri"}
                          </span>
                          <p className="text-xl font-bold text-indigo-600 mt-1">
                            {formatFlowRate(damData.mrican_kiri)}{" "}
                            <span className="text-xs font-normal text-slate-500">m³/det</span>
                          </p>
                        </div>
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                          <span className="text-xs text-slate-500">
                            {damName.toLowerCase().includes("mrican") ? "Mrican Kanan Turi" : "Saluran Kanan"}
                          </span>
                          <p className="text-xl font-bold text-purple-600 mt-1">
                            {formatFlowRate(damData.mrican_kanan)}{" "}
                            <span className="text-xs font-normal text-slate-500">m³/det</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Visualisasi Grafik Outflow AWLR */}
                    <OutflowChart
                      damName={damName}
                      dateStr={
                        isAllDates
                          ? "Gabungan Seluruh Hari"
                          : startDate && endDate
                          ? isSameDay(startDate, endDate)
                            ? formatDate(startDate, "long")
                            : `${formatDate(startDate, "short")} – ${formatDate(endDate, "short")}`
                          : "Terkini"
                      }
                      timeRange={`${startHour} - ${endHour}`}
                      outflowHourly={damPoints}
                      currentStatus={damData.siaga_status || "Normal"}
                      availableDams={availableDams}
                      selectedDam={damName}
                      showDamFilter={false}
                      availableDates={availableDates}
                      startDate={startDate}
                      endDate={endDate}
                      isAllDates={isAllDates}
                      onDateRangeChange={(s, e, all) => {
                        setStartDate(s);
                        setEndDate(e);
                        setIsAllDates(all);
                      }}
                      startHour={startHour}
                      endHour={endHour}
                      onTimeRangeChange={(s, e) => {
                        setStartHour(s);
                        setEndHour(e);
                      }}
                      onResetFilter={() => {
                        setIsAllDates(false);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        setStartDate(today);
                        setEndDate(today);
                        setStartHour("00.00");
                        setEndHour("23.59");
                      }}
                      defaultDateLabel={dynamicToday || damData.date_str || "Terkini"}
                    />

                  </section>
                );
              })}
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
                Grafik dan ringkasan debit akan otomatis ditampilkan setelah Anda memasukkan teks laporan bendung di Halaman Admin.
              </p>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <FileText className="w-3.5 h-3.5" />
                Buka Halaman Admin
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}
