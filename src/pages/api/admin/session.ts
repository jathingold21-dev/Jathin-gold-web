import type { APIRoute } from 'astro';
import { failure, session } from '../../../server/blog-endpoint';

export const prerender = false;

export const GET: APIRoute = (context) => {
  try {
    return session(context);
  } catch (err) {
    return failure(err);
  }
};
