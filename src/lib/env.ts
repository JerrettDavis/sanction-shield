/**
 * Environment variable validation.
 * Fails fast at startup with clear error messages for missing vars.
 */

interface EnvSchema {
  // Required in production
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  CRON_SECRET?: string;

  // Optional
  RESEND_API_KEY?: string;

  // Computed
  isProduction: boolean;
  isLocalDev: boolean;
}

let _validated: EnvSchema | null = null;

export function validateEnv(): EnvSchema {
  if (_validated) return _validated;

  const isProduction = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const errors: string[] = [];

  if (isProduction) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) errors.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) errors.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) errors.push("SUPABASE_SERVICE_ROLE_KEY");
    if (!process.env.CRON_SECRET) errors.push("CRON_SECRET");
  }

  if (errors.length > 0) {
    const msg = `[SanctionShield] Missing required environment variables: ${errors.join(", ")}`;
    console.error(msg);
    if (process.env.NODE_ENV === "production") {
      throw new Error(msg);
    }
  }

  _validated = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    isProduction,
    isLocalDev: !isProduction,
  };

  console.log(`[SanctionShield] Environment: ${isProduction ? "PRODUCTION (Supabase)" : "LOCAL DEV (SQLite)"}`);
  return _validated;
}
