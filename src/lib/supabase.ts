import { createClient as createBrowserSupabaseClient } from "@/utils/supabase/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const supabase = supabaseUrl && supabaseKey ? createBrowserSupabaseClient() : null;

export const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseKey);
