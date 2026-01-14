import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | undefined;

declare global {
  interface Window {
    __ENV?: Record<string, string | undefined>;
  }
}

/**
 * Returns a singleton Supabase client for browser/client components.
 *
 * Requires:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  // NOTE: In Next.js client bundles, env vars are only inlined for
  // direct property access (e.g. process.env.NEXT_PUBLIC_...).
  // Dynamic indexing like process.env[name] will be undefined.
  // For Docker/prod runtime env injection, we also support window.__ENV.
  const url =
    (typeof window !== 'undefined' ? window.__ENV?.NEXT_PUBLIC_SUPABASE_URL : undefined) ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    (typeof window !== 'undefined' ? window.__ENV?.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
