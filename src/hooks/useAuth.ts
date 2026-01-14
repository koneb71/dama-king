'use client';

import type { Provider, Session, User } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export type OAuthProvider = Extract<Provider, 'google' | 'github'>;

export type Player = {
  id: string;
  username: string;
  avatar_url: string | null;
  email?: string | null;
  is_guest: boolean;
  created_at: string;
};

export type UseAuthValue = {
  isLoading: boolean;
  error: string | null;
  session: Session | null;
  user: User | null;
  player: Player | null;
  isAuthenticated: boolean;
  isGuest: boolean;

  signInAsGuest: (options?: { username?: string }) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    options?: { username?: string; redirectTo?: string },
  ) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  sendPasswordResetEmail: (email: string, options?: { redirectTo?: string }) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider, options?: { redirectTo?: string }) => Promise<void>;
  upgradeGuestWithOAuth: (
    provider: OAuthProvider,
    options?: { redirectTo?: string },
  ) => Promise<void>;
  signOut: () => Promise<void>;

  refreshPlayer: () => Promise<void>;
};

const AuthContext = createContext<UseAuthValue | null>(null);

function randomSuffix(chars = 4): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  const bytes = new Uint8Array(chars);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < bytes.length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function normalizeUsername(input: string): string {
  const trimmed = input.trim();
  const cleaned = trimmed
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 24);
}

function deriveDefaultGuestUsername(): string {
  return `guest_${randomSuffix(5)}`;
}

const GUEST_USERNAME_KEY = 'dama_guest_username';

async function fetchPlayer(userId: string): Promise<Player | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('players')
    .select('id, username, avatar_url, email, is_guest, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function updateOwnPlayer(userId: string, patch: Partial<Player>): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from('players').update(patch).eq('id', userId);
  if (error) throw error;
}

function hasNonAnonymousIdentity(user: User | null): boolean {
  const identities = (user as unknown as { identities?: Array<{ provider?: unknown }> } | null)?.identities;
  if (!Array.isArray(identities)) return false;
  return identities.some((i) => typeof i?.provider === 'string' && i.provider !== 'anonymous');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);

  const lastUserIdRef = useRef<string | null>(null);

  const refreshPlayer = useCallback(async () => {
    if (!user) {
      setPlayer(null);
      return;
    }
    try {
      const p = await fetchPlayer(user.id);
      setPlayer(p);
    } catch {
      // If the trigger is slightly delayed, a retry will be attempted by callers.
      setPlayer(null);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setIsLoading(true);
      setError(null);

      const { data, error: getSessionError } = await supabase.auth.getSession();
      if (!mounted) return;

      if (getSessionError) {
        setError(getSessionError.message);
      }

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      if (!data.session) setPlayer(null);
      setIsLoading(false);
    }

    bootstrap();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      if (!nextSession) setPlayer(null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    // Keep player state in sync when user changes.
    const nextId = user?.id ?? null;
    if (lastUserIdRef.current === nextId) return;
    lastUserIdRef.current = nextId;

    if (!user) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const isLinkedOAuth = hasNonAnonymousIdentity(user);

        // Fetch player with a few retries (DB trigger can be slightly delayed after OAuth).
        let p: Player | null = null;
        for (const waitMs of [0, 200, 500, 1000, 2000]) {
          if (cancelled) return;
          if (waitMs) await new Promise((r) => setTimeout(r, waitMs));
          try {
            p = await fetchPlayer(user.id);
            if (p) break;
          } catch {
            // ignore and retry
          }
        }
        if (cancelled) return;

        // Fix is_guest flag for OAuth users
        // Handles guest -> OAuth upgrade flows where app_metadata.provider may still be 'anonymous',
        // but identities include a real provider.
        if (p && isLinkedOAuth && p.is_guest) {
          // Update the player record to not be a guest
          const avatarUrl =
            (user.user_metadata as Record<string, unknown> | undefined)?.avatar_url ||
            (user.user_metadata as Record<string, unknown> | undefined)?.picture;
          
          await supabase
            .from('players')
            .update({ 
              is_guest: false,
              ...(avatarUrl ? { avatar_url: avatarUrl as string } : {}),
            })
            .eq('id', user.id);

          // Best-effort: also clear auth metadata so future reads don't say guest.
          try {
            await supabase.auth.updateUser({ data: { is_guest: false } });
          } catch {
            // ignore
          }
          
          // Refetch the updated player
          p = await fetchPlayer(user.id);
          if (cancelled) return;
        }

        setPlayer(p);
      } catch {
        if (!cancelled) setPlayer(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const signInAsGuest = useCallback(
    async (options?: { username?: string }) => {
      setError(null);

      const stored = typeof window !== 'undefined' ? localStorage.getItem(GUEST_USERNAME_KEY) : null;
      const base = normalizeUsername(options?.username ?? stored ?? deriveDefaultGuestUsername());
      const username = base.length > 0 ? base : deriveDefaultGuestUsername();

      if (typeof window !== 'undefined') localStorage.setItem(GUEST_USERNAME_KEY, username);

      const { data, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) {
        setError(signInError.message);
        throw signInError;
      }

      const signedInUser = data.user ?? (await supabase.auth.getUser()).data.user;
      if (!signedInUser) return;

      // Best-effort: mark this account as guest + set a friendly username.
      // (Anonymous sign-in doesn't accept metadata at creation time.)
      await supabase.auth.updateUser({ data: { is_guest: true, username } });

      // Try to update the players table; retry on username collisions.
      let attempt = 0;
      let candidate = username;
      while (attempt < 5) {
        try {
          await updateOwnPlayer(signedInUser.id, { is_guest: true, username: candidate });
          break;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : '';
          const isUniqueViolation =
            msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique');
          if (!isUniqueViolation) throw e;
          attempt += 1;
          candidate = `${username}_${randomSuffix(3)}`;
        }
      }

      await refreshPlayer();
    },
    [refreshPlayer, supabase],
  );

  const signInWithOAuth = useCallback(
    async (provider: OAuthProvider, options?: { redirectTo?: string }) => {
      setError(null);
      const redirectTo =
        options?.redirectTo ??
        (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined);

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: redirectTo ? { redirectTo } : undefined,
      });

      if (signInError) {
        setError(signInError.message);
        throw signInError;
      }
    },
    [supabase],
  );

  const signUpWithEmail = useCallback(
    async (email: string, password: string, options?: { username?: string; redirectTo?: string }) => {
      setError(null);
      const redirectTo =
        options?.redirectTo ??
        (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined);

      const username = options?.username ? normalizeUsername(options.username) : undefined;

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
          data: {
            ...(username ? { username } : {}),
            is_guest: false,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        throw signUpError;
      }
    },
    [supabase],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        throw signInError;
      }
    },
    [supabase],
  );

  const sendPasswordResetEmail = useCallback(
    async (email: string, options?: { redirectTo?: string }) => {
      setError(null);
      const redirectTo =
        options?.redirectTo ??
        (typeof window !== 'undefined' ? `${window.location.origin}/auth/reset` : undefined);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        ...(redirectTo ? { redirectTo } : {}),
      });

      if (resetError) {
        setError(resetError.message);
        throw resetError;
      }
    },
    [supabase],
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      setError(null);
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message);
        throw updateError;
      }
    },
    [supabase],
  );

  const upgradeGuestWithOAuth = useCallback(
    async (provider: OAuthProvider, options?: { redirectTo?: string }) => {
      setError(null);
      const redirectTo =
        options?.redirectTo ??
        (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined);

      type LinkIdentityFn = (args: {
        provider: OAuthProvider;
        options?: { redirectTo?: string };
      }) => Promise<{ error: { message: string } | null }>;

      const linkIdentity = (supabase.auth as unknown as { linkIdentity?: LinkIdentityFn })
        .linkIdentity;
      if (typeof linkIdentity !== 'function') {
        const err = new Error(
          'Auth linking is not available in this Supabase client. Enable "Manual Linking" in Supabase Auth settings and ensure @supabase/supabase-js supports linkIdentity().',
        );
        setError(err.message);
        throw err;
      }

      const { error: linkError } = await linkIdentity({
        provider,
        options: redirectTo ? { redirectTo } : undefined,
      });

      if (linkError) {
        setError(linkError.message);
        throw linkError;
      }
    },
    [supabase],
  );

  const signOut = useCallback(async () => {
    setError(null);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      throw signOutError;
    }
  }, [supabase]);

  const isAuthenticated = !!session && !!user;
  
  // Determine if user is a guest
  // If the account is linked to a real provider (e.g. google), it is not a guest even if
  // Supabase still reports app_metadata.provider='anonymous' (common after linkIdentity()).
  const isLinkedOAuth = hasNonAnonymousIdentity(user);
  const provider = (user?.app_metadata as Record<string, unknown> | undefined)?.provider;
  const isGuest = isLinkedOAuth
    ? false
    : (user?.is_anonymous === true || player?.is_guest === true || provider === 'anonymous');

  const value: UseAuthValue = useMemo(
    () => ({
      isLoading,
      error,
      session,
      user,
      player,
      isAuthenticated,
      isGuest,
      signInAsGuest,
      signUpWithEmail,
      signInWithEmail,
      sendPasswordResetEmail,
      updatePassword,
      signInWithOAuth,
      upgradeGuestWithOAuth,
      signOut,
      refreshPlayer,
    }),
    [
      error,
      isAuthenticated,
      isGuest,
      isLoading,
      player,
      refreshPlayer,
      session,
      signInAsGuest,
      signInWithEmail,
      signInWithOAuth,
      signOut,
      signUpWithEmail,
      sendPasswordResetEmail,
      upgradeGuestWithOAuth,
      updatePassword,
      user,
    ],
  );

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): UseAuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

