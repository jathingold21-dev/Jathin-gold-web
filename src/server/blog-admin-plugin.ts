import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin } from 'vite';
import {
  BlogError,
  blogContentDir,
  blogPublicDir,
  createPost,
  deletePost,
  ensureDirs,
  listPosts,
  readPost,
  saveUpload,
  updatePost,
} from './blog-store';
import { isSlug } from '../lib/blog-types';

const COOKIE = 'jg_blog_admin';
const DEV_PASSWORD = 'jathin-desk';

function sameSecret(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

function sessionToken(password: string) {
  return createHmac('sha256', password).update('jathin-gold-blog-admin-v1').digest('hex');
}

function readCookies(header: string | undefined) {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

function authorized(req: IncomingMessage, password: string) {
  const got = readCookies(req.headers.cookie)[COOKIE] ?? '';
  return sameSecret(got, sessionToken(password));
}

function cookie(value: string, maxAge: number) {
  return `${COOKIE}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function send(res: ServerResponse, status: number, body: unknown, extra?: Record<string, string>) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extra,
  });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage, limit: number) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;
    req.on('data', (chunk: Buffer) => {
      if (failed) return;
      size += chunk.length;
      if (size > limit) {
        failed = true;
        reject(new BlogError(413, 'That upload is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!failed) resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', (err) => {
      if (!failed) reject(err);
    });
  });
}

async function readJson(req: IncomingMessage, limit: number) {
  const raw = await readBody(req, limit);
  if (!raw.trim()) throw new BlogError(400, 'Missing request body.');
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new BlogError(400, 'Post data should be JSON.');
  }
}

export function blogAdminPlugin(): Plugin {
  return {
    name: 'jathin-blog-admin',
    apply: 'serve',
    configureServer(server) {
      ensureDirs();
      server.watcher.add(blogContentDir);
      server.watcher.add(blogPublicDir);

      const env = loadEnv(server.config.mode, server.config.root, '');
      const fromEnv = (env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '').trim();
      const password = fromEnv || DEV_PASSWORD;
      const usingDefaultPassword = !fromEnv;
      let failures = 0;
      let lockedUntil = 0;

      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?')[0] || '';
        if (pathname !== '/api/admin/session' && pathname !== '/api/admin/login' && pathname !== '/api/admin/logout' && pathname !== '/api/blog' && pathname !== '/api/blog-media' && !pathname.startsWith('/api/blog/')) {
          next();
          return;
        }

        void handle(req, res, pathname).catch((err) => {
          if (res.headersSent) return;
          const status = err instanceof BlogError ? err.status : 500;
          if (status === 500) console.error(err);
          send(res, status, { error: err instanceof BlogError ? err.message : 'Could not save the post.' });
        });
      });

      async function handle(req: IncomingMessage, res: ServerResponse, pathname: string) {
        const method = req.method || 'GET';

        if (pathname === '/api/admin/session' && method === 'GET') {
          send(res, 200, {
            ok: authorized(req, password),
            usingDefaultPassword,
            ...(usingDefaultPassword ? { devPassword: password } : {}),
          });
          return;
        }

        if (pathname === '/api/admin/login' && method === 'POST') {
          if (Date.now() < lockedUntil) throw new BlogError(429, 'Too many attempts. Wait a minute, then try again.');
          const body = (await readJson(req, 20_000)) as { password?: unknown };
          const given = typeof body.password === 'string' ? body.password : '';
          if (!sameSecret(given, password)) {
            failures += 1;
            if (failures >= 8) {
              failures = 0;
              lockedUntil = Date.now() + 60_000;
            }
            throw new BlogError(401, 'That password is not the desk password.');
          }
          failures = 0;
          send(res, 200, { ok: true }, { 'Set-Cookie': cookie(sessionToken(password), 60 * 60 * 24 * 14) });
          return;
        }

        if (pathname === '/api/admin/logout' && method === 'POST') {
          send(res, 200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
          return;
        }

        if (!authorized(req, password)) throw new BlogError(401, 'Sign in to edit the blog.');

        if (pathname === '/api/blog' && method === 'GET') {
          send(res, 200, { posts: listPosts() });
          return;
        }

        if (pathname === '/api/blog' && method === 'POST') {
          send(res, 200, { post: createPost(await readJson(req, 600_000)) });
          return;
        }

        if (pathname === '/api/blog-media' && method === 'POST') {
          const body = (await readJson(req, 4_500_000)) as { dataUrl?: unknown };
          send(res, 200, { url: saveUpload(body.dataUrl) });
          return;
        }

        const match = /^\/api\/blog\/([a-z0-9-]+)$/.exec(pathname);
        if (!match || !isSlug(match[1])) throw new BlogError(404, 'That post was not found.');
        const slug = match[1];

        if (method === 'GET') {
          send(res, 200, { post: readPost(slug) });
          return;
        }
        if (method === 'PUT') {
          send(res, 200, { post: updatePost(slug, await readJson(req, 600_000)) });
          return;
        }
        if (method === 'DELETE') {
          deletePost(slug);
          send(res, 200, { ok: true });
          return;
        }

        throw new BlogError(405, 'That action is not available.');
      }
    },
  };
}
