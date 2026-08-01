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
    
    
    // First, get the Pokémon name for redaction
    const nameQuery = `
      SELECT name
      FROM pokemon
      WHERE id = $1
    `;
    
    const [nameResult] = await dbConnectionManager.query(nameQuery, [pokemonId]);
    
    if (!nameResult) {
      return NextResponse.json({ 
        flavor_text: "No description available", 
        pokemon_name: "" 
      }, { status: 200 });
    }
    
    const pokemon_name = nameResult.name;
    
    // Query the database for a random flavor text
    const flavorTextQuery = `
      SELECT flavor_text
      FROM pokemon_flavor_text
      WHERE pokemon_id = $1 AND language_code = 'en'
      ORDER BY RANDOM()
      LIMIT 1
    `;
    
    const [flavorTextResult] = await dbConnectionManager.query(flavorTextQuery, [pokemonId]);
    
    if (!flavorTextResult) {
      return NextResponse.json({ 
        flavor_text: "No description available for this Pokémon.", 
        pokemon_name: pokemon_name 
      }, { status: 200 });
    }
    
    return NextResponse.json({ 
      flavor_text: flavorTextResult.flavor_text,
      pokemon_name: pokemon_name
    });
    
  } catch (error) {
    console.error('Error getting Pokémon flavor text:', error);
    return NextResponse.json({ 
      error: 'Failed to get Pokémon flavor text',
      flavor_text: "Unable to load description at this time.",
      pokemon_name: ""
    }, { status: 500 });
  }
}