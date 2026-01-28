import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Create admin client (will be non-functional if env vars are missing, but won't crash build)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper to check if Supabase Admin is configured
export const isSupabaseAdminConfigured = () => {
  return Boolean(supabaseUrl && supabaseServiceKey);
};

