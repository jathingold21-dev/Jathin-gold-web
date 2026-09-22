export const ROBOTS_OPTIONS = ['index, follow', 'noindex, follow', 'noindex, nofollow'] as const;
export type RobotsOption = (typeof ROBOTS_OPTIONS)[number];

export const POST_STATUSES = ['draft', 'published'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const LIMITS = {
  title: 140,
  description: 320,
  excerpt: 320,
  seoTitle: 120,
  author: 80,
  slug: 80,
  keywords: 300,
  focusKeyphrase: 80,
  canonical: 400,
  image: 400,
  coverAlt: 180,
  body: 80_000,
} as const;

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  body: string;
  pubDate: string;
  updatedDate: string;
  author: string;
  status: PostStatus;
  seoTitle: string;
  canonical: string;
  robots: RobotsOption;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  keywords: string;
  focusKeyphrase: string;
  coverImage: string;
  coverAlt: string;
};

export function isRobots(value: string): value is RobotsOption {
  return (ROBOTS_OPTIONS as readonly string[]).includes(value);
}

export function isStatus(value: string): value is PostStatus {
  return (POST_STATUSES as readonly string[]).includes(value);
}

export function isSlug(value: string): boolean {
  return value.length > 0 && value.length <= LIMITS.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LIMITS.slug)
    .replace(/-+$/g, '');
}
