import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { dbConnectionManager } from '@/lib/db/connectionManager';

export async function GET(request: NextRequest) {
  try {
    // Get Pokémon ID from query parameters
    const { searchParams } = new URL(request.url);
    const pokemonId = searchParams.get('id');
    
    if (!pokemonId) {
      return NextResponse.json({ error: 'Pokémon ID is required' }, { status: 400 });
    }
    
    
    // Query the database for the genus
    const query = `
      SELECT genus
      FROM pokemon_genera
      WHERE pokemon_id = $1 AND language_code = 'en'
      LIMIT 1
    `;
    
    const [result] = await dbConnectionManager.query(query, [pokemonId]);
    
    if (!result) {
      return NextResponse.json({ genus: "Unknown Pokémon" }, { status: 200 });
    }
    
    return NextResponse.json({ genus: result.genus });
    
  } catch (error) {
    console.error('Error getting Pokémon genus:', error);
    return NextResponse.json({ error: 'Failed to get Pokémon genus' }, { status: 500 });
  }
}