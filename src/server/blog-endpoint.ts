import type { APIContext } from 'astro';
import { isSlug } from '../lib/blog-types';
import {
  assertLoginAllowed,
  cookieName,
  cookieOptions,
  deskAuth,
  isAuthed,
  noteLoginFailure,
  noteLoginSuccess,
  passwordMatches,
  sessionToken,
} from './blog-auth';
import { canReadLive, isLiveHost, liveSetup, loadPost, loadPosts, removeSaved, saveExisting, saveNew, storeUpload } from './blog-backend';
import { BlogError } from './blog-store';

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

export function failure(err: unknown) {
  if (err instanceof BlogError) {
    if (err.status >= 500) console.error(err);
    return json({ error: err.message }, err.status);
  }
  if (err instanceof Error && err.message.startsWith('Too many attempts')) {
    return json({ error: err.message }, 429);
  }
  console.error(err);
  return json({ error: 'Could not save the post.' }, 500);
}

function sessionBody() {
  const auth = deskAuth();
  const setup = liveSetup();
  return {
    ok: false,
    usingDefaultPassword: auth.usingDefaultPassword,
    ...(auth.usingDefaultPassword ? { devPassword: auth.password } : {}),
    live: isLiveHost(),
    ...(setup ? { setup } : {}),
    ...(canReadLive() ? { publishesLive: true } : {}),
  };
}

export function session(context: APIContext) {
  const auth = deskAuth();
  const ok = isAuthed(context.cookies.get(cookieName())?.value);
  return json({ ...sessionBody(), ok: auth.configured && ok });
}

export async function login(context: APIContext) {
  const auth = deskAuth();
  if (!auth.configured) throw new BlogError(503, liveSetup() || 'Add ADMIN_PASSWORD in the Vercel project settings, then redeploy.');
  let body: { password?: unknown };
  try {
    body = (await context.request.json()) as { password?: unknown };
  } catch {
    throw new BlogError(400, 'Missing request body.');
  }
  assertLoginAllowed();
  const given = typeof body.password === 'string' ? body.password : '';
  if (!passwordMatches(given, auth.password)) {
    noteLoginFailure();
    throw new BlogError(401, 'That password is not the desk password.');
  }
  noteLoginSuccess();
  context.cookies.set(cookieName(), sessionToken(auth.password), cookieOptions(60 * 60 * 24 * 14));
  return json({ ok: true });
}

export function logout(context: APIContext) {
  context.cookies.delete(cookieName(), { path: '/' });
  return json({ ok: true });
}

function requireDesk(context: APIContext) {
  const setup = liveSetup();
  if (setup) throw new BlogError(503, setup);
  if (!isAuthed(context.cookies.get(cookieName())?.value)) {
    throw new BlogError(401, 'Sign in to edit the blog.');
  }
}

export async function blogCollection(context: APIContext, method: string) {
  requireDesk(context);
  if (method === 'GET') return json({ posts: await loadPosts() });
  if (method === 'POST') {
    const saved = await saveNew(await readJson(context));
    return json(saved);
  }
  throw new BlogError(405, 'That action is not available.');
}

export async function blogItem(context: APIContext, method: string) {
  requireDesk(context);
  const slug = context.params.slug || '';
  if (!isSlug(slug)) throw new BlogError(404, 'That post was not found.');
  if (method === 'GET') return json({ post: await loadPost(slug) });
  if (method === 'PUT') return json(await saveExisting(slug, await readJson(context)));
  if (method === 'DELETE') return json({ ok: true, ...(await removeSaved(slug)) });
  throw new BlogError(405, 'That action is not available.');
}

export async function blogMedia(context: APIContext) {
  requireDesk(context);
  if (context.request.method !== 'POST') throw new BlogError(405, 'That action is not available.');
  const body = (await readJson(context)) as { dataUrl?: unknown };
  return json(await storeUpload(body.dataUrl));
}

async function readJson(context: APIContext) {
  try {
    return await context.request.json();
  } catch {
    throw new BlogError(400, 'Post data should be JSON.');
  }
}
