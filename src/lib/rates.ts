import {
  fetchPublicSpot,
  metalFromInrPerGram,
  type Rates,
} from './rates-core';

export type { MetalQuote, Rates } from './rates-core';
export { fetchPublicSpot, GOLD_18K, GOLD_22K, TROY_OZ_GRAMS } from './rates-core';

const FALLBACK: Rates = {
  gold: metalFromInrPerGram(13420),
  silver: metalFromInrPerGram(205, false),
  platinum: metalFromInrPerGram(5570, false),
  inrPerUsd: 96,
  fetchedAt: new Date().toISOString(),
  source: 'fallback',
  indicative: true,
};

async function fetchMetalsDev(apiKey: string): Promise<Rates> {
  const url = `https://api.metals.dev/v1/latest?api_key=${encodeURIComponent(apiKey)}&currency=INR&unit=g`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`metals.dev ${res.status}`);
  const data = await res.json();
  const m = data?.metals ?? data;
  const gold = Number(m.ibja_gold ?? m.gold);
  const silver = Number(m.mcx_silver ?? m.silver);
  const platinum = Number(m.platinum);
  if (![gold, silver, platinum].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error('metals.dev parse failed');
  }
  return {
    gold: metalFromInrPerGram(gold, true),
    silver: metalFromInrPerGram(silver, false),
    platinum: metalFromInrPerGram(platinum, false),
    inrPerUsd: Number(data?.currencies?.USD) ? 1 / Number(data.currencies.USD) : 0,
    fetchedAt: new Date().toISOString(),
    source: 'metals.dev',
    indicative: true,
  };
}

let memo: { rates: Rates; at: number } | null = null;

/** Build-time / server only. Do not import this module from client scripts. */
export async function getRates(): Promise<Rates> {
  if (memo && Date.now() - memo.at < 60_000) return memo.rates;
  try {
    const key = import.meta.env.METALS_DEV_API_KEY;
    const rates = key ? await fetchMetalsDev(key).catch(() => fetchPublicSpot()) : await fetchPublicSpot();
    memo = { rates, at: Date.now() };
    return rates;
  } catch (err) {
    console.warn('Rate fetch failed, using fallback', err);
    return FALLBACK;
  }
}
