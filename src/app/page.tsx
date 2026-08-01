'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import GameHeader from '@/components/game/GameHeader';
import GuessGrid from '@/components/game/GuessGrid';
import { Pokemon } from '@/types/pokemon';
import {
  getSelectedGenerations,
  saveSelectedGenerations,
  saveGameGenerations,
  getLiveStreak,
  recordWin,
  recordLoss
} from '@/lib/game/storage';
import Footer from '@/components/ui/Footer';

const ALL_GENERATIONS = Array.from({ length: 9 }, (_, i) => i + 1);

// YYYY-MM-DD in the user's local timezone (toISOString would give UTC)
function getLocalDateString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sameGenerations(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((gen, i) => gen === sortedB[i]);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with a couple of retries. The API is hosted on a free tier that
 * cold-starts, so the first request after an idle period can fail or time
 * out even though the service is healthy.
 */
async function fetchWithRetry(url: string, signal: AbortSignal, attempts = 3): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, { signal });
      // Retry server errors, but treat 4xx as final — retrying won't help
      if (response.ok || response.status < 500) return response;
      lastError = new Error(`Server responded ${response.status}`);
    } catch (error) {
      if (signal.aborted) throw error;
      lastError = error;
    }

    if (attempt < attempts - 1) {
      await sleep(400 * Math.pow(3, attempt));
      if (signal.aborted) break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Request failed');
}

function HomePage() {
  const [guesses, setGuesses] = useState<Pokemon[]>([]);
  const [targetPokemon, setTargetPokemon] = useState<Pokemon | null>(null);
  const [yesterdaysPokemon, setYesterdaysPokemon] = useState<Pokemon | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGenerations, setSelectedGenerations] = useState<number[]>(ALL_GENERATIONS);

  const streakUpdatedRef = useRef(false);
  const generationsChangeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resetInProgressRef = useRef(false);
  const activeGenerationsRef = useRef<number[]>([]);
  const dateCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Guards against a slow response from an earlier generation set landing
  // after a newer one and overwriting the board with stale data.
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Load the saved generation selection and fetch today's Pokémon once on mount
  useEffect(() => {
    const generations = getSelectedGenerations();
    setSelectedGenerations(generations);
    activeGenerationsRef.current = generations;
    fetchDailyPokemon(generations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload for a fresh puzzle when the local date rolls over
  useEffect(() => {
    localStorage.setItem('pokedle-current-date', new Date().toDateString());

    dateCheckIntervalRef.current = setInterval(() => {
      const currentDate = new Date().toDateString();
      const savedDate = localStorage.getItem('pokedle-current-date');

      if (savedDate && currentDate !== savedDate) {
        localStorage.setItem('pokedle-current-date', currentDate);
        localStorage.removeItem('pokedle-game-state');
        window.location.reload();
      }
    }, 60000);

    return () => {
      if (dateCheckIntervalRef.current) {
        clearInterval(dateCheckIntervalRef.current);
        dateCheckIntervalRef.current = null;
      }
    };
  }, []);

  const fetchDailyPokemon = useCallback(async (generations?: number[], forceRefresh = false) => {
    // Supersede any in-flight request; only the newest one may apply results
    const requestId = ++requestIdRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const isCurrent = () => requestId === requestIdRef.current;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const localDate = getLocalDateString();
      const gens = generations || selectedGenerations || activeGenerationsRef.current;
      activeGenerationsRef.current = gens;

      const params = new URLSearchParams({
        date: localDate,
        generations: gens.join(',')
      });

      // Restore a saved game from earlier today if the generations still match
      let savedState: {
        date?: string;
        guesses?: Pokemon[];
        streak?: number;
        gameState?: 'playing' | 'won' | 'lost';
        generations?: number[];
      } | null = null;
      if (!forceRefresh) {
        try {
          const raw = localStorage.getItem('pokedle-game-state');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.date === new Date().toDateString() && sameGenerations(parsed.generations || [], gens)) {
              savedState = parsed;
            }
          }
        } catch {
          // Corrupt saved state — ignore and start fresh
        }
      }

      const response = await fetchWithRetry(`/api/daily?${params}`, controller.signal);
      if (!response.ok) {
        throw new Error('Failed to fetch daily pokemon');
      }

      const data = await response.json();
      if (!data.pokemon) {
        throw new Error('No pokemon data received');
      }

      // A newer generation selection has been made since this request started
      if (!isCurrent()) return;

      setYesterdaysPokemon(data.yesterdayPokemon || null);
      setTargetPokemon(data.pokemon);

      // Always derive the streak from storage rather than the saved game
      // blob, so there's only one source of truth for it
      setStreak(getLiveStreak());

      if (savedState) {
        setGuesses(savedState.guesses || []);
        if (savedState.gameState && savedState.gameState !== 'playing') {
          setGameState(savedState.gameState);
          streakUpdatedRef.current = true;
        }
      } else {
        saveGameGenerations(gens);
        setGuesses([]);
        setGameState('playing');
        streakUpdatedRef.current = false;
      }
    } catch (error) {
      // Aborted and superseded requests are expected, not failures
      if (controller.signal.aborted || !isCurrent()) return;
      console.error('Error fetching target pokemon:', error);
      setErrorMessage("Couldn't reach the server. It may be waking up — try again.");
    } finally {
      if (isCurrent()) {
        setIsLoading(false);
        resetInProgressRef.current = false;
      }
    }
  }, [selectedGenerations]);

  // Persist the game state whenever it changes
  useEffect(() => {
    if (!targetPokemon || resetInProgressRef.current) return;

    localStorage.setItem('pokedle-game-state', JSON.stringify({
      date: new Date().toDateString(),
      guesses,
      streak,
      gameState,
      targetPokemonId: targetPokemon.id,
      generations: selectedGenerations
    }));
  }, [guesses, gameState, streak, targetPokemon, selectedGenerations]);

  // Update streak and report completion when the game ends
  useEffect(() => {
    if ((gameState !== 'won' && gameState !== 'lost') || streakUpdatedRef.current) return;

    fetch(`/api/complete?date=${getLocalDateString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true, won: gameState === 'won' })
    }).catch(err => console.error('Failed to update completion status:', err));

    // recordWin/recordLoss own the date bookkeeping, including ignoring a
    // second win on a day that already counted
    if (gameState === 'won') {
      setStreak(recordWin());
    } else {
      recordLoss();
      setStreak(0);
    }

    localStorage.setItem('pokedle-last-played', new Date().toDateString());
    streakUpdatedRef.current = true;
  }, [gameState]);

  const handleGuess = useCallback((pokemon: Pokemon) => {
    if (!targetPokemon || gameState !== 'playing') return;
    if (guesses.some(g => g.id === pokemon.id)) return;

    setGuesses(prev => [...prev, pokemon]);
    if (pokemon.id === targetPokemon.id) {
      setGameState('won');
    }
  }, [targetPokemon, guesses, gameState]);

  const handleRandomGuess = useCallback(async () => {
    if (!targetPokemon || gameState !== 'playing' || isLoading) return;

    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      const guessedIds = guesses.map(g => g.id);
      if (guessedIds.length > 0) {
        params.set('exclude', guessedIds.join(','));
      }
      params.set('generations', activeGenerationsRef.current.join(','));
      params.set('t', Date.now().toString());

      const response = await fetch(`/api/random?${params}`);
      if (!response.ok) throw new Error('Failed to fetch random pokemon');

      handleGuess(await response.json());
    } catch (error) {
      console.error('Error making random guess:', error);
    } finally {
      setIsLoading(false);
    }
  }, [targetPokemon, guesses, gameState, handleGuess, isLoading]);

  const handleResetGame = useCallback(() => {
    resetInProgressRef.current = true;
    if (generationsChangeTimerRef.current) {
      clearTimeout(generationsChangeTimerRef.current);
      generationsChangeTimerRef.current = null;
    }
    localStorage.removeItem('pokedle-game-state');
    window.location.reload();
  }, []);

  const handleGenerationsChange = useCallback((generations: number[]) => {
    if (gameState !== 'playing') return;
    if (sameGenerations(generations, activeGenerationsRef.current)) return;

    resetInProgressRef.current = true;
    saveSelectedGenerations(generations);
    setSelectedGenerations(generations);
    activeGenerationsRef.current = [...generations];

    if (generationsChangeTimerRef.current) {
      clearTimeout(generationsChangeTimerRef.current);
    }

    setTargetPokemon(null);
    setIsLoading(true);
    localStorage.removeItem('pokedle-game-state');
    setGuesses([]);
    setGameState('playing');
    streakUpdatedRef.current = false;

    // Debounce so rapid toggling of several generations results in one fetch
    generationsChangeTimerRef.current = setTimeout(() => {
      fetchDailyPokemon(generations, true);
      generationsChangeTimerRef.current = null;
    }, 350);
  }, [fetchDailyPokemon, gameState]);

  useEffect(() => {
    return () => {
      if (generationsChangeTimerRef.current) {
        clearTimeout(generationsChangeTimerRef.current);
      }
      if (dateCheckIntervalRef.current) {
        clearInterval(dateCheckIntervalRef.current);
      }
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div className="main-screen">
      <header className="main-header">
        <h1 className="main-title">Pokédle</h1>
      </header>

      <main className="main-container">
        <GameHeader
          onPokemonSelect={handleGuess}
          onRandomGuess={handleRandomGuess}
          onResetGame={handleResetGame}
          streak={streak}
          guessedPokemon={guesses}
          gameState={gameState}
          yesterdaysPokemon={yesterdaysPokemon || undefined}
          targetPokemon={targetPokemon}
          guessCount={guesses.length}
          disabled={!targetPokemon || gameState !== 'playing' || isLoading}
          onGenerationsChange={handleGenerationsChange}
          selectedGenerations={selectedGenerations}
        />

        {errorMessage && (
          <div className="error-container">
            <div className="error-content">
              <p className="error-message">{errorMessage}</p>
              <button
                onClick={() => fetchDailyPokemon(activeGenerationsRef.current, true)}
                className="retry-button"
                disabled={isLoading}
              >
                {isLoading ? 'Retrying…' : 'Try again'}
              </button>
            </div>
          </div>
        )}

        {targetPokemon ? (
          <div className="game-result-container" key={targetPokemon.id}>
            <GuessGrid guesses={guesses} target={targetPokemon} />
          </div>
        ) : (
          !errorMessage && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          )
        )}
      </main>
      <Footer />
    </div>
  );
}

// Rendered client-side only: the game depends on localStorage and local dates
export default dynamic(() => Promise.resolve(HomePage), {
  ssr: false
});
