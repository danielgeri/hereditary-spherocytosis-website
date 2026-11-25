import * as THREE from 'three';
import { GeneId } from '../data/hsContent';
import { evalRbcSurfaceFrame, RbcShapeParams } from './rbcGeometry';

/**
 * Conformal Cryo-EM 3D molecular cutaway assembly engineered to hold up both at
 * 40 nm (hexagonal cytoskeleton mesh) AND at 10 nm (single protein complex close-up!).
 *
 * Includes:
 * - ~1,200 instanced phospholipid headgroups + paired hydrophobic tails projected
 *   conformally onto the live parametric Evans-Fung RBC surface
 * - Sculpted multi-domain Band 3 (SLC4A1) transmembrane dimers + twin cytoplasmic domains
 * - Glycophorin A (GPA) companion stalks flanking Band 3 (per Figure 2)
 * - 16-segment curved C-shaped Ankyrin-1 (ANK1) 24-repeat solenoid arch + ZU5/UPA Spectrin clamp
 * - Multi-lobe Protein 4.2 (EPB42) clasp bridging Band 3 and Ankyrin-1
 * - Smooth, high-tessellation braided coiled-coil α/β-Spectrin filaments + 4.1R/F-Actin hubs
 */
export const CUT_UNIT_CENTER = new THREE.Vector3(0.46, 0.85, 0.25).normalize();
export const CUT_MAX_CHORD = 0.56;

export interface HeroFocusFrame {
  center: THREE.Vector3; // exact RBC-local center of the Hero Complex
  normal: THREE.Vector3; // exact outward surface normal at Hero Complex
  subunitTarget: THREE.Vector3; // subtle gene-specific focus point at 10 nm
}

export interface PinAnchorPair {
  target: THREE.Vector3; // exact 3D point ON the anatomical structure (leader dot terminates here)
  label: THREE.Vector3; // floating label pill anchor in nearby open space
}

export interface MembraneMolecularAssembly {
  root: THREE.Group;
  update: (params: {
    gene: GeneId;
    hoveredGene?: GeneId | null;
    dive: number;
    shape: RbcShapeParams;
    elapsed: number;
  }) => void;
  /** Overview callout target/label pairs (shown at 40 nm Mesh scale) */
  pinAnchors: Record<string, PinAnchorPair>;
  /** Tight anatomical subunit target/label pairs on the single Hero Complex (shown at 10 nm scale) */
  closePinAnchors: Record<string, PinAnchorPair>;
  /** Returns exact live RBC-local framing target for the 10 nm Protein Complex camera */
  getHeroFocus: (gene: GeneId, out: HeroFocusFrame) => void;
  pickables: { mesh: THREE.Object3D; gene: GeneId }[];
}

interface LipidSpec {
  unitDir: THREE.Vector3;
  chordR: number;
  hJitter: number;
  tiltX: number;
  tiltZ: number;
  scale: number;
}

interface SpectrinEdgeRef {
  mesh: THREE.Mesh;
  iA: number;
  iB: number;
  phaseOffset: number;
  slackPhase: number;
  compromised: boolean;
  isAlpha: boolean;
  radialSegs: number;
  tubularSegs: number;
}

interface AnchorCluster {
  unitDir: THREE.Vector3;
  tangentAngle: number;
  band3: THREE.Group;
  gpa: THREE.Group;
  ankyrin: THREE.Group;
  protein42: THREE.Group;
  compromised: boolean;
  surfPos: THREE.Vector3;
  surfNormal: THREE.Vector3;
  quat: THREE.Quaternion;
}

interface JunctionRef {
  unitDir: THREE.Vector3;
  group: THREE.Group;
  pos: THREE.Vector3;
  normal: THREE.Vector3;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const T1 = new THREE.Vector3(-CUT_UNIT_CENTER.z, 0, CUT_UNIT_CENTER.x).normalize();
const T2 = new THREE.Vector3().crossVectors(CUT_UNIT_CENTER, T1).normalize();

function tangentToUnitDir(tx: number, tz: number): THREE.Vector3 {
  const r = Math.hypot(tx, tz);
  if (r < 1e-6) return CUT_UNIT_CENTER.clone();
  const cosR = Math.cos(r);
  const sinR = Math.sin(r) / r;
  return new THREE.Vector3()
    .copy(CUT_UNIT_CENTER)
    .multiplyScalar(cosR)
    .addScaledVector(T1, tx * sinR)
    .addScaledVector(T2, tz * sinR)
    .normalize();
}

export function createMembraneAssembly(): MembraneMolecularAssembly {
  const root = new THREE.Group();
  const pickables: { mesh: THREE.Object3D; gene: GeneId }[] = [];
  const rand = mulberry32(7079);

  const maxAngle = 2 * Math.asin(Math.min(0.99, (CUT_MAX_CHORD + 0.012) / 2));

  // -------------------------------------------------------------------------
  // 1. Densely Packed Conformal Phospholipid Bilayer Carpet (~1,280 samples)
  // -------------------------------------------------------------------------
  const lipidSpecs: LipidSpec[] = [];
  const totalSamples = 1280;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < totalSamples; i++) {
    const rAngle = Math.sqrt((i + 0.5) / totalSamples) * maxAngle;
    const theta = i * goldenAngle;
    const tx = Math.cos(theta) * rAngle;
    const tz = Math.sin(theta) * rAngle;

    const winDist = Math.hypot((tx - 0.02) * 1.04, (tz - 0.03) * 1.08);
    const organicEdge = 0.335 + Math.sin(theta * 3.0) * 0.028 + Math.cos(theta * 5.0) * 0.016;
    if (winDist < organicEdge) continue;

    const unitDir = tangentToUnitDir(tx, tz);
    lipidSpecs.push({
      unitDir,
      chordR: unitDir.distanceTo(CUT_UNIT_CENTER),
      hJitter: (rand() - 0.5) * 0.0045,
      tiltX: (rand() - 0.5) * 0.2,
      tiltZ: (rand() - 0.5) * 0.2,
      scale: 0.88 + rand() * 0.22,
    });
  }

  const headCount = lipidSpecs.length;
  // Smoother headgroup geometry so lipids stay refined even at 10 nm macro zoom!
  const headGeo = new THREE.SphereGeometry(0.0106, 12, 10);
  const tailGeo = new THREE.CylinderGeometry(0.0021, 0.0017, 0.033, 6);

  const outerHeadMat = new THREE.MeshPhysicalMaterial({
    color: '#9A4248',
    roughness: 0.38,
    metalness: 0.02,
    clearcoat: 0.16,
    clearcoatRoughness: 0.42,
  });
  const innerHeadMat = new THREE.MeshPhysicalMaterial({
    color: '#B57672',
    roughness: 0.44,
    metalness: 0.02,
    clearcoat: 0.1,
    clearcoatRoughness: 0.5,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: '#D8C3AA',
    roughness: 0.65,
    metalness: 0.0,
  });

  const outerHeads = new THREE.InstancedMesh(headGeo, outerHeadMat, headCount);
  const innerHeads = new THREE.InstancedMesh(headGeo, innerHeadMat, headCount);
  const tailsUpper = new THREE.InstancedMesh(tailGeo, tailMat, headCount);
  const tailsLower = new THREE.InstancedMesh(tailGeo, tailMat, headCount);

  const cTmp = new THREE.Color();
  const baseOuter = new THREE.Color('#9A4248');
  const baseInner = new THREE.Color('#B57672');
  lipidSpecs.forEach((p, idx) => {
    const shade = 0.9 + (p.scale - 0.88) * 0.9;
    cTmp.copy(baseOuter).multiplyScalar(shade);
    outerHeads.setColorAt(idx, cTmp);
    cTmp.copy(baseInner).multiplyScalar(shade);
    innerHeads.setColorAt(idx, cTmp);
  });
  if (outerHeads.instanceColor) outerHeads.instanceColor.needsUpdate = true;
  if (innerHeads.instanceColor) innerHeads.instanceColor.needsUpdate = true;
  root.add(outerHeads, innerHeads, tailsUpper, tailsLower);

  // -------------------------------------------------------------------------
  // 2. Conformal Hexagonal Junctional Vertices (F-Actin + Protein 4.1R)
  // -------------------------------------------------------------------------
  const hexAngleR = 0.36;
  const specOffset = -0.145;

  const vertexUnitDirs: THREE.Vector3[] = [tangentToUnitDir(0.01, 0.01)];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + Math.PI / 6;
    const jitterR = hexAngleR * (0.94 + rand() * 0.1);
    vertexUnitDirs.push(tangentToUnitDir(Math.cos(a) * jitterR, Math.sin(a) * jitterR));
  }

  const smoothBeadGeo = new THREE.SphereGeometry(1, 18, 14);
  const actinMat = new THREE.MeshPhysicalMaterial({
    color: '#9C9288',
    roughness: 0.48,
    clearcoat: 0.12,
  });
  const p41Mat = new THREE.MeshPhysicalMaterial({
    color: '#6C645C',
    roughness: 0.42,
    clearcoat: 0.16,
  });

  const junctions: JunctionRef[] = vertexUnitDirs.map((unitDir, vIdx) => {
    const jGroup = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const t = (k - 2.5) * 0.01;
      const ang = k * 1.25;
      const mono = new THREE.Mesh(smoothBeadGeo, actinMat);
      mono.scale.setScalar(0.0098);
      mono.position.set(t, Math.sin(ang) * 0.0055, Math.cos(ang) * 0.0055);
      jGroup.add(mono);
    }
    for (let lobe = 0; lobe < 3; lobe++) {
      const la = (lobe * Math.PI * 2) / 3 + vIdx * 0.5;
      const m = new THREE.Mesh(smoothBeadGeo, p41Mat);
      m.scale.setScalar(0.0115);
      m.position.set(Math.cos(la) * 0.0095, 0.013, Math.sin(la) * 0.0095);
      jGroup.add(m);
    }
    root.add(jGroup);
    return {
      unitDir,
      group: jGroup,
      pos: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 1, 0),
    };
  });

  // -------------------------------------------------------------------------
  // 3. High-Resolution Coiled-Coil α/β-Spectrin Filaments (smooth at 10 nm!)
  // -------------------------------------------------------------------------
  const edges: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [0, 6],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [6, 1],
  ];

  const spectrinRefs: SpectrinEdgeRef[] = [];
  const tubularSegs = 46;
  const radialSegs = 11;

  const createSpectrinShell = (
    iA: number,
    iB: number,
    phaseOffset: number,
    color: string,
    isAlpha: boolean,
    compromised: boolean
  ) => {
    const dummyCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0, 0));
    const geo = new THREE.TubeGeometry(dummyCurve, tubularSegs, 0.0054, radialSegs, false);
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.4,
      metalness: 0.04,
      clearcoat: 0.14,
      clearcoatRoughness: 0.45,
      transparent: true,
      opacity: 0.96,
    });
    const mesh = new THREE.Mesh(geo, mat);
    root.add(mesh);
    pickables.push({ mesh, gene: isAlpha ? 'SPTA1' : 'SPTB' });
    spectrinRefs.push({
      mesh,
      iA,
      iB,
      phaseOffset,
      slackPhase: rand() * Math.PI * 2,
      compromised,
      isAlpha,
      radialSegs,
      tubularSegs,
    });
  };

  edges.forEach(([iA, iB], edgeIdx) => {
    createSpectrinShell(iA, iB, 0, '#6B5A7E', true, edgeIdx % 2 === 0 || edgeIdx === 1);
    createSpectrinShell(iA, iB, Math.PI, '#49687C', false, edgeIdx % 2 === 1);
  });

  // -------------------------------------------------------------------------
  // 4. High-Fidelity Cryo-EM Band 3 + GPA + Ankyrin-1 Solenoid + Protein 4.2
  // -------------------------------------------------------------------------
  const anchorClusters: AnchorCluster[] = [];
  const gpaStalkGeo = new THREE.CapsuleGeometry(0.0031, 0.044, 8, 12);

  for (let edgeIdx = 0; edgeIdx < 6; edgeIdx++) {
    const [iA, iB] = edges[edgeIdx];
    const midUnit = new THREE.Vector3()
      .addVectors(vertexUnitDirs[iA], vertexUnitDirs[iB])
      .normalize();

    const tangentAngle = (edgeIdx * Math.PI) / 3;

    // --- Band 3 (SLC4A1): High-resolution multi-domain dimeric transmembrane channel ---
    const band3Group = new THREE.Group();
    const b3Mat = new THREE.MeshPhysicalMaterial({
      color: '#AD7243',
      roughness: 0.38,
      metalness: 0.04,
      clearcoat: 0.18,
      clearcoatRoughness: 0.38,
      transparent: true,
      opacity: 0.96,
    });
    const b3Lobes: [number, number, number, number, number, number][] = [
      // Extracellular glycosylated loops (protruding cleanly above outer lipid leaflet)
      [-0.014, 0.036, -0.009, 0.0125, 0.011, 0.012],
      [0.015, 0.038, -0.008, 0.012, 0.010, 0.013],
      [-0.011, 0.034, 0.013, 0.012, 0.010, 0.012],
      [0.013, 0.036, 0.012, 0.0125, 0.011, 0.011],
      [0.0, 0.042, 0.002, 0.010, 0.009, 0.011],
      // Core transmembrane helices bundle (14-TM anion exchanger domain)
      [-0.016, 0.008, -0.010, 0.014, 0.021, 0.013],
      [0.016, 0.008, -0.010, 0.014, 0.021, 0.013],
      [-0.015, 0.006, 0.012, 0.013, 0.020, 0.013],
      [0.015, 0.006, 0.012, 0.013, 0.020, 0.013],
      [0.0, -0.004, 0.0, 0.017, 0.025, 0.016],
      // Flexible linker waist + twin cytoplasmic N-terminal domains docking onto Ankyrin D3/D4
      [-0.015, -0.032, 0.004, 0.0145, 0.016, 0.0135],
      [0.015, -0.032, -0.004, 0.0145, 0.016, 0.0135],
      [-0.011, -0.049, 0.003, 0.0125, 0.0125, 0.0115],
      [0.012, -0.048, -0.003, 0.0125, 0.0125, 0.0115],
      [0.0, -0.042, 0.009, 0.011, 0.012, 0.011],
    ];
    b3Lobes.forEach(([lx, ly, lz, sx, sy, sz]) => {
      const m = new THREE.Mesh(smoothBeadGeo, b3Mat.clone());
      m.position.set(lx, ly, lz);
      m.scale.set(sx, sy, sz);
      band3Group.add(m);
      pickables.push({ mesh: m, gene: 'SLC4A1' });
    });
    root.add(band3Group);

    // --- Glycophorin A (GPA) companion transmembrane stalks flanking Band 3 (Figure 2!) ---
    const gpaGroup = new THREE.Group();
    const gpaMat = new THREE.MeshPhysicalMaterial({
      color: '#A84D5B',
      roughness: 0.4,
      clearcoat: 0.18,
      transparent: true,
      opacity: 0.96,
    });
    [-0.031, 0.031].forEach((ox) => {
      const stalk = new THREE.Mesh(gpaStalkGeo, gpaMat.clone());
      stalk.position.set(ox, 0.004, -0.006);
      const cap = new THREE.Mesh(smoothBeadGeo, gpaMat.clone());
      cap.scale.set(0.0068, 0.0052, 0.0068);
      cap.position.set(ox, 0.033, -0.006);
      gpaGroup.add(stalk, cap);
    });
    root.add(gpaGroup);

    // --- Ankyrin-1 (ANK1): 16-segment curved 24-repeat solenoid arch + ZU5/UPA Spectrin clamp ---
    const ankyrinGroup = new THREE.Group();
    const ankMat = new THREE.MeshPhysicalMaterial({
      color: '#913241',
      roughness: 0.36,
      metalness: 0.04,
      clearcoat: 0.2,
      clearcoatRoughness: 0.36,
      transparent: true,
      opacity: 0.96,
    });
    // 16 smooth stacked helical ankyrin repeats forming the iconic horseshoe cradle
    for (let seg = 0; seg < 16; seg++) {
      const t = seg / 15;
      const theta = (t - 0.5) * Math.PI * 0.94;
      const arcR = 0.048;
      const ax = Math.sin(theta) * 0.022;
      const ay = -Math.sin(theta) * arcR + 0.005;
      const az = (Math.cos(theta) - 0.62) * 0.04;
      const lobe = new THREE.Mesh(smoothBeadGeo, ankMat.clone());
      const rBase = 0.0115 + Math.sin(t * Math.PI) * 0.0042;
      lobe.position.set(ax, ay, az);
      // Slight alternating ridge twist mimics stacked α-helical ankyrin repeats up close
      lobe.scale.set(rBase * 1.32, rBase * 0.68, rBase * 1.05);
      lobe.rotation.set(theta * 0.65, t * 0.75 + (seg % 2) * 0.12, 0);
      ankyrinGroup.add(lobe);
      pickables.push({ mesh: lobe, gene: 'ANK1' });
    }
    // Sculpted ZU5/UPA spectrin-binding saddle gripping the coiled-coil spectrin underneath
    [-0.011, 0.011].forEach((ox) => {
      const foot = new THREE.Mesh(smoothBeadGeo, ankMat.clone());
      foot.position.set(ox, -0.046, -0.014);
      foot.scale.set(0.011, 0.0095, 0.013);
      ankyrinGroup.add(foot);
      pickables.push({ mesh: foot, gene: 'ANK1' });
    });
    root.add(ankyrinGroup);

    // --- Protein 4.2 (EPB42): Sculpted multi-domain transglutaminase-fold clasp ---
    const p42Group = new THREE.Group();
    const p42Mat = new THREE.MeshPhysicalMaterial({
      color: '#3F6F62',
      roughness: 0.38,
      metalness: 0.04,
      clearcoat: 0.18,
      clearcoatRoughness: 0.38,
      transparent: true,
      opacity: 0.96,
    });
    const p42Lobes: [number, number, number, number][] = [
      [0.025, 0.010, 0.016, 0.0135],
      [0.034, -0.004, 0.011, 0.012],
      [0.020, -0.012, 0.020, 0.0115],
      [0.031, 0.003, 0.023, 0.0105],
      [0.028, 0.022, 0.012, 0.0085], // N-terminal myristoylated membrane anchor lobe
    ];
    p42Lobes.forEach(([lx, ly, lz, lr]) => {
      const m = new THREE.Mesh(smoothBeadGeo, p42Mat.clone());
      m.position.set(lx, ly, lz);
      m.scale.setScalar(lr);
      p42Group.add(m);
      pickables.push({ mesh: m, gene: 'EPB42' });
    });
    root.add(p42Group);

    anchorClusters.push({
      unitDir: midUnit,
      tangentAngle,
      band3: band3Group,
      gpa: gpaGroup,
      ankyrin: ankyrinGroup,
      protein42: p42Group,
      compromised: edgeIdx % 2 === 0 || edgeIdx === 1,
      surfPos: new THREE.Vector3(),
      surfNormal: new THREE.Vector3(0, 1, 0),
      quat: new THREE.Quaternion(),
    });
  }

  // Designate Anchor Cluster 4 (upper-right prominent complex cleanly illuminated in 40 nm & 10 nm!)
  // as our Hero Complex for the 10 nm Protein Complex close-up dive!
  const HERO_IDX = 4;

  const makePinPair = (): PinAnchorPair => ({
    target: new THREE.Vector3(),
    label: new THREE.Vector3(),
  });

  // Overview callout pin target/label pairs (shown at 40 nm Mesh scale)
  const bilayerPinUnit = tangentToUnitDir(0.42, -0.12);
  const pinAnchors: Record<string, PinAnchorPair> = {
    bilayer: makePinPair(),
    band3: makePinPair(),
    ankyrin: makePinPair(),
    protein42: makePinPair(),
    spectrin: makePinPair(),
    junction41: makePinPair(),
  };

  // Close-up subunit target/label pairs on the single Hero Complex (shown at 10 nm Complex scale!)
  const closePinAnchors: Record<string, PinAnchorPair> = {
    closeBand3: makePinPair(),
    closeGpa: makePinPair(),
    closeAnkyrin: makePinPair(),
    closeProtein42: makePinPair(),
    closeAlphaSpec: makePinPair(),
    closeBetaSpec: makePinPair(),
  };

  // Exact live spine sample points captured during conformal deformation
  const overviewSpecPt = new THREE.Vector3();
  const idealLeftSpec = new THREE.Vector3();
  const idealRightSpec = new THREE.Vector3();
  const snappedBetaSpec = new THREE.Vector3();
  const snappedAlphaSpec = new THREE.Vector3();

  // -------------------------------------------------------------------------
  // CONFORMAL SURFACE DEFORMATION
  // -------------------------------------------------------------------------
  let lastSphericity = -999;
  let lastAcantho = -999;
  let lastPincer = -999;
  let lastOval = -999;
  let lastCutOpen = -999;

  const tmpPos = new THREE.Vector3();
  const tmpNorm = new THREE.Vector3();
  const tmpQuat = new THREE.Quaternion();
  const tmpSpin = new THREE.Quaternion();
  const tmpTilt = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();
  const tmpLocal = new THREE.Vector3();
  const upY = new THREE.Vector3(0, 1, 0);
  const dummyObj = new THREE.Object3D();

  const spinePts: THREE.Vector3[] = Array.from({ length: tubularSegs + 1 }, () => new THREE.Vector3());
  const spineNorms: THREE.Vector3[] = Array.from({ length: tubularSegs + 1 }, () => new THREE.Vector3());
  const tmpU = new THREE.Vector3();
  const tmpTan = new THREE.Vector3();
  const tmpSide = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();

  const conformToSurface = (shape: RbcShapeParams, cutOpen: number) => {
    const staticShape: RbcShapeParams = {
      sphericity: shape.sphericity,
      acantho: shape.acantho,
      pincer: shape.pincer,
      oval: shape.oval,
      time: 0,
    };

    const activeChord = cutOpen * CUT_MAX_CHORD + 0.015;

    // 1. Project phospholipids & tails conformally onto live RBC surface
    for (let i = 0; i < headCount; i++) {
      const sp = lipidSpecs[i];
      if (sp.chordR > activeChord) {
        dummyObj.scale.setScalar(0);
        dummyObj.updateMatrix();
        outerHeads.setMatrixAt(i, dummyObj.matrix);
        innerHeads.setMatrixAt(i, dummyObj.matrix);
        tailsUpper.setMatrixAt(i, dummyObj.matrix);
        tailsLower.setMatrixAt(i, dummyObj.matrix);
        continue;
      }

      evalRbcSurfaceFrame(sp.unitDir, staticShape, tmpPos, tmpNorm);
      tmpQuat.setFromUnitVectors(upY, tmpNorm);
      tmpEuler.set(sp.tiltX, 0, sp.tiltZ);
      tmpTilt.setFromEuler(tmpEuler);

      dummyObj.position.copy(tmpPos).addScaledVector(tmpNorm, 0.006 + sp.hJitter);
      dummyObj.quaternion.copy(tmpQuat).multiply(tmpTilt);
      dummyObj.scale.set(sp.scale, sp.scale * 0.9, sp.scale);
      dummyObj.updateMatrix();
      outerHeads.setMatrixAt(i, dummyObj.matrix);

      dummyObj.position.copy(tmpPos).addScaledVector(tmpNorm, -0.044 + sp.hJitter);
      dummyObj.updateMatrix();
      innerHeads.setMatrixAt(i, dummyObj.matrix);

      dummyObj.scale.setScalar(1);
      dummyObj.position.copy(tmpPos).addScaledVector(tmpNorm, -0.01 + sp.hJitter);
      dummyObj.updateMatrix();
      tailsUpper.setMatrixAt(i, dummyObj.matrix);

      dummyObj.position.copy(tmpPos).addScaledVector(tmpNorm, -0.028 + sp.hJitter);
      dummyObj.updateMatrix();
      tailsLower.setMatrixAt(i, dummyObj.matrix);
    }
    outerHeads.instanceMatrix.needsUpdate = true;
    innerHeads.instanceMatrix.needsUpdate = true;
    tailsUpper.instanceMatrix.needsUpdate = true;
    tailsLower.instanceMatrix.needsUpdate = true;

    // 2. Project 4.1R / F-Actin junctions
    junctions.forEach((j) => {
      evalRbcSurfaceFrame(j.unitDir, staticShape, j.pos, j.normal);
      j.group.position.copy(j.pos).addScaledVector(j.normal, specOffset);
      j.group.quaternion.setFromUnitVectors(upY, j.normal);
    });

    // 3. Project Band 3, GPA, Ankyrin-1, and Protein 4.2 clusters first so we know Hero Complex frame
    anchorClusters.forEach((c) => {
      evalRbcSurfaceFrame(c.unitDir, staticShape, c.surfPos, c.surfNormal);
      c.quat.setFromUnitVectors(upY, c.surfNormal);
      tmpSpin.setFromAxisAngle(upY, c.tangentAngle);
      c.quat.multiply(tmpSpin);

      c.band3.position.copy(c.surfPos).addScaledVector(c.surfNormal, -0.018);
      c.band3.quaternion.copy(c.quat);

      c.gpa.position.copy(c.surfPos).addScaledVector(c.surfNormal, -0.018);
      c.gpa.quaternion.copy(c.quat);

      c.ankyrin.position.copy(c.surfPos).addScaledVector(c.surfNormal, -0.095);
      c.ankyrin.quaternion.copy(c.quat);

      c.protein42.position.copy(c.surfPos).addScaledVector(c.surfNormal, -0.058);
      c.protein42.quaternion.copy(c.quat);
    });

    // Ideal unobstructed left/right regions flanking the Hero Complex for snapping Spectrin dots
    const hero = anchorClusters[HERO_IDX];
    const heroLocalToRbc = (lx: number, ly: number, lz: number, out: THREE.Vector3) => {
      tmpLocal.set(lx, ly, lz).applyQuaternion(hero.quat);
      out.copy(hero.surfPos).add(tmpLocal);
    };
    heroLocalToRbc(0.072, -0.142, -0.06, idealLeftSpec);
    heroLocalToRbc(-0.082, -0.142, -0.075, idealRightSpec);
    let bestBetaDistSq = Infinity;
    let bestAlphaDistSq = Infinity;

    // 4. Conformally deform coiled-coil Spectrin cables in-place & snap close-up Spectrin dots
    spectrinRefs.forEach((ref, refIdx) => {
      const uA = junctions[ref.iA].unitDir;
      const uB = junctions[ref.iB].unitDir;

      for (let s = 0; s <= ref.tubularSegs; s++) {
        const t = s / ref.tubularSegs;
        tmpU.lerpVectors(uA, uB, t).normalize();
        evalRbcSurfaceFrame(tmpU, staticShape, spinePts[s], spineNorms[s]);
        spinePts[s].addScaledVector(spineNorms[s], specOffset);
      }

      for (let s = 0; s <= ref.tubularSegs; s++) {
        const t = s / ref.tubularSegs;
        const pPrev = spinePts[Math.max(0, s - 1)];
        const pNext = spinePts[Math.min(ref.tubularSegs, s + 1)];
        tmpTan.subVectors(pNext, pPrev).normalize();
        tmpSide.crossVectors(tmpTan, spineNorms[s]).normalize();
        const env = Math.sin(t * Math.PI);
        const braid = t * Math.PI * 10.0 + ref.phaseOffset;
        const sway = Math.sin(t * Math.PI * 2.0 + ref.slackPhase) * 0.005 * env;
        spinePts[s].addScaledVector(tmpSide, Math.cos(braid) * 0.0055 * env + sway);
        spinePts[s].addScaledVector(
          spineNorms[s],
          Math.sin(braid) * 0.0055 * env - 0.011 * env
        );
      }

      // Capture exact deformed coiled-coil spine coordinates for leader-line targets
      const edgeIdx = Math.floor(refIdx / 2);
      if (edgeIdx === 2 && !ref.isAlpha) {
        overviewSpecPt.copy(spinePts[Math.round(ref.tubularSegs * 0.52)]);
      }
      // Snap close-up β-Spectrin (left) and α-Spectrin (right) dots directly onto
      // the flanking outer hex ring cables (edges 9 & 10 meeting behind the Hero Complex)!
      if (edgeIdx === 9 || edgeIdx === 10) {
        for (let s = 6; s <= ref.tubularSegs - 6; s += 2) {
          if (!ref.isAlpha) {
            const dSq = spinePts[s].distanceToSquared(idealLeftSpec);
            if (dSq < bestBetaDistSq) {
              bestBetaDistSq = dSq;
              snappedBetaSpec.copy(spinePts[s]);
            }
          } else {
            const dSq = spinePts[s].distanceToSquared(idealRightSpec);
            if (dSq < bestAlphaDistSq) {
              bestAlphaDistSq = dSq;
              snappedAlphaSpec.copy(spinePts[s]);
            }
          }
        }
      }

      const posAttr = ref.mesh.geometry.attributes.position as THREE.BufferAttribute;
      const tubeR = 0.0052;
      let vi = 0;
      for (let s = 0; s <= ref.tubularSegs; s++) {
        const pPrev = spinePts[Math.max(0, s - 1)];
        const pNext = spinePts[Math.min(ref.tubularSegs, s + 1)];
        tmpTan.subVectors(pNext, pPrev).normalize();
        tmpSide.crossVectors(tmpTan, spineNorms[s]).normalize();
        tmpUp.crossVectors(tmpSide, tmpTan).normalize();

        for (let r = 0; r <= ref.radialSegs; r++) {
          const ang = (r / ref.radialSegs) * Math.PI * 2;
          const ca = Math.cos(ang) * tubeR;
          const sa = Math.sin(ang) * tubeR;
          posAttr.setXYZ(
            vi,
            spinePts[s].x + tmpSide.x * ca + tmpUp.x * sa,
            spinePts[s].y + tmpSide.y * ca + tmpUp.y * sa,
            spinePts[s].z + tmpSide.z * ca + tmpUp.z * sa
          );
          vi++;
        }
      }
      posAttr.needsUpdate = true;
      ref.mesh.geometry.computeVertexNormals();
    });

    // 5. Project 40 nm overview callout target & label pairs
    evalRbcSurfaceFrame(bilayerPinUnit, staticShape, tmpPos, tmpNorm);
    pinAnchors.bilayer.target.copy(tmpPos).addScaledVector(tmpNorm, 0.008);
    pinAnchors.bilayer.label
      .copy(tmpPos)
      .addScaledVector(tmpNorm, 0.062)
      .addScaledVector(T1, 0.02);

    const c4 = anchorClusters[4];
    pinAnchors.band3.target.copy(c4.surfPos).addScaledVector(c4.surfNormal, 0.014);
    tmpLocal.set(0.095, 0.035, 0.015).applyQuaternion(c4.quat);
    pinAnchors.band3.label.copy(c4.surfPos).add(tmpLocal);

    const c5 = anchorClusters[5];
    pinAnchors.ankyrin.target.copy(c5.surfPos).addScaledVector(c5.surfNormal, -0.095);
    tmpLocal.set(-0.075, -0.095, 0.025).applyQuaternion(c5.quat);
    pinAnchors.ankyrin.label.copy(c5.surfPos).add(tmpLocal);

    const c0 = anchorClusters[0];
    tmpLocal.set(0.028, -0.056, 0.018).applyQuaternion(c0.quat);
    pinAnchors.protein42.target.copy(c0.surfPos).add(tmpLocal);
    tmpLocal.set(0.092, -0.042, 0.045).applyQuaternion(c0.quat);
    pinAnchors.protein42.label.copy(c0.surfPos).add(tmpLocal);

    pinAnchors.spectrin.target.copy(overviewSpecPt);
    pinAnchors.spectrin.label.copy(overviewSpecPt).addScaledVector(junctions[0].normal, -0.068);

    const j3 = junctions[3];
    pinAnchors.junction41.target.copy(j3.pos).addScaledVector(j3.normal, specOffset);
    pinAnchors.junction41.label.copy(j3.pos).addScaledVector(j3.normal, specOffset - 0.068);

    // 6. Project 10 nm close-up subunit target & label pairs on Hero Complex (anchorClusters[HERO_IDX])
    // Band 3 Dimer: dot directly on upper-left transmembrane lobe, pill floating upper-left
    heroLocalToRbc(0.013, 0.008, 0.012, closePinAnchors.closeBand3.target);
    heroLocalToRbc(0.068, 0.036, 0.014, closePinAnchors.closeBand3.label);

    // Glycophorin A: dot directly on right rosewood GPA cap/stalk, pill floating cleanly right below top bar
    heroLocalToRbc(-0.031, 0.015, -0.006, closePinAnchors.closeGpa.target);
    heroLocalToRbc(-0.078, 0.012, -0.004, closePinAnchors.closeGpa.label);

    // Protein 4.2 Clasp: dot dead-center on emerald clasp, pill floating left
    heroLocalToRbc(0.028, -0.054, 0.018, closePinAnchors.closeProtein42.target);
    heroLocalToRbc(0.082, -0.050, 0.022, closePinAnchors.closeProtein42.label);

    // Ankyrin-1 Solenoid Arch: dot directly on crimson helical ridge, pill floating right
    heroLocalToRbc(-0.004, -0.092, 0.016, closePinAnchors.closeAnkyrin.target);
    heroLocalToRbc(-0.068, -0.088, 0.024, closePinAnchors.closeAnkyrin.label);

    // β-Spectrin (left blue coil) & α-Spectrin (right violet coil): glued directly onto real strands!
    const heroLocalX = tmpU.set(1, 0, 0).applyQuaternion(hero.quat);
    closePinAnchors.closeBetaSpec.target.copy(snappedBetaSpec);
    closePinAnchors.closeBetaSpec.label
      .copy(snappedBetaSpec)
      .addScaledVector(hero.surfNormal, -0.032)
      .addScaledVector(heroLocalX, -0.012);

    closePinAnchors.closeAlphaSpec.target.copy(snappedAlphaSpec);
    closePinAnchors.closeAlphaSpec.label
      .copy(snappedAlphaSpec)
      .addScaledVector(hero.surfNormal, -0.042)
      .addScaledVector(heroLocalX, 0.008);
  };

  // Expose live Hero Complex focus point & gene-targeted subunit offset for 10 nm camera
  const getHeroFocus: MembraneMolecularAssembly['getHeroFocus'] = (gene, out) => {
    const hero = anchorClusters[HERO_IDX];
    out.center.copy(hero.surfPos).addScaledVector(hero.surfNormal, -0.062);
    out.normal.copy(hero.surfNormal);

    // Gentle shift onto the active protein subunit while keeping bilayer + spectrin in frame
    const offset = new THREE.Vector3(0, -0.062, 0);
    if (gene === 'SLC4A1') offset.set(0, -0.036, 0);
    else if (gene === 'ANK1') offset.set(0, -0.072, 0.008);
    else if (gene === 'EPB42') offset.set(0.02, -0.054, 0.012);
    else if (gene === 'SPTA1') offset.set(-0.018, -0.088, 0);
    else if (gene === 'SPTB') offset.set(0.018, -0.088, 0);

    offset.applyQuaternion(hero.quat);
    out.subunitTarget.copy(hero.surfPos).add(offset);
  };

  const mutedStone = new THREE.Color('#B5ACA3');
  const hoverWarm = new THREE.Color('#FFF7EA');
  const tmpBaseC = new THREE.Color();
  const tmpEmissiveC = new THREE.Color();
  const gpaBase = new THREE.Color('#A84D5B');
  const gpaMuted = new THREE.Color('#A84D5B').lerp(mutedStone, 0.48);

  // Smoothly interpolated per-gene hover weights (0..1) for tactile glow & scale pop
  const hoverWeights: Record<GeneId, number> = {
    healthy: 0,
    ANK1: 0,
    SPTB: 0,
    SLC4A1: 0,
    SPTA1: 0,
    EPB42: 0,
  };
  const HOVERABLE_GENES: GeneId[] = ['ANK1', 'SPTB', 'SLC4A1', 'SPTA1', 'EPB42'];

  const styleGroup = (
    grp: THREE.Group,
    baseColorHex: string,
    isTarget: boolean,
    isCompromised: boolean,
    isAnyDefect: boolean,
    reveal: number,
    pulse: number,
    hoverAmt: number
  ) => {
    tmpBaseC.set(baseColorHex);
    // Keep hover glow deeply hue-matched (only 12% warm lift) so ACESFilmic never washes out sculpted 3D ridges!
    tmpEmissiveC.copy(tmpBaseC).lerp(hoverWarm, 0.12);

    grp.children.forEach((child) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
      mat.roughness = 0.38 - 0.14 * hoverAmt;
      mat.clearcoat = 0.18 + 0.55 * hoverAmt;

      if (isTarget && isCompromised) {
        mat.color.copy(tmpBaseC).lerp(hoverWarm, 0.08 * hoverAmt);
        mat.opacity = Math.min(0.92, (0.28 + 0.3 * pulse + 0.24 * hoverAmt) * reveal);
        mat.depthWrite = false;
        mat.emissive.copy(hoverAmt > 0.05 ? tmpEmissiveC : tmpBaseC);
        mat.emissiveIntensity = Math.max(0.45 * pulse, 0.34 * hoverAmt);
      } else if (isTarget) {
        mat.color.copy(tmpBaseC).lerp(hoverWarm, 0.1 * hoverAmt);
        mat.opacity = 0.98 * reveal;
        mat.depthWrite = reveal > 0.85;
        mat.emissive.copy(hoverAmt > 0.05 ? tmpEmissiveC : tmpBaseC);
        mat.emissiveIntensity = Math.max(0.16, 0.32 * hoverAmt);
      } else if (isAnyDefect) {
        // Non-target proteins wake back up into rich saturated color + warm internal glow on hover
        mat.color
          .copy(tmpBaseC)
          .lerp(mutedStone, 0.34 * (1 - hoverAmt))
          .lerp(hoverWarm, 0.1 * hoverAmt);
        mat.opacity = 0.96 * reveal;
        mat.depthWrite = reveal > 0.85;
        if (hoverAmt > 0.005) {
          mat.emissive.copy(tmpEmissiveC);
          mat.emissiveIntensity = 0.3 * hoverAmt;
        } else {
          mat.emissive.set('#000000');
          mat.emissiveIntensity = 0;
        }
      } else {
        mat.color.copy(tmpBaseC).lerp(hoverWarm, 0.1 * hoverAmt);
        mat.opacity = 0.98 * reveal;
        mat.depthWrite = reveal > 0.85;
        if (hoverAmt > 0.005) {
          mat.emissive.copy(tmpEmissiveC);
          mat.emissiveIntensity = 0.3 * hoverAmt;
        } else {
          mat.emissive.set('#000000');
          mat.emissiveIntensity = 0;
        }
      }
    });
  };

  const update: MembraneMolecularAssembly['update'] = ({
    gene,
    hoveredGene = null,
    dive,
    shape,
    elapsed,
  }) => {
    // Open circular cutaway iris cleanly across Whole Cell (0.0) -> Bilayer Rim (0.41)
    const cutOpen = THREE.MathUtils.smoothstep(dive, 0.08, 0.44);
    const reveal = THREE.MathUtils.smoothstep(dive, 0.09, 0.36);
    root.visible = reveal > 0.01;
    if (!root.visible) return;

    // Smooth hover ramp (fast attack, gentle release)
    for (let i = 0; i < HOVERABLE_GENES.length; i++) {
      const gid = HOVERABLE_GENES[i];
      const target = hoveredGene === gid ? 1 : 0;
      const rate = target > hoverWeights[gid] ? 0.26 : 0.16;
      hoverWeights[gid] = THREE.MathUtils.lerp(hoverWeights[gid], target, rate);
      if (hoverWeights[gid] < 0.002) hoverWeights[gid] = 0;
    }

    if (
      Math.abs(shape.sphericity - lastSphericity) > 0.002 ||
      Math.abs((shape.acantho ?? 0) - lastAcantho) > 0.002 ||
      Math.abs((shape.pincer ?? 0) - lastPincer) > 0.002 ||
      Math.abs((shape.oval ?? 0) - lastOval) > 0.002 ||
      Math.abs(cutOpen - lastCutOpen) > 0.008
    ) {
      conformToSurface(shape, cutOpen);
      lastSphericity = shape.sphericity;
      lastAcantho = shape.acantho ?? 0;
      lastPincer = shape.pincer ?? 0;
      lastOval = shape.oval ?? 0;
      lastCutOpen = cutOpen;
    }

    const isDefective = gene !== 'healthy';
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 3.8);

    const b3Hover = hoverWeights.SLC4A1;
    const ankHover = hoverWeights.ANK1;
    const p42Hover = hoverWeights.EPB42;
    const alphaHover = hoverWeights.SPTA1;
    const betaHover = hoverWeights.SPTB;

    anchorClusters.forEach((c) => {
      const b3Hit = gene === 'SLC4A1';
      const ankHit = gene === 'ANK1';
      const p42Hit = gene === 'EPB42';

      styleGroup(c.band3, '#AD7243', b3Hit, c.compromised, isDefective, reveal, pulse, b3Hover);
      const b3Lift = b3Hit && c.compromised ? 0.011 * pulse : 0;
      c.band3.position.copy(c.surfPos).addScaledVector(c.surfNormal, -0.018 + b3Lift);
      c.band3.scale.setScalar(1.0 + 0.075 * b3Hover);

      // GPA stalks stay solid and subtly muted when another gene is highlighted
      c.gpa.children.forEach((ch) => {
        const mat = (ch as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
        mat.color.copy(isDefective && !b3Hit ? gpaMuted : gpaBase);
        mat.opacity = 0.96 * reveal;
        mat.depthWrite = reveal > 0.85;
      });

      styleGroup(c.ankyrin, '#913241', ankHit, c.compromised, isDefective, reveal, pulse, ankHover);
      const ankBaseScale = ankHit && c.compromised ? 0.88 + 0.08 * pulse : 1.0;
      c.ankyrin.scale.setScalar(ankBaseScale * (1.0 + 0.075 * ankHover));

      styleGroup(c.protein42, '#3F6F62', p42Hit, c.compromised, isDefective, reveal, pulse, p42Hover);
      c.protein42.scale.setScalar(1.0 + 0.095 * p42Hover);
    });

    const alphaHit = gene === 'SPTA1';
    const betaHit = gene === 'SPTB';
    const alphaBase = new THREE.Color('#6B5A7E');
    const betaBase = new THREE.Color('#49687C');

    spectrinRefs.forEach((ref) => {
      const mat = ref.mesh.material as THREE.MeshPhysicalMaterial;
      const baseC = ref.isAlpha ? alphaBase : betaBase;
      const isTarget = ref.isAlpha ? alphaHit : betaHit;
      const spHover = ref.isAlpha ? alphaHover : betaHover;
      const weak =
        ((ref.isAlpha && (alphaHit || gene === 'ANK1')) || (!ref.isAlpha && betaHit)) &&
        ref.compromised;
      tmpEmissiveC.copy(baseC).lerp(hoverWarm, 0.14);
      mat.roughness = 0.4 - 0.14 * spHover;
      mat.clearcoat = 0.14 + 0.5 * spHover;

      if (isTarget && weak) {
        mat.color.copy(baseC).lerp(hoverWarm, 0.1 * spHover);
        mat.opacity = Math.min(0.9, (0.24 + 0.28 * pulse + 0.24 * spHover) * reveal);
        mat.depthWrite = false;
        mat.emissive.copy(spHover > 0.05 ? tmpEmissiveC : baseC);
        mat.emissiveIntensity = Math.max(0.42 * pulse, 0.34 * spHover);
      } else if (isTarget) {
        mat.color.copy(baseC).lerp(hoverWarm, 0.12 * spHover);
        mat.opacity = 0.98 * reveal;
        mat.depthWrite = reveal > 0.85;
        mat.emissive.copy(spHover > 0.05 ? tmpEmissiveC : baseC);
        mat.emissiveIntensity = Math.max(0.16, 0.34 * spHover);
      } else if (isDefective) {
        mat.color
          .copy(baseC)
          .lerp(mutedStone, 0.45 * (1 - spHover))
          .lerp(hoverWarm, 0.12 * spHover);
        mat.opacity = 0.96 * reveal;
        mat.depthWrite = reveal > 0.85;
        if (spHover > 0.005) {
          mat.emissive.copy(tmpEmissiveC);
          mat.emissiveIntensity = 0.34 * spHover;
        } else {
          mat.emissive.set('#000000');
          mat.emissiveIntensity = 0;
        }
      } else {
        mat.color.copy(baseC).lerp(hoverWarm, 0.12 * spHover);
        mat.opacity = 0.98 * reveal;
        mat.depthWrite = reveal > 0.85;
        if (spHover > 0.005) {
          mat.emissive.copy(tmpEmissiveC);
          mat.emissiveIntensity = 0.34 * spHover;
        } else {
          mat.emissive.set('#000000');
          mat.emissiveIntensity = 0;
        }
      }
    });
  };

  return { root, update, pinAnchors, closePinAnchors, getHeroFocus, pickables };
}
