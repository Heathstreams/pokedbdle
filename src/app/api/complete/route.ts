import { NextRequest, NextResponse } from 'next/server';
import { dbConnectionManager } from '@/lib/db/connectionManager';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'A date parameter (YYYY-MM-DD) is required' }, { status: 400 });
    }

    const { completed, won } = await request.json();

    await dbConnectionManager.query(
      'UPDATE daily_pokemon SET is_completed = $1, won = $2 WHERE date = $3',
      [completed, won, date]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating completion status:', error);
    return NextResponse.json({ error: 'Failed to update completion status' }, { status: 500 });
  }
}
