# Petunjuk Setup Supabase & Deploy Vercel (Gratis 100%)

Proyek Dashboard Monitoring Bendungan ini dibuat dengan **Next.js (App Router) + Tailwind CSS + Lucide Icons + Supabase**.

---

### Langkah 1: Buat Proyek Supabase (Gratis)
1. Buka [https://supabase.com](https://supabase.com) dan buat akun/login.
2. Klik **"New Project"**, beri nama proyek (misal: `bendungan-db`).
3. Tunggu hingga database selesai dibuat (~1-2 menit).
4. Masuk ke menu **SQL Editor** di sidebar kiri Supabase.
5. Jalankan query SQL dari file [supabase_schema.sql](file:///home/flow/Code/dashboard-bendungan/supabase_schema.sql):

```sql
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

-- Row Level Security & Policies
ALTER TABLE dam_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON dam_reports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public insert access" ON dam_reports FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public delete access" ON dam_reports FOR DELETE TO anon, authenticated USING (true);
```

6. Masuk ke menu **Project Settings** > **API**.
   Catat 2 informasi:
   - **Project URL** (contoh: `https://xyzcompany.supabase.co`)
   - **Project API Keys** (`anon` / `public`)

---

### Langkah 2: Uji Coba Lokal (Opsional)
Buat file `.env.local` di direktori proyek:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
Jalankan di terminal:
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.

---

### Langkah 3: Deploy ke Vercel (Gratis)
1. Push repository ini ke GitHub / GitLab:
   ```bash
   git add .
   git commit -m "feat: dam monitoring dashboard with supabase & vercel ready"
   git push origin main
   ```
2. Buka [https://vercel.com](https://vercel.com) dan login dengan akun GitHub Anda.
3. Klik **"Add New..."** > **"Project"**, lalu pilih repository `dashboard-bendungan`.
4. Di bagian **Environment Variables**, tambahkan 2 variabel berikut:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Project URL dari Supabase)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Anon Public Key dari Supabase)
5. Klik **"Deploy"**. Dalam hitungan detik, aplikasi Anda sudah online!
