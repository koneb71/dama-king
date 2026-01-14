import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://damaking.com').replace(/\/+$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/signin/',
          '/profile/',
          '/game/',
          '/replay/',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

