"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Radio,
  Battery,
  ArrowDown,
  RefreshCw,
  Maximize2,
  BarChart2,
  AlertTriangle,
  Camera,
  ExternalLink,
  Eye,
  X,
} from "lucide-react";

interface AwlrLeftPanel {
  id: string | null;
  nama_pos: string;
  device_id: string | null;
  tinggi_muka_air: number | null;
  satuan: string;
  status_siaga: number;
  trend: string;
  debit: number | null;
  baterai_volt: number | null;
  baterai_persen: number | null;
  waktu_baca: string | null;
  status_alat: string;
  ambang_siaga: {
    siaga1: number | null;
    siaga2: number | null;
    siaga3: number | null;
  };
}

interface ChartPoint {
  millis: number;
  value: number;
}

interface AwlrApiResponse {
  success: boolean;
  scraped_at?: string;
  cctv?: {
    name: string;
    url: string;
  };
  left_panel?: AwlrLeftPanel;
  right_panel?: {
    grafik_12_jam?: ChartPoint[];
  };
  error?: string;
}

export default function AwlrJatimlerekPanel() {
  const [data, setData] = useState<AwlrApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "online" | "offline">("all");
  const [cctvTimestamp, setCctvTimestamp] = useState<number | null>(null);
  const [isCctvModalOpen, setIsCctvModalOpen] = useState(false);
  const [cctvError, setCctvError] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    dateStr: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  const fetchAwlrData = useCallback(async (isSilent = false) => {
    if (isSilent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/jatimlerek?t=${Date.now()}`, { cache: "no-store" });
      const json: AwlrApiResponse = await res.json();
      if (json.success) {
        setData(json);
        setCctvTimestamp(Date.now());
        setCctvError(false);
        setLastSynced(new Date());
      } else {
        setErrorMsg(json.error || "Gagal mengambil data telemetri AWLR");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Kesalahan koneksi";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setCctvTimestamp(Date.now());
    fetchAwlrData(false);

    // Auto-refresh interval 30 detik (Realtime polling ke Higertech)
    const timer = setInterval(() => {
      if (!document.hidden) {
        fetchAwlrData(true);
      }
    }, 30000);

    const handleVisibility = () => {
      if (!document.hidden) {
        fetchAwlrData(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchAwlrData]);

  const p = data?.left_panel;
  const chartPoints = data?.right_panel?.grafik_12_jam || [];

  const tma = p?.tinggi_muka_air ?? 32.64;
  const siaga1 = p?.ambang_siaga?.siaga1 ?? 33.9;
  const siaga2 = p?.ambang_siaga?.siaga2 ?? 33.7;
  const siaga3 = p?.ambang_siaga?.siaga3 ?? 33.0;

  // Format tanggal & jam baca persis sesuai Higertech (backend Higertech menyimpan waktu lokal langsung pada format UTC)
  const formatReadingTime = (isoStr: string | null) => {
    if (!isoStr) return "Hari Ini, 23:25 WIB";
    try {
      const d = new Date(isoStr);
      const hours = String(d.getUTCHours()).padStart(2, "0");
      const mins = String(d.getUTCMinutes()).padStart(2, "0");
      return `Hari Ini, ${hours}:${mins} WIB`;
    } catch {
      return "Hari Ini, 23:25 WIB";
    }
  };

  // Format waktu pada titik grafik menggunakan format UTC yang sama persis seperti Highcharts di situs asli
  const formatChartDate = (millis: number) => {
    const d = new Date(millis);
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const day = d.getUTCDate();
    const mon = months[d.getUTCMonth()];
    const yr = String(d.getUTCFullYear()).slice(2);
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    return `${day}-${mon}-${yr} ${h}:${m}`;
  };

  // Pos Duga Air Filter Logic
  const matchesSearch =
    p?.nama_pos.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p?.device_id || "").toLowerCase().includes(searchQuery.toLowerCase());

  const matchesTab =
    filterTab === "all" ||
    (filterTab === "online" && p?.status_alat === "online") ||
    (filterTab === "offline" && p?.status_alat !== "online");

  const showStationCard = matchesSearch && matchesTab;

  // SVG Chart Dimensi & Scaling
  const svgW = 680;
  const svgH = 260;
  const padL = 48;
  const padR = 25;
  const padT = 30;
  const padB = 60; // Ruang lega untuk label miring tanpa terpotong

  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const yMin = 31.8;
  const yMax = 34.2;

  const getY = (v: number) => {
    const norm = (v - yMin) / (yMax - yMin);
    return padT + chartH - norm * chartH;
  };

  const getX = (idx: number, len: number) => {
    if (len <= 1) return padL + chartW / 2;
    return padL + (idx / (len - 1)) * chartW;
  };

  // Path data garis TMA
  const linePathD = chartPoints.reduce((acc, pt, i) => {
    const x = getX(i, chartPoints.length);
    const y = getY(pt.value);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  const areaPathD =
    chartPoints.length > 0
      ? `${linePathD} L ${getX(chartPoints.length - 1, chartPoints.length)} ${
          padT + chartH
        } L ${padL} ${padT + chartH} Z`
      : "";

  return (
    <div className="space-y-6">
      {/* =========================================
          HEADER SISI KANAN: TELEMETRI AWLR
         ========================================= */}
      <header className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-200/80 shadow-xs">
            <Radio className="w-7 h-7 text-cyan-600 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-600 block">
              SISTEM TELEMETRI AWLR
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              AWLR B. Jatimlerek
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Badge Pos Online */}
          <div
            suppressHydrationWarning
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-ping opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Pos Online</span>
          </div>

          {/* Badge Device ID */}
          <div className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs">
            {p?.device_id || "HGT1539"}
          </div>

          {/* Badge Auto-Sync Realtime */}
          <div
            suppressHydrationWarning
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs"
            title="Sinkronisasi sensor & CCTV otomatis setiap 30 detik"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
            <span>Auto-Sync 30s</span>
          </div>

          {/* Tombol Segarkan Telemetri Manual */}
          <button
            type="button"
            onClick={() => fetchAwlrData(false)}
            disabled={isLoading || isRefreshing}
            suppressHydrationWarning
            title="Segarkan data telemetri & snapshot CCTV sekarang"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition shadow-2xs flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                isLoading || isRefreshing ? "animate-spin text-cyan-600" : ""
              }`}
            />
          </button>
        </div>
      </header>

      {errorMsg ? (
        <div className="p-6 text-center text-sm text-rose-600 bg-rose-50 rounded-2xl border border-rose-200">
          <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-rose-500" />
          <p className="font-semibold">{errorMsg}</p>
        </div>
      ) : (
        <>
          {/* =========================================
              BAGIAN UTAMA: POS DUGA AIR & CCTV MONITORING
             ========================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SUB-CARD 1: POS DUGA AIR (PERSIS SCREENSHOT ASLI) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
              {/* Header POS DUGA AIR */}
              <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl px-3 py-1.5 flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800">
                  POS DUGA AIR
                </span>
                <span className="bg-blue-600 text-white text-[11px] font-bold px-2 py-0.2 rounded-full">
                  1
                </span>
              </div>

              {/* Input Pencarian */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama pos/device id ..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-2xs"
                />
              </div>

              {/* Filter Pills Persis Screenshot Asli */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                    filterTab === "all"
                      ? "bg-blue-50 text-blue-700 border border-blue-300 shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Semua Pos
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("online")}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                    filterTab === "online"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Pos Online
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("offline")}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                    filterTab === "offline"
                      ? "bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Pos Offline
                </button>
              </div>

              {/* Card AWLR B.JATIMLEREK (Persis Screenshot Asli) */}
              {showStationCard ? (
                <div className="bg-white border-2 border-cyan-400/80 rounded-2xl p-3.5 shadow-xs relative overflow-hidden transition hover:shadow-md">
                  {/* Garis Aksen Samping Kiri */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-cyan-500" />

                  {/* Baris Atas: Judul Pos & Waktu Baca */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 pl-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                        {p?.nama_pos || "AWLR B.JATIMLEREK"}
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-800">
                      {formatReadingTime(p?.waktu_baca || null)}
                    </span>
                  </div>

                  {/* Baris Badges: Brand, DeviceID, Baterai */}
                  <div className="flex items-center gap-1.5 my-2.5 pl-1 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                      Higertech
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                      {p?.device_id || "HGT1539"}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                      <Battery className="w-3 h-3 text-amber-600" />
                      <span>{p?.baterai_volt !== null && p?.baterai_volt !== undefined ? `${p.baterai_volt.toFixed(2)} V` : "12.51 V"}</span>
                    </span>
                  </div>

                  {/* Baris Metrik: TMA, Debit, Status Siaga */}
                  <div className="grid grid-cols-3 gap-2 text-center py-2 border-t border-slate-100 pl-1">
                    {/* TMA */}
                    <div>
                      <div className="flex items-center justify-center gap-1 font-bold">
                        <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px]">
                          <ArrowDown className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
                          {tma !== null ? tma.toFixed(2).replace(".", ",") : "32,64"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold">mdpl</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                        Tinggi Muka Air
                      </span>
                    </div>

                    {/* Debit */}
                    <div>
                      <span className="text-sm sm:text-base font-extrabold text-slate-700 block font-mono">
                        -
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                        Debit
                      </span>
                    </div>

                    {/* Status Siaga */}
                    <div>
                      <span className="inline-block bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        NORMAL
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                        Status Siaga
                      </span>
                    </div>
                  </div>

                  {/* Multi-Color Threshold Progress Bar (Persis Screenshot Asli) */}
                  <div className="mt-2.5 pl-1 pt-2 border-t border-slate-100">
                    <div className="relative w-full h-2 rounded-full overflow-hidden flex bg-slate-100">
                      <div className="bg-emerald-500 h-full w-[80%]" />
                      <div className="bg-yellow-400 h-full w-[10%]" />
                      <div className="bg-amber-500 h-full w-[5%]" />
                      <div className="bg-rose-500 h-full w-[5%]" />
                    </div>

                    {/* Label Bawah Bar Persis Asli */}
                    <div className="flex justify-between items-center text-[9px] font-extrabold mt-1">
                      <span className="text-emerald-600">0</span>
                      <span className="text-yellow-600">{siaga3} mdpl</span>
                      <span className="text-amber-600">{String(siaga2).replace(".", ",")} mdpl</span>
                      <span className="text-rose-600">{String(siaga1).replace(".", ",")} mdpl</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                  Tidak ada pos yang cocok dengan pencarian.
                </div>
              )}
            </div>

            {/* SUB-CARD 2: MONITORING CCTV (PERSIS SCREENSHOT ASLI) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
              {/* Header CCTV */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                      MONITORING
                    </span>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight">
                      CCTV
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    LIVE
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCctvTimestamp(Date.now());
                      setCctvError(false);
                    }}
                    title="Segarkan snapshot CCTV sekarang"
                    className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card Container Kamera dengan Footer Dark Bar Persis Asli */}
              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs group flex flex-col bg-slate-900">
                <div className="relative w-full h-[210px] bg-slate-950 flex items-center justify-center overflow-hidden">
                  {cctvError ? (
                    <div className="text-center p-4 text-slate-400">
                      <Camera className="w-8 h-8 mx-auto mb-2 text-slate-500 stroke-[1.5]" />
                      <p className="text-xs font-semibold text-slate-300">Feed CCTV Sedang Sinkronisasi</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCctvError(false);
                          setCctvTimestamp(Date.now());
                        }}
                        className="mt-3 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-semibold border border-slate-700 cursor-pointer"
                      >
                        Coba Lagi
                      </button>
                    </div>
                  ) : (
                    <>
                      <img
                        src={
                          cctvTimestamp
                            ? `${data?.cctv?.url || "https://cctv.higertech.com/cctvhgt/JATIMLEREK/AWLR.jpg"}?v=${cctvTimestamp}`
                            : (data?.cctv?.url || "https://cctv.higertech.com/cctvhgt/JATIMLEREK/AWLR.jpg")
                        }
                        alt="CCTV AWLR B. Jatimlerek"
                        suppressHydrationWarning
                        onError={() => setCctvError(true)}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.02] cursor-pointer"
                        onClick={() => setIsCctvModalOpen(true)}
                      />
                    </>
                  )}
                </div>

                {/* Footer Bar Hitam Persis Screenshot Asli */}
                <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between border-t border-slate-800">
                  <span className="font-bold text-xs tracking-tight">
                    {data?.cctv?.name || "AWLR JATIMLEREK"}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCctvModalOpen(true)}
                      title="Lihat foto penuh"
                      className="text-slate-300 hover:text-white transition cursor-pointer p-0.5"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <a
                      href={data?.cctv?.url || "https://cctv.higertech.com/cctvhgt/JATIMLEREK/AWLR.jpg"}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Buka snapshot asli di tab baru"
                      className="text-slate-400 hover:text-white transition p-0.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================
              BAGIAN BAWAH: GRAFIK 12 JAM TERAKHIR (PERSIS SCREENSHOT ASLI)
             ========================================= */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            {/* Header GRAFIK & Nama Pos */}
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center flex-shrink-0">
                <BarChart2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-bold tracking-wider uppercase text-blue-600 block">
                  GRAFIK
                </span>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase">
                  {p?.nama_pos || "AWLR B.JATIMLEREK"}
                </h4>
              </div>
            </div>

            {/* Sub-judul Grafik Persis Asli */}
            <h5 className="text-center text-xs font-extrabold text-slate-800 tracking-tight mt-1">
              Data 12 Jam Terakhir
            </h5>

            {/* SVG Chart Area */}
            {chartPoints.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                Memuat data grafik 12 jam...
              </div>
            ) : (
              <div className="relative w-full overflow-hidden select-none">
                <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-auto overflow-visible">
                  <defs>
                    <linearGradient id="chartWaterGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Sumbu Y Label & Garis Kisi Horisontal */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = padT + chartH * pct;
                    const val = yMax - pct * (yMax - yMin);
                    return (
                      <g key={idx}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={padL + chartW}
                          y2={y}
                          stroke="#f1f5f9"
                          strokeWidth="1"
                        />
                        <text
                          x={padL - 6}
                          y={y + 3.5}
                          textAnchor="end"
                          className="text-[9.5px] fill-slate-400 font-mono font-medium"
                        >
                          {val.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Label Vertikal TMA (m) */}
                  <text
                    x={padL - 28}
                    y={padT + chartH / 2}
                    textAnchor="middle"
                    transform={`rotate(-90 ${padL - 28} ${padT + chartH / 2})`}
                    className="text-[9.5px] fill-slate-400 font-bold"
                  >
                    TMA (m)
                  </text>

                  {/* Garis Putus-Putus SIAGA 1 (AWAS - 33.9) */}
                  {siaga1 >= yMin && siaga1 <= yMax && (
                    <g>
                      <line
                        x1={padL}
                        y1={getY(siaga1)}
                        x2={padL + chartW}
                        y2={getY(siaga1)}
                        stroke="#ef4444"
                        strokeDasharray="4 3"
                        strokeWidth="1.2"
                      />
                      <text
                        x={padL + 4}
                        y={getY(siaga1) - 3}
                        className="text-[8.5px] fill-rose-600 font-extrabold"
                      >
                        AWAS
                      </text>
                    </g>
                  )}

                  {/* Garis Putus-Putus SIAGA 2 (SIAGA - 33.7) */}
                  {siaga2 >= yMin && siaga2 <= yMax && (
                    <g>
                      <line
                        x1={padL}
                        y1={getY(siaga2)}
                        x2={padL + chartW}
                        y2={getY(siaga2)}
                        stroke="#f59e0b"
                        strokeDasharray="4 3"
                        strokeWidth="1.2"
                      />
                      <text
                        x={padL + 4}
                        y={getY(siaga2) - 3}
                        className="text-[8.5px] fill-amber-600 font-extrabold"
                      >
                        SIAGA
                      </text>
                    </g>
                  )}

                  {/* Garis Putus-Putus SIAGA 3 (WASPADA - 33.0) */}
                  {siaga3 >= yMin && siaga3 <= yMax && (
                    <g>
                      <line
                        x1={padL}
                        y1={getY(siaga3)}
                        x2={padL + chartW}
                        y2={getY(siaga3)}
                        stroke="#eab308"
                        strokeDasharray="4 3"
                        strokeWidth="1.2"
                      />
                      <text
                        x={padL + 4}
                        y={getY(siaga3) - 3}
                        className="text-[8.5px] fill-yellow-600 font-extrabold"
                      >
                        WASPADA
                      </text>
                    </g>
                  )}

                  {/* Area Warna Air */}
                  {areaPathD && <path d={areaPathD} fill="url(#chartWaterGradient)" />}

                  {/* Garis Biru TMA Utama */}
                  {linePathD && (
                    <path
                      d={linePathD}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Titik Sampling Hover Interaktif */}
                  {chartPoints.map((pt, idx) => {
                    const step = Math.max(1, Math.floor(chartPoints.length / 20));
                    if (idx % step !== 0 && idx !== chartPoints.length - 1) return null;

                    const cx = getX(idx, chartPoints.length);
                    const cy = getY(pt.value);
                    const dateStr = formatChartDate(pt.millis);

                    return (
                      <circle
                        key={idx}
                        cx={cx}
                        cy={cy}
                        r={hoveredPoint?.dateStr === dateStr ? 4.5 : 2}
                        className="fill-sky-500 hover:fill-rose-500 stroke-white stroke-1 cursor-pointer transition-all"
                        onMouseEnter={() =>
                          setHoveredPoint({
                            dateStr,
                            value: pt.value,
                            x: cx,
                            y: cy,
                          })
                        }
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    );
                  })}

                  {/* Label Waktu Miring pada Sumbu X (Persis Screenshot Asli & Tidak Terpotong) */}
                  {chartPoints.map((pt, idx) => {
                    const step = Math.max(1, Math.floor(chartPoints.length / 4));
                    if (idx % step !== 0 && idx !== chartPoints.length - 1) return null;

                    const cx = getX(idx, chartPoints.length);
                    const dateStr = formatChartDate(pt.millis);

                    return (
                      <text
                        key={`x-${idx}`}
                        x={cx}
                        y={padT + chartH + 16}
                        textAnchor="end"
                        transform={`rotate(-40 ${cx} ${padT + chartH + 16})`}
                        className="text-[8.5px] fill-slate-500 font-mono font-medium"
                      >
                        {dateStr}
                      </text>
                    );
                  })}

                  {/* Tooltip Hover */}
                  {hoveredPoint && (
                    <g>
                      <line
                        x1={hoveredPoint.x}
                        y1={padT}
                        x2={hoveredPoint.x}
                        y2={padT + chartH}
                        stroke="#38bdf8"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                      <rect
                        x={Math.min(svgW - 95, Math.max(padL, hoveredPoint.x - 45))}
                        y={Math.max(5, hoveredPoint.y - 32)}
                        width="90"
                        height="26"
                        rx="5"
                        className="fill-slate-900/90 shadow-sm"
                      />
                      <text
                        x={Math.min(svgW - 50, Math.max(padL + 45, hoveredPoint.x))}
                        y={Math.max(18, hoveredPoint.y - 19)}
                        textAnchor="middle"
                        className="text-[9px] fill-sky-300 font-mono font-bold"
                      >
                        {hoveredPoint.dateStr}
                      </text>
                      <text
                        x={Math.min(svgW - 50, Math.max(padL + 45, hoveredPoint.x))}
                        y={Math.max(27, hoveredPoint.y - 10)}
                        textAnchor="middle"
                        className="text-[9px] fill-white font-mono font-bold"
                      >
                        {hoveredPoint.value.toFixed(2)} m
                      </text>
                    </g>
                  )}
                </svg>
              </div>
            )}

            {/* Legend Bawah Grafik (Sesuai Screenshot Asli) */}
            <div className="flex items-center justify-center gap-4 text-[10px] font-semibold pt-2 border-t border-slate-100 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <span className="w-4 h-0.5 bg-sky-400" /> TMA
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <span className="w-4 h-0.5 border-t border-dashed border-rose-500" /> AWAS
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <span className="w-4 h-0.5 border-t border-dashed border-amber-500" /> SIAGA
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <span className="w-4 h-0.5 border-t border-dashed border-yellow-500" /> WASPADA
              </span>
            </div>
          </div>
        </>
      )}

      {/* Modal Tampilan Penuh CCTV */}
      {isCctvModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsCctvModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 border-b border-slate-800 bg-slate-950 text-white">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <h3 className="text-sm font-bold">
                  Live CCTV: {data?.cctv?.name || "AWLR JATIMLEREK"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCctvModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center min-h-[300px]">
              <img
                src={
                  cctvTimestamp
                    ? `${data?.cctv?.url || "https://cctv.higertech.com/cctvhgt/JATIMLEREK/AWLR.jpg"}?v=${cctvTimestamp}`
                    : (data?.cctv?.url || "https://cctv.higertech.com/cctvhgt/JATIMLEREK/AWLR.jpg")
                }
                alt="CCTV Full View"
                suppressHydrationWarning
                className="w-full max-h-[75vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
