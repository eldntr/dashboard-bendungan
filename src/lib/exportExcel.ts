import * as XLSX from "xlsx";
import { DamMonitoringData } from "@/types/dam";

/**
 * Ekspor data laporan bendung ke format file Excel (.xlsx) dalam satu sheet.
 * Dapat dipanggil langsung dari sisi client (browser) oleh seluruh user.
 */
export function exportDamReportsToExcel(
  reports: DamMonitoringData[],
  options?: {
    filename?: string;
    sheetName?: string;
  }
) {
  if (!reports || reports.length === 0) {
    alert("Tidak ada data laporan untuk diekspor.");
    return false;
  }

  const filename = options?.filename || "Laporan_Monitoring_Bendungan";
  const sheetName = options?.sheetName || "Data Monitoring Bendungan";

  // Format baris data
  const rows = reports.map((r, index) => {
    // Format detail per jam
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
    // Batasi lebar maksimal agar tidak terlalu panjang
    return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
  });
  worksheet["!cols"] = colWidths;

  // Buat workbook dengan 1 sheet saja
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

  // Tanggal saat ini untuk nama file
  const todayStr = new Date().toISOString().slice(0, 10);
  const cleanFilename = `${filename.replace(/\s+/g, "_")}_${todayStr}.xlsx`;

  // Download langsung ke browser user
  XLSX.writeFile(workbook, cleanFilename);
  return true;
}
