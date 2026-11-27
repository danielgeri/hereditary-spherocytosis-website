import React from 'react';
import { ReadingDepth } from '../data/hsContent';

interface HeaderProps {
  depth: ReadingDepth;
  onDepthChange: (depth: ReadingDepth) => void;
  onNavigate: (path: string, hash?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ depth, onDepthChange, onNavigate }) => {
  const handleNav = (e: React.MouseEvent<HTMLAnchorElement>, path: string, hash?: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(path, hash);
  };

  return (
    <header className="top-bar">
      <div className="top-bar__inner">
        <a href="/" className="brand" onClick={(e) => handleNav(e, '/', '#explorer')}>
          <span className="brand__dot" aria-hidden="true" />
          <span className="brand__name">HS Atlas</span>
          <span className="brand__tag">3D Erythrocyte</span>
        </a>

        <nav className="top-nav" aria-label="Primary sections">
          <a href="/#explorer" onClick={(e) => handleNav(e, '/', '#explorer')}>
            3D Cell
          </a>
          <a href="/#mechanism" onClick={(e) => handleNav(e, '/', '#mechanism')}>
            Mechanism
          </a>
          <a href="/#genetics" onClick={(e) => handleNav(e, '/', '#genetics')}>
            Five Genes
          </a>
          <a href="/#diagnosis" onClick={(e) => handleNav(e, '/', '#diagnosis')}>
            Diagnosis
          </a>
          <a href="/#care" onClick={(e) => handleNav(e, '/', '#care')}>
            Living With HS
          </a>
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
            Clinical Language
          </button>
        </div>
      </div>
    </header>
  );
};
