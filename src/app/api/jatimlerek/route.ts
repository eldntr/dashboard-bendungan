import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AwlrStationRaw {
  id?: string;
  type?: string;
  name?: string;
  slug?: string;
  brandName?: string;
  deviceId?: string;
  waterLevel?: number | null;
  unitDisplay?: string;
  readingAt?: string | null;
  changeValue?: number | null;
  changeStatus?: string | null;
  warningStatus?: number | null;
  battery?: number | null;
  batteryCapacity?: number | null;
  siaga1?: number | null;
  siaga2?: number | null;
  siaga3?: number | null;
  deviceStatus?: string | null;
  debit?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface ChartPoint {
  millis: number;
  value: number;
}

export async function GET() {
  const BASE_URL = "https://wj-awlr-jatimlerek.higertech.com";

  const headers: HeadersInit = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Referer: `${BASE_URL}/`,
    "X-Requested-With": "XMLHttpRequest",
    Accept: "application/json, text/plain, */*",
  };

  try {
    // 1. Ambil data panel kiri dan feed CCTV secara real-time
    const [awlrRes, cctvRes] = await Promise.all([
      fetch(`${BASE_URL}/Home/GetAwlrLastReading`, {
        headers,
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      }),
      fetch(`${BASE_URL}/Home/cctvs/all`, {
        headers,
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      }).catch(() => null),
    ]);

    if (!awlrRes.ok) {
      throw new Error(`Gagal fetch AWLR: HTTP ${awlrRes.status}`);
    }

    const awlrPayload = await awlrRes.json();
    const stations: AwlrStationRaw[] =
      awlrPayload.response ||
      awlrPayload.data ||
      (Array.isArray(awlrPayload) ? awlrPayload : []);
    const activeStation = stations.length > 0 ? stations[0] : null;

    let cctvData = {
      name: "AWLR JATIMLEREK",
      url: "https://cctv.higertech.com/cctvhgt/JATIMLEREK/AWLR.jpg",
    };
    if (cctvRes && cctvRes.ok) {
      try {
        const cctvJson = await cctvRes.json();
        if (Array.isArray(cctvJson) && cctvJson.length > 0) {
          cctvData = {
            name: cctvJson[0].name || "AWLR JATIMLEREK",
            url: cctvJson[0].url || "https://cctv.higertech.com/cctvhgt/JATIMLEREK/AWLR.jpg",
          };
        }
      } catch {}
    }

    let chartData: ChartPoint[] = [];

    // 2. Ambil data panel kanan (Grafik 12 Jam)
    // Catatan penting: Endpoint asli membutuhkan parameter ke-3 "/no-sensor"
    if (activeStation?.deviceId) {
      const type = (activeStation.type || "awlr").toLowerCase();
      const deviceId = activeStation.deviceId;

      const chartUrl = `${BASE_URL}/Home/grafik/${type}/${deviceId}/no-sensor`;
      try {
        const chartRes = await fetch(chartUrl, {
          headers,
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });

        if (chartRes.ok) {
          const jsonChart = await chartRes.json();
          const rawList = jsonChart.response || jsonChart.data || jsonChart;
          if (Array.isArray(rawList)) {
            chartData = rawList;
          }
        }
      } catch (chartErr) {
        console.warn("Gagal fetch grafik AWLR:", chartErr);
      }
    }

    // 3. Response bersih untuk frontend
    return NextResponse.json({
      success: true,
      scraped_at: new Date().toISOString(),
      cctv: cctvData,
      left_panel: {
        id: activeStation?.id ?? null,
        nama_pos: activeStation?.name ?? "AWLR B. JATIMLEREK",
        device_id: activeStation?.deviceId ?? null,
        tinggi_muka_air: activeStation?.waterLevel ?? null,
        satuan: activeStation?.unitDisplay ?? "mdpl",
        status_siaga: activeStation?.warningStatus ?? 0,
        trend: activeStation?.changeStatus ?? "const", // inc / dec / const
        debit: activeStation?.debit ?? null,
        baterai_volt: activeStation?.battery ?? null,
        baterai_persen: activeStation?.batteryCapacity ?? null,
        waktu_baca: activeStation?.readingAt ?? null,
        status_alat: activeStation?.deviceStatus ?? "online",
        ambang_siaga: {
          siaga1: activeStation?.siaga1 ?? 33.9,
          siaga2: activeStation?.siaga2 ?? 33.7,
          siaga3: activeStation?.siaga3 ?? 33.0,
        },
      },
      right_panel: {
        grafik_12_jam: chartData,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
