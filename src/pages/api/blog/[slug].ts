import type { APIRoute } from 'astro';
import { blogItem, failure } from '../../../server/blog-endpoint';

export const prerender = false;

export const GET: APIRoute = (context) => blogItem(context, 'GET').catch(failure);
export const PUT: APIRoute = (context) => blogItem(context, 'PUT').catch(failure);
export const DELETE: APIRoute = (context) => blogItem(context, 'DELETE').catch(failure);
