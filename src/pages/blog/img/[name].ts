import type { APIRoute } from 'astro';
import { canReadLive } from '../../../server/blog-backend';
import { readImage } from '../../../server/blog-github';

export const prerender = false;

const types: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

export const GET: APIRoute = async ({ params }) => {
  const name = params.name || '';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (!canReadLive() || !types[ext]) return new Response(null, { status: 404 });
  try {
    const file = await readImage(name);
    if (!file) return new Response(null, { status: 404 });
    return new Response(file.bytes, {
      headers: {
        'content-type': types[ext],
        'cache-control': 'public, max-age=300',
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
};
