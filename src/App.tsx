import { useCallback, useEffect, useState } from 'react';
import { CellSandbox } from './components/CellSandbox';
import { EditorialSections } from './components/EditorialSections';
import { Header } from './components/Header';
import { GENES, GeneId, ReadingDepth } from './data/hsContent';

export function App() {
  const [depth, setDepth] = useState<ReadingDepth>('plain');
  const [dive, setDive] = useState<number>(0.0);
  const [selectedGene, setSelectedGene] = useState<GeneId>('healthy');
  const [severity, setSeverity] = useState<number>(0.0);

  // Scroll-state header fallback for browsers without CSS container-type: scroll-state
  useEffect(() => {
    if (typeof CSS !== 'undefined' && CSS.supports('container-type', 'scroll-state')) {
      return;
    }
    const bar = document.querySelector('.top-bar') as HTMLElement | null;
    if (!bar) return;
    let lastY = window.scrollY;
    const onScroll = () => {
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      const y = Math.max(0, Math.min(window.scrollY, maxY));
      if (y === lastY) return;
      bar.classList.toggle('is-hidden', y > lastY && y > bar.offsetHeight + 24);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleGeneChange = useCallback((gene: GeneId, syncSeverity = true) => {
    setSelectedGene(gene);
    if (syncSeverity) {
      const profile = GENES.find((g) => g.id === gene);
      if (profile) {
        setSeverity(profile.defaultSphericity);
      }
    }
  }, []);

  const handleJumpToCell = useCallback(
    (opts: { dive: number; gene?: GeneId; severity?: number }) => {
      setDive(opts.dive);
      if (opts.gene) {
        setSelectedGene(opts.gene);
        if (opts.severity === undefined) {
          const profile = GENES.find((g) => g.id === opts.gene);
          if (profile) setSeverity(profile.defaultSphericity);
        }
      }
      if (opts.severity !== undefined) {
        setSeverity(opts.severity);
      }
      document.getElementById('explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    []
  );

  return (
    <div className="app-shell">
      <Header depth={depth} onDepthChange={setDepth} />
      <main>
        <CellSandbox
          depth={depth}
          dive={dive}
          onDiveChange={setDive}
          selectedGene={selectedGene}
          onGeneChange={handleGeneChange}
          severity={severity}
          onSeverityChange={setSeverity}
        />
        <EditorialSections depth={depth} onJumpToCell={handleJumpToCell} />
      </main>
    </div>
  );
}

export default App;
