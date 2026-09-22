import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'jg_blog_admin';
const DEV_PASSWORD = 'jathin-desk';

export const PASSWORD_SETUP =
  'Add ADMIN_PASSWORD in the Vercel project settings, then redeploy.';

export function deskAuth() {
  const fromEnv = (process.env.ADMIN_PASSWORD || '').trim();
  if (fromEnv) return { password: fromEnv, usingDefaultPassword: false, configured: true };
  if (process.env.VERCEL) return { password: '', usingDefaultPassword: false, configured: false };
  return { password: DEV_PASSWORD, usingDefaultPassword: true, configured: true };
}

export function sessionToken(password: string) {
  return createHmac('sha256', password).update('jathin-gold-blog-admin-v1').digest('hex');
}

function sameSecret(a: string, b: string) {
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

export function passwordMatches(given: string, expected: string) {
  return sameSecret(given, expected);
}

export function isAuthed(cookieValue: string | undefined) {
  const auth = deskAuth();
  if (!auth.configured || !cookieValue) return false;
  return sameSecret(cookieValue, sessionToken(auth.password));
}

export function cookieName() {
  return COOKIE;
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: Boolean(process.env.VERCEL),
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

let failures = 0;
let lockedUntil = 0;

export function assertLoginAllowed() {
  if (Date.now() < lockedUntil) {
    throw new Error('Too many attempts. Wait a minute, then try again.');
  }
}

export function noteLoginFailure() {
  failures += 1;
  if (failures >= 8) {
    failures = 0;
    lockedUntil = Date.now() + 60_000;
  }
}

export function noteLoginSuccess() {
  failures = 0;
}
