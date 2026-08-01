'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Pokemon } from '@/types/pokemon';
import './PokemonSearch.css';

interface PokemonSearchProps {
  onSelect: (pokemon: Pokemon) => void;
  disabled?: boolean;
  guessedPokemon?: Pokemon[]; // Array of already guessed Pokémon
  selectedGenerations: number[]; // Add this prop
}

export function PokemonSearch({ onSelect, disabled = false, guessedPokemon = [], selectedGenerations }: PokemonSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Pokemon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0); // Default to first item
  const [lastSuccessfulUpdate, setLastSuccessfulUpdate] = useState(Date.now());
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Store guessedPokemon IDs in a ref to avoid dependency issues
  const guessedPokemonIdsRef = useRef(new Set<number>());
  
  // Update the ref when guessedPokemon changes
  useEffect(() => {
    guessedPokemonIdsRef.current = new Set(guessedPokemon.map(p => p.id));
  }, [guessedPokemon]);

  // Check for stale connections
  useEffect(() => {
    const checkConnection = () => {
      const now = Date.now();
      // If it's been more than 5 minutes since the last successful search
      if (now - lastSuccessfulUpdate > 5 * 60 * 1000) {
        // Force a refresh of the connection
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        setLastSuccessfulUpdate(now);
      }
    };
    
    const interval = setInterval(checkConnection, 60 * 1000); // Check every minute
    return () => clearInterval(interval);
  }, [lastSuccessfulUpdate]);

  useEffect(() => {
    // Reset suggestion refs array when suggestions change
    suggestionRefs.current = suggestions.map(() => null);
    
    // Automatically select the first suggestion when suggestions change
    if (suggestions.length > 0) {
      setSelectedIndex(0);
      // Update last successful update timestamp when we get valid suggestions
      setLastSuccessfulUpdate(Date.now());
    } else {
      setSelectedIndex(-1);
    }
  }, [suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Memoize filter function to avoid recreating it on each render
  const filterGuessedPokemon = useCallback((pokemonList: Pokemon[]) => {
    return pokemonList.filter(pokemon => !guessedPokemonIdsRef.current.has(pokemon.id));
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchPokemon = async () => {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();
      
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&generations=${selectedGenerations.join(',')}`,
          { signal: abortControllerRef.current.signal }
        );
        
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        const filteredData = filterGuessedPokemon(data);
        
        setSuggestions(filteredData);
        setShowSuggestions(filteredData.length > 0);
        setLastSuccessfulUpdate(Date.now());
      } catch (error) {
        // Only log if it's not an abort error
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Search error:', error);
        }
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
        // Clear the abort controller reference if it's the current one
        if (abortControllerRef.current && abortControllerRef.current.signal.aborted) {
          abortControllerRef.current = null;
        }
      }
    };

    const debounce = setTimeout(fetchPokemon, 300);
    return () => {
      clearTimeout(debounce);
      // Abort the fetch if component unmounts or query changes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [query, filterGuessedPokemon, selectedGenerations]); // Added selectedGenerations dependency

  const handleSelect = (pokemon: Pokemon) => {
    onSelect(pokemon);
    // Clear state after selection
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // Focus the input element for the next search
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    // Arrow down
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prevIndex => {
        const nextIndex = prevIndex < suggestions.length - 1 ? prevIndex + 1 : 0;
        scrollToSuggestion(nextIndex);
        return nextIndex;
      });
    }
    
    // Arrow up
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prevIndex => {
        const nextIndex = prevIndex > 0 ? prevIndex - 1 : suggestions.length - 1;
        scrollToSuggestion(nextIndex);
        return nextIndex;
      });
    }
    
    // Enter key
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex]);
      }
    }
    
    // Escape key
    else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const scrollToSuggestion = (index: number) => {
    const suggestionEl = suggestionRefs.current[index];
    if (suggestionEl) {
      suggestionEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  };

  // Fixed ref callback that returns void
  const setSuggestionRef = (index: number) => (el: HTMLDivElement | null) => {
    suggestionRefs.current[index] = el;
  };

  return (
    <div ref={searchContainerRef} className={`search-container ${isLoading ? 'is-loading' : ''}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleQueryChange}
        onFocus={() => {
          if (query.length >= 2 && suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Enter Pokémon name..."
        className="search-input"
        aria-expanded={showSuggestions}
        aria-controls="suggestions-listbox"
        aria-autocomplete="list"
        role="combobox"
      />

      {isLoading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div 
          className="suggestions-list"
          role="listbox"
          id="suggestions-listbox"
        >
          {suggestions.map((pokemon, index) => (
            <div
              ref={setSuggestionRef(index)}
              key={`${pokemon.id}-${pokemon.name}`}
              onClick={() => handleSelect(pokemon)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
              role="option"
              aria-selected={selectedIndex === index}
              tabIndex={-1}
            >
              <Image
                src={pokemon.sprite_default}
                alt={pokemon.name}
                className="pokemon-suggestion-sprite"
                width={40}
                height={40}
                unoptimized={true}
              />
              <span className="pokemon-suggestion-name">{pokemon.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}