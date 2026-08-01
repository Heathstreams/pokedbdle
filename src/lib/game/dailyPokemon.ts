import { Pokemon } from '@/types/pokemon';
import { getIdRangesForGenerations } from '@/lib/utils/generations';
import { query } from '@/lib/db/connectionManager';

// Days before a Pokémon can be the daily pick again
const NO_REPEAT_DAYS = 30;

const ALL_GENERATIONS = Array.from({ length: 9 }, (_, i) => i + 1);

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * SQL condition matching only ids inside the given generations.
 * Ranges come from the static GENERATION_RANGES table and are plain
 * integers, so inlining them is safe.
 */
function idRangeCondition(generations: number[], column = 'id'): string {
  return getIdRangesForGenerations(generations)
    .map(r => `(${column} BETWEEN ${r.start} AND ${r.end})`)
    .join(' OR ');
}

/** Shift a YYYY-MM-DD date string by a number of days. */
export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

/** Deterministic 0–1 fraction for a date + generation combination. */
function pickFraction(dateStr: string, generations: number[]): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateSeed = y * 10000 + m * 100 + d;
  const genHash = generations.reduce((acc, gen) => acc + gen, 0);
  return seededRandom(dateSeed + genHash);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPokemonRow(row: any): Pokemon {
  return {
    id: row.id,
    name: row.name,
    generation: row.generation,
    types: row.types || [],
    color: row.color,
    evolution_stage: row.evolution_stage,
    height: row.height,
    weight: row.weight,
    base_stat_total: row.base_stat_total,
    highest_stats: row.highest_stats || [],
    highest_stat_value: row.highest_stat_value || 0,
    abilities: row.abilities || [],
    egg_groups: row.egg_groups || [],
    habitat: '',
    sprite_default: row.sprite_default,
    sprite_official: row.sprite_official,
    sprite_shiny: row.sprite_shiny
  };
}

export interface DailyResolution {
  target: Pokemon | null;
  yesterday: Pokemon | null;
  /** The global pick for the date, or null if no row exists yet. */
  globalTodayId: number | null;
  /** True when the target is the global pick rather than a generation-specific one. */
  isGlobalDaily: boolean;
}

/**
 * Resolve today's target, yesterday's Pokémon, and their full game data in a
 * single database round trip.
 *
 * The target is the global daily pick when it falls inside the selected
 * generations, and otherwise a deterministic per-generation pick: the same
 * date and generation set always resolve to the same Pokémon, so this needs
 * no stored state and can be recomputed on any instance.
 */
export async function resolveDaily(
  dateStr: string,
  generations: number[]
): Promise<DailyResolution> {
  const poolRanges = idRangeCondition(generations);
  const entryRanges = idRangeCondition(generations, 'pokemon_id');
  const yesterdayStr = shiftDate(dateStr, -1);
  const pastDateStr = shiftDate(dateStr, -NO_REPEAT_DAYS);
  const fraction = pickFraction(dateStr, generations);

  const rows = await query(
    `WITH today_entry AS (
      SELECT pokemon_id FROM daily_pokemon WHERE date = $1
    ),
    yesterday_entry AS (
      SELECT pokemon_id FROM daily_pokemon WHERE date = $2
    ),
    -- Candidates in the selected generations that haven't been used recently
    eligible AS (
      SELECT id FROM pokemon
      WHERE (${poolRanges})
        AND id NOT IN (SELECT pokemon_id FROM daily_pokemon WHERE date > $3)
    ),
    -- If every candidate was recently used, fall back to the whole range
    pool_src AS (
      SELECT id FROM eligible
      UNION ALL
      SELECT id FROM pokemon
      WHERE (${poolRanges}) AND NOT EXISTS (SELECT 1 FROM eligible)
    ),
    pool AS (
      SELECT id,
             ROW_NUMBER() OVER (ORDER BY id) AS rn,
             COUNT(*) OVER () AS total
      FROM pool_src
    ),
    target AS (
      SELECT COALESCE(
        -- Prefer the global pick, but only if it's in the selected generations
        (SELECT pokemon_id FROM today_entry WHERE (${entryRanges})),
        -- Otherwise pick deterministically from the pool
        (SELECT id FROM pool WHERE rn = LEAST(1 + FLOOR($4::float8 * total), total))
      ) AS id
    ),
    wanted AS (
      SELECT id FROM target WHERE id IS NOT NULL
      UNION
      SELECT pokemon_id FROM yesterday_entry
    ),
    max_stats AS (
      SELECT pokemon_id, MAX(base_value) as max_value
      FROM pokemon_stats
      WHERE pokemon_id IN (SELECT id FROM wanted)
      GROUP BY pokemon_id
    ),
    highest_stats AS (
      SELECT
        ps.pokemon_id,
        array_agg(ps.stat_name ORDER BY ps.stat_name) as highest_stats,
        MAX(ps.base_value) as highest_stat_value
      FROM pokemon_stats ps
      JOIN max_stats ms ON ps.pokemon_id = ms.pokemon_id
      WHERE ps.base_value = ms.max_value
      GROUP BY ps.pokemon_id
    )
    SELECT
      p.id,
      p.name,
      p.generation,
      p.color,
      p.evolution_stage,
      p.height,
      p.weight,
      p.base_stat_total,
      p.sprite_default,
      p.sprite_official,
      p.sprite_shiny,
      array_agg(DISTINCT pt.type_name) as types,
      array_agg(DISTINCT pa.ability_name) as abilities,
      array_agg(DISTINCT peg.egg_group_name) as egg_groups,
      COALESCE(hs.highest_stats, ARRAY[]::text[]) as highest_stats,
      COALESCE(hs.highest_stat_value, 0) as highest_stat_value,
      (SELECT id FROM target) as target_id,
      (SELECT pokemon_id FROM yesterday_entry) as yesterday_id,
      (SELECT pokemon_id FROM today_entry) as global_today_id
    FROM pokemon p
    LEFT JOIN pokemon_types pt ON p.id = pt.pokemon_id
    LEFT JOIN pokemon_abilities pa ON p.id = pa.pokemon_id
    LEFT JOIN pokemon_egg_groups peg ON p.id = peg.pokemon_id
    LEFT JOIN highest_stats hs ON p.id = hs.pokemon_id
    WHERE p.id IN (SELECT id FROM wanted)
    GROUP BY p.id, hs.highest_stats, hs.highest_stat_value`,
    [dateStr, yesterdayStr, pastDateStr, fraction]
  );

  // Match by id rather than position: target and yesterday can be the same
  // Pokémon, in which case the UNION collapses them into a single row.
  const targetId = rows[0]?.target_id ?? null;
  const yesterdayId = rows[0]?.yesterday_id ?? null;
  const globalTodayId = rows[0]?.global_today_id ?? null;

  const targetRow = rows.find(r => r.id === targetId) ?? null;
  const yesterdayRow = rows.find(r => r.id === yesterdayId) ?? null;

  return {
    target: targetRow ? mapPokemonRow(targetRow) : null,
    yesterday: yesterdayRow ? mapPokemonRow(yesterdayRow) : null,
    globalTodayId,
    isGlobalDaily: targetId != null && targetId === globalTodayId
  };
}

/**
 * Insert the global daily pick for a date and return its pokemon id.
 * Excludes recent picks in-query, falling back to the full range if the
 * pool is exhausted. Safe to call concurrently: a duplicate insert loses
 * the race harmlessly and the existing row is returned.
 */
export async function createGlobalDaily(dateStr: string): Promise<number | null> {
  const ranges = idRangeCondition(ALL_GENERATIONS);
  const pastDateStr = shiftDate(dateStr, -NO_REPEAT_DAYS);

  const [row] = await query<{ pokemon_id: number }>(
    `WITH eligible AS (
      SELECT id FROM pokemon
      WHERE (${ranges})
        AND id NOT IN (
          SELECT pokemon_id FROM daily_pokemon WHERE date > $2 AND date < $1
        )
    ),
    pool AS (
      SELECT id FROM eligible
      UNION ALL
      SELECT id FROM pokemon
      WHERE (${ranges}) AND NOT EXISTS (SELECT 1 FROM eligible)
    )
    INSERT INTO daily_pokemon (date, pokemon_id)
    SELECT $1, id FROM pool ORDER BY RANDOM() LIMIT 1
    ON CONFLICT (date) DO UPDATE SET pokemon_id = daily_pokemon.pokemon_id
    RETURNING pokemon_id`,
    [dateStr, pastDateStr]
  );

  return row?.pokemon_id ?? null;
}
