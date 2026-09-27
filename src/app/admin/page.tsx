"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { parseDamReports } from "@/lib/parser";
import { DamMonitoringData } from "@/types/dam";
import {
  ArrowLeft,
  Database,
  Send,
  Trash2,
  RefreshCw,
  Info,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  RotateCcw,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  KeyRound,
} from "lucide-react";

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

export default function AdminPage() {
  const [inputText, setInputText] = useState("");
  const [history, setHistory] = useState<DamMonitoringData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [configured, setConfigured] = useState<boolean>(() => {
    return Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );
  });

  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

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
      console.error("Fetch reports error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/check");
      const json = await res.json();
      if (json.authenticated) {
        setIsAuthenticated(true);
        fetchReports();
      } else {
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    } catch {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [fetchReports]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError("Harap masukkan password.");
      return;
    }
    setIsSubmittingAuth(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setPasswordInput("");
        fetchReports();
      } else {
        setAuthError(data.error || "Password salah. Silakan coba lagi.");
      }
    } catch {
      setAuthError("Gagal menghubungi server. Silakan coba lagi.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setIsAuthenticated(false);
    setPasswordInput("");
    setHistory([]);
  };

  const handleProcessAndSave = async () => {
    if (!inputText.trim()) {
      setMessage({ text: "Harap masukkan teks laporan terlebih dahulu.", type: "error" });
      return;
    }

    let parsedList: DamMonitoringData[] = [];
    try {
      parsedList = parseDamReports(inputText);
    } catch {
      setMessage({ text: "Gagal memproses teks. Pastikan format teks laporan sesuai.", type: "error" });
      return;
    }

    if (!parsedList || parsedList.length === 0) {
      setMessage({ text: "Tidak ada data laporan bendungan yang terbaca dari teks input.", type: "error" });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedList),
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Gagal menyimpan ke database");
      }

      setMessage({
        text: `Berhasil mengolah dan menyimpan ${parsedList.length} laporan ke database!`,
        type: "success",
      });
      setInputText("");
      await fetchReports();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setMessage({ text: `Gagal menyimpan: ${errMsg}`, type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("Apakah Anda yakin ingin menghapus data laporan ini?")) return;

    try {
      const res = await fetch(`/api/reports?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
        setMessage({ text: "Laporan berhasil dihapus.", type: "info" });
      } else {
        setMessage({ text: json.error || "Gagal menghapus laporan.", type: "error" });
      }
    } catch (e) {
      console.error("Delete error:", e);
      setMessage({ text: "Terjadi kesalahan saat menghapus laporan.", type: "error" });
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          <p className="text-xs font-medium text-slate-500">Memeriksa otentikasi admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md">
          <div className="bg-white/10 border border-white/10 rounded-3xl p-7 md:p-9 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25 mb-3">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Akses Admin Bendungan
              </h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                Silakan masukkan kata sandi administrator untuk mengelola input teks dan data laporan bendungan.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200 block">
                  Password Admin
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan password admin..."
                    autoFocus
                    className="w-full pl-4 pr-11 py-2.5 bg-slate-950/60 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingAuth || !passwordInput.trim()}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingAuth ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Masuk ke Panel Admin
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center border-t border-white/10">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali ke Dashboard Utama
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali ke Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 shadow-2xs transition"
                title="Keluar dari sesi admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                Keluar
              </button>
              <span className="text-xs font-medium text-slate-400">|</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                Panel Admin
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 pt-1">
              Admin & Manajemen Laporan
            </h1>
            <p className="text-slate-500 text-xs md:text-sm">
              Kelola input teks laporan bendungan harian dan kontrol data yang tersimpan di sistem.
            </p>
          </div>

          <div className="flex items-center gap-3">
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
              <span className="font-medium">{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-slate-600 font-bold ml-4"
              aria-label="Tutup notifikasi"
            >
              ✕
            </button>
          </div>
        )}

        {/* SECTION 1: Input Teks Laporan */}
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-800">
                  Input & Ekstraksi Teks Laporan
                </h2>
                <p className="text-xs text-slate-500">
                  Tempel teks laporan harian/shift bendungan untuk diekstrak dan disimpan otomatis.
                </p>
              </div>
            </div>
            <button
              onClick={() => setInputText(getSampleText())}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition self-start sm:self-auto bg-blue-50 hover:bg-blue-100/70 border border-blue-100 px-3 py-1.5 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Muat Format Sample
            </button>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={14}
            placeholder="Tempel teks laporan bendungan di sini..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs md:text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition resize-none leading-relaxed"
          />

          <div className="flex justify-end pt-2">
            <button
              onClick={handleProcessAndSave}
              disabled={isSaving || !inputText.trim()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition rounded-xl font-semibold text-sm text-white shadow-md shadow-blue-600/20"
            >
              <Send className="w-4 h-4" />
              {isSaving ? "Mengolah & Menyimpan..." : "Simpan"}
            </button>
          </div>
        </section>

        {/* SECTION 2: Tersimpan */}
        <section className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
                <Database className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">Tersimpan</h2>
                <span className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold border border-slate-200">
                  {history.length} Laporan
                </span>
              </div>
            </div>
            <button
              onClick={fetchReports}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-slate-700 flex items-center gap-1.5 transition shadow-2xs font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Muat Ulang
            </button>
          </div>

          {history.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-sm shadow-xs">
              Belum ada data riwayat tersimpan.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-xs transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-slate-900 text-base">{item.dam_name}</h3>
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
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.date_str || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.time_range || "-"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs mb-3 border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Q Inflow:</span>
                        <span className="font-semibold text-blue-600">{item.q_inflow_dkd ?? "-"} m³/det</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Q Outflow:</span>
                        <span className="font-semibold text-teal-600">{item.q_outflow_dkd ?? "-"} m³/det</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Elevasi:</span>
                        <span className="font-semibold text-amber-600">{item.elv_aktual ?? "-"} m</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Cuaca:</span>
                        <span className="font-semibold text-slate-700">{item.cuaca || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 text-[11px] truncate max-w-[180px]">
                      {item.shift_info} ({item.officers?.join(", ") || "-"})
                    </span>
                    {item.id && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-400 hover:text-rose-600 transition p-1 hover:bg-rose-50 rounded"
                        title="Hapus data"
                        aria-label="Hapus data laporan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
