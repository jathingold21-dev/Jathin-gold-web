import { formatBlogDate } from '../lib/format';
import {
  isRobots,
  isSlug,
  isStatus,
  slugify,
  type BlogPost,
  type PostStatus,
  type RobotsOption,
} from '../lib/blog-types';

type Session = {
  ok: boolean;
  usingDefaultPassword?: boolean;
  devPassword?: string;
  live?: boolean;
  setup?: string;
  publishesLive?: boolean;
};
type ListPost = Omit<BlogPost, 'body'>;
type View = 'login' | 'list' | 'editor';

const BRAND = 'Jathin Gold';

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function must<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing ${selector}`);
  return el;
}

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function field(form: HTMLFormElement, name: string) {
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return el.value;
  }
  return '';
}

function writeField(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    el.value = value;
  }
}

function norm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasPhrase(hay: string, phrase: string) {
  const needle = norm(phrase);
  if (!needle) return false;
  return ` ${norm(hay)} `.includes(` ${needle} `);
}

function searchTitle(seo: string, title: string) {
  const page = (seo || title).trim();
  if (!page) return '';
  return page.includes(BRAND) ? page : `${page} | ${BRAND}`;
}

function blankPost(): BlogPost {
  const today = todayISO();
  return {
    slug: '',
    title: '',
    description: '',
    excerpt: '',
    body: '',
    pubDate: today,
    updatedDate: today,
    author: BRAND,
    status: 'draft',
    seoTitle: '',
    canonical: '',
    robots: 'index, follow',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    keywords: '',
    focusKeyphrase: '',
    coverImage: '',
    coverAlt: '',
  };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  } catch {
    throw new ApiError(0, 'The blog desk could not reach the server. Reload the page.');
  }
  const text = await response.text();
  let data: { error?: string } = {};
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string };
    } catch {
      throw new ApiError(response.status, 'The blog desk could not reach the server. Reload the page.');
    }
  }
  if (!response.ok) throw new ApiError(response.status, data.error || 'Request failed.');
  return data as T;
}

export function mountBlogAdmin() {
  const root = must<HTMLElement>('#blog-admin');
  const site = root.dataset.site || 'https://www.jathingold.com';
  const boot = must<HTMLElement>('#admin-boot');
  const login = must<HTMLElement>('#admin-login');
  const list = must<HTMLElement>('#admin-list');
  const editor = must<HTMLElement>('#admin-editor');
  const heading = must<HTMLElement>('#admin-heading');
  const logout = must<HTMLButtonElement>('#logout');
  const form = must<HTMLFormElement>('#editor-form');
  const loginForm = must<HTMLFormElement>('#login-form');
  let view: View = 'login';
  let slugTouched = false;
  let originalSlug = '';
  let snapshot = '';
  let routeToken = 0;

  function setStatus(id: string, message: string) {
    must<HTMLElement>(id).textContent = message;
  }

  function show(next: View) {
    view = next;
    login.hidden = next !== 'login';
    list.hidden = next !== 'list';
    editor.hidden = next !== 'editor';
    logout.hidden = next === 'login';
    if (next === 'login') heading.textContent = 'Blog desk';
    if (next === 'list') heading.textContent = 'Posts';
  }

  function readForm(): BlogPost {
    const status = field(form, 'status');
    const robots = field(form, 'robots');
    return {
      slug: field(form, 'slug').trim(),
      title: field(form, 'title').trim(),
      description: field(form, 'description').trim(),
      excerpt: field(form, 'excerpt').trim(),
      body: field(form, 'body').replace(/\r\n/g, '\n'),
      pubDate: field(form, 'pubDate').trim(),
      updatedDate: field(form, 'updatedDate').trim(),
      author: field(form, 'author').trim(),
      status: (isStatus(status) ? status : 'draft') as PostStatus,
      seoTitle: field(form, 'seoTitle').trim(),
      canonical: field(form, 'canonical').trim(),
      robots: (isRobots(robots) ? robots : 'index, follow') as RobotsOption,
      ogTitle: field(form, 'ogTitle').trim(),
      ogDescription: field(form, 'ogDescription').trim(),
      ogImage: field(form, 'ogImage').trim(),
      keywords: field(form, 'keywords').trim(),
      focusKeyphrase: field(form, 'focusKeyphrase').trim(),
      coverImage: field(form, 'coverImage').trim(),
      coverAlt: field(form, 'coverAlt').trim(),
    };
  }

  function takeSnapshot() {
    snapshot = JSON.stringify(readForm());
  }

  function isDirty() {
    return view === 'editor' && JSON.stringify(readForm()) !== snapshot;
  }

  function confirmLeave() {
    if (!isDirty()) return true;
    return confirm('Leave this post without saving?');
  }

  function markCount(id: string, length: number, min: number, max: number) {
    const el = must<HTMLElement>(`#${id}`);
    el.textContent = length ? `${length} characters. Aim for ${min}–${max}.` : `Aim for ${min}–${max} characters.`;
    el.classList.remove('is-good', 'is-short', 'is-long');
    if (!length) return;
    el.classList.add(length < min ? 'is-short' : length > max ? 'is-long' : 'is-good');
  }

  function updatePreview() {
    const post = readForm();
    const title = searchTitle(post.seoTitle, post.title);
    const host = site.replace(/^https?:\/\//, '');
    must<HTMLElement>('#serp-title').textContent = title || 'Search title';
    must<HTMLElement>('#serp-url').textContent = `${host}/blog/${post.slug || 'your-slug'}`;
    must<HTMLElement>('#serp-desc').textContent = post.description || 'Meta description';
    markCount('count-title', title.length, 50, 60);
    const titleCount = must<HTMLElement>('#count-title');
    titleCount.textContent = `${titleCount.textContent} This includes “ | Jathin Gold” when the name is not already in the title.`;
    markCount('count-description', post.description.length, 140, 160);

    const checks = [
      { ok: post.status === 'published' && post.robots.startsWith('index'), text: 'Published and indexable' },
      { ok: title.length >= 50 && title.length <= 60, text: 'Search title is 50–60 characters' },
      { ok: post.description.length >= 140 && post.description.length <= 160, text: 'Meta description is 140–160 characters' },
      { ok: post.slug.length > 0 && post.slug.length <= 60, text: 'URL slug is short' },
    ];
    if (post.focusKeyphrase.trim()) {
      const phrase = post.focusKeyphrase;
      checks.push(
        { ok: hasPhrase(post.title, phrase), text: 'Keyphrase in the heading' },
        { ok: hasPhrase(title, phrase), text: 'Keyphrase in the search title' },
        { ok: hasPhrase(post.description, phrase), text: 'Keyphrase in the meta description' },
        { ok: hasPhrase(post.slug, phrase), text: 'Keyphrase in the URL' },
        { ok: hasPhrase(post.body.slice(0, 300), phrase), text: 'Keyphrase in the opening' },
      );
    } else {
      checks.push({ ok: false, text: 'Focus keyphrase added' });
    }
    if (post.coverImage) checks.push({ ok: post.coverAlt.trim().length > 0, text: 'Cover image has alt text' });

    const ul = must<HTMLElement>('#seo-checks');
    ul.replaceChildren();
    for (const check of checks) {
      const li = document.createElement('li');
      li.className = check.ok ? 'is-ok' : 'is-miss';
      const mark = document.createElement('span');
      mark.textContent = check.ok ? 'OK' : 'Fix';
      li.append(mark, document.createTextNode(` ${check.text}`));
      ul.append(li);
    }

    const preview = must<HTMLImageElement>('#cover-preview');
    if (post.coverImage) {
      preview.src = post.coverImage;
      preview.alt = post.coverAlt;
      preview.hidden = false;
    } else {
      preview.removeAttribute('src');
      preview.hidden = true;
    }
  }

  function fillEditor(post: BlogPost | null) {
    const value = post ?? blankPost();
    slugTouched = Boolean(post);
    originalSlug = post?.slug ?? '';
    for (const key of Object.keys(blankPost()) as (keyof BlogPost)[]) {
      writeField(form, key, value[key]);
    }
    const viewLink = must<HTMLAnchorElement>('#view-post');
    const deleteBtn = must<HTMLButtonElement>('#delete-post');
    viewLink.hidden = !post;
    deleteBtn.hidden = !post;
    if (post) viewLink.href = `/blog/${post.slug}`;
    heading.textContent = post ? post.title : 'New post';
    updatePreview();
    takeSnapshot();
    const title = form.elements.namedItem('title');
    if (title instanceof HTMLInputElement) title.focus();
  }

  function renderRows(posts: ListPost[]) {
    const rows = must<HTMLElement>('#post-rows');
    rows.replaceChildren();
    if (!posts.length) {
      const empty = document.createElement('p');
      empty.className = 'admin-empty';
      empty.textContent = 'No posts yet.';
      rows.append(empty);
      return;
    }
    for (const post of posts) {
      const row = document.createElement('article');
      row.className = 'admin-row';
      const copy = document.createElement('div');
      const pill = document.createElement('span');
      pill.className = post.status === 'published' ? 'pill pill-published' : 'pill pill-draft';
      pill.textContent = post.status === 'published' ? 'Published' : 'Draft';
      const title = document.createElement('h2');
      title.textContent = post.title;
      const meta = document.createElement('p');
      meta.textContent = `${formatBlogDate(post.pubDate)} · /blog/${post.slug}`;
      copy.append(pill, title, meta);

      const actions = document.createElement('div');
      actions.className = 'admin-row-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn btn-seal';
      edit.textContent = 'Edit';
      edit.addEventListener('click', () => navigate(`/admin/blog?post=${encodeURIComponent(post.slug)}`));
      const viewLink = document.createElement('a');
      viewLink.className = 'btn btn-ghost';
      viewLink.href = `/blog/${post.slug}`;
      viewLink.target = '_blank';
      viewLink.rel = 'noopener';
      viewLink.textContent = 'View';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn btn-ghost';
      remove.textContent = 'Delete';
      remove.addEventListener('click', () => void removePost(post.slug, post.title));
      actions.append(edit, viewLink, remove);
      row.append(copy, actions);
      rows.append(row);
    }
  }

  async function loadList() {
    const data = await api<{ posts: ListPost[] }>('/api/blog');
    renderRows(data.posts);
  }

  async function renderRoute() {
    const token = ++routeToken;
    const post = new URLSearchParams(location.search).get('post');
    try {
      if (!post) {
        show('list');
        setStatus('#list-status', '');
        await loadList();
        return;
      }
      show('editor');
      setStatus('#editor-status', '');
      if (post === 'new') {
        fillEditor(null);
        return;
      }
      if (!isSlug(post)) throw new ApiError(404, 'That post was not found.');
      const data = await api<{ post: BlogPost }>(`/api/blog/${encodeURIComponent(post)}`);
      if (token !== routeToken) return;
      fillEditor(data.post);
    } catch (err) {
      if (token !== routeToken) return;
      if (err instanceof ApiError && err.status === 401) {
        show('login');
        setStatus('#login-status', err.message);
        return;
      }
      show('list');
      setStatus('#list-status', err instanceof Error ? err.message : 'Could not open that post.');
      try {
        await loadList();
      } catch {
        /* The status line already explains the failure. */
      }
    }
  }

  function navigate(url: string) {
    if (!confirmLeave()) return;
    history.pushState({}, '', url);
    void renderRoute();
  }

  async function removePost(slug: string, title: string) {
    if (!confirm(`Delete “${title}”?`)) return;
    setStatus('#list-status', 'Deleting…');
    setStatus('#editor-status', 'Deleting…');
    try {
      const removed = await api<{ pendingPublish?: boolean }>(`/api/blog/${encodeURIComponent(slug)}`, { method: 'DELETE' });
      originalSlug = '';
      snapshot = JSON.stringify(readForm());
      history.pushState({}, '', '/admin/blog');
      await renderRoute();
      setStatus('#list-status', removed.pendingPublish ? 'Deleted. The public page updates from the repository now.' : 'Deleted.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not delete the post.';
      setStatus('#list-status', message);
      setStatus('#editor-status', message);
    }
  }

  form.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
    if (target.name === 'slug') slugTouched = true;
    if (target.name === 'title' && !slugTouched) {
      const slug = form.elements.namedItem('slug');
      if (slug instanceof HTMLInputElement) slug.value = slugify(target.value);
    }
    updatePreview();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const slugInput = form.elements.namedItem('slug');
    if (slugInput instanceof HTMLInputElement) {
      slugInput.value = slugify(slugInput.value || field(form, 'title'));
    }
    const post = readForm();
    if (!post.title) {
      setStatus('#editor-status', 'Add a title.');
      return;
    }
    if (!isSlug(post.slug)) {
      setStatus('#editor-status', 'Use a URL slug with lowercase letters, numbers, and hyphens.');
      return;
    }
    if (post.status === 'published') {
      if (!post.description) {
        setStatus('#editor-status', 'Add a meta description before publishing.');
        return;
      }
      if (!post.body.trim()) {
        setStatus('#editor-status', 'Write the post before publishing.');
        return;
      }
      if (post.coverImage && !post.coverAlt) {
        setStatus('#editor-status', 'Add alt text for the cover image before publishing.');
        return;
      }
    }
    const saveBtn = must<HTMLButtonElement>('#save-post');
    saveBtn.disabled = true;
    setStatus('#editor-status', 'Saving…');
    const creating = !originalSlug;
    void api<{ post: BlogPost; pendingPublish?: boolean }>(creating ? '/api/blog' : `/api/blog/${encodeURIComponent(originalSlug)}`, {
      method: creating ? 'POST' : 'PUT',
      body: JSON.stringify(post),
    })
      .then((data) => {
        originalSlug = data.post.slug;
        slugTouched = true;
        writeField(form, 'slug', data.post.slug);
        writeField(form, 'pubDate', data.post.pubDate);
        writeField(form, 'updatedDate', data.post.updatedDate);
        writeField(form, 'author', data.post.author);
        const viewLink = must<HTMLAnchorElement>('#view-post');
        viewLink.hidden = false;
        viewLink.href = `/blog/${data.post.slug}`;
        must<HTMLButtonElement>('#delete-post').hidden = false;
        heading.textContent = data.post.title;
        history.replaceState({}, '', `/admin/blog?post=${encodeURIComponent(data.post.slug)}`);
        updatePreview();
        takeSnapshot();
        setStatus('#editor-status', data.pendingPublish ? 'Saved. The public page is reading this post from the repository.' : 'Saved.');
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) show('login');
        setStatus(view === 'login' ? '#login-status' : '#editor-status', err instanceof Error ? err.message : 'Could not save the post.');
      })
      .finally(() => {
        saveBtn.disabled = false;
      });
  });

  must<HTMLButtonElement>('#new-post').addEventListener('click', () => navigate('/admin/blog?post=new'));
  must<HTMLButtonElement>('#back-to-posts').addEventListener('click', () => navigate('/admin/blog'));
  must<HTMLButtonElement>('#delete-post').addEventListener('click', () => {
    if (!originalSlug) return;
    void removePost(originalSlug, field(form, 'title') || 'this post');
  });
  must<HTMLButtonElement>('#use-cover').addEventListener('click', () => {
    writeField(form, 'ogImage', field(form, 'coverImage'));
    updatePreview();
  });
  must<HTMLInputElement>('#cover-file').addEventListener('change', () => {
    const input = must<HTMLInputElement>('#cover-file');
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (file.size > 2_500_000) {
      setStatus('#editor-status', 'Choose an image under 2.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('error', () => setStatus('#editor-status', 'Could not read that image.'));
    reader.addEventListener('load', () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      setStatus('#editor-status', 'Uploading…');
      void api<{ url: string }>('/api/blog-media', { method: 'POST', body: JSON.stringify({ dataUrl }) })
        .then((data) => {
          writeField(form, 'coverImage', data.url);
          if (!field(form, 'ogImage')) writeField(form, 'ogImage', data.url);
          updatePreview();
          setStatus('#editor-status', 'Cover image uploaded. Save the post to keep it.');
        })
        .catch((err: unknown) => {
          setStatus('#editor-status', err instanceof Error ? err.message : 'Could not upload the image.');
        });
    });
    reader.readAsDataURL(file);
  });
  must<HTMLImageElement>('#cover-preview').addEventListener('error', () => {
    must<HTMLImageElement>('#cover-preview').hidden = true;
  });

  logout.addEventListener('click', () => {
    if (!confirmLeave()) return;
    void api('/api/admin/logout', { method: 'POST' })
      .catch(() => undefined)
      .finally(() => {
        show('login');
        setStatus('#login-status', '');
        loginForm.reset();
      });
  });

  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const password = field(loginForm, 'password');
    setStatus('#login-status', 'Checking…');
    void api<Session>('/api/admin/session')
      .then(() => api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }))
      .then(() => renderRoute())
      .catch((err: unknown) => {
        setStatus('#login-status', err instanceof Error ? err.message : 'Could not sign in.');
      });
  });

  document.addEventListener('keydown', (event) => {
    if (view !== 'editor') return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (!isDirty()) return;
    event.preventDefault();
  });

  window.addEventListener('popstate', () => {
    void renderRoute();
  });

  void api<Session>('/api/admin/session')
    .then((session) => {
      const hint = must<HTMLElement>('#login-hint');
      if (session.setup) hint.textContent = session.setup;
      else if (session.usingDefaultPassword && session.devPassword) {
        hint.textContent = `This dev server is using the password ${session.devPassword}. Set ADMIN_PASSWORD in .env to replace it.`;
      }
      if (!session.ok) {
        show('login');
        const password = loginForm.elements.namedItem('password');
        if (password instanceof HTMLInputElement) password.focus();
        return;
      }
      return renderRoute();
    })
    .catch((err: unknown) => {
      show('login');
      setStatus('#login-status', err instanceof Error ? err.message : 'Could not open the desk.');
    })
    .finally(() => {
      boot.hidden = true;
    });
}
