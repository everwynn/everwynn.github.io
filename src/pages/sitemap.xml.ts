import type { APIRoute } from 'astro';
import { getUpdatedAt } from '../lib/sites';

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL('https://everwynn.github.io');
  const lastmod = getUpdatedAt();
  const pages = [new URL('./', origin), new URL('about/', origin)];

  const entries = pages
    .map((url) => `  <url>\n    <loc>${url.href}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
