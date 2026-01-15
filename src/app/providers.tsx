'use client';

import React from 'react';
import Script from 'next/script';

import { AuthProvider } from '@/hooks/useAuth';

function GoogleAnalytics() {
  const gaId =
    (typeof window !== 'undefined' ? (window as unknown as { __ENV?: Record<string, string | undefined> }).__ENV?.NEXT_PUBLIC_GA_ID : undefined) ??
    process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
      </Script>
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <GoogleAnalytics />
      {children}
    </AuthProvider>
  );
}

