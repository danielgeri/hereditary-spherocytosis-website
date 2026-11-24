import React from 'react';
import { ReadingDepth } from '../data/hsContent';

interface HeaderProps {
  depth: ReadingDepth;
  onDepthChange: (depth: ReadingDepth) => void;
}

export const Header: React.FC<HeaderProps> = ({ depth, onDepthChange }) => {
  return (
    <header className="top-bar">
      <div className="top-bar__inner">
        <a href="#explorer" className="brand">
          <span className="brand__dot" aria-hidden="true" />
          <span className="brand__name">HS Atlas</span>
          <span className="brand__tag">3D Erythrocyte</span>
        </a>

        <nav className="top-nav" aria-label="Primary sections">
          <a href="#explorer">3D Cell</a>
          <a href="#mechanism">Mechanism</a>
          <a href="#genetics">Five Genes</a>
          <a href="#diagnosis">Diagnosis</a>
          <a href="#care">Living With HS</a>
        </nav>

        <div className="depth-toggle" role="group" aria-label="Reading depth">
          <button
            type="button"
            className={`depth-toggle__btn ${depth === 'plain' ? 'is-active' : ''}`}
            aria-pressed={depth === 'plain'}
            onClick={() => onDepthChange('plain')}
          >
            Plain Language
          </button>
          <button
            type="button"
            className={`depth-toggle__btn ${depth === 'clinical' ? 'is-active' : ''}`}
            aria-pressed={depth === 'clinical'}
            onClick={() => onDepthChange('clinical')}
          >
            Clinical
          </button>
        </div>
      </div>
    </header>
  );
};
