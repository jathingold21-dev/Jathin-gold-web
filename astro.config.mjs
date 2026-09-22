// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { company } from './src/data/company.ts';
import { excludedBlogPaths, listPosts } from './src/server/blog-store.ts';

const hiddenBlog = new Set(excludedBlogPaths());
const blogPages = [
  new URL('/blog', company.site).href,
  ...listPosts()
    .filter((post) => post.status === 'published' && !post.robots.startsWith('noindex'))
    .map((post) => new URL(`/blog/${post.slug}`, company.site).href),
];

export default defineConfig({
  site: company.site,
  output: 'static',
  adapter: vercel(),
  trailingSlash: 'never',
  redirects: {
    '/admin': '/admin/blog',
  },
  integrations: [
    sitemap({
      customPages: blogPages,
      filter: (page) => {
        let path = page;
        try {
          path = new URL(page).pathname;
        } catch {
          return true;
        }
        if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
        if (path === '/admin' || path.startsWith('/admin/')) return false;
        return !hiddenBlog.has(path);
      },
    }),
  ],
});
