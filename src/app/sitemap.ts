import type { MetadataRoute } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://damaking.com').replace(/\/+$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Keep this limited to public, indexable routes.
  const routes = ['/', '/play', '/lobby', '/leaderboard', '/contact'] as const;

  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
  }));
}

