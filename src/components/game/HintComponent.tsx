'use client';

import React, { useState, useEffect } from 'react';
import './HintComponent.css';

interface HintComponentProps {
  guessCount: number;
  targetPokemonId: number | null;
  gameState: 'playing' | 'won' | 'lost';
}

const HintComponent: React.FC<HintComponentProps> = ({
  guessCount,
  targetPokemonId,
  gameState
}) => {
  const [genus, setGenus] = useState<string | null>(null);
  const [flavorText, setFlavorText] = useState<string | null>(null);
  const [isHint1Open, setIsHint1Open] = useState(false);
  const [isHint2Open, setIsHint2Open] = useState(false);
  const [isHint1Unlocked, setIsHint1Unlocked] = useState(false);
  const [isHint2Unlocked, setIsHint2Unlocked] = useState(false);
  const [isLoadingHint1, setIsLoadingHint1] = useState(false);
  const [isLoadingHint2, setIsLoadingHint2] = useState(false);
  const [hint1Error, setHint1Error] = useState<string | null>(null);
  const [hint2Error, setHint2Error] = useState<string | null>(null);
  
  // Guesses required before each hint unlocks
  const HINT1_THRESHOLD = 10;
  const HINT2_THRESHOLD = 15;

  const remainingForHint1 = Math.max(0, HINT1_THRESHOLD - guessCount);
  const remainingForHint2 = Math.max(0, HINT2_THRESHOLD - guessCount);

  useEffect(() => {
    if (gameState === 'playing') {
      if (guessCount >= HINT1_THRESHOLD) {
        setIsHint1Unlocked(true);
      }
      if (guessCount >= HINT2_THRESHOLD) {
        setIsHint2Unlocked(true);
      }
    }
  }, [guessCount, gameState]);
  
  // Function to fetch genus hint
  const fetchGenus = async () => {
    if (!targetPokemonId) return;
    
    setIsLoadingHint1(true);
    setHint1Error(null);
    
    try {
      const response = await fetch(`/api/hint1?id=${targetPokemonId}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch genus: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.genus) {
        setGenus(data.genus);
      } else {
        setHint1Error("No category information available");
      }
    } catch (error) {
      console.error("Error fetching genus hint:", error);
      setHint1Error("Failed to load hint");
    } finally {
      setIsLoadingHint1(false);
    }
  };
  
  // Function to fetch flavor text hint
  const fetchFlavorText = async () => {
    if (!targetPokemonId) return;
    
    setIsLoadingHint2(true);
    setHint2Error(null);
    
    try {
      const response = await fetch(`/api/hint2?id=${targetPokemonId}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch flavor text: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Redact the Pokémon name from flavor text if present
      if (data.pokemon_name && data.flavor_text) {
        const redactedText = data.flavor_text.replace(
          new RegExp(data.pokemon_name, 'gi'), 
          '???'
        );
        setFlavorText(redactedText);
      } else if (data.flavor_text) {
        setFlavorText(data.flavor_text);
      } else {
        setHint2Error("No description information available");
      }
    } catch (error) {
      console.error("Error fetching flavor text hint:", error);
      setHint2Error("Failed to load hint");
    } finally {
      setIsLoadingHint2(false);
    }
  };
  
  // Show Hint 1 (Genus)
  const handleShowHint1 = () => {
    if (!isHint1Unlocked) return;
    
    // Fetch genus if not already loaded
    if ((!genus && !isLoadingHint1) || hint1Error) {
      fetchGenus();
    }
    
    setIsHint1Open(prev => !prev); // Toggle hint 1
    setIsHint2Open(false); // Close hint 2 if open
  };
  
  // Show Hint 2 (Flavor Text)
  const handleShowHint2 = () => {
    if (!isHint2Unlocked) return;
    
    // Fetch flavor text if not already loaded
    if ((!flavorText && !isLoadingHint2) || hint2Error) {
      fetchFlavorText();
    }
    
    setIsHint2Open(prev => !prev); // Toggle hint 2
    setIsHint1Open(false); // Close hint 1 if open
  };
  
  // Close Hint 1
  const closeHint1 = () => {
    setIsHint1Open(false);
  };
  
  // Close Hint 2
  const closeHint2 = () => {
    setIsHint2Open(false);
  };
  
  // Reset hints when targetPokemonId changes
  useEffect(() => {
    if (targetPokemonId) {
      // Reset hints for new target
      setGenus(null);
      setFlavorText(null);
      setHint1Error(null);
      setHint2Error(null);
      
      // Close any open hints
      setIsHint1Open(false);
      setIsHint2Open(false);
    }
  }, [targetPokemonId]);
  
  // Prepare counter displays
  const hint1Counter = !isHint1Unlocked ? remainingForHint1 : null;
  const hint2Counter = !isHint2Unlocked ? remainingForHint2 : null;
  
  // Prepare button titles
  const hint1Title = !isHint1Unlocked 
    ? `${remainingForHint1} more guesses to unlock Pokémon category hint` 
    : isHint1Open ? "Hide Pokémon category hint" : "Show Pokémon category hint";
  
  const hint2Title = !isHint2Unlocked 
    ? `${remainingForHint2} more guesses to unlock Pokémon description hint` 
    : isHint2Open ? "Hide Pokémon description hint" : "Show Pokémon description hint";
  
  // Render hint content
  const renderHint1Content = () => {
    if (isLoadingHint1) return "Loading hint...";
    if (hint1Error) return hint1Error;
    return genus || "No category information available";
  };
  
  const renderHint2Content = () => {
    if (isLoadingHint2) return "Loading hint...";
    if (hint2Error) return hint2Error;
    return flavorText || "No description information available";
  };
  
  return (
    <>
      {/* Hint Buttons */}
      <button 
        className={`icon-btn hint-button ${isHint1Unlocked ? 'unlocked' : ''} ${isHint1Open ? 'active' : ''}`}
        onClick={handleShowHint1}
        disabled={!isHint1Unlocked || gameState !== 'playing'}
        title={hint1Title}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        {hint1Counter !== null && (
          <span className="hint-counter">{hint1Counter}</span>
        )}
      </button>
      
      <button 
        className={`icon-btn hint-button ${isHint2Unlocked ? 'unlocked' : ''} ${isHint2Open ? 'active' : ''}`}
        onClick={handleShowHint2}
        disabled={!isHint2Unlocked || gameState !== 'playing'}
        title={hint2Title}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
        {hint2Counter !== null && (
          <span className="hint-counter">{hint2Counter}</span>
        )}
      </button>
      
      {/* Hint 1 Message in the hint row */}
      {isHint1Open && (
        <div className="hint-message-container">
          <div className="hint-message">
            <button 
              className="hint-message-close-btn" 
              onClick={closeHint1}
              title="Close"
            >
              x
            </button>
            <div className="hint-message-content">
              <div className="hint-message-title">
                Hint 1: Category
              </div>
              <div className="hint-message-text">
                {renderHint1Content()}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hint 2 Message in the hint row */}
      {isHint2Open && (
        <div className="hint-message-container">
          <div className="hint-message">
            <button 
              className="hint-message-close-btn" 
              onClick={closeHint2}
              title="Close"
            >
              x
            </button>
            <div className="hint-message-content">
              <div className="hint-message-title">
                Hint 2: Description
              </div>
              <div className="hint-message-text">
                {renderHint2Content()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HintComponent;