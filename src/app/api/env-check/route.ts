import { NextResponse } from 'next/server';

function mask(value: string | undefined | null): { present: boolean; length: number; tail: string } {
  const v = value ?? '';
  return {
    present: v.length > 0,
    length: v.length,
    tail: v.length >= 6 ? v.slice(-6) : v,
  };
}

export async function GET() {
  // NOTE: do not expose full values in responses/logs.
  // The anon key is technically public, but keep it masked anyway.
  return NextResponse.json({
    ok: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: mask(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    },
  });
}

