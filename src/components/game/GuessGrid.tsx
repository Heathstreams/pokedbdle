'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Pokemon } from '@/types/pokemon';
import { compareGuess } from '@/lib/game/compareGuess';
import './GuessGrid.css';

function formatGeneration(gen: string): string {
  const generationMap: { [key: string]: string } = {
    'generation-i': 'Gen 1',
    'generation-ii': 'Gen 2',
    'generation-iii': 'Gen 3',
    'generation-iv': 'Gen 4',
    'generation-v': 'Gen 5',
    'generation-vi': 'Gen 6',
    'generation-vii': 'Gen 7',
    'generation-viii': 'Gen 8',
    'generation-ix': 'Gen 9'
  };
  return generationMap[gen] || gen;
}

function formatColor(color: string): string {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

function formatEggGroup(group: string): string {
  return group
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface GuessGridProps {
  guesses: Pokemon[];
  target: Pokemon;
}

/**
 * What each column compares, and what earns a yellow "close" cell.
 * The numeric tolerances mirror the thresholds used below — keep them
 * in step if those ever change.
 */
const COLUMNS: { label: string; tip: string }[] = [
  { label: 'Pokemon', tip: 'Your guess, newest at the top' },
  { label: 'Type', tip: 'Green: both types match · Yellow: one type matches' },
  { label: 'Generation', tip: 'Green: same generation · no close match' },
  { label: 'Color', tip: 'Green: same Pokédex color · no close match' },
  { label: 'Evolution', tip: 'Green: same evolution stage · no close match' },
  { label: 'Height', tip: 'Green: exact · Yellow: within 0.3 m · Arrow points to the answer' },
  { label: 'Weight', tip: 'Green: exact · Yellow: within 10 kg · Arrow points to the answer' },
  { label: 'BST', tip: 'Green: exact · Yellow: within 50 · Arrow points to the answer' },
  { label: 'Egg Groups', tip: 'Green: all groups match · Yellow: at least one matches' },
  { label: 'Ability', tip: 'Green: all abilities match · Yellow: at least one matches' }
];

const GuessGrid: React.FC<GuessGridProps> = ({ guesses, target }) => {
  // Newest guess renders at the top
  const displayGuesses = useMemo(() => [...guesses].reverse(), [guesses]);

  const dailyShinyId = useMemo(() => {
    const date = new Date();
    const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

    // Use the seed to generate a number between 1 and 1025
    const baseNumber = ((seed * 9301 + 49297) % 233280) % 1025 + 1;

    // If it happens to be the same as target.id, add 1 (or wrap back to 1)
    if (baseNumber === target.id) {
      return baseNumber === 1025 ? 1 : baseNumber + 1;
    }

    return baseNumber;
  }, [target.id]);

  return (
    <div className="guesses-container">
      <div className="column-headers">
        {COLUMNS.map(({ label, tip }) => (
          <div
            key={label}
            className="header-cell"
            data-tip={tip}
            tabIndex={0}
            role="note"
            aria-label={`${label}. ${tip}`}
          >
            {label}
          </div>
        ))}
      </div>

      {displayGuesses.map((guess, index) => {
        const comparisonResults = compareGuess(guess, target);

        return (
          <div key={`guess-${displayGuesses.length - index}`} className="grid-container">
            <div className="pokemon-sprite">
              <div className="guess-counter">{displayGuesses.length - index}</div>
              <Image
                src={guess?.id === dailyShinyId ? (guess?.sprite_shiny || guess?.sprite_default) : guess?.sprite_default}
                alt={guess?.name || 'Unknown Pokemon'}
                width={100}
                height={100}
                unoptimized={true}
              />
            </div>

            <div className={`stat-card type-card ${comparisonResults.types.isCorrect ? 'correct' :
                comparisonResults.types.isPartiallyCorrect ? 'partial' : 'incorrect'
              }`}>
              <div className="type-icons">
                {(guess?.types || []).map((type: string) => (
                  <Image
                    key={type}
                    src={`/icons/${type.charAt(0).toUpperCase() + type.slice(1)}.png`}
                    alt={type}
                    className="type-icon"
                    width={70}
                    height={17}
                    unoptimized={true}
                  />
                ))}
              </div>
            </div>

            <div className={`stat-card ${comparisonResults.generation.isCorrect ? 'correct' : 'incorrect'}`}>
              {formatGeneration(guess?.generation || '-')}
            </div>

            <div className={`stat-card ${comparisonResults.color.isCorrect ? 'correct' : 'incorrect'}`}>
              {formatColor(guess?.color || '-')}
            </div>

            <div className={`stat-card ${comparisonResults.evolution.isCorrect ? 'correct' : 'incorrect'}`}>
              {guess?.evolution_stage ? guess.evolution_stage.replace('stage', 'Stage ') : '-'}
            </div>

            <div className={`stat-card ${
              comparisonResults.height.isCorrect ? 'correct' : 
              Math.abs(guess?.height - target.height) <= 3 ? 'partial' : 'incorrect'
            }`}>
              {guess?.height ? `${(guess.height / 10).toFixed(1)}m` : '-'}
              {comparisonResults.height.hint && <span className="hint">{comparisonResults.height.hint}</span>}
            </div>

            <div className={`stat-card ${
              comparisonResults.weight.isCorrect ? 'correct' : 
              Math.abs(guess?.weight - target.weight) <= 100 ? 'partial' : 'incorrect'
            }`}>
              {guess?.weight ? `${(guess.weight / 10).toFixed(1)}kg` : '-'}
              {comparisonResults.weight.hint && <span className="hint">{comparisonResults.weight.hint}</span>}
            </div>

            <div className={`stat-card ${
              comparisonResults.bst.isCorrect ? 'correct' : 
              Math.abs(guess?.base_stat_total - target.base_stat_total) <= 50 ? 'partial' : 'incorrect'
            }`}>
              {guess?.base_stat_total || '-'}
              {comparisonResults.bst.hint && <span className="hint">{comparisonResults.bst.hint}</span>}
            </div>

            <div className={`stat-card ${comparisonResults.eggGroups?.isCorrect ? 'correct' :
              comparisonResults.eggGroups?.isPartiallyCorrect ? 'partial' : 'incorrect'
            }`}>
              <div className="egg-groups-container">
                {(guess?.egg_groups || [])
                  .map((eggGroup: string, index: number) => (
                    <span key={`egg-group-${eggGroup}-${index}`} className="egg-group-item">
                      {formatEggGroup(eggGroup)}
                      {index < (guess?.egg_groups?.length || 0) - 1 && <span className="egg-group-separator"></span>}
                    </span>
                  ))
                }
              </div>
            </div>

            <div className={`stat-card ${comparisonResults.abilities?.isCorrect ? 'correct' :
              comparisonResults.abilities?.isPartiallyCorrect ? 'partial' : 'incorrect'
            }`}>
              <div className="abilities-container">
                {(guess?.abilities || [])
                  .map((ability: string, index: number) => (
                    <span key={`ability-${ability}-${index}`} className="ability-item">
                      {ability
                        .split('-')
                        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                      {index < (guess?.abilities?.length || 0) - 1 && <span className="ability-separator"></span>}
                    </span>
                  ))
                }
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GuessGrid;