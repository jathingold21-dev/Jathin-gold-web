import { company } from '../data/company';

export const TROY_OZ_GRAMS = 31.1034768;
export const GOLD_22K = 0.916;
export const GOLD_18K = 0.75;

export type MetalQuote = {
  perGram: number;
  perGram24k: number;
  perGram22k: number;
  perGram18k: number;
};

export type Rates = {
  gold: MetalQuote;
  silver: MetalQuote;
  platinum: MetalQuote;
  inrPerUsd: number;
  fetchedAt: string;
  source: string;
  indicative: true;
};

export function metalFromInrPerGram(finePerGram: number, applyKarat = true): MetalQuote {
  return {
    perGram: finePerGram,
    perGram24k: finePerGram,
    perGram22k: applyKarat ? finePerGram * GOLD_22K : finePerGram,
    perGram18k: applyKarat ? finePerGram * GOLD_18K : finePerGram,
  };
}

async function getJson(url: string) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

/** Public CORS-friendly spot. Safe in the browser. */
export async function fetchPublicSpot(): Promise<Rates> {
  const [xau, xag, xpt, fx] = await Promise.all([
    getJson('https://api.gold-api.com/price/XAU'),
    getJson('https://api.gold-api.com/price/XAG'),
    getJson('https://api.gold-api.com/price/XPT'),
    getJson('https://open.er-api.com/v6/latest/USD'),
  ]);

  const inr = Number(fx?.rates?.INR);
  if (!inr) throw new Error('FX INR missing');

  const factor = company.indiaLandingFactor;
  const toInrGram = (usdPerOz: number, landing: number) =>
    ((usdPerOz * inr) / TROY_OZ_GRAMS) * landing;

  const goldG = toInrGram(Number(xau.price), factor);
  const silverG = toInrGram(Number(xag.price), 1);
  const platG = toInrGram(Number(xpt.price), 1);

  if (![goldG, silverG, platG].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error('Spot parse failed');
  }

  return {
    gold: metalFromInrPerGram(goldG, true),
    silver: metalFromInrPerGram(silverG, false),
    platinum: metalFromInrPerGram(platG, false),
    inrPerUsd: inr,
    fetchedAt: new Date().toISOString(),
    source: 'spot',
    indicative: true,
  };
}
