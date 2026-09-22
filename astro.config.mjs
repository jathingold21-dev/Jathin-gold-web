// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { company } from './src/data/company.ts';
import { blogAdminPlugin } from './src/server/blog-admin-plugin.ts';
import { excludedBlogPaths } from './src/server/blog-store.ts';

const hiddenBlog = new Set(excludedBlogPaths());

export default defineConfig({
  site: company.site,
  trailingSlash: 'never',
  redirects: {
    '/admin': '/admin/blog',
  },
  integrations: [
    sitemap({
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
  vite: {
    plugins: [blogAdminPlugin()],
  },
});
