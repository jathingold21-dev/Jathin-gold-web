import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LIMITS,
  isRobots,
  isSlug,
  isStatus,
  slugify,
  type BlogPost,
  type PostStatus,
  type RobotsOption,
} from '../lib/blog-types';

const here = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(here, '../..');
export const blogContentDir = path.join(projectRoot, 'src', 'content', 'blog');
export const blogPublicDir = path.join(projectRoot, 'public', 'blog');

export class BlogError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type BlogListItem = Omit<BlogPost, 'body'>;

export function ensureDirs() {
  fs.mkdirSync(blogContentDir, { recursive: true });
  fs.mkdirSync(blogPublicDir, { recursive: true });
}

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function isDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function postPath(slug: string) {
  if (!isSlug(slug)) throw new BlogError(400, 'Use a URL slug with lowercase letters, numbers, and hyphens.');
  const root = path.resolve(blogContentDir);
  const file = path.resolve(root, `${slug}.md`);
  if (!file.startsWith(`${root}${path.sep}`)) throw new BlogError(400, 'That URL is not allowed.');
  return file;
}

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BlogError(400, 'Post data should be an object.');
  }
  return input as Record<string, unknown>;
}

function str(record: Record<string, unknown>, key: string) {
  const value = record[key];
  if (value == null) return '';
  if (typeof value !== 'string') throw new BlogError(400, `${key} should be text.`);
  return value.replace(/\u0000/g, '');
}

function oneLine(label: string, value: string, max: number) {
  const clean = value.trim();
  if (/[\r\n]/.test(clean)) throw new BlogError(400, `${label} should stay on one line.`);
  if (clean.length > max) throw new BlogError(400, `${label} is too long.`);
  return clean;
}

function checkImage(label: string, value: string) {
  if (!value) return;
  if (value.length > LIMITS.image || value.includes('..') || /\s/.test(value)) {
    throw new BlogError(400, `${label} is not a valid image URL.`);
  }
  const local = /^\/blog\/[A-Za-z0-9._-]+$/.test(value);
  const remote = /^https?:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s]*)?$/.test(value);
  if (!local && !remote) {
    throw new BlogError(400, `${label} should be an uploaded image or a full http(s) URL.`);
  }
}

function checkCanonical(value: string) {
  if (!value) return;
  if (value.length > LIMITS.canonical || !/^https?:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[^\s]*)?$/.test(value)) {
    throw new BlogError(400, 'Canonical URL should be a full http or https URL.');
  }
}

export function normalize(input: unknown): BlogPost {
  const record = asRecord(input);
  const title = oneLine('Title', str(record, 'title'), LIMITS.title);
  if (!title) throw new BlogError(400, 'Add a title.');

  const requested = oneLine('URL slug', str(record, 'slug'), LIMITS.slug);
  const slug = requested || slugify(title);
  if (!isSlug(slug)) throw new BlogError(400, 'Use a URL slug with lowercase letters, numbers, and hyphens.');

  const description = oneLine('Meta description', str(record, 'description'), LIMITS.description);
  const excerpt = oneLine('Excerpt', str(record, 'excerpt'), LIMITS.excerpt);
  const seoTitle = oneLine('Search title', str(record, 'seoTitle'), LIMITS.seoTitle);
  const keywords = oneLine('Keywords', str(record, 'keywords'), LIMITS.keywords);
  const focusKeyphrase = oneLine('Focus keyphrase', str(record, 'focusKeyphrase'), LIMITS.focusKeyphrase);
  const canonical = oneLine('Canonical URL', str(record, 'canonical'), LIMITS.canonical);
  const ogTitle = oneLine('Social title', str(record, 'ogTitle'), LIMITS.seoTitle);
  const ogDescription = oneLine('Social description', str(record, 'ogDescription'), LIMITS.description);
  const ogImage = oneLine('Social image', str(record, 'ogImage'), LIMITS.image);
  const coverImage = oneLine('Cover image', str(record, 'coverImage'), LIMITS.image);
  const coverAlt = oneLine('Cover alt text', str(record, 'coverAlt'), LIMITS.coverAlt);
  let author = oneLine('Author', str(record, 'author'), LIMITS.author);
  if (!author) author = 'Jathin Gold';

  let pubDate = oneLine('Publish date', str(record, 'pubDate'), 10);
  let updatedDate = oneLine('Updated date', str(record, 'updatedDate'), 10);
  if (!pubDate) pubDate = todayISO();
  if (!isDate(pubDate)) throw new BlogError(400, 'Publish date should be YYYY-MM-DD.');
  if (!updatedDate) updatedDate = pubDate;
  if (!isDate(updatedDate)) throw new BlogError(400, 'Updated date should be YYYY-MM-DD.');

  const statusRaw = oneLine('Status', str(record, 'status'), 20);
  const status: PostStatus = statusRaw ? (isStatus(statusRaw) ? statusRaw : 'draft') : 'draft';
  if (statusRaw && !isStatus(statusRaw)) throw new BlogError(400, 'Choose draft or published.');

  const robotsRaw = oneLine('Indexing', str(record, 'robots'), 40);
  const robots: RobotsOption = robotsRaw ? (isRobots(robotsRaw) ? robotsRaw : 'index, follow') : 'index, follow';
  if (robotsRaw && !isRobots(robotsRaw)) throw new BlogError(400, 'Choose an indexing option.');

  checkCanonical(canonical);
  checkImage('Cover image', coverImage);
  checkImage('Social image', ogImage);

  const body = str(record, 'body').replace(/\r\n/g, '\n');
  if (body.length > LIMITS.body) throw new BlogError(400, 'The post is too long.');
  const prose = body.replace(/^\n+/, '').replace(/\s+$/, '');

  if (status === 'published') {
    if (!description) throw new BlogError(400, 'Add a meta description before publishing.');
    if (!prose) throw new BlogError(400, 'Write the post before publishing.');
    if (coverImage && !coverAlt) throw new BlogError(400, 'Add alt text for the cover image before publishing.');
  }

  return {
    slug,
    title,
    description,
    excerpt,
    body: prose,
    pubDate,
    updatedDate,
    author,
    status,
    seoTitle,
    canonical,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    keywords,
    focusKeyphrase,
    coverImage,
    coverAlt,
  };
}

function quote(value: string) {
  return JSON.stringify(value);
}

export function serializePost(post: BlogPost) {
  return [
    '---',
    `title: ${quote(post.title)}`,
    `description: ${quote(post.description)}`,
    `excerpt: ${quote(post.excerpt)}`,
    `pubDate: ${quote(post.pubDate)}`,
    `updatedDate: ${quote(post.updatedDate)}`,
    `author: ${quote(post.author)}`,
    `status: ${quote(post.status)}`,
    `seoTitle: ${quote(post.seoTitle)}`,
    `canonical: ${quote(post.canonical)}`,
    `robots: ${quote(post.robots)}`,
    `ogTitle: ${quote(post.ogTitle)}`,
    `ogDescription: ${quote(post.ogDescription)}`,
    `ogImage: ${quote(post.ogImage)}`,
    `keywords: ${quote(post.keywords)}`,
    `focusKeyphrase: ${quote(post.focusKeyphrase)}`,
    `coverImage: ${quote(post.coverImage)}`,
    `coverAlt: ${quote(post.coverAlt)}`,
    '---',
    '',
    post.body,
    '',
  ].join('\n');
}

export function parseMarkdown(slug: string, raw: string): BlogPost {
  const text = raw.replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n')) throw new BlogError(500, `Could not read ${slug}.`);
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) throw new BlogError(500, `Could not read ${slug}.`);
  const data: Record<string, string> = {};
  for (const line of text.slice(4, end).split('\n')) {
    if (!line.trim()) continue;
    const match = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line);
    if (!match) continue;
    const rawValue = match[2].trim();
    try {
      data[match[1]] = rawValue.startsWith('"') ? (JSON.parse(rawValue) as string) : rawValue;
    } catch {
      throw new BlogError(500, `Could not read ${slug}.`);
    }
  }
  const body = text.slice(end + 5).replace(/^\n/, '').replace(/\s+$/, '');
  return normalize({ ...data, body, slug });
}

function readAll(): BlogPost[] {
  ensureDirs();
  const names = fs.readdirSync(blogContentDir);
  const posts = names
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3))
    .filter((slug) => isSlug(slug))
    .map((slug) => parseMarkdown(slug, fs.readFileSync(postPath(slug), 'utf8')));
  posts.sort((a, b) => b.pubDate.localeCompare(a.pubDate) || a.title.localeCompare(b.title));
  return posts;
}

export function listPosts(): BlogListItem[] {
  return readAll().map(({ body: _body, ...item }) => item);
}

export function readPost(slug: string): BlogPost {
  const file = postPath(slug);
  if (!fs.existsSync(file)) throw new BlogError(404, 'That post was not found.');
  return parseMarkdown(slug, fs.readFileSync(file, 'utf8'));
}

function writePost(post: BlogPost) {
  ensureDirs();
  const dest = postPath(post.slug);
  const tmp = `${dest}.tmp`;
  fs.writeFileSync(tmp, serializePost(post), 'utf8');
  fs.renameSync(tmp, dest);
}

function localImagePath(url: string) {
  if (!/^\/blog\/[A-Za-z0-9._-]+$/.test(url)) return null;
  const root = path.resolve(blogPublicDir);
  const file = path.resolve(root, path.basename(url));
  if (!file.startsWith(`${root}${path.sep}`)) return null;
  return file;
}

function releaseImages(previous: string[], keep: string[]) {
  const held = new Set(keep.filter(Boolean));
  const used = new Set<string>();
  for (const post of readAll()) {
    if (post.coverImage) used.add(post.coverImage);
    if (post.ogImage) used.add(post.ogImage);
  }
  for (const url of previous) {
    if (!url || held.has(url) || used.has(url)) continue;
    const file = localImagePath(url);
    if (file) fs.rmSync(file, { force: true });
  }
}

export function createPost(input: unknown): BlogPost {
  const post = normalize(input);
  if (fs.existsSync(postPath(post.slug))) throw new BlogError(409, 'A post with that URL already exists.');
  writePost(post);
  return post;
}

export function updatePost(current: string, input: unknown): BlogPost {
  const existing = readPost(current);
  const next = normalize(input);
  if (next.slug !== current && fs.existsSync(postPath(next.slug))) {
    throw new BlogError(409, 'A post with that URL already exists.');
  }
  writePost(next);
  if (next.slug !== current) fs.rmSync(postPath(current), { force: true });
  releaseImages([existing.coverImage, existing.ogImage], [next.coverImage, next.ogImage]);
  return next;
}

export function deletePost(slug: string) {
  const existing = readPost(slug);
  fs.rmSync(postPath(slug), { force: true });
  releaseImages([existing.coverImage, existing.ogImage], []);
}

function sniff(buf: Buffer): 'jpg' | 'png' | 'webp' | 'gif' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'webp';
  }
  if (buf.length > 6) {
    const mark = buf.subarray(0, 6).toString('ascii');
    if (mark === 'GIF87a' || mark === 'GIF89a') return 'gif';
  }
  return null;
}

export function saveUpload(dataUrl: unknown): string {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    throw new BlogError(400, 'Upload a JPEG, PNG, WebP, or GIF.');
  }
  const comma = dataUrl.indexOf(',');
  if (comma < 0 || !dataUrl.slice(0, comma).includes(';base64')) {
    throw new BlogError(400, 'Upload a JPEG, PNG, WebP, or GIF.');
  }
  const buf = Buffer.from(dataUrl.slice(comma + 1).replace(/\s/g, ''), 'base64');
  if (buf.length === 0 || buf.length > 2_500_000) throw new BlogError(413, 'Choose an image under 2.5 MB.');
  const ext = sniff(buf);
  if (!ext) throw new BlogError(400, 'Upload a JPEG, PNG, WebP, or GIF.');
  ensureDirs();
  const filename = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  fs.writeFileSync(path.join(blogPublicDir, filename), buf);
  return `/blog/${filename}`;
}

export function excludedBlogPaths(): string[] {
  try {
    return listPosts()
      .filter((post) => post.status !== 'published' || post.robots.startsWith('noindex'))
      .map((post) => `/blog/${post.slug}`);
  } catch (err) {
    console.warn('Blog sitemap filter skipped', err);
    return [];
  }
}
