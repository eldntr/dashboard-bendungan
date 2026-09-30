import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { parseDateString } from "@/lib/dateUtils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dam = searchParams.get("dam");
    const range = searchParams.get("range") || "all";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Filter per bendung
    const where: Record<string, unknown> = {};
    if (dam && dam !== "ALL") {
      where.damName = dam;
    }

    const reports = await prisma.damReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Helper tanggal
    const getReportDate = (r: (typeof reports)[number]): Date | null => {
      if (r.dateStr) {
        const d = parseDateString(r.dateStr);
        if (d) return d;
      }
      if (r.createdAt) {
        const d = new Date(r.createdAt);
        if (!isNaN(d.getTime())) {
          d.setHours(0, 0, 0, 0);
          return d;
        }
      }
      return null;
    };

    // Filter Periode
    let filteredReports = reports;
    if (range !== "all") {
      let maxReportDate = new Date();
      reports.forEach((r) => {
        const d = getReportDate(r);
        if (d && d > maxReportDate) {
          maxReportDate = new Date(d);
        }
      });

      const refEnd = new Date(maxReportDate);
      refEnd.setHours(23, 59, 59, 999);

      if (range === "week") {
        const weekStart = new Date(refEnd);
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        filteredReports = reports.filter((r) => {
          const d = getReportDate(r);
          return !d || (d >= weekStart && d <= refEnd);
        });
      } else if (range === "month") {
        const monthStart = new Date(refEnd);
        monthStart.setDate(monthStart.getDate() - 30);
        monthStart.setHours(0, 0, 0, 0);
        filteredReports = reports.filter((r) => {
          const d = getReportDate(r);
          return !d || (d >= monthStart && d <= refEnd);
        });
      } else if (range === "custom") {
        const customStart = startDateParam ? parseDateString(startDateParam) : null;
        if (customStart) customStart.setHours(0, 0, 0, 0);
        const customEnd = endDateParam ? parseDateString(endDateParam) : null;
        if (customEnd) customEnd.setHours(23, 59, 59, 999);

        filteredReports = reports.filter((r) => {
          const d = getReportDate(r);
          if (!d) return true;
          if (customStart && d < customStart) return false;
          if (customEnd && d > customEnd) return false;
          return true;
        });
      }
    }

    const rows = filteredReports.map((r, index) => {
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Monitoring Bendung");

    const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const todayStr = new Date().toISOString().slice(0, 10);
    const filename = `Laporan_Bendung_${todayStr}.xlsx`;

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
