import React from 'react';
import Modal from '../ui/Modal';
import './Modal.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How to play"
    >
      <section className="modal-section intro-section">
        <div className="intro-flex">
          <div className="intro-text">
            <h3 className="section-title gradient-title">Guess the daily Pokémon</h3>
            <p className="intro-description">
              There&apos;s a hidden Pokémon every day. Each guess shows how it compares
              to the answer across nine categories, so you can narrow it down guess by guess.
            </p>
          </div>
          <div className="pokeball-icon">
            <div className="pokeball-inner"></div>
          </div>
        </div>
      </section>

      <section className="modal-section game-flow-section">
        <h3 className="section-title">The basics</h3>
        <div className="game-steps">
          <div className="game-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Guess a Pokémon</h4>
              <p>Type a name in the search bar and pick one from the list.</p>
            </div>
          </div>
          <div className="game-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Read the colors</h4>
              <p>Green is a match, yellow is close, gray is wrong.</p>
            </div>
          </div>
          <div className="game-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Narrow it down</h4>
              <p>Use what you&apos;ve learned to rule Pokémon out and guess again.</p>
            </div>
          </div>
          <div className="game-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Come back tomorrow</h4>
              <p>A new Pokémon appears at midnight. Win daily to build a streak.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="modal-section categories-section">
        <h3 className="section-title">The categories</h3>
        <div className="categories-grid">
          <div className="category-card">
            <h4 className="category-name">Type</h4>
            <p className="category-description">Fire, Water, Grass and so on. Yellow means one of two types matches.</p>
          </div>
          <div className="category-card">
            <h4 className="category-name">Generation</h4>
            <p className="category-description">Which game generation the Pokémon first appeared in (Gen 1–9).</p>
          </div>
          <div className="category-card">
            <h4 className="category-name">Color</h4>
            <p className="category-description">The official Pokédex color — not always the color you&apos;d expect from the artwork.</p>
          </div>
          <div className="category-card">
            <h4 className="category-name">Evolution</h4>
            <p className="category-description">Where it sits in its evolution line: basic, Stage 1, or Stage 2.</p>
          </div>
          <div className="category-card">
            <h4 className="category-name">Height &amp; Weight</h4>
            <p className="category-description">Arrows show whether the answer is taller/heavier (↑) or shorter/lighter (↓).</p>
          </div>
          <div className="category-card">
            <h4 className="category-name">BST</h4>
            <p className="category-description">Base stat total — the sum of all six base stats. Legendaries tend to sit around 600+.</p>
          </div>
          <div className="category-card">
            <h4 className="category-name">Egg Groups</h4>
            <p className="category-description">Breeding groups. Handy for ruling out whole families.</p>
          </div>
          <div className="category-card">
            <h4 className="category-name">Abilities</h4>
            <p className="category-description">Yellow means at least one ability is shared with the answer.</p>
          </div>
        </div>
      </section>

      <section className="modal-section indicators-section">
        <h3 className="section-title">What the colors mean</h3>
        <div className="indicators-flex">
          <div className="indicators-column">
            <div className="indicator-item">
              <span className="indicator correct"></span>
              <div className="indicator-content">
                <h4>Match</h4>
                <p>This category is exactly right.</p>
              </div>
            </div>
            <div className="indicator-item">
              <span className="indicator partial"></span>
              <div className="indicator-content">
                <h4>Close</h4>
                <p>
                  Partly right. For Type, Egg Groups and Abilities that means at least
                  one entry matches. For the numbers it means you&apos;re within
                  0.3&nbsp;m on Height, 10&nbsp;kg on Weight, or 50 on BST.
                </p>
                <p className="indicator-note">
                  Generation, Color and Evolution have no close state — they&apos;re
                  either right or wrong.
                </p>
              </div>
            </div>
            <div className="indicator-item">
              <span className="indicator incorrect"></span>
              <div className="indicator-content">
                <h4>No match</h4>
                <p>This category is wrong.</p>
              </div>
            </div>
          </div>
          <div className="indicators-column">
            <div className="direction-indicator">
              <div className="direction-symbol">↑</div>
              <p>The answer&apos;s value is <strong>higher</strong> than your guess</p>
            </div>
            <div className="direction-indicator">
              <div className="direction-symbol">↓</div>
              <p>The answer&apos;s value is <strong>lower</strong> than your guess</p>
            </div>
          </div>
        </div>
      </section>

      <section className="modal-section features-section">
        <h3 className="section-title">Extras</h3>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon gen-icon"></div>
            <div className="feature-content">
              <h4>Generation filter</h4>
              <p>Only know the classics? Limit the game to the generations you pick with the buttons in the header.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon random-icon"></div>
            <div className="feature-content">
              <h4>Random guess</h4>
              <p>The dice button makes a random guess for you — useful as an opener. You get five per day.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon hint-icon"></div>
            <div className="feature-content">
              <h4>Hints</h4>
              <p>Stuck? After 10 guesses you can reveal the Pokémon&apos;s category, and after 15 its Pokédex entry.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="feature-icon shiny-icon"></div>
            <div className="feature-content">
              <h4>Daily shiny</h4>
              <p>One Pokémon each day shows up shiny in the guess grid. Keep an eye out.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="modal-section pro-tips">
        <h3 className="section-title">Tips</h3>
        <ul className="enhanced-bullet-list">
          <li>
            <span className="bullet-highlight">Open strong: </span>
            a Pokémon with two types, two egg groups and a middling BST rules out a lot in one go.
          </li>
          <li>
            <span className="bullet-highlight">Use the evolution stage: </span>
            once you know it, entire evolution lines drop out of the running.
          </li>
          <li>
            <span className="bullet-highlight">Watch the BST: </span>
            550+ usually means legendary or pseudo-legendary territory.
          </li>
          <li>
            <span className="bullet-highlight">Mind the streak: </span>
            the puzzle resets at midnight local time — win each day to keep it going.
          </li>
        </ul>
      </section>
    </Modal>
  );
}

export default HelpModal;
