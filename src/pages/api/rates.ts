import type { APIRoute } from 'astro';
import { getRates } from '../../lib/rates';

export const prerender = false;

/** Same-origin live rates. The browser does not call third-party metal APIs. */
export const GET: APIRoute = async () => {
  const rates = await getRates();
  if (rates.source === 'fallback') {
    return new Response(JSON.stringify({ error: 'rates unavailable' }), {
      status: 503,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    });
  }
  return new Response(JSON.stringify(rates), {
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=120',
    },
  });
};
