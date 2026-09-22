import type { APIRoute } from 'astro';
import { blogMedia, failure } from '../../server/blog-endpoint';

export const prerender = false;

export const POST: APIRoute = (context) => blogMedia(context).catch(failure);
