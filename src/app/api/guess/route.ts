import { NextResponse } from 'next/server';
import { dbConnectionManager } from '@/lib/db/connectionManager';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return NextResponse.json({ error: 'Name parameter is required' }, { status: 400 });
  }

  try {
    const query = `
      WITH highest_stats AS (
        SELECT 
          pokemon_id,
          array_agg(stat_name ORDER BY stat_name) as highest_stats
        FROM pokemon_stats 
        WHERE is_highest = true
        GROUP BY pokemon_id
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
        p.sprite_official,
        p.sprite_default,
        array_agg(DISTINCT pt.type_name) as types,
        array_agg(DISTINCT pa.ability_name) as abilities,
        array_agg(DISTINCT peg.egg_group_name) as egg_groups,
        COALESCE(hs.highest_stats, ARRAY[]::text[]) as highest_stats
      FROM pokemon p
      LEFT JOIN pokemon_types pt ON p.id = pt.pokemon_id
      LEFT JOIN pokemon_abilities pa ON p.id = pa.pokemon_id
      LEFT JOIN pokemon_egg_groups peg ON p.id = peg.pokemon_id
      LEFT JOIN highest_stats hs ON p.id = hs.pokemon_id
      WHERE LOWER(p.name) = LOWER($1)
      GROUP BY p.id, hs.highest_stats
    `;

    const pokemon = await dbConnectionManager.query(query, [name]);

    if (!pokemon.length) {
      return NextResponse.json({ error: 'Pokemon not found' }, { status: 404 });
    }


    return NextResponse.json(pokemon[0]);
  } catch (error) {
    console.error('Error getting pokemon:', error);
    return NextResponse.json({ error: 'Failed to get pokemon' }, { status: 500 });
  }
}