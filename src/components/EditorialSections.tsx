import React from 'react';
import { ArrowUpRight, Check, ChevronDown, Download } from 'lucide-react';
import {
  DIAGNOSTIC_TESTS,
  GENES,
  GeneId,
  INHERITANCE_STATS,
  ReadingDepth,
  SPLEEN_ROLE_TABLE,
} from '../data/hsContent';
import { usePwaInstall } from '../pwa';

interface EditorialSectionsProps {
  depth: ReadingDepth;
  onJumpToCell: (opts: { dive: number; gene?: GeneId; severity?: number }) => void;
}

export const EditorialSections: React.FC<EditorialSectionsProps> = ({ depth, onJumpToCell }) => {
  const onlyMutatedGenes = GENES.filter((g) => g.id !== 'healthy');
  const { canPromptInstall, isStandalone, isIosSafari, triggerInstall } = usePwaInstall();

  return (
    <div className="editorial-body">
      {/* SECTION I: MECHANISM CHAIN */}
      <section id="mechanism" className="ed-section">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="eyebrow">01 · Pathophysiology</p>
              <h2 className="section-title">One physical chain reaction</h2>
            </div>
            <p className="section-lead">
              {depth === 'plain'
                ? 'Unlike diseases that alter oxygen-carrying hemoglobin, hereditary spherocytosis affects the molecular scaffolding that holds a red blood cell’s shape.'
                : 'Quantitative deficiencies in vertical membrane-cytoskeleton proteins initiate microvesiculation as early as the reticulocyte stage, distinguishing HS from immune hemolysis where typically only mature RBCs lose membrane.'}
            </p>
          </div>

          <div className="chain-grid">
            <article className="chain-card">
              <span className="chain-card__num">I</span>
              <h3>{depth === 'plain' ? 'Weakened vertical anchors' : 'Vertical linkage deficit'}</h3>
              <p>
                {depth === 'plain'
                  ? 'A variant in one of five genes reduces the protein anchors connecting the outer membrane to the inner coiled scaffold.'
                  : 'Pathogenic variants in ANK1, SPTB, SLC4A1, SPTA1, or EPB42 reduce vertical coupling between the phospholipid bilayer and spectrin cytoskeleton.'}
              </p>
              <button
                type="button"
                className="inline-jump"
                onClick={() => onJumpToCell({ dive: 1.0, gene: 'ANK1' })}
              >
                Dive to 10 nm <ArrowUpRight size={14} />
              </button>
            </article>

            <article className="chain-card">
              <span className="chain-card__num">II</span>
              <h3>{depth === 'plain' ? 'Membrane micro-shedding' : 'Microvesiculation'}</h3>
              <p>
                {depth === 'plain'
                  ? 'Unanchored pockets of the outer lipid layer pinch off as microscopic droplets — shrinking surface area while cell volume stays roughly the same.'
                  : 'Unsupported bilayer domains shed lipid microvesicles (along with band 3 complexes), progressively lowering the surface-area-to-volume (SA/V) ratio.'}
              </p>
              <button
                type="button"
                className="inline-jump"
                onClick={() => onJumpToCell({ dive: 0.41, gene: 'SPTA1' })}
              >
                Inspect bilayer rim <ArrowUpRight size={14} />
              </button>
            </article>

            <article className="chain-card">
              <span className="chain-card__num">III</span>
              <h3>{depth === 'plain' ? 'Disc becomes a sphere' : 'Spherocyte transformation'}</h3>
              <p>
                {depth === 'plain'
                  ? 'With less surface fabric wrapping the same interior, geometry forces the soft biconcave disc into a compact, stiffer sphere with no pale center.'
                  : 'Reduced SA/V eliminates central pallor, raises MCHC (typically ≥36 g/dL), increases passive Na⁺/K⁺ permeability, and sharply decreases osmotic tolerance.'}
              </p>
              <button
                type="button"
                className="inline-jump"
                onClick={() => onJumpToCell({ dive: 0.0, gene: 'ANK1', severity: 0.88 })}
              >
                View whole spherocyte <ArrowUpRight size={14} />
              </button>
            </article>

            <article className="chain-card">
              <span className="chain-card__num">IV</span>
              <h3>{depth === 'plain' ? 'Cleared by the spleen' : 'Splenic conditioning'}</h3>
              <p>
                {depth === 'plain'
                  ? 'Stiff spheres cannot fold cleanly through the spleen’s tight filtering cords, shedding even more membrane and being recycled early — causing anemia, enlarged spleen, and pigment gallstones.'
                  : 'Impaired passage through splenic cord fenestrations exposes spherocytes to an acidotic, oxidizing microenvironment and red pulp macrophage phagocytosis.'}
              </p>
              <a href="#care" className="inline-jump">
                Management &amp; splenectomy <ArrowUpRight size={14} />
              </a>
            </article>
          </div>
        </div>
      </section>

      {/* SECTION II: GENETICS & THE 5 GENES */}
      <section id="genetics" className="ed-section ed-section--tinted">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="eyebrow">02 · Genetics &amp; Inheritance</p>
              <h2 className="section-title">Five genes, hundreds of private variants</h2>
            </div>
            <p className="section-lead">
              {depth === 'plain'
                ? 'Most families with HS carry their own unique genetic spelling change rather than one shared “hotspot.” HS occurs worldwide, most commonly in people of northern European ancestry (about 1 in 2,000 to 1 in 5,000).'
                : 'Pathogenic variants are distributed across the five HS loci (over 250 in ANK1 alone) rather than clustered at hotspots. Prevalence reaches ~0.02–0.05% in northern European populations and accounts for ~1% of severely jaundiced neonates.'}
            </p>
          </div>

          <div className="inheritance-panel">
            <div className="inheritance-bar" aria-hidden="true">
              {INHERITANCE_STATS.map((st, idx) => (
                <div
                  key={st.percent}
                  className={`inheritance-bar__seg inheritance-bar__seg--${idx}`}
                  style={{ width: `${st.width}%` }}
                />
              ))}
            </div>
            <div className="inheritance-grid">
              {INHERITANCE_STATS.map((st, idx) => (
                <div key={st.percent} className="inheritance-item">
                  <div className="inheritance-item__top">
                    <span className={`dot dot--${idx}`} />
                    <span className="inheritance-item__pct">{st.percent}</span>
                    <span className="inheritance-item__lbl">{st.label[depth]}</span>
                  </div>
                  <p className="inheritance-item__desc">{st.detail[depth]}</p>
                  <span className="inheritance-item__genes">{st.genes}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="table-scroll">
            <table className="ed-table">
              <thead>
                <tr>
                  <th>Gene</th>
                  <th>Protein</th>
                  <th>Typical Share</th>
                  <th>Inheritance</th>
                  <th>Clinical Severity</th>
                  <th aria-label="3D Action" />
                </tr>
              </thead>
              <tbody>
                {onlyMutatedGenes.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <span className="gene-badge">
                        <i style={{ backgroundColor: g.color }} />
                        <em>{g.symbol}</em>
                      </span>
                    </td>
                    <td>{g.protein[depth]}</td>
                    <td className="mono-cell">{g.share}</td>
                    <td>{g.inheritance[depth]}</td>
                    <td>{g.severity[depth]}</td>
                    <td className="action-cell">
                      <button
                        type="button"
                        className="inline-jump"
                        onClick={() => onJumpToCell({ dive: 1.0, gene: g.id })}
                      >
                        Inspect 10 nm <ArrowUpRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="ed-details">
            <summary>
              <span>
                {depth === 'plain'
                  ? 'Why can family members with the exact same mutation have different symptoms?'
                  : 'Variable penetrance, modifying co-variants & quantitative vs. qualitative spectrin defects'}
              </span>
              <ChevronDown size={16} className="ed-details__chev" />
            </summary>
            <div className="ed-details__body">
              <p>
                {depth === 'plain'
                  ? 'Even within one family, HS can range from barely noticeable to symptomatic. Other common inherited traits can tip the balance — for example, co-inheriting Gilbert syndrome (a harmless liver bilirubin trait) makes jaundice and pigment gallstones noticeably more likely and earlier to appear. Co-inherited enzyme variations (such as partial pyruvate kinase deficiency) can also heighten red cell fragility.'
                  : 'Variable clinical penetrance within kindreds can reflect co-inherited modifiers: Gilbert syndrome accelerates unconjugated hyperbilirubinemia and cholelithiasis [117], while concomitant PKLR variants or reduced RBC pyruvate kinase activity can aggravate hemolysis [109,110]. Separately, qualitative spectrin defects impairing tetramer assembly cause hereditary elliptocytosis (HE), whereas variants affecting both quantity and quality produce hereditary spherocytic elliptocytosis or pyropoikilocytosis (HPP).'}
              </p>
            </div>
          </details>
        </div>
      </section>

      {/* SECTION III: EVALUATION & DIAGNOSIS */}
      <section id="diagnosis" className="ed-section">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="eyebrow">03 · Evaluation &amp; Labs</p>
              <h2 className="section-title">Recognizing the signature in blood</h2>
            </div>
            <p className="section-lead">
              {depth === 'plain'
                ? 'Doctors suspect HS when a blood test shows non-immune red cell breakdown, compact hemoglobin-packed cells (MCHC ≥36 g/dL), and round spherocytes under the microscope — then confirm it with targeted membrane or DNA tests.'
                : 'Suspect HS in DAT (Coombs)-negative hemolytic anemia with elevated MCHC (≥36 g/dL), wide RDW, elevated LDH/indirect bilirubin, low haptoglobin, reticulocytosis, and peripheral blood spherocytes — followed by confirmatory phenotypic or molecular testing.'}
            </p>
          </div>

          <div className="clues-strip">
            <div className="clue-box">
              <span className="clue-box__kicker">Key Index</span>
              <strong className="clue-box__big">MCHC ≥ 36 g/dL</strong>
              <p>
                {depth === 'plain'
                  ? 'Often the single strongest routine lab clue — especially helpful in newborns, where spherocytes on a smear are less reliable.'
                  : 'Most useful routine RBC index; typical neonatal HS range is 35–38 g/dL vs. 33–36 g/dL in HDFN. Combining elevated MCHC + wide RDW improves screening yield.'}
              </p>
            </div>
            <div className="clue-box">
              <span className="clue-box__kicker">Immune Check</span>
              <strong className="clue-box__big">DAT Negative</strong>
              <p>
                {depth === 'plain'
                  ? 'A negative Coombs (DAT) test points away from antibody-driven hemolysis, though rare antibody-negative immune cases are still kept in mind.'
                  : 'Direct antiglobulin test is negative in HS; maintain suspicion for DAT-negative AIHA (3–11% of AIHA) when family history and prior abnormal CBCs are absent.'}
              </p>
            </div>
            <div className="clue-box">
              <span className="clue-box__kicker">Critical Distinction</span>
              <strong className="clue-box__big">Rule Out HX First</strong>
              <p>
                {depth === 'plain'
                  ? 'Before any spleen surgery, confirming true HS over look-alike hereditary xerocytosis (HX) is vital — splenectomy is unsafe in HX.'
                  : 'Differentiating HS from dehydrated HSt / hereditary xerocytosis (PIEZO1/KCNN4) via OGE and/or NGS is mandatory prior to splenectomy, as surgery causes severe thromboembolism in HX without resolving hemolysis.'}
              </p>
            </div>
          </div>

          <div className="tests-grid">
            {DIAGNOSTIC_TESTS.map((t) => (
              <article key={t.name} className="test-card">
                <div className="test-card__top">
                  <h3>{t.name}</h3>
                  <span className="test-card__badge">{t.sensitivity}</span>
                </div>
                <p className="test-card__sample">{t.sample}</p>
                <p className="test-card__desc">{t.summary[depth]}</p>
              </article>
            ))}
          </div>

          <details className="ed-details">
            <summary>
              <span>
                {depth === 'plain'
                  ? 'Other conditions doctors rule out (differential diagnosis)'
                  : 'Differential diagnosis of spherocytic hemolytic anemia'}
              </span>
              <ChevronDown size={16} className="ed-details__chev" />
            </summary>
            <div className="ed-details__body ed-details__cols">
              <div>
                <h4>In Newborns</h4>
                <ul>
                  <li>
                    <strong>Neonatal alloimmune hemolysis (HDFN):</strong> ABO/Rh incompatibility; abundant spherocytes, but transient and <strong>DAT-positive</strong>.
                  </li>
                  <li>
                    <strong>Infantile pyknocytosis:</strong> Hyperdense RBCs with irregular projections and high MCHC; resolves spontaneously within 3–9 months.
                  </li>
                </ul>
              </div>
              <div>
                <h4>In Children &amp; Adults</h4>
                <ul>
                  <li>
                    <strong>Autoimmune hemolytic anemia (AIHA):</strong> Usually DAT-positive, negative family history, prior normal CBCs.
                  </li>
                  <li>
                    <strong>Other membrane &amp; marrow disorders:</strong> Hereditary elliptocytosis (HE/HPP), HSt/HX, G6PD/PK enzyme defects, and <strong>CDA type II</strong> (<em>SEC23B</em>; can mimic HS on EMA/OGE but has lower reticulocytes and binucleate marrow erythroblasts).
                  </li>
                </ul>
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* SECTION IV: LIVING WITH HS & PROCEDURES */}
      <section id="care" className="ed-section ed-section--tinted">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="eyebrow">04 · Care, Maintenance &amp; Procedures</p>
              <h2 className="section-title">Living with HS across life stages</h2>
            </div>
            <p className="section-lead">
              {depth === 'plain'
                ? 'There is no medication that repairs the red cell membrane itself, so care focuses on calm monitoring, preventing complications, and knowing when supportive treatment or surgery genuinely helps.'
                : 'Management targets complications of chronic hemolysis and anemia across age brackets, aligned with BCSH (2011) and EHA (2017) consensus guidelines.'}
            </p>
          </div>

          <div className="care-grid">
            <article className="care-card">
              <span className="care-card__stage">Stage 01 · Newborns &amp; Infancy</span>
              <h3>Jaundice early, anemia at 2–3 weeks</h3>
              <p>
                {depth === 'plain'
                  ? 'Babies born into families with HS are watched closely for bilirubin rising on day one (treated with phototherapy or, rarely, exchange transfusion). Hemoglobin is typically normal at birth, then dips 2–3 weeks later as the newborn spleen matures — needing a transfusion early on does not automatically mean lifelong severe disease.'
                  : 'Monitor bilirubin from day 1 of life to prevent kernicterus. Normal birth Hb drops at 2–3 weeks as neonatal hyposplenism resolves. First-year transfusion need is not necessarily prognostic; recombinant human erythropoietin (1000 IU/kg/wk + iron) can reduce early transfusions until ~9 months of age.'}
              </p>
            </article>

            <article className="care-card">
              <span className="care-card__stage">Stage 02 · Daily Life &amp; Red Flags</span>
              <h3>Monitoring, folate &amp; parvovirus awareness</h3>
              <p>
                {depth === 'plain'
                  ? 'Children with mild HS often need just an annual visit and no routine activity restrictions. Families learn to watch for viral “aplastic crisis” (especially parvovirus B19), when bone marrow pauses making new cells and hemoglobin drops quickly. Folic acid helps support steady red cell production in moderate-to-severe HS and during pregnancy (while unnecessary iron pills are avoided unless deficiency is proven).'
                  : 'Annual follow-up suffices for mild HS; evaluate abrupt Hb/reticulocyte drops for parvovirus B19 transient aplastic crisis. Suggest folic acid supplementation (Grade 2C): 0.4 mg/day (<6–12 mo), 1 mg/day (moderate–severe HS), 2–4 mg/day pre-conception & pregnancy. Avoid empirical iron in pregnancy due to iron overload risk. Pigment gallstones occur in up to ~50% of adults.'}
              </p>
            </article>

            <article className="care-card">
              <span className="care-card__stage">Stage 03 · Procedures</span>
              <h3>Splenectomy: timing, partial vs. total</h3>
              <p>
                {depth === 'plain'
                  ? 'For severe or strongly symptomatic HS, removing part or all of the spleen dramatically reduces anemia and transfusion need — even though the red blood cells remain spherical. Total splenectomy is ideally delayed past age 5 so pre-surgery vaccines protect strongly against encapsulated bacteria; partial splenectomy can be considered after age 3 when needed.'
                  : 'Delay total splenectomy until >5 years of age after encapsulated-organism immunizations (Grade 2C); partial splenectomy may be considered after age 3 (Grade 2C) to preserve immune function while deferring total resection (splenic remnant regrowth leads to later completion in ~27%). Complete α-spectrin or Band 3 null HS does not respond to splenectomy.'}
              </p>
            </article>
          </div>

          <div className="details-stack">
            <details className="ed-details">
              <summary>
                <span>Pre-splenectomy vaccination overview (Pediatric &amp; Adult — US Tables 3 &amp; 4)</span>
                <ChevronDown size={16} className="ed-details__chev" />
              </summary>
              <div className="ed-details__body">
                <p className="details-intro">
                  For elective splenectomy, immunizations should be administered at least{' '}
                  <strong>14 days prior</strong> (ideally <strong>10–12 weeks prior</strong>) so a
                  protective antibody response develops. Emergency splenectomy series begin 14 days
                  post-op.
                </p>
                <div className="table-scroll">
                  <table className="ed-table ed-table--compact">
                    <thead>
                      <tr>
                        <th>Pathogen / Vaccine</th>
                        <th>Children (&lt;19 yrs)</th>
                        <th>Adults (&gt;19 yrs)</th>
                        <th>Booster Cadence</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Pneumococcus</strong></td>
                        <td>Age-specific PCV / PPSV regimen per current guidelines</td>
                        <td>PCV15 / PCV20 / PPSV23 per current UpToDate regimen</td>
                        <td>Per current guidelines</td>
                      </tr>
                      <tr>
                        <td><strong><em>Haemophilus influenzae</em> type b (Hib)</strong></td>
                        <td>&lt;2 yrs: 3–4 dose primary series; ≥2 yrs: if unvaccinated/incomplete</td>
                        <td>1 dose (if previously unvaccinated or status unknown)</td>
                        <td>Not required</td>
                      </tr>
                      <tr>
                        <td><strong>Meningococcus ACWY</strong></td>
                        <td>&lt;2 yrs: 4-dose Menveo; ≥2 yrs: 2 doses ≥8 weeks apart</td>
                        <td>2 doses at least 8 weeks apart</td>
                        <td>Age &lt;7: 3 yrs then q5y · Age ≥7 &amp; adults: every 5 yrs</td>
                      </tr>
                      <tr>
                        <td><strong>Meningococcus B</strong></td>
                        <td>Recommended starting at age 10 (Trumenba 3-dose or Bexsero 2-dose)</td>
                        <td>Bexsero 2 doses (≥1 mo apart) or Trumenba 3 doses (0, 1–2, 6 mo)</td>
                        <td>1 yr post-primary, then every 2–3 years</td>
                      </tr>
                      <tr>
                        <td><strong>Seasonal Influenza</strong></td>
                        <td>1 dose annually (&gt;6 mo; inactivated preferred over live)</td>
                        <td>1 dose annually (plus routine adult vaccines including COVID-19)</td>
                        <td>Annually at start of flu season</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </details>

            <details className="ed-details">
              <summary>
                <span>Clinical study snapshot: RBC indices before vs. after splenectomy (Table 2)</span>
                <ChevronDown size={16} className="ed-details__chev" />
              </summary>
              <div className="ed-details__body">
                <div className="table-scroll">
                  <table className="ed-table ed-table--compact">
                    <thead>
                      <tr>
                        <th>RBC Property</th>
                        <th>Controls</th>
                        <th>HS (Intact Spleen)</th>
                        <th>HS Post-Splenectomy</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SPLEEN_ROLE_TABLE.map((row) => (
                        <tr key={row.metric}>
                          <td><strong>{row.metric}</strong></td>
                          <td className="mono-cell">{row.controls}</td>
                          <td className="mono-cell">{row.hs}</td>
                          <td className="mono-cell">{row.splenect}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="table-footnote">
                  Values are mean ±1 SD. Data from Da Costa L, Mohandas N, Sorette M, et al.{' '}
                  <em>Blood</em> 2001; 98:2894 (Graphic 54945).
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>

      {/* QUIET FOOTER & DISCLAIMER */}
      <footer className="site-footer">
        <div className="container footer-inner">
          <div>
            <p className="footer-brand">Hereditary Spherocytosis — 3D Interactive Atlas</p>
            <p className="footer-note">
              <strong>Educational resource only:</strong> This interactive site is designed to help
              visualize red blood cell biology and summarize published clinical literature. It is
              not medical advice and should not replace guidance from a qualified hematologist or
              pediatrician.
            </p>
            <p className="footer-contact">
              Site feedback &amp; corrections (non-medical):{' '}
              <a
                href="https://github.com/danielgeri"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub (@danielgeri)
              </a>
              <span aria-hidden="true"> · </span>
              <a
                href="https://github.com/danielgeri/hereditary-spherocytosis-website/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                Report an issue
              </a>
            </p>
          </div>
          <div className="footer-meta">
            <p>
              Grounded in Kalfa TA, Means RT Jr, Tirnauer JS. <em>Hereditary spherocytosis.</em>{' '}
              UpToDate Topic 7079 v47.0 (literature review current through Nov 2024).
            </p>
            <div className="footer-pwa">
              {isStandalone ? (
                <span className="pwa-badge">
                  <Check size={13} />
                  <span>Installed App · Offline Ready</span>
                </span>
              ) : canPromptInstall ? (
                <button type="button" className="pwa-install-btn" onClick={triggerInstall}>
                  <Download size={13} />
                  <span>Install App (Offline Ready)</span>
                </button>
              ) : isIosSafari ? (
                <span className="pwa-hint">
                  Install as an app: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
