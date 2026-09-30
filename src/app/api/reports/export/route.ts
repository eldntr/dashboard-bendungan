import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dam = searchParams.get("dam");

    // Filter per bendung jika ada parameter dam
    const where = dam && dam !== "ALL" ? { damName: dam } : {};

    const reports = await prisma.damReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const rows = reports.map((r, index) => {
      const outflowHourly = Array.isArray(r.outflowHourly)
        ? (r.outflowHourly as { hour: string; value: number }[])
        : [];

      const hourlyText = outflowHourly.length > 0
        ? outflowHourly.map((h) => `${h.hour} = ${h.value} m³/det`).join("; ")
        : "-";

      const officers = Array.isArray(r.officers)
        ? (r.officers as string[])
        : [];

      const officersText = officers.length > 0 ? officers.join(", ") : "-";

      const formatNum = (val: unknown) => {
        if (val === null || val === undefined) return "-";
        const n = Number(val);
        return isNaN(n) ? "-" : n;
      };

      return {
        "No": index + 1,
        "Tanggal": r.dateStr || "-",
        "Pukul / Waktu": r.timeRange || "-",
        "Nama Bendung": r.damName || "-",
        "Kondisi": r.condition || "Normal",
        "Status Siaga": r.siagaStatus || "Normal",
        "Elevasi Aktual (m)": formatNum(r.elvAktual),
        "Q Inflow (m³/det)": formatNum(r.qInflowDkd),
        "Q Outflow (m³/det)": formatNum(r.qOutflowDkd),
        "Saluran Kiri (m³/det)": formatNum(r.mricanKiri),
        "Saluran Kanan (m³/det)": formatNum(r.mricanKanan),
        "Cuaca": r.cuaca || "-",
        "Rincian Outflow Per Jam": hourlyText,
        "Shift": r.shiftInfo || "-",
        "Petugas Shift": officersText,
        "Waktu Input Sistem": r.createdAt
          ? new Date(r.createdAt).toLocaleString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-fit column widths
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

    // Buat workbook satu sheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Monitoring Bendungan");

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const todayStr = new Date().toISOString().slice(0, 10);
    const filename = `Laporan_Bendungan_${todayStr}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error exporting reports";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
