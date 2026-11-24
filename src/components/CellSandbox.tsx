import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  Focus,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  ZoomIn,
} from 'lucide-react';
import { GENES, GeneId, ReadingDepth } from '../data/hsContent';
import { ProjectedPin, RbcSceneEngine } from '../scene/RbcSceneEngine';

interface CellSandboxProps {
  depth: ReadingDepth;
  dive: number; // 0.00 (7.5 μm) -> 0.41 (500 nm) -> 0.79 (40 nm) -> 1.00 (10 nm Complex)
  onDiveChange: (nextDive: number) => void;
  selectedGene: GeneId;
  onGeneChange: (gene: GeneId, syncSeverity?: boolean) => void;
  severity: number;
  onSeverityChange: (val: number) => void;
}

const SCALE_STOPS = [
  { label: '7.5 μm', sub: 'Whole Cell', mobileSub: 'Cell', value: 0.0 },
  { label: '500 nm', sub: 'Bilayer Rim', mobileSub: 'Rim', value: 0.41 },
  { label: '40 nm', sub: 'Mesh', mobileSub: 'Mesh', value: 0.79 },
  { label: '10 nm', sub: 'Complex', mobileSub: 'Complex', value: 1.0 },
];

export const CellSandbox: React.FC<CellSandboxProps> = ({
  depth,
  dive,
  onDiveChange,
  selectedGene,
  onGeneChange,
  severity,
  onSeverityChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RbcSceneEngine | null>(null);
  const pinElsRef = useRef<Record<string, HTMLElement | null>>({});

  const [isolateMembrane, setIsolateMembrane] = useState<boolean>(false);
  const [paused, setPaused] = useState<boolean>(false);

  // Keep latest callbacks in refs so Three.js event listeners never go stale
  const diveChangeRef = useRef(onDiveChange);
  const geneChangeRef = useRef(onGeneChange);
  diveChangeRef.current = onDiveChange;
  geneChangeRef.current = onGeneChange;

  const handlePinsUpdate = useCallback((pins: ProjectedPin[]) => {
    for (const pin of pins) {
      const el = pinElsRef.current[pin.id];
      if (!el) continue;
      if (pin.visible) {
        el.style.opacity = '1';
        el.style.pointerEvents = pin.id === 'diveHotspot' ? 'auto' : 'none';
        el.style.left = `${pin.x}%`;
        el.style.top = `${pin.y}%`;
      } else {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
      }
    }
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const engine = new RbcSceneEngine(
      mountRef.current,
      {
        dive,
        severity,
        selectedGene,
        isolateMembrane,
        paused,
      },
      {
        onPinsUpdate: handlePinsUpdate,
        onDiveRequest: (target) => diveChangeRef.current(target),
        onGenePick: (gene) => geneChangeRef.current(gene, false),
      }
    );
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Automatically restore the outer RBC shell when pulling back to whole-cell scale
  useEffect(() => {
    if (dive < 0.3 && isolateMembrane) {
      setIsolateMembrane(false);
    }
  }, [dive, isolateMembrane]);

  useEffect(() => {
    engineRef.current?.updateState({
      dive,
      severity,
      selectedGene,
      isolateMembrane,
      paused,
    });
  }, [dive, severity, selectedGene, isolateMembrane, paused]);

  const activeGene = useMemo(
    () => GENES.find((g) => g.id === selectedGene) ?? GENES[0],
    [selectedGene]
  );

  const isMolecular = dive >= 0.34;
  const isComplexClose = dive >= 0.88;
  const heroFade = Math.max(0, 1 - dive * 2.8);

  const activeStopIndex = useMemo(() => {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < SCALE_STOPS.length; i++) {
      const d = Math.abs(dive - SCALE_STOPS[i].value);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, [dive]);

  // Derived biophysical readouts
  const savRatio = (1.0 - severity * 0.28).toFixed(2);
  const estMchc = (32.2 + severity * 5.2).toFixed(1);
  const mchcHigh = Number(estMchc) >= 36.0;
  const pallorText =
    severity < 0.28
      ? depth === 'plain'
        ? 'Pale center'
        : '~1/3 diameter'
      : severity < 0.65
        ? depth === 'plain'
          ? 'Fading'
          : 'Diminished'
        : depth === 'plain'
          ? 'Absent'
          : 'Hyperchromic';

  // Physical scale indicator readout (interpolates logarithmically 7.5 μm -> 10 nm)
  const scaleLabel = useMemo(() => {
    const rawNm = 7500 * Math.pow(10 / 7500, dive);
    if (rawNm >= 1000) return `${(rawNm / 1000).toFixed(1)} μm`;
    const nm = rawNm >= 150 ? Math.round(rawNm / 10) * 10 : Math.round(rawNm);
    return `${nm} nm`;
  }, [dive]);

  // 40 nm Mesh overview callout labels
  const molecularPins: { id: string; label: string; accent?: string }[] = useMemo(
    () => [
      {
        id: 'bilayer',
        label: depth === 'plain' ? 'Phospholipid Bilayer' : 'Lipid Bilayer',
        accent: '#9F474C',
      },
      {
        id: 'band3',
        label: depth === 'plain' ? 'Band 3 Channel' : 'Band 3 (SLC4A1)',
        accent: '#AD7243',
      },
      {
        id: 'ankyrin',
        label: depth === 'plain' ? 'Ankyrin-1 Arch' : 'Ankyrin-1 (ANK1)',
        accent: '#913241',
      },
      {
        id: 'protein42',
        label: depth === 'plain' ? 'Protein 4.2 Clasp' : 'Protein 4.2 (EPB42)',
        accent: '#3F6F62',
      },
      {
        id: 'spectrin',
        label: depth === 'plain' ? 'Coiled Spectrin Mesh' : 'α/β-Spectrin Coiled-Coil',
        accent: '#49687C',
      },
      {
        id: 'junction41',
        label: depth === 'plain' ? '4.1R / Actin Hub (Intact)' : '4.1R / F-Actin Junction (Intact)',
        accent: '#6C645C',
      },
    ],
    [depth]
  );

  // 10 nm Single Protein Complex close-up subunit labels
  const closePins: { id: string; label: string; accent?: string }[] = useMemo(
    () => [
      {
        id: 'closeBand3',
        label: depth === 'plain' ? 'Band 3 Dimer' : 'Band 3 (SLC4A1) Dimer',
        accent: '#AD7243',
      },
      {
        id: 'closeGpa',
        label: depth === 'plain' ? 'Glycophorin A' : 'Glycophorin A (GPA)',
        accent: '#9E4450',
      },
      {
        id: 'closeAnkyrin',
        label: depth === 'plain' ? 'Ankyrin-1 Arch' : 'Ankyrin-1 Solenoid (ANK1)',
        accent: '#913241',
      },
      {
        id: 'closeProtein42',
        label: depth === 'plain' ? 'Protein 4.2 Clasp' : 'Protein 4.2 (EPB42)',
        accent: '#3F6F62',
      },
      {
        id: 'closeAlphaSpec',
        label: depth === 'plain' ? 'α-Spectrin Coil' : 'α-Spectrin (SPTA1)',
        accent: '#49687C',
      },
      {
        id: 'closeBetaSpec',
        label: depth === 'plain' ? 'β-Spectrin Coil' : 'β-Spectrin (SPTB)',
        accent: '#2E526A',
      },
    ],
    [depth]
  );

  return (
    <section id="explorer" className="stage-hero" aria-label="Interactive 3D Red Blood Cell">
      {/* Full-Bleed 3D WebGL Canvas */}
      <div ref={mountRef} className="stage-canvas" />

      {/* 3D-to-2D Projected Interactive Overlay Layer */}
      <div className="pins-layer">
        {/* On-cell breathing reticle hotspot: click directly on the living cell to drill down! */}
        <button
          type="button"
          ref={(el) => {
            pinElsRef.current.diveHotspot = el;
          }}
          className="cell-reticle"
          onClick={() => onDiveChange(0.79)}
          aria-label="Dive inside the red blood cell membrane"
        >
          <span className="cell-reticle__ring" aria-hidden="true" />
          <span className="cell-reticle__core" aria-hidden="true" />
          <span className="cell-reticle__label">
            <Focus size={12} />
            <span>Drill into membrane</span>
          </span>
        </button>

        {/* 40 nm Mesh Overview Callout Labels */}
        {molecularPins.map((p) => (
          <div
            key={p.id}
            ref={(el) => {
              pinElsRef.current[p.id] = el;
            }}
            className="pin-tag"
            aria-hidden="true"
          >
            <span className="pin-tag__dot" style={{ background: p.accent ?? '#57504A' }} />
            <span>{p.label}</span>
          </div>
        ))}

        {/* 10 nm Protein Complex Subunit Labels */}
        {closePins.map((p) => (
          <div
            key={p.id}
            ref={(el) => {
              pinElsRef.current[p.id] = el;
            }}
            className="pin-tag"
            aria-hidden="true"
          >
            <span className="pin-tag__dot" style={{ background: p.accent ?? '#57504A' }} />
            <span>{p.label}</span>
          </div>
        ))}
      </div>

      {/* Top-Left Editorial Title (fades gracefully as you dive inside the cell) */}
      <div
        className="stage-title-overlay"
        style={{
          opacity: heroFade,
          pointerEvents: heroFade > 0.2 ? 'auto' : 'none',
        }}
      >
        <p className="eyebrow">
          <span className="unit-exact">7.5 μm</span> · Interactive 3D Erythrocyte
        </p>
        <h1 className="stage-headline">Hereditary Spherocytosis</h1>
        <p className="stage-lead">
          {depth === 'plain'
            ? 'Explore how missing membrane anchors reshape a red blood cell. Drag to orbit, pick a gene below, or click the reticle to drill inside the membrane.'
            : 'Interactive parametric erythrocyte with Beer–Lambert hemoglobin optics. Drill directly through the phospholipid bilayer into the vertical ankyrin–band 3–spectrin complex.'}
        </p>
      </div>

      {/* Top-Left Molecular Breadcrumb (emerges smoothly once zoomed into the cutaway) */}
      <div
        className="stage-molecular-crumb"
        style={{
          opacity: isMolecular ? 1 : 0,
          pointerEvents: isMolecular ? 'auto' : 'none',
        }}
      >
        <button
          type="button"
          className="crumb-back-btn"
          onClick={() => onDiveChange(0.0)}
        >
          <ArrowLeft size={14} />
          <span>
            Whole Cell <span className="crumb-back-unit">(7.5 μm)</span>
          </span>
        </button>
        <span className="crumb-scale">
          {scaleLabel} ·{' '}
          {isComplexClose
            ? depth === 'plain'
              ? 'Single Protein Complex'
              : 'Ankyrin–Band 3 Macrocomplex'
            : depth === 'plain'
              ? 'Membrane Cross-Section'
              : 'Vertical Linkage Complex'}
        </span>
      </div>

      {/* Top-Right Minimal Studio Utility Controls */}
      <div className="stage-utilities">
        {isMolecular && (
          <button
            type="button"
            className={`hud-btn hud-btn--isolate ${isolateMembrane ? 'is-active' : ''}`}
            aria-pressed={isolateMembrane}
            onClick={() => setIsolateMembrane((v) => !v)}
            title="Hide the outer red blood cell to inspect only the membrane cross-section from all angles"
          >
            <Layers size={14} />
            <span>{isolateMembrane ? 'Membrane Only' : 'Isolate Membrane'}</span>
          </button>
        )}
        <button
          type="button"
          className="hud-btn hud-btn--icon"
          onClick={() => setPaused((v) => !v)}
          aria-label={paused ? 'Resume motion' : 'Pause motion'}
          title={paused ? 'Resume motion' : 'Pause motion'}
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
        <button
          type="button"
          className="hud-btn hud-btn--icon"
          onClick={() => engineRef.current?.resetCamera()}
          aria-label="Reset camera view"
          title="Reset view"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Right-Edge Continuous Scale Depth Rail (7.5 μm <-> 10 nm) */}
      <aside className="scale-rail" aria-label="Zoom depth from whole cell to protein complex">
        <span className="scale-rail__readout">{scaleLabel}</span>

        <div className="scale-rail__track-wrap">
          <div className="scale-rail__stops">
            {SCALE_STOPS.map((stop, idx) => {
              const active = idx === activeStopIndex;
              return (
                <button
                  key={stop.label}
                  type="button"
                  className={`scale-stop ${active ? 'is-active' : ''}`}
                  onClick={() => onDiveChange(stop.value)}
                >
                  <span className="scale-stop__num">{stop.label}</span>
                  <span className="scale-stop__sub">{stop.sub}</span>
                </button>
              );
            })}
          </div>

          <input
            type="range"
            className="scale-rail__slider"
            aria-label="Membrane zoom depth"
            min={0}
            max={100}
            step={1}
            value={Math.round(dive * 100)}
            aria-valuetext={`${scaleLabel} magnification`}
            style={
              {
                '--attr-min': 0,
                '--attr-max': 100,
                '--control-value': Math.round(dive * 100),
              } as React.CSSProperties
            }
            onChange={(e) => onDiveChange(Number(e.target.value) / 100)}
          />
        </div>
      </aside>

      {/* Bottom Floating Frosted Studio Bar */}
      <div className="stage-dock">
        {/* Compact 4-stop scale bar shown on mobile/tablet where the side rail hides */}
        <div className="mobile-scale-bar" role="group" aria-label="Magnification scale">
          {SCALE_STOPS.map((stop, idx) => {
            const active = idx === activeStopIndex;
            return (
              <button
                key={stop.label}
                type="button"
                className={`mobile-scale-btn ${active ? 'is-active' : ''}`}
                onClick={() => onDiveChange(stop.value)}
              >
                <span className="mobile-scale-btn__num">{stop.label}</span>
                <span>{stop.mobileSub}</span>
              </button>
            );
          })}
        </div>

        {/* Top strip: 5-gene selector + primary Dive / Zoom-10nm / Pull-Back toggle */}
        <div className="stage-dock__top">
          <div className="gene-selector" role="group" aria-label="Select red blood cell genotype">
            {GENES.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`gene-pill ${selectedGene === g.id ? 'is-active' : ''}`}
                onClick={() => onGeneChange(g.id, true)}
              >
                <span className="gene-pill__dot" style={{ backgroundColor: g.color }} />
                <span className="gene-pill__sym">{g.symbol}</span>
                {g.id !== 'healthy' && <span className="gene-pill__share">{g.share}</span>}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="dive-cta"
            onClick={() => onDiveChange(!isMolecular ? 0.79 : !isComplexClose ? 1.0 : 0.0)}
          >
            {!isMolecular ? (
              <>
                <Focus size={14} />
                <span>Dive into Membrane</span>
              </>
            ) : !isComplexClose ? (
              <>
                <ZoomIn size={14} />
                <span>Zoom to 10 nm</span>
              </>
            ) : (
              <>
                <ArrowLeft size={14} />
                <span>Pull Back to Cell</span>
              </>
            )}
          </button>
        </div>

        {/* Bottom strip: adapts seamlessly between Whole-Cell metrics and Molecular Gene Readout */}
        {!isMolecular ? (
          <div className="stage-dock__macro">
            <div className="macro-slider-col">
              <div className="macro-slider-head">
                <label htmlFor="severity-slider" className="control-label">
                  {depth === 'plain' ? 'Membrane Loss · Shape' : 'Spherocytic Severity'}
                </label>
                <span className="macro-slider-hint">
                  Drag to orbit · Scroll wheel to zoom into membrane
                </span>
              </div>
              <input
                id="severity-slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(severity * 100)}
                aria-valuetext={`${Math.round(severity * 100)}% spherocytic`}
                style={
                  {
                    '--attr-min': 0,
                    '--attr-max': 100,
                    '--control-value': Math.round(severity * 100),
                  } as React.CSSProperties
                }
                onChange={(e) => onSeverityChange(Number(e.target.value) / 100)}
              />
            </div>

            <div className="macro-metrics">
              <div className="mini-metric">
                <span>SA / V</span>
                <strong>{savRatio}×</strong>
              </div>
              <div className="mini-metric">
                <span>MCHC</span>
                <strong className={mchcHigh ? 'is-alert' : ''}>{estMchc} g/dL</strong>
              </div>
              <div className="mini-metric">
                <span>Pallor</span>
                <strong className="is-text">{pallorText}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="stage-dock__micro">
            <div className="micro-gene-lead">
              <span
                className="micro-gene-bar"
                style={{ backgroundColor: activeGene.color }}
              />
              <div>
                <div className="micro-gene-title-row">
                  <h3>{activeGene.protein[depth]}</h3>
                  <span className="micro-gene-inherit">{activeGene.inheritance[depth]}</span>
                </div>
                <p>{activeGene.mechanism[depth]}</p>
                {depth === 'clinical' && (
                  <p className="micro-clinical-pearl">
                    <Sparkles size={12} /> {activeGene.clinicalNote}
                  </p>
                )}
              </div>
            </div>
            <div className="micro-tip">
              {isComplexClose
                ? 'Drag to orbit protein complex · Switch genes above to focus each subunit'
                : 'Click any protein in 3D to inspect · Scroll wheel or pick 10 nm to zoom closer'}
            </div>
          </div>
        )}
      </div>

      {/* Subtle Scroll Down Indicator */}
      <a href="#mechanism" className="scroll-cue" aria-label="Scroll to overview guide">
        <span>Read Guide</span>
        <ArrowDown size={13} />
      </a>
    </section>
  );
};
