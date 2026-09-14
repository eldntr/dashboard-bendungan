-- Buat tabel untuk menyimpan laporan bendungan
CREATE TABLE IF NOT EXISTS dam_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    dam_name TEXT NOT NULL,
    date_str TEXT,
    time_range TEXT,
    condition TEXT,
    q_inflow_dkd NUMERIC,
    q_outflow_dkd NUMERIC,
    mrican_kiri NUMERIC,
    mrican_kanan NUMERIC,
    siaga_status TEXT,
    outflow_hourly JSONB DEFAULT '[]'::jsonb,
    out_average NUMERIC,
    elv_aktual NUMERIC,
    cuaca TEXT,
    shift_info TEXT,
    officers JSONB DEFAULT '[]'::jsonb,
    raw_text TEXT
);

-- Index untuk mempermudah pengurutan berdasarkan tanggal pembuatan
CREATE INDEX IF NOT EXISTS idx_dam_reports_created_at ON dam_reports (created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE dam_reports ENABLE ROW LEVEL SECURITY;

-- Buat policy agar publik bisa membaca (SELECT) dan menulis (INSERT) data (anon key)
CREATE POLICY "Allow public read access" 
ON dam_reports FOR SELECT 
TO anon, authenticated 
USING (true);

CREATE POLICY "Allow public insert access" 
ON dam_reports FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow public delete access" 
ON dam_reports FOR DELETE 
TO anon, authenticated 
USING (true);
