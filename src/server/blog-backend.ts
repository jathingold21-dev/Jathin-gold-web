import { BlogError, createPost as createFilePost, deletePost as deleteFilePost, listPosts as listFilePosts, readPost as readFilePost, saveUpload as saveFileUpload, updatePost as updateFilePost, type BlogListItem, type BlogPost } from './blog-store';
import * as github from './blog-github';

export function isLiveHost() {
  return process.env.VERCEL === '1';
}

export function canReadLive() {
  return isLiveHost() && Boolean(process.env.GITHUB_TOKEN?.trim());
}

export function liveSetup() {
  if (!isLiveHost()) return '';
  const missing: string[] = [];
  if (!process.env.ADMIN_PASSWORD?.trim()) missing.push('ADMIN_PASSWORD');
  if (!process.env.GITHUB_TOKEN?.trim()) missing.push('GITHUB_TOKEN');
  if (!missing.length) return '';
  return `Add ${missing.join(' and ')} in the Vercel project settings, then redeploy. GITHUB_TOKEN needs read and write access to code on jathingold21-dev/Jathin-gold-web.`;
}

function assertReady() {
  const setup = liveSetup();
  if (setup) throw new BlogError(503, setup);
}

export async function loadPosts(): Promise<BlogListItem[]> {
  if (!isLiveHost()) return listFilePosts();
  assertReady();
  return github.listPosts();
}

export async function loadPost(slug: string): Promise<BlogPost> {
  if (!isLiveHost()) return readFilePost(slug);
  assertReady();
  return github.readPost(slug);
}

export async function readLivePost(slug: string): Promise<BlogPost> {
  return github.readPost(slug);
}

export async function saveNew(input: unknown) {
  if (!isLiveHost()) return { post: createFilePost(input), pendingPublish: false };
  assertReady();
  return { post: await github.createPost(input), pendingPublish: true };
}

export async function saveExisting(slug: string, input: unknown) {
  if (!isLiveHost()) return { post: updateFilePost(slug, input), pendingPublish: false };
  assertReady();
  return { post: await github.updatePost(slug, input), pendingPublish: true };
}

export async function removeSaved(slug: string) {
  if (!isLiveHost()) {
    deleteFilePost(slug);
    return { pendingPublish: false };
  }
  assertReady();
  await github.deletePost(slug);
  return { pendingPublish: true };
}

export async function storeUpload(dataUrl: unknown) {
  if (!isLiveHost()) return { url: saveFileUpload(dataUrl) as string, previewUrl: undefined as string | undefined };
  assertReady();
  return github.saveUpload(dataUrl);
}
