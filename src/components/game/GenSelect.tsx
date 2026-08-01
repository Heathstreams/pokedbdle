'use client';

import React from 'react';
import './GenSelect.css';

const ALL_GENERATIONS = Array.from({ length: 9 }, (_, i) => i + 1);

interface GenSelectProps {
  onGenerationsChange: (gens: number[]) => void;
  selectedGenerations: number[];
  disabled?: boolean;
}

/**
 * Controlled generation picker. The parent owns the selection and its
 * persistence — keeping state here too is what used to let the buttons and
 * the board drift out of sync.
 */
const GenSelect: React.FC<GenSelectProps> = ({
  onGenerationsChange,
  selectedGenerations,
  disabled = false
}) => {
  const toggleGeneration = (gen: number) => {
    if (disabled) return;

    const next = selectedGenerations.includes(gen)
      ? selectedGenerations.filter(g => g !== gen)
      : [...selectedGenerations, gen].sort((a, b) => a - b);

    // Always leave at least one generation selected
    if (next.length === 0) return;

    onGenerationsChange(next);
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onGenerationsChange(ALL_GENERATIONS);
  };

  const allSelected = selectedGenerations.length === ALL_GENERATIONS.length;
  const disabledSuffix = disabled ? ' (disabled once the game is finished)' : '';

  return (
    <div className={`gen-select ${disabled ? 'disabled' : ''}`}>
      <div className="generation-label">Generation</div>
      <div className="gen-grid">
        {ALL_GENERATIONS.map(gen => (
          <button
            key={gen}
            className={`gen-button ${selectedGenerations.includes(gen) ? 'selected' : ''}`}
            onClick={() => toggleGeneration(gen)}
            title={`Generation ${gen}${disabledSuffix}`}
            aria-pressed={selectedGenerations.includes(gen)}
            disabled={disabled}
          >
            {gen}
          </button>
        ))}
        <button
          className={`gen-button all ${allSelected ? 'selected' : ''}`}
          onClick={handleSelectAll}
          title={`All generations${disabledSuffix}`}
          aria-pressed={allSelected}
          disabled={disabled}
        >
          All
        </button>
      </div>
    </div>
  );
};

export default GenSelect;
