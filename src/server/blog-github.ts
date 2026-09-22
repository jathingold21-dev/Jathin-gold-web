import { isSlug } from '../lib/blog-types';
import { BlogError, normalize, parseMarkdown, serializePost, type BlogListItem, type BlogPost } from './blog-store';

const SETUP =
  'Add GITHUB_TOKEN in the Vercel project settings. The token needs read and write access to code on jathingold21-dev/Jathin-gold-web. Then redeploy.';

type GhFile = {
  type?: string;
  name?: string;
  sha?: string;
  content?: string;
  encoding?: string;
};

function target() {
  const full = (process.env.GITHUB_REPO || 'jathingold21-dev/Jathin-gold-web').trim();
  const [owner, repo] = full.split('/');
  if (!owner || !repo || full.split('/').length !== 2) {
    throw new BlogError(500, 'GITHUB_REPO should look like owner/name.');
  }
  return {
    owner,
    repo,
    branch: (process.env.GITHUB_BRANCH || 'main').trim() || 'main',
  };
}

function token() {
  const value = process.env.GITHUB_TOKEN?.trim();
  if (!value) throw new BlogError(503, SETUP);
  return value;
}

async function gh(path: string, init?: RequestInit) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'jathin-gold-blog',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers || {}),
    },
  });
  return response;
}

async function fail(response: Response): Promise<never> {
  let message = `GitHub responded ${response.status}.`;
  try {
    const body = (await response.json()) as { message?: string };
    if (body.message) message = body.message;
  } catch {
    /* keep the status message */
  }
  if (response.status === 401 || response.status === 403) {
    throw new BlogError(502, 'GitHub rejected GITHUB_TOKEN. Check that it can read and write this repository, then redeploy.');
  }
  throw new BlogError(502, message);
}

async function readBytes(path: string) {
  const { branch } = target();
  const response = await gh(`/repos/${repoName()}/contents/${path}?ref=${encodeURIComponent(branch)}`);
  if (response.status === 404) return null;
  if (!response.ok) return fail(response);
  const data = (await response.json()) as GhFile;
  if (!data.sha || !data.content || data.type !== 'file') throw new BlogError(500, `Could not read ${path}.`);
  const bytes =
    data.encoding === 'base64' || !data.encoding
      ? Buffer.from(data.content.replace(/\n/g, ''), 'base64')
      : Buffer.from(data.content);
  return { sha: data.sha, bytes };
}

async function readFile(path: string) {
  const file = await readBytes(path);
  if (!file) return null;
  return { sha: file.sha, text: file.bytes.toString('utf8') };
}

export async function readImage(name: string) {
  if (!/^[A-Za-z0-9._-]+$/.test(name)) return null;
  return readBytes(`public/blog/${name}`);
}

function repoName() {
  const { owner, repo } = target();
  return `${owner}/${repo}`;
}

async function writeFile(path: string, content: string, message: string, sha?: string) {
  const { branch } = target();
  const response = await gh(`/repos/${repoName()}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (response.status === 409 || response.status === 422) {
    throw new BlogError(409, 'That file changed while it was being saved. Reload and try again.');
  }
  if (!response.ok) return fail(response);
}

async function removeFile(path: string, sha: string, message: string) {
  const { branch } = target();
  const response = await gh(`/repos/${repoName()}/contents/${path}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha, branch }),
  });
  if (response.status === 404) return;
  if (!response.ok) return fail(response);
}

function postFile(slug: string) {
  if (!isSlug(slug)) throw new BlogError(400, 'Use a URL slug with lowercase letters, numbers, and hyphens.');
  return `src/content/blog/${slug}.md`;
}

export async function listPosts(): Promise<BlogListItem[]> {
  const { branch } = target();
  const response = await gh(`/repos/${repoName()}/contents/src/content/blog?ref=${encodeURIComponent(branch)}`);
  if (response.status === 404) return [];
  if (!response.ok) return fail(response);
  const files = (await response.json()) as GhFile[];
  if (!Array.isArray(files)) return [];
  const slugs = files
    .filter((file) => file.type === 'file' && file.name?.endsWith('.md'))
    .map((file) => file.name!.slice(0, -3))
    .filter((slug) => isSlug(slug));
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const file = await readFile(postFile(slug));
      return file ? parseMarkdown(slug, file.text) : null;
    }),
  );
  return posts
    .filter((post): post is BlogPost => Boolean(post))
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate) || a.title.localeCompare(b.title))
    .map(({ body: _body, ...item }) => item);
}

export async function readPost(slug: string): Promise<BlogPost> {
  const file = await readFile(postFile(slug));
  if (!file) throw new BlogError(404, 'That post was not found.');
  return parseMarkdown(slug, file.text);
}

async function releaseImages(previous: string[], keep: string[]) {
  const held = new Set(keep.filter(Boolean));
  const posts = await listPosts();
  const used = new Set<string>();
  for (const post of posts) {
    if (post.coverImage) used.add(post.coverImage);
    if (post.ogImage) used.add(post.ogImage);
  }
  for (const url of previous) {
    const name = /^\/blog\/img\/([A-Za-z0-9._-]+)$/.exec(url)?.[1] || /^\/blog\/([A-Za-z0-9._-]+)$/.exec(url)?.[1];
    if (!url || held.has(url) || used.has(url) || !name) continue;
    const file = await readFile(`public/blog/${name}`);
    if (file) await removeFile(`public/blog/${name}`, file.sha, `Remove unused blog image ${name}`);
  }
}

export async function createPost(input: unknown): Promise<BlogPost> {
  const post = normalize(input);
  const existing = await readFile(postFile(post.slug));
  if (existing) throw new BlogError(409, 'A post with that URL already exists.');
  await writeFile(postFile(post.slug), Buffer.from(serializePost(post), 'utf8').toString('base64'), `Add blog post ${post.slug}`);
  return post;
}

export async function updatePost(current: string, input: unknown): Promise<BlogPost> {
  const existingFile = await readFile(postFile(current));
  if (!existingFile) throw new BlogError(404, 'That post was not found.');
  const existing = parseMarkdown(current, existingFile.text);
  const next = normalize(input);
  if (next.slug !== current) {
    const clash = await readFile(postFile(next.slug));
    if (clash) throw new BlogError(409, 'A post with that URL already exists.');
    await writeFile(postFile(next.slug), Buffer.from(serializePost(next), 'utf8').toString('base64'), `Rename blog post ${current} to ${next.slug}`);
    await removeFile(postFile(current), existingFile.sha, `Remove old blog slug ${current}`);
  } else {
    await writeFile(
      postFile(current),
      Buffer.from(serializePost(next), 'utf8').toString('base64'),
      `Update blog post ${current}`,
      existingFile.sha,
    );
  }
  await releaseImages([existing.coverImage, existing.ogImage], [next.coverImage, next.ogImage]);
  return next;
}

export async function deletePost(slug: string) {
  const file = await readFile(postFile(slug));
  if (!file) throw new BlogError(404, 'That post was not found.');
  const existing = parseMarkdown(slug, file.text);
  await removeFile(postFile(slug), file.sha, `Delete blog post ${slug}`);
  await releaseImages([existing.coverImage, existing.ogImage], []);
}

function sniff(buf: Buffer) {
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

export async function saveUpload(dataUrl: unknown) {
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
  const filename = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `public/blog/${filename}`;
  await writeFile(path, buf.toString('base64'), `Add blog image ${filename}`);
  return { url: `/blog/img/${filename}` };
}
