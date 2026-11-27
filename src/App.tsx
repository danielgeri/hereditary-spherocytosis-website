import { useCallback, useEffect, useMemo, useState } from 'react';
import { trackEventOnce, trackPageview } from './analytics';
import { CellSandbox } from './components/CellSandbox';
import { EditorialSections } from './components/EditorialSections';
import { Header } from './components/Header';
import { GENES, GeneId, ReadingDepth } from './data/hsContent';
import { getSeoRoute, normalizeRoutePath, SITE_ORIGIN } from './data/seoRoutes';

interface AppProps {
  initialPath?: string;
}

export function App({ initialPath }: AppProps = {}) {
  const startPath = normalizeRoutePath(
    initialPath ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
  );
  const initialRoute = getSeoRoute(startPath);

  const [routePath, setRoutePath] = useState<string>(initialRoute.path);
  const [depth, setDepth] = useState<ReadingDepth>('plain');
  const [dive, setDive] = useState<number>(initialRoute.scenePreset.dive);
  const [selectedGene, setSelectedGene] = useState<GeneId>(initialRoute.scenePreset.gene);
  const [severity, setSeverity] = useState<number>(
    initialRoute.scenePreset.severity ??
      GENES.find((g) => g.id === initialRoute.scenePreset.gene)?.defaultSphericity ??
      0.0
  );

  const activeRoute = useMemo(() => getSeoRoute(routePath), [routePath]);

  // Keep browser history, <title>, and canonical URL synced on back/forward navigation
  useEffect(() => {
    const onPopState = () => {
      const next = getSeoRoute(window.location.pathname);
      setRoutePath(next.path);
      setDive(next.scenePreset.dive);
      setSelectedGene(next.scenePreset.gene);
      setSeverity(
        next.scenePreset.severity ??
          GENES.find((g) => g.id === next.scenePreset.gene)?.defaultSphericity ??
          0.0
      );
      document.title = next.title;
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute('href', `${SITE_ORIGIN}${next.path}`);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

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

  const handleNavigate = useCallback((targetPath: string, hash?: string) => {
    const next = getSeoRoute(targetPath);
    const fullUrl = hash ? `${next.path}${hash}` : next.path;

    if (typeof window !== 'undefined' && window.location.pathname + window.location.hash !== fullUrl) {
      window.history.pushState({}, '', fullUrl);
    }

    setRoutePath(next.path);
    setDive(next.scenePreset.dive);
    setSelectedGene(next.scenePreset.gene);
    setSeverity(
      next.scenePreset.severity ??
        GENES.find((g) => g.id === next.scenePreset.gene)?.defaultSphericity ??
        0.0
    );

    if (typeof document !== 'undefined') {
      document.title = next.title;
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute('href', `${SITE_ORIGIN}${next.path}`);
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', next.description);
    }

    trackPageview(next.path, next.title);

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        if (hash) {
          const targetEl = document.getElementById(hash.replace(/^#/, ''));
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
          }
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }, []);

  const handleDepthChange = useCallback((nextDepth: ReadingDepth) => {
    setDepth(nextDepth);
    if (nextDepth === 'clinical') {
      trackEventOnce('depth/clinical', 'Switched to Clinical Language');
    }
  }, []);

  const handleDiveChange = useCallback((nextDive: number) => {
    setDive(nextDive);
    if (nextDive >= 0.94) {
      trackEventOnce('dive/10nm', 'Dived to 10 nm Protein Complex');
    } else if (nextDive >= 0.72) {
      trackEventOnce('dive/40nm', 'Dived to 40 nm Mesh');
    }
  }, []);

  const handleGeneChange = useCallback((gene: GeneId, syncSeverity = true) => {
    setSelectedGene(gene);
    if (gene !== 'healthy') {
      trackEventOnce(`gene/${gene}`, `Inspected ${gene}`);
    }
    if (syncSeverity) {
      const profile = GENES.find((g) => g.id === gene);
      if (profile) {
        setSeverity(profile.defaultSphericity);
      }
    }
  }, []);

  const handleJumpToCell = useCallback(
    (opts: { dive: number; gene?: GeneId; severity?: number }) => {
      handleDiveChange(opts.dive);
      if (opts.gene) {
        setSelectedGene(opts.gene);
        if (opts.gene !== 'healthy') {
          trackEventOnce(`gene/${opts.gene}`, `Inspected ${opts.gene}`);
        }
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
    [handleDiveChange]
  );

  const handleFocusScene = useCallback(() => {
    handleJumpToCell(activeRoute.scenePreset);
  }, [activeRoute, handleJumpToCell]);

  return (
    <div className="app-shell">
      <Header depth={depth} onDepthChange={handleDepthChange} onNavigate={handleNavigate} />
      <main>
        <CellSandbox
          route={activeRoute}
          depth={depth}
          dive={dive}
          onDiveChange={handleDiveChange}
          selectedGene={selectedGene}
          onGeneChange={handleGeneChange}
          severity={severity}
          onSeverityChange={setSeverity}
        />
        <EditorialSections
          route={activeRoute}
          depth={depth}
          onJumpToCell={handleJumpToCell}
          onNavigate={handleNavigate}
          onFocusScene={handleFocusScene}
        />
      </main>
    </div>
  );
}

export default App;
