export interface HourlyOutflow {
  hour: string;
  value: number;
}

export interface DamMonitoringData {
  id?: string;
  created_at?: string;
  raw_text?: string;
  dam_name: string;
  date_str: string;
  time_range: string;
  condition: string;
  q_inflow_dkd: number | null;
  q_outflow_dkd: number | null;
  mrican_kiri: number | null;
  mrican_kanan: number | null;
  siaga_status: "Hijau" | "Kuning" | "Merah" | "Normal";
  outflow_hourly: HourlyOutflow[];
  out_average: number | null;
  elv_aktual: number | null;
  cuaca: string;
  shift_info: string;
  officers: string[];
}
