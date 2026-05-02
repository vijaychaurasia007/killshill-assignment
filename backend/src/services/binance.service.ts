import axios from 'axios';

const BINANCE_BASE = 'https://api.binance.com/api/v3';
const CACHE_TTL_MS = 5_000;

interface CacheEntry {
  price: number;
  fetchedAt: number;
}

const priceCache = new Map<string, CacheEntry>();

function getCached(symbol: string): number | null {
  const entry = priceCache.get(symbol);
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) return entry.price;
  return null;
}

function setCache(symbol: string, price: number): void {
  priceCache.set(symbol, { price, fetchedAt: Date.now() });
}

export async function getLivePrice(symbol: string): Promise<number | null> {
  const upper = symbol.toUpperCase();
  const cached = getCached(upper);
  if (cached !== null) return cached;

  try {
    const { data } = await axios.get(`${BINANCE_BASE}/ticker/price`, {
      params: { symbol: upper },
      timeout: 5_000,
    });
    const price = parseFloat(data.price);
    setCache(upper, price);
    return price;
  } catch {
    // Return stale cache over null if available
    const stale = priceCache.get(upper);
    return stale ? stale.price : null;
  }
}

export async function getMultiplePrices(
  symbols: string[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const toFetch: string[] = [];

  for (const sym of unique) {
    const cached = getCached(sym);
    if (cached !== null) result.set(sym, cached);
    else toFetch.push(sym);
  }

  if (toFetch.length === 0) return result;

  try {
    // Fetch all tickers in one call — efficient
    const { data } = await axios.get<Array<{ symbol: string; price: string }>>(
      `${BINANCE_BASE}/ticker/price`,
      { timeout: 8_000 }
    );
    const tickerMap = new Map(data.map((t) => [t.symbol, parseFloat(t.price)]));

    for (const sym of toFetch) {
      const price = tickerMap.get(sym);
      if (price !== undefined) {
        setCache(sym, price);
        result.set(sym, price);
      }
    }
  } catch {
    // Fall back: fetch individually
    await Promise.allSettled(
      toFetch.map(async (sym) => {
        const price = await getLivePrice(sym);
        if (price !== null) result.set(sym, price);
      })
    );
  }

  return result;
}
