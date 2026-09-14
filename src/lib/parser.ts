import { DamMonitoringData, HourlyOutflow } from "@/types/dam";

/**
 * Utility to parse localized Indonesian decimal numbers like "91,499" or "29,98"
 */
function parseIndoNumber(val: string): number | null {
  if (!val || val.trim() === "-" || val.trim() === "") return null;
  // replace comma with dot
  const cleaned = val.replace(/\./g, "").replace(",", ".").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parseDamReport(text: string): DamMonitoringData {
  const lines = text.split("\n").map((l) => l.trim());

  let dam_name = "Bendungan";
  let date_str = "";
  let time_range = "";
  let condition = "Normal";
  let q_inflow_dkd: number | null = null;
  let q_outflow_dkd: number | null = null;
  let mrican_kiri: number | null = null;
  let mrican_kanan: number | null = null;
  const outflow_hourly: HourlyOutflow[] = [];
  let out_average: number | null = null;
  let elv_aktual: number | null = null;
  let cuaca = "Cerah";
  let shift_info = "Shift I";
  const officers: string[] = [];

  // Extract dam name from first non-empty line
  for (const line of lines) {
    if (line && !line.startsWith("=") && !line.startsWith("_")) {
      dam_name = line;
      break;
    }
  }

  let inHourlySection = false;
  let inPetugasSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^Tanggal\s*:/i.test(line)) {
      date_str = line.replace(/^Tanggal\s*:\s*/i, "").trim();
    } else if (/^Pukul\s*:/i.test(line)) {
      time_range = line.replace(/^Pukul\s*:\s*/i, "").trim();
    } else if (/^Kondisi\s*:/i.test(line)) {
      condition = line.replace(/^Kondisi\s*:\s*/i, "").trim();
    } else if (/^Q Inflow.*:/i.test(line)) {
      const match = line.split(":");
      if (match[1]) q_inflow_dkd = parseIndoNumber(match[1]);
    } else if (/^Q Outflow.*:/i.test(line) && !inHourlySection) {
      const match = line.split(":");
      if (match[1]) q_outflow_dkd = parseIndoNumber(match[1]);
    } else if (/^Mrican Kiri.*:/i.test(line)) {
      const match = line.split(":");
      if (match[1]) mrican_kiri = parseIndoNumber(match[1]);
    } else if (/^Mrican Kanan.*:/i.test(line)) {
      const match = line.split(":");
      if (match[1]) mrican_kanan = parseIndoNumber(match[1]);
    } else if (/^Q Outflow\b/i.test(line) && !line.includes(":")) {
      inHourlySection = true;
      inPetugasSection = false;
    } else if (inHourlySection && /^\d{2}\.\d{2}\s*=/i.test(line)) {
      // e.g. 07.00 = 29,98 m³/det
      const parts = line.split("=");
      const hour = parts[0]?.trim();
      const valStr = parts[1]?.replace(/m³\/det/i, "").trim();
      const numVal = parseIndoNumber(valStr);
      if (hour && numVal !== null) {
        outflow_hourly.push({ hour, value: numVal });
      }
    } else if (/^Out Rata/i.test(line)) {
      inHourlySection = false;
      const match = line.split(":");
      if (match[1]) {
        const valStr = match[1].replace(/m³\/det/i, "").trim();
        out_average = parseIndoNumber(valStr);
      }
    } else if (/^Elv Aktual\s*:/i.test(line)) {
      inHourlySection = false;
      const match = line.split(":");
      if (match[1]) {
        const valStr = match[1].replace(/m/i, "").trim();
        elv_aktual = parseIndoNumber(valStr);
      }
    } else if (/^Cuaca\s*:/i.test(line)) {
      cuaca = line.replace(/^Cuaca\s*:\s*/i, "").trim();
    } else if (/^Petugas/i.test(line)) {
      shift_info = line.trim();
      inPetugasSection = true;
      inHourlySection = false;
    } else if (inPetugasSection && line && !line.startsWith("_") && !line.startsWith("=")) {
      officers.push(line.trim());
    } else if (line.startsWith("___") || line.startsWith("===")) {
      // divider
      if (inHourlySection) {
        inHourlySection = false;
      }
    }
  }

  // Calculate average outflow if not specified or '-'
  if (out_average === null && outflow_hourly.length > 0) {
    const sum = outflow_hourly.reduce((acc, curr) => acc + curr.value, 0);
    out_average = parseFloat((sum / outflow_hourly.length).toFixed(2));
  }

  // Determine Siaga status based on Inflow DKD or Outflow
  // Siaga Banjir: Hijau >= 800, Kuning >= 900, Merah >= 1000
  const maxQ = Math.max(q_inflow_dkd ?? 0, q_outflow_dkd ?? 0, out_average ?? 0);
  let siaga_status: "Hijau" | "Kuning" | "Merah" | "Normal" = "Normal";
  if (maxQ >= 1000) {
    siaga_status = "Merah";
  } else if (maxQ >= 900) {
    siaga_status = "Kuning";
  } else if (maxQ >= 800) {
    siaga_status = "Hijau";
  }

  return {
    raw_text: text,
    dam_name,
    date_str,
    time_range,
    condition,
    q_inflow_dkd,
    q_outflow_dkd,
    mrican_kiri,
    mrican_kanan,
    siaga_status,
    outflow_hourly,
    out_average,
    elv_aktual,
    cuaca,
    shift_info,
    officers,
  };
}
