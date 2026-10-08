import { createClient } from "@supabase/supabase-js";
import type { AppConfig } from "../config";

export function createSupabaseAdmin(config: AppConfig) {
  return createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;
