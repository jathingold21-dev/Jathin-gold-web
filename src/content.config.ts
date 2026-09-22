import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().default(''),
    excerpt: z.string().default(''),
    pubDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    updatedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    author: z.string().default('Jathin Gold'),
    status: z.enum(['draft', 'published']).default('draft'),
    seoTitle: z.string().default(''),
    canonical: z.string().default(''),
    robots: z.enum(['index, follow', 'noindex, follow', 'noindex, nofollow']).default('index, follow'),
    ogTitle: z.string().default(''),
    ogDescription: z.string().default(''),
    ogImage: z.string().default(''),
    keywords: z.string().default(''),
    focusKeyphrase: z.string().default(''),
    coverImage: z.string().default(''),
    coverAlt: z.string().default(''),
  }),
});

export const collections = { guides, blog };
