// src/lib/game/storage.ts
import { GameState } from '@/types/game';

const GAME_STATE_KEY = 'pokedle-game-state';
const LAST_PLAYED_KEY = 'pokedle-last-played';
const GENERATIONS_KEY = 'pokedle-generations';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Local function definition
function isNewDay(lastPlayedDate?: string | null): boolean {
  if (!lastPlayedDate) return true;

  const today = new Date();
  const lastPlayed = new Date(lastPlayedDate);

  return (
    today.getFullYear() !== lastPlayed.getFullYear() ||
    today.getMonth() !== lastPlayed.getMonth() ||
    today.getDate() !== lastPlayed.getDate()
  );
}

export function saveGameState(gameState: GameState) {
  if (!isBrowser) return;
  
  try {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState));
    localStorage.setItem(LAST_PLAYED_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Error saving game state:', error);
  }
}

export function loadGameState(): GameState | null {
  if (!isBrowser) return null;
  
  try {
    const lastPlayedDate = localStorage.getItem(LAST_PLAYED_KEY);
    if (isNewDay(lastPlayedDate)) {
      localStorage.removeItem(GAME_STATE_KEY);
      return null;
    }

    const savedState = localStorage.getItem(GAME_STATE_KEY);
    return savedState ? JSON.parse(savedState) : null;
  } catch (error) {
    console.error('Error loading game state:', error);
    return null;
  }
}

export function clearGameState() {
  if (!isBrowser) return;
  
  try {
    localStorage.removeItem(GAME_STATE_KEY);
    localStorage.removeItem(LAST_PLAYED_KEY);
  } catch (error) {
    console.error('Error clearing game state:', error);
  }
}

// Generation selection functions
export function getSelectedGenerations(): number[] {
  if (!isBrowser) {
    // Default to all generations when running on server
    return Array.from({ length: 9 }, (_, i) => i + 1);
  }
  
  try {
    const saved = localStorage.getItem(GENERATIONS_KEY);
    return saved ? JSON.parse(saved) : Array.from({ length: 9 }, (_, i) => i + 1);
  } catch (error) {
    console.error('Error loading selected generations:', error);
    return Array.from({ length: 9 }, (_, i) => i + 1);
  }
}

export function saveSelectedGenerations(generations: number[]): void {
  if (!isBrowser) return;
  
  try {
    // Ensure at least one generation is selected
    const validGens = generations.length > 0 ? 
      generations : 
      Array.from({ length: 9 }, (_, i) => i + 1);
      
    localStorage.setItem(GENERATIONS_KEY, JSON.stringify(validGens));
  } catch (error) {
    console.error('Error saving selected generations:', error);
  }
}

// Add function to check if generations have changed from last game
export function haveGenerationsChanged(currentGenerations: number[]): boolean {
  if (!isBrowser) return false;
  
  try {
    const lastGameState = loadGameState();
    if (!lastGameState) return false;
    
    const savedGenerationsJSON = localStorage.getItem('pokedle-last-generations');
    if (!savedGenerationsJSON) return false;
    
    const savedGenerations = JSON.parse(savedGenerationsJSON);
    
    // Check if arrays have the same elements (order doesn't matter)
    if (savedGenerations.length !== currentGenerations.length) return true;
    
    const sortedSaved = [...savedGenerations].sort();
    const sortedCurrent = [...currentGenerations].sort();
    
    return !sortedSaved.every((gen, i) => gen === sortedCurrent[i]);
  } catch (error) {
    console.error('Error checking generation changes:', error);
    return false;
  }
}

// Save the generations used for the current game
export function saveGameGenerations(generations: number[]): void {
  if (!isBrowser) return;
  
  try {
    localStorage.setItem('pokedle-last-generations', JSON.stringify(generations));
  } catch (error) {
    console.error('Error saving game generations:', error);
  }
}
/* ------------------------------------------------------------------
   Streaks

   A streak is "days won in a row", so it needs the date of the last
   win, not just a counter. Without one, a counter can only ever go up:
   win Monday, skip Tuesday and Wednesday, win Thursday, and you'd carry
   on from where you left off instead of starting over.
   ------------------------------------------------------------------ */

const STREAK_KEY = 'pokedle-streak';
const LAST_WIN_KEY = 'pokedle-last-win-date';
// Pre-dates LAST_WIN_KEY; read once so existing streaks survive the change
const LEGACY_STREAK_DATE_KEY = 'pokedle-last-streak-date';

/** YYYY-MM-DD in the player's own timezone. */
export function localDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole days from `from` to `to`, both YYYY-MM-DD, in local time. */
function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return NaN;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** The stored last-win date, migrating the older key if needed. */
function getLastWinDate(): string | null {
  const stored = localStorage.getItem(LAST_WIN_KEY);
  if (stored) return stored;

  // Migrate from the legacy toDateString() format, e.g. "Fri Aug 01 2026"
  const legacy = localStorage.getItem(LEGACY_STREAK_DATE_KEY);
  if (legacy) {
    const parsed = new Date(legacy);
    if (!isNaN(parsed.getTime())) {
      const migrated = localDateString(parsed);
      localStorage.setItem(LAST_WIN_KEY, migrated);
      return migrated;
    }
  }
  return null;
}

/**
 * The streak as it stands right now. A stored streak is only still alive
 * if the last win was today or yesterday — otherwise a day was missed and
 * it's over, even though the old number is still in storage.
 */
export function getLiveStreak(): number {
  if (!isBrowser) return 0;

  try {
    const stored = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);
    if (!stored || stored < 0) return 0;

    const lastWin = getLastWinDate();
    if (!lastWin) return 0;

    const gap = daysBetween(lastWin, localDateString());
    return !isNaN(gap) && gap >= 0 && gap <= 1 ? stored : 0;
  } catch (error) {
    console.error('Error reading streak:', error);
    return 0;
  }
}

/** Record a win for today and return the resulting streak. */
export function recordWin(): number {
  if (!isBrowser) return 0;

  try {
    const today = localDateString();
    const lastWin = getLastWinDate();

    // Already counted today — replaying or switching generations after a
    // win must not inflate the streak
    if (lastWin === today) {
      return parseInt(localStorage.getItem(STREAK_KEY) || '0', 10) || 1;
    }

    const stored = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10) || 0;
    const continues = lastWin !== null && daysBetween(lastWin, today) === 1;
    const next = continues ? stored + 1 : 1;

    localStorage.setItem(STREAK_KEY, String(next));
    localStorage.setItem(LAST_WIN_KEY, today);
    return next;
  } catch (error) {
    console.error('Error recording win:', error);
    return 0;
  }
}

/** Clear the streak after a loss. */
export function recordLoss(): void {
  if (!isBrowser) return;

  try {
    localStorage.setItem(STREAK_KEY, '0');
    localStorage.removeItem(LAST_WIN_KEY);
    localStorage.removeItem(LEGACY_STREAK_DATE_KEY);
  } catch (error) {
    console.error('Error recording loss:', error);
  }
}
