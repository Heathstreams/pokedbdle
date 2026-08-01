import { NextRequest, NextResponse } from 'next/server';
import { Pokemon } from '@/types/pokemon';
import { createGlobalDaily, resolveDaily } from '@/lib/game/dailyPokemon';

interface DailyPayload {
  pokemon: Pokemon;
  yesterdayPokemon: Pokemon | null;
  isGlobalDaily: boolean;
}

// The daily pick is deterministic per (date, generations), so warm instances
// can answer repeat requests — e.g. toggling generations back and forth —
// without touching the database at all.
const memoryCache = new Map<string, { expires: number; payload: DailyPayload }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function pruneCache() {
  if (memoryCache.size < 500) return;
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expires <= now) memoryCache.delete(key);
  }
}

const RESPONSE_HEADERS = {
  'Cache-Control': 'public, max-age=300, s-maxage=600'
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientDate = searchParams.get('date');
    const generations = searchParams.get('generations')
      ?.split(',')
      .map(Number)
      .filter(n => Number.isInteger(n) && n >= 1 && n <= 9)
      ?? Array.from({ length: 9 }, (_, i) => i + 1);

    if (!clientDate || !/^\d{4}-\d{2}-\d{2}$/.test(clientDate)) {
      return NextResponse.json({ error: 'A date parameter (YYYY-MM-DD) is required' }, { status: 400 });
    }
    if (generations.length === 0) {
      return NextResponse.json({ error: 'At least one valid generation is required' }, { status: 400 });
    }

    const cacheKey = `${clientDate}|${[...generations].sort((a, b) => a - b).join(',')}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.payload, { headers: RESPONSE_HEADERS });
    }

    // Warm path: one round trip resolves the target, yesterday, and full data.
    let resolution = await resolveDaily(clientDate, generations);

    // Cold path, once per day: no global pick exists yet, so create it and
    // re-resolve so the global pick stays authoritative for everyone.
    if (resolution.globalTodayId === null) {
      await createGlobalDaily(clientDate);
      resolution = await resolveDaily(clientDate, generations);
    }

    if (!resolution.target) {
      throw new Error(`Could not resolve a daily Pokémon for ${clientDate} / gens ${generations}`);
    }

    const payload: DailyPayload = {
      pokemon: resolution.target,
      yesterdayPokemon: resolution.yesterday,
      isGlobalDaily: resolution.isGlobalDaily
    };

    pruneCache();
    memoryCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, payload });

    return NextResponse.json(payload, { headers: RESPONSE_HEADERS });
  } catch (error) {
    console.error('Error getting daily pokemon:', error);
    return NextResponse.json({ error: 'Failed to get daily pokemon' }, { status: 500 });
  }
}
