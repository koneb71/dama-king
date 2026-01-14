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

  const isBrowser = typeof window !== 'undefined';

  // NOTE: In Next.js client bundles, env vars are only inlined for
  // direct property access (e.g. process.env.NEXT_PUBLIC_...).
  // Dynamic indexing like process.env[name] will be undefined.
  // For Docker/prod runtime env injection, we also support window.__ENV.
  const url =
    (isBrowser ? window.__ENV?.NEXT_PUBLIC_SUPABASE_URL : undefined) ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    (isBrowser ? window.__ENV?.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Client Components are still rendered on the server during prerender/SSR.
  // During `next build`, env vars may not be set (especially in Docker builds),
  // but our auth effects only run in the browser. To avoid failing builds,
  // we only hard-error in the browser.
  if (!url || !anonKey) {
    if (isBrowser) {
      if (!url) throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
      throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
    }

    // Safe dummy client for SSR/build-time render paths.
    browserClient = createClient('http://localhost:54321', 'dummy-anon-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    return browserClient;
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
