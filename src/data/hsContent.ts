export type ReadingDepth = 'plain' | 'clinical';
export type GeneId = 'healthy' | 'ANK1' | 'SPTB' | 'SLC4A1' | 'SPTA1' | 'EPB42';

export interface DualText {
  plain: string;
  clinical: string;
}

export interface GeneProfile {
  id: GeneId;
  symbol: string;
  protein: DualText;
  color: string;
  share: string;
  defaultSphericity: number; // characteristic baseline sphericity when selected
  inheritance: DualText;
  severity: DualText;
  smearHint: DualText;
  mechanism: DualText;
  clinicalNote: string;
}

export const GENES: GeneProfile[] = [
  {
    id: 'healthy',
    symbol: 'Healthy',
    protein: {
      plain: 'Intact Vertical Membrane Anchors',
      clinical: 'Wild-Type Vertical Membrane-Cytoskeleton Linkages',
    },
    color: '#8E2131',
    share: 'Baseline',
    defaultSphericity: 0.0,
    inheritance: {
      plain: 'Normal flexible biconcave erythrocyte',
      clinical: 'Intact ANK1, SPTB, SLC4A1, SPTA1, EPB42',
    },
    severity: {
      plain: 'Flexible biconcave disc',
      clinical: 'Normal SA/V ratio · MCHC ~32.2 g/dL · 120-day lifespan',
    },
    smearHint: {
      plain: 'Uniform round discs with pale center (~1/3 diameter)',
      clinical: 'Normocytic, normochromic biconcave discs with central pallor',
    },
    mechanism: {
      plain:
        'Vertical protein anchors staple the outer phospholipid bilayer to the coiled spectrin mesh underneath, keeping the cell flexible enough to fold through narrow capillaries.',
      clinical:
        'Band 3–ankyrin–protein 4.2 complexes vertically couple the phospholipid bilayer to α/β-spectrin heterotetramers, maintaining surface-to-volume ratio and shear deformability.',
    },
    clinicalNote:
      'Normal RBC diameter approximates the nucleus of a small lymphocyte; central pallor spans roughly one-third of its diameter.',
  },
  {
    id: 'ANK1',
    symbol: 'ANK1',
    protein: {
      plain: 'Ankyrin-1 (Main Anchor Arch)',
      clinical: 'Erythrocyte Ankyrin-1 (ANK1)',
    },
    color: '#913241',
    share: '~49–53%',
    defaultSphericity: 0.74,
    inheritance: {
      plain: 'Usually one parent (dominant) or brand-new (de novo)',
      clinical: 'Autosomal dominant or de novo (most common de novo HS gene); rare biallelic AR',
    },
    severity: {
      plain: 'Mild to moderate; rare two-copy forms are severe',
      clinical:
        'Monoallelic AD (≤50% expression): mild–moderate; biallelic null + hypomorphic/missense: severe, transfusion-dependent, splenectomy-responsive',
    },
    smearHint: {
      plain: 'Spherocytes of noticeably varied sizes',
      clinical: 'Anisocytic spherocytes (observed association; not rigorously diagnostic)',
    },
    mechanism: {
      plain:
        'Ankyrin forms the curved anchor bridge clamping Band 3 in the outer membrane down onto the inner spectrin mesh. When half these bridges are missing, unsupported membrane bubbles break away.',
      clinical:
        'Over 250 private variants reported in HGMD. High G/C content predisposes to slipped-strand mispairing and de novo variants. Ankyrin deficiency also causes secondary spectrin loss since ankyrin is spectrin’s principal membrane binding site.',
    },
    clinicalNote:
      'Chromosome 8p deletion encompassing ANK1 causes HS alongside intellectual disability and other congenital anomalies.',
  },
  {
    id: 'SPTB',
    symbol: 'SPTB',
    protein: {
      plain: 'Beta-Spectrin (Scaffold Filament)',
      clinical: 'β-Spectrin (SPTB)',
    },
    color: '#49687C',
    share: '~33–36%',
    defaultSphericity: 0.64,
    inheritance: {
      plain: 'Inherited from one parent (dominant)',
      clinical: 'Autosomal dominant (truly null biallelic SPTB variants appear embryonically lethal)',
    },
    severity: {
      plain: 'Usually mild to moderate',
      clinical:
        'Mild to moderate hemolytic anemia; predominantly nonsense variants, plus splicing, indels, and gross rearrangements',
    },
    smearHint: {
      plain: 'Round cells with occasional subtle surface projections',
      clinical: 'Acanthocytic spherocytes (observed morphology association)',
    },
    mechanism: {
      plain:
        'Beta-spectrin pairs with alpha-spectrin to weave the cell’s braided hexagonal inner mesh. Making too few strands leaves unanchored patches of lipid membrane that shed off.',
      clinical:
        'Quantitative β-spectrin deficiency lowers spectrin heterotetramer density and vertical coupling via ankyrin/band 3 complexes. Qualitative spectrin defects instead cause hereditary elliptocytosis (HE).',
    },
    clinicalNote:
      'Rare variants impairing both spectrin quantity and tetramer self-association cause hereditary spherocytic elliptocytosis or pyropoikilocytosis.',
  },
  {
    id: 'SLC4A1',
    symbol: 'SLC4A1',
    protein: {
      plain: 'Band 3 (Membrane Channel & Pillar)',
      clinical: 'Band 3 / Anion Exchanger 1 (SLC4A1)',
    },
    color: '#AD7243',
    share: '~4–13%*',
    defaultSphericity: 0.46,
    inheritance: {
      plain: 'Usually one parent (dominant); ultra-rare two-copy form',
      clinical: 'Typically autosomal dominant; ultra-rare biallelic null AR causes hydrops fetalis + distal RTA',
    },
    severity: {
      plain: 'Often mild or even without obvious anemia',
      clinical:
        'Usually mild or compensated hemolysis (*likely underestimated due to mildness); biallelic null is severe and unresponsive to splenectomy',
    },
    smearHint: {
      plain: 'Pincered or “mushroom-shaped” spherocytes',
      clinical: 'Pincered or mushroom-shaped spherocytes; secondary band 4.2 deficiency may co-occur',
    },
    mechanism: {
      plain:
        'Band 3 clusters pierce straight through the outer lipid wall to pin it to Ankyrin while exchanging ions. Missing Band 3 loosens the membrane’s cohesion so lipid droplets pinch off.',
      clinical:
        'AE1 exchanges HCO₃⁻/Cl⁻ and anchors the lipid bilayer via ankyrin and protein 4.2. Secondary band 3 loss occurs across all HS genotypes because band 3 is shed with lipid microvesicles.',
    },
    clinicalNote:
      'Other distinct SLC4A1 variants cause Southeast Asian ovalocytosis (Δ400–408), distal renal tubular acidosis, or cryohydrocytosis rather than HS.',
  },
  {
    id: 'SPTA1',
    symbol: 'SPTA1',
    protein: {
      plain: 'Alpha-Spectrin (Scaffold Filament)',
      clinical: 'α-Spectrin (SPTA1)',
    },
    color: '#6B5A7E',
    share: '~5–6%',
    defaultSphericity: 0.94,
    inheritance: {
      plain: 'Requires changes from both parents (recessive)',
      clinical: 'Autosomal recessive — each normal allele makes excess α-spectrin, so biallelic variants are required',
    },
    severity: {
      plain: 'Typically severe; often needs transfusions until surgery',
      clinical:
        'Classic genotype: null variant in trans to deep intronic c.4339-99C>T (α-LEPRA) → severe, transfusion-dependent, responds well to splenectomy',
    },
    smearHint: {
      plain: 'Dense, small, compact spherocytes',
      clinical: 'Dense, irregularly shaped cells; concomitant secondary β-spectrin reduction',
    },
    mechanism: {
      plain:
        'One healthy copy makes plenty of alpha-spectrin on its own, so HS appears only when both copies are affected — severely thinning the inner mesh and triggering heavy membrane loss.',
      clinical:
        'Loss of spectrin correlates strongly with hemolysis severity. Complete α-spectrin deficiency presents with near-fatal hydrops fetalis, reticulocytopenia, and no response to splenectomy (requiring lifelong transfusion/chelation or HSCT).',
    },
    clinicalNote:
      'In children remaining transfusion-dependent beyond 1 year of age, genetic testing is recommended to identify SPTA1-associated AR HS and guide management.',
  },
  {
    id: 'EPB42',
    symbol: 'EPB42',
    protein: {
      plain: 'Protein 4.2 (Anchor Clasp)',
      clinical: 'Protein 4.2 / Band 4.2 (EPB42)',
    },
    color: '#3F6F62',
    share: 'Rare',
    defaultSphericity: 0.56,
    inheritance: {
      plain: 'Requires changes from both parents (recessive)',
      clinical: 'Autosomal recessive; most prevalent in Japanese ancestry, with sporadic European and global cases',
    },
    severity: {
      plain: 'Typically mild to moderate; rarely transfusion-dependent',
      clinical: 'Mild to moderate HS; chronic transfusion dependence beyond infancy is generally not expected',
    },
    smearHint: {
      plain: 'Oval-shaped cells and occasional mouth-shaped cells',
      clinical: 'Ovalocytes and occasional ovalostomatocytes',
    },
    mechanism: {
      plain:
        'Protein 4.2 acts like a reinforcing clasp locking Band 3 and Ankyrin tightly together. Without it, the vertical junction loosens and the cell gradually rounds up.',
      clinical:
        'Band 4.2 strengthens the Band 3–ankyrin linkage. Secondary protein 4.2 deficiency can also result from homozygous Band 3 Montefiore (SLC4A1 c.118G>A, p.Glu40Lys).',
    },
    clinicalNote:
      'Historically referred to briefly as pallidin, which is now recognized as a separate protein.',
  },
];

// Table 2 (Da Costa et al., Blood 2001) — role of the spleen
export const SPLEEN_ROLE_TABLE = [
  { metric: 'Subjects (n)', controls: '37', hs: '25', splenect: '23' },
  { metric: 'Hemoglobin (g/dL)', controls: '13.9 ± 1.0', hs: '12.2 ± 1.5', splenect: '15.2 ± 1.3' },
  { metric: 'Reticulocytes (%)', controls: '1.0 ± 0.3', hs: '6.7 ± 3.5', splenect: '2.1 ± 1.0' },
  { metric: 'MCHC reticulocytes (g/dL)', controls: '26.6 ± 1.3', hs: '30.2 ± 2.5', splenect: '31.2 ± 1.2' },
  { metric: 'MCHC mature RBC (g/dL)', controls: '32.2 ± 0.7', hs: '36.1 ± 1.6', splenect: '36.1 ± 0.8' },
];

export const INHERITANCE_STATS = [
  {
    label: { plain: 'Passed from one parent', clinical: 'Autosomal Dominant' },
    percent: '65–70%',
    width: 68,
    genes: 'ANK1, SLC4A1, SPTB',
    detail: {
      plain: 'A single altered copy is enough to cause HS, usually mild to moderate.',
      clinical: 'Heterozygous pathogenic variants; generally not transfusion-dependent beyond infancy.',
    },
  },
  {
    label: { plain: 'New spontaneous change', clinical: 'De Novo Variants' },
    percent: '15–20%',
    width: 18,
    genes: 'Most often ANK1',
    detail: {
      plain: 'Neither parent carries HS — the variant arises for the first time in the child.',
      clinical: 'Predominantly ANK1 due to high G/C content predisposing to slipped-strand mispairing; acts as new AD disease.',
    },
  },
  {
    label: { plain: 'Passed from both parents', clinical: 'Autosomal Recessive' },
    percent: '5–15%',
    width: 14,
    genes: 'SPTA1, EPB42, rare ANK1 / SLC4A1',
    detail: {
      plain: 'Both parents are unaffected carriers; SPTA1 forms tend to be more severe.',
      clinical: 'Biallelic variants; SPTA1 null + α-LEPRA causes severe HS responsive to splenectomy.',
    },
  },
];

export const DIAGNOSTIC_TESTS = [
  {
    name: 'EMA Binding',
    sensitivity: '93–96%',
    sample: '~5 μL blood · ~2 hr turnaround',
    summary: {
      plain: 'A fluorescent dye test measuring how much Band 3 membrane protein remains on red blood cells. Widely used and ideal for newborns because it needs only a tiny drop of blood.',
      clinical: 'Eosin-5-maleimide flow cytometry detects band 3 and Rh-related protein loss (mean fluorescence ~2/3 of controls). Sensitivity 93–96%, specificity 93–99% vs. normal RBCs; remains usable post-transfusion, though also positive in HPP, SAO, AIHA, and CDA-II.',
    },
  },
  {
    name: 'Osmotic Gradient Ektacytometry (OGE)',
    sensitivity: '~100% assay sensitivity',
    sample: '≥0.3 mL blood',
    summary: {
      plain: 'The gold-standard flexibility test: stretches red blood cells with a laser across changing salt levels to distinguish HS cleanly from look-alike membrane conditions.',
      clinical: 'Reference method measuring RBC deformability under shear stress across an osmotic gradient. Crucial for differentiating HS from hereditary xerocytosis (HX) prior to splenectomy; reduced sensitivity after recent transfusion.',
    },
  },
  {
    name: 'Osmotic Fragility (OFT)',
    sensitivity: '68% fresh · 81% incubated',
    sample: 'Fresh or 24-hr incubated RBCs',
    summary: {
      plain: 'The traditional salt-water test showing how early spherocytes burst in dilute saline. Less sensitive on its own, especially in newborns.',
      clinical: 'Measures hemoglobin release across hypotonic buffered saline concentrations; 24-hour incubation improves yield (81% vs. 68% fresh), though false positives occur in AIHA, HDFN, G6PD deficiency, and unstable hemoglobins.',
    },
  },
  {
    name: 'Next-Generation DNA Sequencing (NGS)',
    sensitivity: '89–97% yield in cohorts',
    sample: 'DNA panel (unaffected by transfusions)',
    summary: {
      plain: 'Reads the five HS genes directly. Essential if a child needs ongoing transfusions (when blood cell tests are clouded by donor cells) or before considering splenectomy.',
      clinical: 'Identifies familial variants for prognosis, genetic counseling, and ruling out PIEZO1/KCNN4 hereditary xerocytosis (where splenectomy is contraindicated due to life-threatening VTE/arterial thrombosis).',
    },
  },
];
