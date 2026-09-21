// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { company } from './src/data/company.ts';

export default defineConfig({
  site: company.site,
  trailingSlash: 'never',
  integrations: [sitemap()],
});
