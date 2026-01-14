import { Suspense } from "react";

import { AuthCallbackClient } from "./AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
          <div className="mx-auto max-w-xl px-6 py-16">
            <h1 className="text-2xl font-semibold tracking-tight">Auth callback</h1>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">Finishing sign-in…</p>
          </div>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}

