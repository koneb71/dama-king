// Supabase Edge Function: close-idle-games
// Calls public.close_idle_games(10) using the service role key.
//
// Deploy with:
//   supabase functions deploy close-idle-games --no-verify-jwt
//
// Then schedule it (Supabase Dashboard → Edge Functions → Schedules)
// or call it from any external cron.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) {
    return new Response("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", { status: 500 });
  }

  const secret = Deno.env.get("CRON_SECRET") ?? "";
  if (secret) {
    const got = req.headers.get("x-cron-secret") ?? "";
    if (got !== secret) return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("close_idle_games", { p_idle_minutes: 10 });
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true, closed: data ?? 0 }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
});

