import React, { useEffect, useState } from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  const [colorMode, setColorMode] = useState('default');

  useEffect(() => {
    // Load saved preference on mount
    const savedMode = localStorage.getItem('pokedle-color-mode') || 'default';
    setColorMode(savedMode);
    document.documentElement.setAttribute('data-color-mode', savedMode);
  }, []);

  const handleColorModeChange = (mode: string) => {
    setColorMode(mode);
    localStorage.setItem('pokedle-color-mode', mode);
    document.documentElement.setAttribute('data-color-mode', mode);
  };

  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-section privacy-section">
          <h3>Privacy Information</h3>
          <p>
            Pokédle uses browser storage to remember your game progress, streak, and preferences.
            No personal data is collected or shared with third parties.
          </p>
          <p>
            Your game state is stored locally on your device to let you continue where you left off
            and to track your daily streak.
          </p>
        </div>
        
        <div className="footer-section disclaimer-section">
          <h3>Disclaimer</h3>
          <p>
            Pokédle is a fan project and is not affiliated with, endorsed, sponsored, or approved by 
            Nintendo, The Pokémon Company, or Game Freak.
          </p>
          <p>
            All Pokémon content and images are property of their respective owners.
          </p>
          <p>
            Pokémon data sourced from <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer">PokéAPI</a>.
          </p>
        </div>
        
        <div className="footer-section credits-section">
          <h3>About</h3>
          <p>
            Reach out: <a href="mailto:contact@pokedle.day">contact@pokedle.day</a>
          </p>
          <div className="tech-stack">
            <ul>
              <li>Next.js 15</li>
              <li>TypeScript</li>
              <li>Neon.tech PostgreSQL</li>
              <li>React</li>
            </ul>
          </div>
        </div>

        <div className="footer-section accessibility-section">
          <h3>Accessibility</h3>
          <p>
            Choose a color mode for improved accessibility:
          </p>
          <div className="color-mode-options">
            <button 
              className={`color-mode-btn ${colorMode === 'default' ? 'active' : ''}`}
              onClick={() => handleColorModeChange('default')}
              aria-label="Standard color mode"
            >
              <span className="mode-swatch default-swatch">
                <span className="swatch-correct"></span>
                <span className="swatch-partial"></span>
                <span className="swatch-incorrect"></span>
              </span>
              <span className="mode-name">Standard</span>
            </button>
            
            <button 
              className={`color-mode-btn ${colorMode === 'dyschromatopsia' ? 'active' : ''}`}
              onClick={() => handleColorModeChange('dyschromatopsia')}
              aria-label="Dyschromatopsia (Red-Green blindness) friendly mode"
            >
              <span className="mode-swatch dyschromatopsia-swatch">
                <span className="swatch-correct"></span>
                <span className="swatch-partial"></span>
                <span className="swatch-incorrect"></span>
              </span>
              <span className="mode-name">Dyschroma</span>
            </button>
            
            <button 
              className={`color-mode-btn ${colorMode === 'alternate' ? 'active' : ''}`}
              onClick={() => handleColorModeChange('alternate')}
              aria-label="Alternate color scheme"
            >
              <span className="mode-swatch alternate-swatch">
                <span className="swatch-correct"></span>
                <span className="swatch-partial"></span>
                <span className="swatch-incorrect"></span>
              </span>
              <span className="mode-name">Alternate</span>
            </button>
            
            <button 
              className={`color-mode-btn ${colorMode === 'monochrome' ? 'active' : ''}`}
              onClick={() => handleColorModeChange('monochrome')}
              aria-label="Monochrome (grayscale) mode"
            >
              <span className="mode-swatch monochrome-swatch">
                <span className="swatch-correct"></span>
                <span className="swatch-partial"></span>
                <span className="swatch-incorrect"></span>
              </span>
              <span className="mode-name">Monochrome</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;