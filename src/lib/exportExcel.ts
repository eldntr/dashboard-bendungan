import * as XLSX from "xlsx";
import { DamMonitoringData } from "@/types/dam";
import { parseDateString } from "@/lib/dateUtils";

export type ExportPeriod = "all" | "week" | "month" | "custom";

export interface ExportFilterOptions {
  period: ExportPeriod;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  damName?: string;   // "ALL" | nama bendung
}

/**
 * Mengambil objek Date dari laporan (dari date_str atau created_at)
 */
export function getReportDate(r: DamMonitoringData): Date | null {
  if (r.date_str) {
    const d = parseDateString(r.date_str);
    if (d) return d;
  }
  if (r.created_at) {
    const d = new Date(r.created_at);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }
  return null;
}

/**
 * Filter data laporan berdasarkan opsi periode dan bendung
 */
export function filterReportsForExport(
  reports: DamMonitoringData[],
  options: ExportFilterOptions
): DamMonitoringData[] {
  const { period, startDate, endDate, damName } = options;

  // 1. Tentukan tanggal acuan untuk 1 minggu / 1 bulan
  let maxReportDate = new Date();
  reports.forEach((r) => {
    const d = getReportDate(r);
    if (d && d > maxReportDate) {
      maxReportDate = new Date(d);
    }
  });

  const refEnd = new Date(maxReportDate);
  refEnd.setHours(23, 59, 59, 999);

  const weekStart = new Date(refEnd);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(refEnd);
  monthStart.setDate(monthStart.getDate() - 30);
  monthStart.setHours(0, 0, 0, 0);

  let customStart: Date | null = null;
  let customEnd: Date | null = null;

  if (period === "custom") {
    if (startDate) {
      customStart = parseDateString(startDate);
      if (customStart) customStart.setHours(0, 0, 0, 0);
    }
    if (endDate) {
      customEnd = parseDateString(endDate);
      if (customEnd) customEnd.setHours(23, 59, 59, 999);
    }
  }

  return reports.filter((r) => {
    // Filter Bendung
    if (damName && damName !== "ALL" && r.dam_name !== damName) {
      return false;
    }

    // Filter Periode
    if (period === "all") return true;

    const rDate = getReportDate(r);
    if (!rDate) return true; // jika tidak ada info tanggal, tetap sertakan agar tidak hilang

    if (period === "week") {
      return rDate >= weekStart && rDate <= refEnd;
    }

    if (period === "month") {
      return rDate >= monthStart && rDate <= refEnd;
    }

    if (period === "custom") {
      if (customStart && rDate < customStart) return false;
      if (customEnd && rDate > customEnd) return false;
      return true;
    }

    return true;
  });
}

/**
 * Ekspor data laporan bendung ke format file Excel (.xlsx) dalam satu sheet.
 */
export function exportDamReportsToExcel(
  reports: DamMonitoringData[],
  options?: {
    filename?: string;
    sheetName?: string;
  }
) {
  if (!reports || reports.length === 0) {
    alert("Tidak ada data laporan bendung untuk diekspor.");
    return false;
  }

  const filename = options?.filename || "Laporan_Monitoring_Bendung";
  const sheetName = options?.sheetName || "Data Monitoring Bendung";

  // Format baris data
  const rows = reports.map((r, index) => {
    const hourlyText = Array.isArray(r.outflow_hourly) && r.outflow_hourly.length > 0
      ? r.outflow_hourly.map((h) => `${h.hour} = ${h.value} m³/det`).join("; ")
      : "-";

    const officersText = Array.isArray(r.officers) && r.officers.length > 0
      ? r.officers.join(", ")
      : "-";

    const formatNum = (val: number | null | undefined) => {
      if (val === null || val === undefined || isNaN(Number(val))) return "-";
      return Number(val);
    };

    return {
      "No": index + 1,
      "Tanggal": r.date_str || "-",
      "Pukul / Waktu": r.time_range || "-",
      "Nama Bendung": r.dam_name || "-",
      "Kondisi": r.condition || "Normal",
      "Status Siaga": r.siaga_status || "Normal",
      "Elevasi Aktual (m)": formatNum(r.elv_aktual),
      "Q Inflow (m³/det)": formatNum(r.q_inflow_dkd),
      "Q Outflow (m³/det)": formatNum(r.q_outflow_dkd),
      "Saluran Kiri (m³/det)": formatNum(r.mrican_kiri),
      "Saluran Kanan (m³/det)": formatNum(r.mrican_kanan),
      "Cuaca": r.cuaca || "-",
      "Rincian Outflow Per Jam": hourlyText,
      "Shift": r.shift_info || "-",
      "Petugas Shift": officersText,
      "Waktu Input Sistem": r.created_at
        ? new Date(r.created_at).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-",
    };
  });

  // Buat worksheet dari baris data JSON
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Atur lebar kolom secara otomatis (Auto-fit Column Widths)
  const headers = Object.keys(rows[0] || {});
  const colWidths = headers.map((key) => {
    let maxLen = key.length;
    for (const row of rows) {
      const val = String((row as Record<string, unknown>)[key] ?? "");
      if (val.length > maxLen) {
        maxLen = val.length;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
  });
  worksheet["!cols"] = colWidths;

  // Buat workbook dengan 1 sheet saja
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

  const todayStr = new Date().toISOString().slice(0, 10);
  const cleanFilename = `${filename.replace(/\s+/g, "_")}_${todayStr}.xlsx`;

  // Download langsung ke browser user
  XLSX.writeFile(workbook, cleanFilename);
  return true;
}
