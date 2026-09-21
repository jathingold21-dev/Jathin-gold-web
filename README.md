# Jathin Gold

Static Astro site for a gold / silver / platinum **buyer** (no jewellery sales). Live indicative rates, branch pages, and SEO guides.

## Configure before launch

1. Edit `src/data/company.ts` — name, phone, WhatsApp, email, domain, hours.
2. Edit `src/data/branches.ts` — real addresses, maps links, lat/lng.
3. Copy `.env.example` to `.env` if you have a [metals.dev](https://metals.dev) key (Indian IBJA/MCX) or a [Web3Forms](https://web3forms.com) key.
4. Set `site` in `src/data/company.ts` to the production URL (also used by the sitemap).

Rates fall back to international spot × USDINR × `indiaLandingFactor` when no metals.dev key is set. Tune that factor against a real branch quote.

## Commands

```sh
npm install
npm run dev
npm run build
npm run preview
```

Deploy the `dist/` folder to Cloudflare Pages or Netlify.
