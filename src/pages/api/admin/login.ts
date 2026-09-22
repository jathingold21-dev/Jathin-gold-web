import type { APIRoute } from 'astro';
import { failure, login } from '../../../server/blog-endpoint';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    return await login(context);
  } catch (err) {
    return failure(err);
  }
};
