import type { APIRoute } from 'astro';
import { failure, logout } from '../../../server/blog-endpoint';

export const prerender = false;

export const POST: APIRoute = (context) => {
  try {
    return logout(context);
  } catch (err) {
    return failure(err);
  }
};
