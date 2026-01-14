"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AuthCallbackClient() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string>("Finishing sign-in…");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // With detectSessionInUrl enabled in the client, Supabase will parse the URL
        // and establish a session (OAuth + magic links + recovery).
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;

        if (error) throw error;

        const redirect = searchParams.get("redirect") || "/";
        if (!data.session) {
          setStatus("error");
          setMessage("No session was established. Please try signing in again.");
          return;
        }

        // For OAuth users, ensure they're not marked as guest
        // This handles both new OAuth users and guests upgrading to OAuth
        const user = data.session.user;
        const provider = user.app_metadata?.provider;
        
        if (provider && provider !== 'anonymous') {
          // Update player to not be a guest (for OAuth users)
          await supabase
            .from('players')
            .update({ 
              is_guest: false,
              // Also update avatar if available from OAuth provider
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            })
            .eq('id', user.id);
        }

        setStatus("ok");
        setMessage("Signed in. Redirecting…");
        window.location.replace(redirect);
      } catch (e: unknown) {
        if (cancelled) return;
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Sign-in failed.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, supabase]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Auth callback</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">{message}</p>

        {status === "error" ? (
          <Link
            className="mt-6 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            href="/"
          >
            Back to home
          </Link>
        ) : null}
      </div>
    </div>
  );
}

