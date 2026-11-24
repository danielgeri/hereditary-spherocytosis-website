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

export interface MembraneMolecularAssembly {
  root: THREE.Group;
  update: (params: {
    gene: GeneId;
    dive: number;
    shape: RbcShapeParams;
    elapsed: number;
  }) => void;
  /** Overview callout anchors (shown at 40 nm Mesh scale) */
  pinAnchors: Record<string, THREE.Vector3>;
  /** Tight anatomical subunit anchors on the single Hero Complex (shown at 10 nm Complex scale) */
  closePinAnchors: Record<string, THREE.Vector3>;
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

  // Overview callout pin specs (shown at 40 nm Mesh scale)
  const pinSpecs: Record<string, { unitDir: THREE.Vector3; normalOffset: number }> = {
    bilayer: { unitDir: tangentToUnitDir(-0.46, 0.25), normalOffset: 0.04 },
    band3: { unitDir: anchorClusters[4].unitDir.clone(), normalOffset: 0.055 },
    ankyrin: { unitDir: anchorClusters[5].unitDir.clone(), normalOffset: -0.095 },
    protein42: { unitDir: anchorClusters[0].unitDir.clone(), normalOffset: -0.06 },
    spectrin: { unitDir: tangentToUnitDir(-0.18, -0.14), normalOffset: specOffset },
    junction41: { unitDir: vertexUnitDirs[3].clone(), normalOffset: specOffset },
  };

  const pinAnchors: Record<string, THREE.Vector3> = {
    bilayer: new THREE.Vector3(),
    band3: new THREE.Vector3(),
    ankyrin: new THREE.Vector3(),
    protein42: new THREE.Vector3(),
    spectrin: new THREE.Vector3(),
    junction41: new THREE.Vector3(),
  };

  // Close-up subunit pin anchors on the single Hero Complex (shown at 10 nm Complex scale!)
  const closePinAnchors: Record<string, THREE.Vector3> = {
    closeBand3: new THREE.Vector3(),
    closeGpa: new THREE.Vector3(),
    closeAnkyrin: new THREE.Vector3(),
    closeProtein42: new THREE.Vector3(),
    closeAlphaSpec: new THREE.Vector3(),
    closeBetaSpec: new THREE.Vector3(),
  };

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

    // 3. Conformally deform coiled-coil Spectrin cables in-place
    spectrinRefs.forEach((ref) => {
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

    // 4. Project Band 3, GPA, Ankyrin-1, and Protein 4.2 clusters
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

    // 5. Project 40 nm overview callout anchors
    Object.entries(pinSpecs).forEach(([id, spec]) => {
      evalRbcSurfaceFrame(spec.unitDir, staticShape, tmpPos, tmpNorm);
      pinAnchors[id].copy(tmpPos).addScaledVector(tmpNorm, spec.normalOffset);
    });

    // 6. Project 10 nm close-up subunit anchors right onto Hero Complex (anchorClusters[HERO_IDX])
    const hero = anchorClusters[HERO_IDX];
    const heroLocalToRbc = (lx: number, ly: number, lz: number, target: THREE.Vector3) => {
      tmpLocal.set(lx, ly, lz).applyQuaternion(hero.quat);
      target.copy(hero.surfPos).add(tmpLocal);
    };

    // Balanced 2-column anatomical callout anchors framing the Hero Complex cleanly:
    // Left (+lx): Band 3 Dimer -> Protein 4.2 Clasp -> β-Spectrin Coil
    // Right (-lx): Glycophorin A -> Ankyrin-1 Arch -> α-Spectrin Coil
    heroLocalToRbc(0.034, 0.032, 0.012, closePinAnchors.closeBand3);
    heroLocalToRbc(-0.046, 0.026, -0.006, closePinAnchors.closeGpa);
    heroLocalToRbc(-0.044, -0.092, 0.022, closePinAnchors.closeAnkyrin);
    heroLocalToRbc(0.048, -0.050, 0.018, closePinAnchors.closeProtein42);
    heroLocalToRbc(-0.068, -0.142, -0.010, closePinAnchors.closeAlphaSpec);
    heroLocalToRbc(0.064, -0.142, 0.012, closePinAnchors.closeBetaSpec);
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

  const styleGroup = (
    grp: THREE.Group,
    baseColorHex: string,
    isTarget: boolean,
    isCompromised: boolean,
    isAnyDefect: boolean,
    reveal: number,
    pulse: number
  ) => {
    const baseC = new THREE.Color(baseColorHex);
    grp.children.forEach((child) => {
      const mat = (child as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
      if (isTarget && isCompromised) {
        mat.color.copy(baseC);
        mat.opacity = (0.28 + 0.3 * pulse) * reveal;
        mat.depthWrite = false;
        mat.emissive.copy(baseC);
        mat.emissiveIntensity = 0.45 * pulse;
      } else if (isTarget) {
        mat.color.copy(baseC);
        mat.opacity = 0.98 * reveal;
        mat.depthWrite = reveal > 0.85;
        mat.emissive.copy(baseC);
        mat.emissiveIntensity = 0.16;
      } else if (isAnyDefect) {
        // Keep non-target proteins crisp & solid (just softly desaturated) so 10 nm macro view stays sharp!
        mat.color.copy(baseC).lerp(mutedStone, 0.34);
        mat.opacity = 0.96 * reveal;
        mat.depthWrite = reveal > 0.85;
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      } else {
        mat.color.copy(baseC);
        mat.opacity = 0.98 * reveal;
        mat.depthWrite = reveal > 0.85;
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      }
    });
  };

  const update: MembraneMolecularAssembly['update'] = ({ gene, dive, shape, elapsed }) => {
    // Open circular cutaway iris cleanly across Whole Cell (0.0) -> Bilayer Rim (0.41)
    const cutOpen = THREE.MathUtils.smoothstep(dive, 0.08, 0.44);
    const reveal = THREE.MathUtils.smoothstep(dive, 0.09, 0.36);
    root.visible = reveal > 0.01;
    if (!root.visible) return;

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

    anchorClusters.forEach((c) => {
      const b3Hit = gene === 'SLC4A1';
      const ankHit = gene === 'ANK1';
      const p42Hit = gene === 'EPB42';

      styleGroup(c.band3, '#AD7243', b3Hit, c.compromised, isDefective, reveal, pulse);
      const b3Lift = b3Hit && c.compromised ? 0.011 * pulse : 0;
      c.band3.position.copy(c.surfPos).addScaledVector(c.surfNormal, -0.018 + b3Lift);

      // GPA stalks stay solid and subtly muted when another gene is highlighted
      const gpaBase = new THREE.Color('#A84D5B');
      c.gpa.children.forEach((ch) => {
        const mat = (ch as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
        mat.color.copy(isDefective && !b3Hit ? gpaBase.clone().lerp(mutedStone, 0.48) : gpaBase);
        mat.opacity = 0.96 * reveal;
        mat.depthWrite = reveal > 0.85;
      });

      styleGroup(c.ankyrin, '#913241', ankHit, c.compromised, isDefective, reveal, pulse);
      c.ankyrin.scale.setScalar(ankHit && c.compromised ? 0.88 + 0.08 * pulse : 1.0);

      styleGroup(c.protein42, '#3F6F62', p42Hit, c.compromised, isDefective, reveal, pulse);
    });

    const alphaHit = gene === 'SPTA1';
    const betaHit = gene === 'SPTB';
    const alphaBase = new THREE.Color('#6B5A7E');
    const betaBase = new THREE.Color('#49687C');

    spectrinRefs.forEach((ref) => {
      const mat = ref.mesh.material as THREE.MeshPhysicalMaterial;
      const baseC = ref.isAlpha ? alphaBase : betaBase;
      const isTarget = ref.isAlpha ? alphaHit : betaHit;
      const weak =
        ((ref.isAlpha && (alphaHit || gene === 'ANK1')) || (!ref.isAlpha && betaHit)) &&
        ref.compromised;

      if (isTarget && weak) {
        mat.color.copy(baseC);
        mat.opacity = (0.24 + 0.28 * pulse) * reveal;
        mat.depthWrite = false;
        mat.emissive.copy(baseC);
        mat.emissiveIntensity = 0.42 * pulse;
      } else if (isTarget) {
        mat.color.copy(baseC);
        mat.opacity = 0.98 * reveal;
        mat.depthWrite = reveal > 0.85;
        mat.emissive.copy(baseC);
        mat.emissiveIntensity = 0.16;
      } else if (isDefective) {
        mat.color.copy(baseC).lerp(mutedStone, 0.45);
        mat.opacity = 0.96 * reveal;
        mat.depthWrite = reveal > 0.85;
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      } else {
        mat.color.copy(baseC);
        mat.opacity = 0.98 * reveal;
        mat.depthWrite = reveal > 0.85;
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      }
    });
  };

  return { root, update, pinAnchors, closePinAnchors, getHeroFocus, pickables };
}
