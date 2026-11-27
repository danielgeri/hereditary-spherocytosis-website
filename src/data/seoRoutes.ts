import { DualText, GeneId } from './hsContent';

export interface FaqEntry {
  question: string;
  answer: DualText;
}

export interface KeyFact {
  label: string;
  value: string;
  detail: DualText;
}

export interface PubMedReference {
  id: string;
  citation: string;
  journal: string;
  pmid: string;
  url: string;
  topic: string;
}

export interface SeoRouteConfig {
  path: string;
  kind: 'home' | 'gene' | 'topic';
  shortLabel: string;
  title: string;
  description: string;
  kicker: string;
  h1: string;
  lead: DualText;
  scenePreset: {
    dive: number;
    gene: GeneId;
    severity?: number;
  };
  keyFacts?: KeyFact[];
  deepDiveParagraphs?: DualText[];
  faqs: FaqEntry[];
  relatedPaths: string[];
  geneId?: GeneId;
}

export const SITE_ORIGIN = 'https://hs.geri.io';
export const SITE_LAST_UPDATED = '2026-11-26';

export const PUBMED_REFERENCES: PubMedReference[] = [
  {
    id: 'bcsh-2012',
    citation: 'Bolton-Maggs PH, Langer JC, Iolascon A, Tittensor P, King MJ.',
    journal: 'Guidelines for the diagnosis and management of hereditary spherocytosis — 2011 update. Br J Haematol. 2012.',
    pmid: '22055020',
    url: 'https://pubmed.ncbi.nlm.nih.gov/22055020/',
    topic: 'BCSH Diagnosis & Management Guideline',
  },
  {
    id: 'icsh-2015',
    citation: 'King MJ, Garçon L, Hoyer JD, et al.',
    journal: 'ICSH guidelines for the laboratory diagnosis of nonimmune hereditary red cell membrane disorders. Int J Lab Hematol. 2015.',
    pmid: '25790109',
    url: 'https://pubmed.ncbi.nlm.nih.gov/25790109/',
    topic: 'EMA Binding & Lab Diagnostics',
  },
  {
    id: 'eha-2017',
    citation: 'Iolascon A, Andolfo I, Barcellini W, et al.',
    journal: 'Recommendations regarding splenectomy in hereditary hemolytic anemias. Haematologica. 2017.',
    pmid: '28550188',
    url: 'https://pubmed.ncbi.nlm.nih.gov/28550188/',
    topic: 'EHA Splenectomy & Xerocytosis Contraindication',
  },
  {
    id: 'perrotta-2008',
    citation: 'Perrotta S, Gallagher PG, Mohandas N.',
    journal: 'Hereditary spherocytosis. The Lancet. 2008.',
    pmid: '18940465',
    url: 'https://pubmed.ncbi.nlm.nih.gov/18940465/',
    topic: 'Molecular Membrane Biology Review',
  },
  {
    id: 'dacosta-2001',
    citation: 'Da Costa L, Mohandas N, Sorette M, et al.',
    journal: 'Temporal differences in membrane loss lead to distinct reticulocyte features in hereditary spherocytosis and in immune hemolytic anemia. Blood. 2001.',
    pmid: '11698268',
    url: 'https://pubmed.ncbi.nlm.nih.gov/11698268/',
    topic: 'Reticulocyte Membrane Loss & Spleen Metrics',
  },
  {
    id: 'evans-fung-1972',
    citation: 'Evans E, Fung YC.',
    journal: 'Improved measurements of the erythrocyte geometry. Microvasc Res. 1972.',
    pmid: '4635577',
    url: 'https://pubmed.ncbi.nlm.nih.gov/4635577/',
    topic: 'Parametric 3D Biconcave Erythrocyte Equation',
  },
];

export const SEO_ROUTES: SeoRouteConfig[] = [
  {
    path: '/',
    kind: 'home',
    shortLabel: '3D Atlas Overview',
    title: 'Hereditary Spherocytosis — Interactive 3D Red Blood Cell Atlas',
    description:
      'Explore hereditary spherocytosis in 3D from a 7.5 μm red blood cell down to 10 nm Ankyrin-1, Band 3, Protein 4.2, and Spectrin complexes, plus genetics, EMA testing, and care.',
    kicker: '7.5 μm → 10 nm · Interactive 3D Erythrocyte',
    h1: 'Hereditary Spherocytosis',
    lead: {
      plain:
        'Explore how missing membrane anchors reshape a red blood cell. Drag to orbit, pick a gene below, or dive inside the membrane down to 10 nm.',
      clinical:
        'Interactive parametric erythrocyte with Beer–Lambert hemoglobin optics. Drill directly through the phospholipid bilayer into the vertical ankyrin–band 3–spectrin complex.',
    },
    scenePreset: { dive: 0.0, gene: 'healthy', severity: 0.0 },
    faqs: [
      {
        question: 'Which five genes cause hereditary spherocytosis?',
        answer: {
          plain:
            'Hereditary spherocytosis is caused by variants in five genes that anchor a red blood cell’s outer membrane to its inner scaffold: ANK1 (ankyrin-1, ~49–53%), SPTB (beta-spectrin, ~33–36%), SLC4A1 (band 3, ~4–13%), SPTA1 (alpha-spectrin, ~5–6%), and EPB42 (protein 4.2, rare).',
          clinical:
            'Pathogenic variants occur in ANK1 (~49–53%), SPTB (~33–36%), SLC4A1 (~4–13%, likely underestimated in mild cases), SPTA1 (~5–6%, autosomal recessive), and EPB42 (autosomal recessive, higher prevalence in Japanese ancestry). All five impair vertical bilayer-to-cytoskeleton tethering.',
        },
      },
      {
        question: 'What MCHC level suggests hereditary spherocytosis?',
        answer: {
          plain:
            'An elevated mean corpuscular hemoglobin concentration (MCHC) of 36 g/dL or higher is often the strongest routine CBC clue — because losing outer membrane packs the same hemoglobin into a tighter sphere. In newborns, MCHC typically runs 35–38 g/dL.',
          clinical:
            'MCHC ≥36 g/dL (often paired with elevated RDW) is the most useful routine red cell index for screening HS, particularly in neonates (typical neonatal HS MCHC 35–38 g/dL vs. 33–36 g/dL in alloimmune HDFN).',
        },
      },
      {
        question: 'What is the most accurate test to confirm hereditary spherocytosis?',
        answer: {
          plain:
            'Doctors typically confirm HS with the EMA binding test (fast, accurate, needs only a tiny drop of blood) or osmotic gradient ektacytometry (the gold-standard flexibility test), and increasingly use an NGS DNA panel when a child receives transfusions or before splenectomy.',
          clinical:
            'Eosin-5-maleimide (EMA) flow cytometry (93–96% sensitivity, 93–99% specificity) and osmotic gradient ektacytometry (OGE, ~100% assay sensitivity) are preferred phenotypic assays; targeted NGS (89–97% yield) is essential in transfusion-dependent patients and prior to splenectomy to exclude PIEZO1/KCNN4 hereditary xerocytosis.',
        },
      },
      {
        question: 'Why must hereditary xerocytosis be ruled out before splenectomy?',
        answer: {
          plain:
            'Hereditary xerocytosis can mimic HS on routine blood work, but removing the spleen does not fix hemolysis in xerocytosis and creates a dangerous risk of serious blood clots — so confirming true HS with ektacytometry or DNA testing first is critical.',
          clinical:
            'Dehydrated hereditary stomatocytosis / hereditary xerocytosis (PIEZO1 or KCNN4) is an absolute contraindication to splenectomy because surgery fails to resolve hemolysis and carries high rates of severe venous and arterial thromboembolism.',
        },
      },
    ],
    relatedPaths: [
      '/genes/ank1/',
      '/genes/sptb/',
      '/genes/slc4a1/',
      '/genes/spta1/',
      '/genes/epb42/',
      '/diagnosis/ema-binding-test/',
      '/diagnosis/mchc-newborn-hs/',
      '/hs-vs-hereditary-xerocytosis/',
    ],
  },
  {
    path: '/genes/ank1/',
    kind: 'gene',
    geneId: 'ANK1',
    shortLabel: 'ANK1 · Ankyrin-1',
    title: 'ANK1 (Ankyrin-1) in Hereditary Spherocytosis — 3D Protein Model',
    description:
      'Interactive 10 nm 3D model of Ankyrin-1 (ANK1), the #1 gene in hereditary spherocytosis (~49–53% of cases). Learn its dominant and de novo inheritance, solenoid bridge mechanics, and severity.',
    kicker: 'Gene Guide · ~49–53% of HS Cases',
    h1: 'ANK1 (Ankyrin-1) in Hereditary Spherocytosis',
    lead: {
      plain:
        'ANK1 is the single most common cause of hereditary spherocytosis. It builds the curved protein arch that clamps Band 3 in the outer membrane down onto the coiled spectrin mesh underneath.',
      clinical:
        'ANK1 variants account for roughly half of all HS cohorts and represent the most frequent source of de novo HS variants. Over 250 private pathogenic variants are cataloged across its high-G/C locus on chromosome 8p11.21.',
    },
    scenePreset: { dive: 1.0, gene: 'ANK1', severity: 0.74 },
    keyFacts: [
      {
        label: 'Share of HS',
        value: '~49–53%',
        detail: {
          plain: 'Most common genetic cause worldwide, especially in European-ancestry cohorts.',
          clinical: 'Leading HS locus (~49–53%); predominant driver of sporadic de novo cases.',
        },
      },
      {
        label: 'Inheritance',
        value: 'Dominant / De Novo',
        detail: {
          plain: 'Usually passed from one parent or arises brand-new in the child; rare two-copy forms exist.',
          clinical: 'Monoallelic AD or de novo (high G/C slipped-strand mispairing); rare biallelic AR.',
        },
      },
      {
        label: '3D Structure',
        value: '24-Repeat Solenoid',
        detail: {
          plain: 'Curved horseshoe bridge linking Band 3 channels above to β-spectrin coils below.',
          clinical: 'N-terminal ANK-repeat membrane-binding solenoid + ZU5/UPA spectrin-binding domain.',
        },
      },
      {
        label: 'Severity Range',
        value: 'Mild to Moderate',
        detail: {
          plain: 'Single-copy forms are typically mild to moderate; rare two-copy forms are severe and respond well to splenectomy.',
          clinical: 'Monoallelic ≤50% expression causes mild–moderate HS; biallelic null + hypomorph causes severe transfusion-dependent, splenectomy-responsive HS.',
        },
      },
    ],
    deepDiveParagraphs: [
      {
        plain:
          'In the 10 nm 3D view above, Ankyrin-1 is the curved crimson arch sitting directly between golden Band 3 pillars and the braided blue/violet spectrin cables underneath. Because Ankyrin-1 is spectrin’s main docking point on the membrane, losing half of your Ankyrin-1 bridges also reduces how much spectrin stays anchored — allowing unpinned pockets of lipid bilayer to pinch off as microvesicles.',
        clinical:
          'Because ankyrin-1 provides the principal high-affinity binding site for β-spectrin on the erythrocyte membrane, primary ANK1 deficiency routinely produces secondary spectrin deficiency on membrane protein quantification. Contiguous chromosome 8p deletions encompassing ANK1 can pair HS with neurodevelopmental anomalies.',
      },
    ],
    faqs: [
      {
        question: 'Can a child have ANK1 hereditary spherocytosis if neither parent has HS?',
        answer: {
          plain:
            'Yes — ANK1 is the most frequent cause of “de novo” (brand-new) hereditary spherocytosis. Roughly 15–20% of all HS cases happen spontaneously for the first time in a child, most often in ANK1, and can then be passed on in a dominant (50%) pattern in future generations.',
          clinical:
            'Yes. High G/C content in ANK1 predisposes to slipped-strand mispairing during replication, making ANK1 the leading source of de novo HS variants (accounting for a majority of the 15–20% sporadic HS fraction).',
        },
      },
      {
        question: 'How severe is ANK1 hereditary spherocytosis?',
        answer: {
          plain:
            'Most people with a single altered ANK1 copy have mild to moderate HS and manage with routine monitoring, folate when advised, and watching for viral aplastic crises. Rare two-copy (biallelic) ANK1 variants cause more severe anemia that typically responds very well to splenectomy.',
          clinical:
            'Heterozygous ANK1 HS is generally mild to moderate and rarely transfusion-dependent past infancy; biallelic (null + hypomorphic/missense) ANK1 HS is severe and transfusion-dependent, yet characteristically responsive to splenectomy.',
        },
      },
      {
        question: 'Does ANK1 cause distinctive cells on a peripheral blood smear?',
        answer: {
          plain:
            'Smears typically show round spherocytes of noticeably varied sizes (anisocytosis) lacking their pale center, though cell shape alone cannot reliably identify the exact gene without DNA testing.',
          clinical:
            'Anisocytic spherocytes have been observed in association with ANK1 variants, though morphology overlaps broadly across genotypes and is not diagnostic of the specific locus.',
        },
      },
    ],
    relatedPaths: ['/genes/sptb/', '/genes/slc4a1/', '/genes/spta1/', '/diagnosis/ema-binding-test/', '/'],
  },
  {
    path: '/genes/sptb/',
    kind: 'gene',
    geneId: 'SPTB',
    shortLabel: 'SPTB · β-Spectrin',
    title: 'SPTB (β-Spectrin) in Hereditary Spherocytosis — 3D Protein Model',
    description:
      'Explore β-Spectrin (SPTB) in 3D at 10 nm. Accounting for ~33–36% of hereditary spherocytosis cases, SPTB weaves the coiled inner scaffold that keeps erythrocytes flexible.',
    kicker: 'Gene Guide · ~33–36% of HS Cases',
    h1: 'SPTB (β-Spectrin) in Hereditary Spherocytosis',
    lead: {
      plain:
        'SPTB is the second most common gene in hereditary spherocytosis. It builds the beta-spectrin strand that braids together with alpha-spectrin to form the red blood cell’s elastic hexagonal inner mesh.',
      clinical:
        'Heterozygous quantitative SPTB variants represent ~33–36% of HS cohorts, typically via nonsense, splicing, indel, or structural rearrangement variants that reduce spectrin heterotetramer density.',
    },
    scenePreset: { dive: 1.0, gene: 'SPTB', severity: 0.64 },
    keyFacts: [
      {
        label: 'Share of HS',
        value: '~33–36%',
        detail: {
          plain: 'Second leading genetic cause of HS across published cohorts.',
          clinical: 'Second most prevalent HS gene (~33–36%), predominantly autosomal dominant.',
        },
      },
      {
        label: 'Inheritance',
        value: 'Dominant (AD)',
        detail: {
          plain: 'Usually inherited from one parent; inheriting two completely absent copies is not viable.',
          clinical: 'Autosomal dominant; truly biallelic null SPTB variants appear embryonically lethal.',
        },
      },
      {
        label: 'Smear Clue',
        value: 'Acanthocytic Hint',
        detail: {
          plain: 'Round spherocytes with occasional subtle irregular surface projections.',
          clinical: 'Observed association with occasional acanthocytic spherocytes (non-specific).',
        },
      },
      {
        label: 'HS vs. HE',
        value: 'Quantity vs. Quality',
        detail: {
          plain: 'Making too little β-spectrin causes round spherocytes (HS); faulty end-to-end links cause oval elliptocytes (HE).',
          clinical: 'Quantitative β-spectrin deficiency drives HS; qualitative tetramer self-association defects produce hereditary elliptocytosis (HE).',
        },
      },
    ],
    deepDiveParagraphs: [
      {
        plain:
          'In the 3D complex above, β-spectrin is the steel-blue coiled strand braided around violet α-spectrin right beneath the crimson Ankyrin-1 saddle. When one SPTB copy stops producing normal protein, the inner scaffold thins out — leaving gaps of unanchored lipid membrane that shed away in circulation.',
        clinical:
          'Unlike α-spectrin (which is synthesized in ~3–4× molar excess), β-spectrin synthesis is rate-limiting for α/β-spectrin heterodimer assembly. Consequently, a single heterozygous SPTB loss-of-function allele lowers membrane spectrin density enough to produce autosomal dominant HS. Rare variants impairing both quantity and tetramer self-association yield hereditary spherocytic elliptocytosis or pyropoikilocytosis.',
      },
    ],
    faqs: [
      {
        question: 'Why does a single SPTB mutation cause HS while SPTA1 requires two?',
        answer: {
          plain:
            'Red blood cell precursors normally make extra alpha-spectrin (SPTA1), so one working SPTA1 copy covers the gap. Beta-spectrin (SPTB) is made in tighter supply — so losing even one SPTB copy immediately limits how many coiled spectrin filaments the cell can build.',
          clinical:
            'β-spectrin production is rate-limiting during erythropoiesis whereas α-spectrin is synthesized in excess; thus heterozygous SPTB deficiency causes AD HS, while SPTA1 HS requires biallelic inheritance.',
        },
      },
      {
        question: 'What is the difference between SPTB hereditary spherocytosis and hereditary elliptocytosis?',
        answer: {
          plain:
            'Variants that reduce the amount of beta-spectrin weaken vertical tethering and cause round spherocytes (HS). Variants that alter how spectrin strands lock together horizontally cause elongated oval cells (hereditary elliptocytosis).',
          clinical:
            'Quantitative SPTB defects impair vertical membrane cohesion (HS), whereas qualitative missense defects at the N-terminal spectrin self-association domain disrupt horizontal tetramerization (HE).',
        },
      },
    ],
    relatedPaths: ['/genes/ank1/', '/genes/spta1/', '/genes/slc4a1/', '/diagnosis/ema-binding-test/', '/'],
  },
  {
    path: '/genes/slc4a1/',
    kind: 'gene',
    geneId: 'SLC4A1',
    shortLabel: 'SLC4A1 · Band 3',
    title: 'SLC4A1 (Band 3) in Hereditary Spherocytosis — 3D Channel Model',
    description:
      'Inspect Band 3 (SLC4A1) in 3D at 10 nm. Explore its dual role as an ion channel and vertical membrane pillar, mushroom/pincer cell morphology, and why EMA dye measures Band 3.',
    kicker: 'Gene Guide · ~4–13%* of HS Cases',
    h1: 'SLC4A1 (Band 3) in Hereditary Spherocytosis',
    lead: {
      plain:
        'SLC4A1 encodes Band 3 — the abundant golden pillar-shaped channel piercing straight through the red blood cell’s outer lipid wall, anchoring it to Ankyrin-1 and Protein 4.2 while carrying bicarbonate and chloride ions.',
      clinical:
        'Band 3 (AE1 / SLC4A1) forms transmembrane dimers and tetramers coupling the lipid bilayer directly to ankyrin-1 and protein 4.2. Dominant SLC4A1 HS is typically mild or compensated and is likely under-represented in severe clinical cohorts.',
    },
    scenePreset: { dive: 1.0, gene: 'SLC4A1', severity: 0.46 },
    keyFacts: [
      {
        label: 'Share of HS',
        value: '~4–13%*',
        detail: {
          plain: '*Likely underestimated because many people with Band 3 HS have mild or near-normal hemoglobin.',
          clinical: 'Reported ~4–13% in tertiary cohorts; mild/compensated cases often go undiagnosed.',
        },
      },
      {
        label: 'Smear Clue',
        value: 'Mushroom / Pincer',
        detail: {
          plain: 'Characteristic “pincered” or mushroom-shaped spherocytes may appear on blood smears.',
          clinical: 'Pincered or mushroom-shaped RBCs are classically associated with Band 3 deficiency.',
        },
      },
      {
        label: 'EMA Test Target',
        value: 'Direct Dye Target',
        detail: {
          plain: 'The fluorescent EMA diagnostic dye binds directly onto Band 3 proteins on the cell surface.',
          clinical: 'Eosin-5-maleimide covalently labels Lys430 on Band 3; secondary Band 3 loss also lowers EMA in ANK1/SPTB HS.',
        },
      },
      {
        label: 'Other SLC4A1 Conditions',
        value: 'SAO & Distal RTA',
        detail: {
          plain: 'Different changes in the same gene can instead cause Southeast Asian ovalocytosis or kidney acid-balance conditions.',
          clinical: 'Distinct SLC4A1 variants cause SAO (Δ400–408), distal renal tubular acidosis, or cryohydrocytosis rather than classic HS.',
        },
      },
    ],
    deepDiveParagraphs: [
      {
        plain:
          'In the 10 nm 3D view above, Band 3 sits directly inside the phospholipid bilayer flanked by slender Glycophorin A stalks, with its twin cytoplasmic feet docking onto Ankyrin-1 and Protein 4.2. Even when HS is caused by ANK1 or SPTB instead of SLC4A1, losing membrane microvesicles carries Band 3 away with them — which is why the EMA dye test catches almost all HS genotypes.',
        clinical:
          'Heterozygous SLC4A1 HS is typically mild to moderate and occasionally accompanied by secondary protein 4.2 reduction. Ultra-rare biallelic null SLC4A1 deficiency causes life-threatening hydrops fetalis, severe hemolytic anemia unresponsive to splenectomy, and distal renal tubular acidosis (because renal α-intercalated cells express truncated AE1).',
      },
    ],
    faqs: [
      {
        question: 'Why are mushroom-shaped or pincered red blood cells linked to SLC4A1?',
        answer: {
          plain:
            'Band 3 deficiency can give a subset of spherocytes a subtle pinched-in contour resembling a mushroom cap on peripheral blood smears. Seeing pincer cells is a helpful visual clue pointing toward SLC4A1, though DNA sequencing confirms the genotype.',
          clinical:
            'Pincered (“mushroom”) erythrocytes are an observed morphologic association in Band 3 (SLC4A1) HS, though sensitivity is limited and confirmation relies on EMA/OGE and NGS.',
        },
      },
      {
        question: 'Does Band 3 HS usually require a splenectomy?',
        answer: {
          plain:
            'Most single-copy (dominant) Band 3 HS is mild or even fully compensated without anemia, so many people never need splenectomy — though gallstones and viral drops in blood counts are still monitored over time.',
          clinical:
            'Monoallelic SLC4A1 HS is frequently mild or compensated; splenectomy is reserved for symptomatic moderate–severe hemolysis. Ultra-rare biallelic Band 3 null HS does not respond to splenectomy.',
        },
      },
    ],
    relatedPaths: ['/diagnosis/ema-binding-test/', '/genes/ank1/', '/genes/epb42/', '/genes/sptb/', '/'],
  },
  {
    path: '/genes/spta1/',
    kind: 'gene',
    geneId: 'SPTA1',
    shortLabel: 'SPTA1 · α-Spectrin',
    title: 'SPTA1 (α-Spectrin) in Hereditary Spherocytosis — 3D Spectrin Model',
    description:
      'Visualize α-Spectrin (SPTA1) in 3D at 10 nm. Learn why SPTA1 HS is autosomal recessive, the role of the α-LEPRA allele, severe transfusion-dependent presentation, and splenectomy response.',
    kicker: 'Gene Guide · ~5–6% of HS Cases (Recessive)',
    h1: 'SPTA1 (α-Spectrin) in Hereditary Spherocytosis',
    lead: {
      plain:
        'SPTA1 builds alpha-spectrin, the violet partner strand in the red blood cell’s coiled inner scaffold. Because one healthy copy produces abundant extra alpha-spectrin, HS occurs only when both copies are affected.',
      clinical:
        'SPTA1-associated HS (~5–6% of cases) is inherited in an autosomal recessive pattern, most classically combining a null SPTA1 allele in trans with the deep intronic hypomorphic α-LEPRA variant (c.4339-99C>T).',
    },
    scenePreset: { dive: 1.0, gene: 'SPTA1', severity: 0.94 },
    keyFacts: [
      {
        label: 'Share of HS',
        value: '~5–6%',
        detail: {
          plain: 'Less common overall, but over-represented among severe infant transfusion-dependent cases.',
          clinical: '~5–6% of all HS; leading molecular etiology in severe autosomal recessive HS.',
        },
      },
      {
        label: 'Inheritance',
        value: 'Recessive (AR)',
        detail: {
          plain: 'Both parents are typically unaffected carriers with normal blood counts.',
          clinical: 'Biallelic AR — normal α-spectrin is produced in 3–4× excess, masking single-copy carriers.',
        },
      },
      {
        label: 'Classic Variant',
        value: 'Null + α-LEPRA',
        detail: {
          plain: 'A severe loss copy paired with a low-output copy (α-LEPRA) causes severe anemia that responds well to splenectomy.',
          clinical: 'Null allele in trans to c.4339-99C>T (α-LEPRA) yields severe transfusion-dependent, splenectomy-responsive HS.',
        },
      },
      {
        label: 'Null Biallelic Form',
        value: 'Splenectomy Non-Responder',
        detail: {
          plain: 'Ultra-rare complete absence of alpha-spectrin does not respond to splenectomy — making DNA testing essential before surgery.',
          clinical: 'Complete biallelic α-spectrin null causes near-fatal hydrops fetalis, reticulocytopenia, and no response to splenectomy.',
        },
      },
    ],
    deepDiveParagraphs: [
      {
        plain:
          'Because a child with SPTA1 HS has changes in both copies, the coiled inner mesh loses far more structural density than in typical dominant HS — producing compact, dense spherocytes with severe early membrane loss. Genetic testing is strongly recommended for any infant who still needs red blood cell transfusions past age one, because knowing the exact SPTA1 variant pair guides whether splenectomy will work.',
        clinical:
          'Quantitative spectrin loss correlates closely with hemolysis severity and secondary β-spectrin depletion. Identifying biallelic SPTA1 genotypes via NGS (including deep intronic coverage for c.4339-99C>T α-LEPRA) is critical in transfusion-dependent children past 12 months to distinguish splenectomy-responsive α-LEPRA compound heterozygotes from splenectomy-unresponsive complete α-spectrin nulls.',
      },
    ],
    faqs: [
      {
        question: 'Why is genetic testing recommended if a child needs transfusions past age 1?',
        answer: {
          plain:
            'Many newborns with dominant HS need a few early transfusions in the first year and then stabilize. Ongoing transfusion need past age 1 often points to recessive SPTA1 (or biallelic ANK1) HS — and checking the exact DNA variants confirms whether splenectomy will help or whether another plan is needed.',
          clinical:
            'Persistent transfusion dependence past 12 months warrants NGS testing to identify biallelic SPTA1 (ensuring intronic α-LEPRA coverage) or ANK1 HS and verify expected splenectomy responsiveness prior to surgery.',
        },
      },
      {
        question: 'Do parents of a child with SPTA1 HS have abnormal blood tests?',
        answer: {
          plain:
            'Usually no — because one working SPTA1 copy makes plenty of alpha-spectrin on its own, carrier parents typically have completely normal red blood cells and no symptoms.',
          clinical:
            'Carrier parents are typically hematologically normal on CBC, smear, and EMA testing because wild-type SPTA1 expression exceeds stoichiometric β-spectrin requirements.',
        },
      },
    ],
    relatedPaths: ['/genes/sptb/', '/genes/ank1/', '/diagnosis/mchc-newborn-hs/', '/hs-vs-hereditary-xerocytosis/', '/'],
  },
  {
    path: '/genes/epb42/',
    kind: 'gene',
    geneId: 'EPB42',
    shortLabel: 'EPB42 · Protein 4.2',
    title: 'EPB42 (Protein 4.2) in Hereditary Spherocytosis — 3D Clasp Model',
    description:
      'Explore Protein 4.2 (EPB42) in 3D at 10 nm. Learn how this stabilizing clasp bridges Band 3 and Ankyrin-1, its recessive inheritance, higher prevalence in Japan, and mild-to-moderate course.',
    kicker: 'Gene Guide · Rare (Recessive)',
    h1: 'EPB42 (Protein 4.2) in Hereditary Spherocytosis',
    lead: {
      plain:
        'EPB42 makes Protein 4.2 — the compact green reinforcing clasp nestled right beside Band 3 and Ankyrin-1 that helps lock the vertical membrane junction tightly together.',
      clinical:
        'EPB42 encodes Band 4.2 (a catalytically inactive transglutaminase-fold protein anchored to the bilayer by N-terminal myristoylation) that stabilizes Band 3–ankyrin-1 coupling. Deficiency is autosomal recessive and typically mild to moderate.',
    },
    scenePreset: { dive: 1.0, gene: 'EPB42', severity: 0.56 },
    keyFacts: [
      {
        label: 'Inheritance',
        value: 'Recessive (AR)',
        detail: {
          plain: 'Requires variants from both parents; carrier parents are unaffected.',
          clinical: 'Autosomal recessive; secondary Band 4.2 loss also occurs with homozygous Band 3 Montefiore (SLC4A1 p.Glu40Lys).',
        },
      },
      {
        label: 'Population Pattern',
        value: 'Higher in Japan',
        detail: {
          plain: 'Rare globally, with the highest frequency reported in Japanese ancestry.',
          clinical: 'Accounts for a substantially higher share of HS in Japanese cohorts (e.g. Protein 4.2 Nippon), with sporadic European and global cases.',
        },
      },
      {
        label: 'Smear Clue',
        value: 'Ovalostomatocytes',
        detail: {
          plain: 'Often shows oval-shaped red cells alongside occasional mouth-shaped cells (stomatocytes).',
          clinical: 'Ovalocytes and occasional ovalostomatocytes may be seen on peripheral blood smear.',
        },
      },
      {
        label: 'Typical Severity',
        value: 'Mild to Moderate',
        detail: {
          plain: 'Chronic transfusion dependence beyond infancy is generally not expected.',
          clinical: 'Typically mild–moderate compensated or modestly anemic HS; rarely transfusion-dependent.',
        },
      },
    ],
    deepDiveParagraphs: [
      {
        plain:
          'In the 10 nm 3D view above, Protein 4.2 is the emerald multi-lobed clasp gripping the side of golden Band 3 and touching the crimson Ankyrin-1 arch. Because Band 3 and Ankyrin-1 can still bind each other directly even when Protein 4.2 is missing, EPB42 hereditary spherocytosis is usually milder than severe spectrin or biallelic ankyrin defects.',
        clinical:
          'Because direct Band 3–ankyrin-1 interaction persists in the absence of Band 4.2, EPB42-deficient erythrocytes experience a milder vertical tethering deficit than severe spectrin defects. Note that homozygous SLC4A1 Band 3 Montefiore (c.118G>A, p.Glu40Lys) abolishes the Band 4.2 binding site on Band 3, producing secondary Protein 4.2 deficiency with an intact EPB42 gene.',
      },
    ],
    faqs: [
      {
        question: 'Can Protein 4.2 be missing even if the EPB42 gene itself is normal?',
        answer: {
          plain:
            'Yes — a specific variant in Band 3 (called Band 3 Montefiore) removes the docking pocket where Protein 4.2 attaches, causing secondary Protein 4.2 deficiency even though the EPB42 gene is intact.',
          clinical:
            'Yes. Homozygous Band 3 Montefiore (SLC4A1 c.118G>A, p.Glu40Lys) disrupts the Band 4.2 binding site on Band 3’s cytoplasmic domain, causing secondary Protein 4.2 deficiency.',
        },
      },
      {
        question: 'Is EPB42 hereditary spherocytosis usually severe?',
        answer: {
          plain:
            'Typically no — most people with EPB42 HS experience mild to moderate hemolysis and do not require ongoing red blood cell transfusions past infancy.',
          clinical:
            'EPB42 HS is generally mild to moderate; persistent transfusion dependence beyond infancy is uncommon.',
        },
      },
    ],
    relatedPaths: ['/genes/slc4a1/', '/genes/ank1/', '/genes/sptb/', '/diagnosis/ema-binding-test/', '/'],
  },
  {
    path: '/diagnosis/ema-binding-test/',
    kind: 'topic',
    shortLabel: 'EMA Binding & OGE',
    title: 'EMA Binding Test & Ektacytometry in Hereditary Spherocytosis',
    description:
      'How the eosin-5-maleimide (EMA) binding test works on Band 3 (93–96% sensitivity), how it compares to osmotic gradient ektacytometry (OGE) and osmotic fragility, and key false positives.',
    kicker: 'Diagnostics Guide · Confirmatory Testing',
    h1: 'EMA Binding Test & Ektacytometry in Hereditary Spherocytosis',
    lead: {
      plain:
        'The EMA binding test uses a fluorescent dye that sticks to Band 3 proteins on the red blood cell membrane. Because spherocytes shed membrane and lose Band 3, they glow about a third dimmer than normal cells.',
      clinical:
        'Eosin-5-maleimide (EMA) flow cytometry (sensitivity 93–96%, specificity 93–99%) and osmotic gradient ektacytometry (OGE) have largely replaced incubated osmotic fragility testing as preferred confirmatory assays for HS.',
    },
    scenePreset: { dive: 0.79, gene: 'SLC4A1', severity: 0.65 },
    keyFacts: [
      {
        label: 'EMA Sensitivity',
        value: '93–96%',
        detail: {
          plain: 'Catches nearly all HS cases across ANK1, SPTB, SLC4A1, SPTA1, and EPB42.',
          clinical: '93–96% sensitivity and 93–99% specificity vs. healthy controls; mean fluorescence ~2/3 of normal.',
        },
      },
      {
        label: 'Sample Needed',
        value: '~5 μL Blood',
        detail: {
          plain: 'Requires only a tiny droplet of blood (~2-hour lab turnaround), making it ideal for newborns.',
          clinical: 'Micro-volume (~5 μL) flow cytometry assay; remains interpretable even after recent RBC transfusion.',
        },
      },
      {
        label: 'Gold Standard',
        value: 'Ektacytometry (OGE)',
        detail: {
          plain: 'Stretches cells with a laser across salt gradients to separate HS cleanly from look-alike xerocytosis.',
          clinical: 'Measures shear deformability across an osmotic gradient (~100% assay sensitivity); distinguishes HS from HSt/HX.',
        },
      },
      {
        label: 'Watch-Out Mimics',
        value: 'CDA II · AIHA · SAO',
        detail: {
          plain: 'A low EMA result can also happen in immune hemolysis, Southeast Asian ovalocytosis, or CDA type II.',
          clinical: 'False-positive low EMA occurs in AIHA, CDA type II (SEC23B), SAO, HPP, and cryohydrocytosis — always pair with DAT and reticulocyte count.',
        },
      },
    ],
    deepDiveParagraphs: [
      {
        plain:
          'In the 40 nm membrane cutaway above, look at the golden Band 3 pillars embedded throughout the phospholipid bilayer. Even when a person’s genetic change is in Ankyrin-1 or Spectrin rather than Band 3 itself, shedding tiny lipid bubbles strips Band 3 off the cell surface too — so the EMA dye detects the drop in surface protein regardless of which HS gene is involved.',
        clinical:
          'EMA binds primarily to Lys430 of Band 3 and Rh-associated membrane complexes. While EMA performs reliably even in recently transfused infants (by gating the patient’s own subpopulation), it does not differentiate HS from CDA type II (which shares low EMA and spherocytes but shows inappropriately low reticulocytes and binucleate marrow erythroblasts) or reliably exclude dehydrated HSt/HX — where OGE and/or targeted NGS remain decisive.',
      },
    ],
    faqs: [
      {
        question: 'Can the EMA binding test be done after a red blood cell transfusion?',
        answer: {
          plain:
            'Yes — unlike osmotic fragility or ektacytometry, EMA flow cytometry measures each red blood cell individually, so experienced labs can often still spot the dimmer HS cell population even after a recent transfusion (though DNA testing is completely unaffected by donor blood).',
          clinical:
            'EMA flow cytometry often retains utility post-transfusion by distinguishing donor and native RBC peaks, whereas OGE sensitivity drops after transfusion; NGS DNA sequencing is completely unaffected.',
        },
      },
      {
        question: 'Why is EMA testing preferred over the older osmotic fragility test (OFT)?',
        answer: {
          plain:
            'The classic salt-water osmotic fragility test misses up to 20–30% of mild or newborn HS cases and gives frequent false positives in immune hemolysis. EMA is faster, uses a tiny drop of blood, and is far more sensitive.',
          clinical:
            'Fresh OFT has only ~68% sensitivity (~81% incubated) and poor specificity across AIHA, HDFN, and enzymopathies; EMA achieves 93–96% sensitivity with micro-volume turnaround.',
        },
      },
      {
        question: 'What condition mimics hereditary spherocytosis on both EMA and ektacytometry?',
        answer: {
          plain:
            'Congenital dyserythropoietic anemia type II (CDA II) can look almost identical on EMA and ektacytometry, but doctors distinguish it by its unusually low reticulocyte (new red cell) count and genetic testing (SEC23B).',
          clinical:
            'CDA type II (SEC23B) frequently mimics HS on EMA and OGE due to Band 3 hypoglycosylation, but is distinguished by inappropriately low reticulocytosis, marrow binucleate erythroblasts, and NGS.',
        },
      },
    ],
    relatedPaths: ['/diagnosis/mchc-newborn-hs/', '/hs-vs-hereditary-xerocytosis/', '/genes/slc4a1/', '/genes/ank1/', '/'],
  },
  {
    path: '/diagnosis/mchc-newborn-hs/',
    kind: 'topic',
    shortLabel: 'Newborn & High MCHC',
    title: 'High MCHC (≥36 g/dL) & Newborn Hereditary Spherocytosis',
    description:
      'Why MCHC ≥36 g/dL is the strongest routine CBC clue in newborn hereditary spherocytosis, how day-1 jaundice and the 2–3 week anemia dip work, and why early transfusions don’t predict lifelong severity.',
    kicker: 'Newborns & CBC Clues · Early Life',
    h1: 'High MCHC (≥36 g/dL) & Newborn Hereditary Spherocytosis',
    lead: {
      plain:
        'In newborns, classic round spherocytes are harder to spot on a blood smear — making an elevated MCHC (35–38 g/dL) alongside a negative Coombs (DAT) test one of the earliest, clearest clues to hereditary spherocytosis.',
      clinical:
        'HS accounts for ~1% of severely jaundiced neonates. Because neonatal smear morphology is less reliable, elevated MCHC (typical HS range 35–38 g/dL vs. 33–36 g/dL in HDFN) combined with wide RDW and negative DAT provides the highest-yield routine CBC screen.',
    },
    scenePreset: { dive: 0.0, gene: 'ANK1', severity: 0.85 },
    keyFacts: [
      {
        label: 'Key CBC Clue',
        value: 'MCHC ≥ 36 g/dL',
        detail: {
          plain: 'Losing outer surface area packs hemoglobin more densely inside the spherical cell.',
          clinical: 'Neonatal HS MCHC typically 35–38 g/dL (vs. 33–36 g/dL in ABO/Rh HDFN); combining MCHC + RDW raises sensitivity.',
        },
      },
      {
        label: 'Day 1 Priority',
        value: 'Bilirubin Watch',
        detail: {
          plain: 'Newborns in HS families are watched closely from day 1 for rising jaundice (treated with phototherapy).',
          clinical: 'Early unconjugated hyperbilirubinemia requires proactive day-1 monitoring and phototherapy to prevent kernicterus.',
        },
      },
      {
        label: 'Weeks 2–3 Dip',
        value: 'Spleen Maturation',
        detail: {
          plain: 'Hemoglobin is often normal at birth, then drops at 2–3 weeks as the newborn spleen begins filtering tightly.',
          clinical: 'Physiologic neonatal hyposplenism yields normal birth Hb followed by a characteristic hemolytic nadir at 2–3 weeks of life.',
        },
      },
      {
        label: 'First-Year Prognosis',
        value: 'Not Lifelong Forecast',
        detail: {
          plain: 'Needing a transfusion during the first year of life does not automatically mean lifelong severe HS.',
          clinical: 'First-year transfusion need is not necessarily prognostic of lifelong severity; rHuEPO (1000 IU/kg/wk + iron) can bridge selected infants until ~9 months.',
        },
      },
    ],
    deepDiveParagraphs: [
      {
        plain:
          'Look at the 3D red blood cell above: as the cell sheds membrane and rounds into a sphere, its volume barely shrinks while its outer surface tightens — concentrating hemoglobin inside (pushing MCHC up toward 36–37 g/dL) and erasing the pale center. In a newborn with jaundice and spherocytes, doctors first check a Coombs (DAT) test to rule out transient blood-group incompatibility (ABO/Rh HDFN).',
        clinical:
          'In neonates presenting with DAT-negative hyperbilirubinemia and elevated MCHC, differential diagnoses include infantile pyknocytosis (hyperdense, irregularly contracted RBCs resolving spontaneously by 3–9 months) and ABO HDFN with weak/negative DAT. Infants with HS should be followed serially for hemoglobin nadirs during the first 1–3 months before steady-state erythropoiesis stabilizes.',
      },
    ],
    faqs: [
      {
        question: 'Why is MCHC high in hereditary spherocytosis?',
        answer: {
          plain:
            'When a red blood cell loses tiny pieces of its outer membrane, it becomes slightly dehydrated and packs the same amount of hemoglobin into a tighter spherical shell — raising the hemoglobin concentration (MCHC) to 36 g/dL or higher.',
          clinical:
            'Surface-area loss combined with mild cellular dehydration (altered passive Na⁺/K⁺ permeability) increases intracellular hemoglobin concentration, elevating MCHC ≥36 g/dL.',
        },
      },
      {
        question: 'If my newborn with HS needed a blood transfusion, will they always have severe HS?',
        answer: {
          plain:
            'Not necessarily. Babies’ bone marrow responds slowly during the first months of life just as the spleen starts clearing spherocytes at 2–3 weeks. Many infants who need early transfusions settle into mild or moderate HS after age 1.',
          clinical:
            'Transfusion requirement during the first year of life does not reliably predict lifelong severe disease; reassessment after 12 months (with NGS if still transfusion-dependent) determines true long-term severity.',
        },
      },
      {
        question: 'How do doctors tell newborn HS apart from ABO blood-group jaundice (HDFN)?',
        answer: {
          plain:
            'Both can show round spherocytes and jaundice in the first days of life, but ABO/Rh incompatibility is usually Coombs (DAT)-positive, resolves over weeks, and tends to have a slightly lower MCHC (33–36 g/dL) than HS (35–38 g/dL).',
          clinical:
            'HDFN is typically DAT-positive, transient, and shows lower MCHC (33–36 g/dL) compared with persistent DAT-negative neonatal HS (35–38 g/dL) confirmed by EMA binding or family/NGS testing.',
        },
      },
    ],
    relatedPaths: ['/diagnosis/ema-binding-test/', '/genes/ank1/', '/genes/spta1/', '/hs-vs-hereditary-xerocytosis/', '/'],
  },
  {
    path: '/hs-vs-hereditary-xerocytosis/',
    kind: 'topic',
    shortLabel: 'HS vs. Xerocytosis',
    title: 'Hereditary Spherocytosis vs. Hereditary Xerocytosis (HSt) — Why Splenectomy Differs',
    description:
      'Why distinguishing hereditary spherocytosis from look-alike hereditary xerocytosis (PIEZO1 / KCNN4) via ektacytometry or DNA testing is critical before splenectomy.',
    kicker: 'Critical Distinction · Pre-Splenectomy Safety',
    h1: 'Hereditary Spherocytosis vs. Hereditary Xerocytosis (HSt)',
    lead: {
      plain:
        'Hereditary xerocytosis (dehydrated hereditary stomatocytosis) can look very similar to hereditary spherocytosis on routine blood tests — including elevated MCHC and hemolysis — yet removing the spleen is dangerous in xerocytosis.',
      clinical:
        'Differentiating HS from dehydrated hereditary stomatocytosis / hereditary xerocytosis (PIEZO1 or KCNN4 gain-of-function channelopathies) via osmotic gradient ektacytometry and/or NGS is mandatory prior to splenectomy.',
    },
    scenePreset: { dive: 0.41, gene: 'ANK1', severity: 0.7 },
    keyFacts: [
      {
        label: 'Root Cause',
        value: 'Anchors vs. Ion Leaks',
        detail: {
          plain: 'HS breaks structural membrane anchors (5 genes); xerocytosis alters cation channels (PIEZO1 / KCNN4) that dehydrate the cell.',
          clinical: 'HS stems from vertical tethering defects (ANK1/SPTB/SLC4A1/SPTA1/EPB42); HX arises from PIEZO1 or KCNN4 (Gardos channel) dehydration.',
        },
      },
      {
        label: 'Shared Lab Trap',
        value: 'High MCHC + Hemolysis',
        detail: {
          plain: 'Both conditions produce dense, hemoglobin-concentrated red cells, negative DAT, and pigment gallstones.',
          clinical: 'Both present with DAT-negative hemolysis, elevated MCHC, reticulocytosis, and cholelithiasis — easily misclassified without OGE or NGS.',
        },
      },
      {
        label: 'Splenectomy Impact',
        value: 'Helps HS · Unsafe in HX',
        detail: {
          plain: 'Splenectomy dramatically improves severe HS, whereas in xerocytosis it fails to stop hemolysis and triggers serious blood clots.',
          clinical: 'Splenectomy is effective in most severe HS (except complete SPTA1/SLC4A1 nulls), but strictly contraindicated in HX due to severe VTE/arterial thrombosis.',
        },
      },
      {
        label: 'How to Tell Apart',
        value: 'OGE & NGS Panel',
        detail: {
          plain: 'Osmotic gradient ektacytometry shows opposite osmotic shifts, and a single DNA panel screens all HS and HX genes together.',
          clinical: 'OGE shows a classic left-shifted curve (dehydration) in HX vs. decreased EImax + right-shifted Omin in HS; NGS confirms PIEZO1/KCNN4 vs. HS loci.',
        },
      },
    ],
    deepDiveParagraphs: [
      {
        plain:
          'In hereditary spherocytosis, cells are trapped and cleared primarily because losing outer membrane turns them into rigid spheres that cannot squeeze through the spleen’s narrow filtering cords. In hereditary xerocytosis, red blood cells leak potassium and water through overactive ion channels (PIEZO1 or KCNN4) and dry out — often also causing high iron levels (iron overload) even without transfusions. Because removing the spleen leaves hyper-sticky dehydrated cells circulating, EHA and hematology guidelines emphasize confirming true HS before any spleen surgery.',
        clinical:
          'Per EHA 2017 splenectomy recommendations (Iolascon et al.), splenectomy is contraindicated in dehydrated HSt/HX because postoperative venous and arterial thromboembolic complications (including pulmonary hypertension and portal/splenic vein thrombosis) are frequent and hemolysis persists. In addition, PIEZO1-related HX often features disproportionate hepatic iron overload independent of transfusion burden — making OGE and comprehensive RBC membrane/channel NGS panels indispensable before elective splenectomy.',
      },
    ],
    faqs: [
      {
        question: 'Can EMA binding alone rule out hereditary xerocytosis?',
        answer: {
          plain:
            'No — while EMA is typically normal in xerocytosis and low in HS, mild overlap can happen. Hematology guidelines recommend osmotic gradient ektacytometry (OGE) and/or a genetic panel covering PIEZO1 and KCNN4 before proceeding with splenectomy.',
          clinical:
            'EMA alone is insufficient to exclude HX prior to surgery; OGE (demonstrating left-shifted hydration curves) and/or an NGS panel including PIEZO1 and KCNN4 should be obtained.',
        },
      },
      {
        question: 'What are other clues that point toward hereditary xerocytosis instead of HS?',
        answer: {
          plain:
            'Elevated iron/ferritin levels without repeated transfusions, a normal EMA test despite high MCHC, pseudohyperkalemia (falsely high potassium in chilled blood tubes), or mouth-shaped stomatocytes on smear are classic clues to check for xerocytosis.',
          clinical:
            'Disproportionate iron overload (elevated ferritin/TSAT without transfusions), normal EMA with elevated MCHC, stomatocytes/target cells on smear, or room-temperature K⁺ leak point strongly toward PIEZO1/KCNN4 HX.',
        },
      },
    ],
    relatedPaths: ['/diagnosis/ema-binding-test/', '/diagnosis/mchc-newborn-hs/', '/genes/ank1/', '/genes/spta1/', '/'],
  },
];

export function normalizeRoutePath(pathname: string): string {
  const clean = (pathname || '/').split('?')[0].split('#')[0].trim();
  if (!clean || clean === '/') return '/';
  const withLead = clean.startsWith('/') ? clean : `/${clean}`;
  return withLead.endsWith('/') ? withLead : `${withLead}/`;
}

export function getSeoRoute(pathname: string): SeoRouteConfig {
  const norm = normalizeRoutePath(pathname);
  return SEO_ROUTES.find((r) => r.path === norm) ?? SEO_ROUTES[0];
}
