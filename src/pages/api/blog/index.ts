import type { APIRoute } from 'astro';
import { blogCollection, failure } from '../../../server/blog-endpoint';

export const prerender = false;

export const GET: APIRoute = (context) => blogCollection(context, 'GET').catch(failure);
export const POST: APIRoute = (context) => blogCollection(context, 'POST').catch(failure);
