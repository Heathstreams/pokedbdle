import { NextResponse } from 'next/server';
import { dbConnectionManager } from '@/lib/db/connectionManager';
import { createGlobalDaily } from '@/lib/game/dailyPokemon';

export async function GET() {
  try {
    // Health check, and pre-generate tomorrow's pick so the first
    // visitor after midnight doesn't have to
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const [row] = await dbConnectionManager.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM daily_pokemon WHERE date = $1) as exists',
      [tomorrowStr]
    );

    if (!row?.exists) {
      await createGlobalDaily(tomorrowStr);
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      tomorrowReady: true
    });
  } catch (error) {
    console.error('Ping failed:', error);
    return NextResponse.json({
      status: 'error',
      message: String(error)
    }, { status: 500 });
  }
}
