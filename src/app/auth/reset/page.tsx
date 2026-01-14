'use client';

import { useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export default function ResetPasswordPage() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const { updatePassword, error, isLoading } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setLocalError('Passwords do not match.');
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setLocalError('No active recovery session found. Please request a new reset email.');
      return;
    }

    await updatePassword(password);
    setDone(true);
    setTimeout(() => window.location.replace('/'), 600);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter a new password for your account.
        </p>

        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm font-medium">New password</span>
            <input
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-white/15 dark:bg-black dark:focus:ring-zinc-100/20"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Confirm password</span>
            <input
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20 dark:border-white/15 dark:bg-black dark:focus:ring-zinc-100/20"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          {localError || error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{localError ?? error}</p>
          ) : null}

          <button
            className="inline-flex items-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200"
            type="submit"
            disabled={isLoading || done}
          >
            {done ? 'Password updated' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}

