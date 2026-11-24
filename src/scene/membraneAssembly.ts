import * as THREE from 'three';
import { GeneId } from '../data/hsContent';
import { evalRbcSurfaceFrame, RbcShapeParams } from './rbcGeometry';

/**
 * Conformal Cryo-EM 3D molecular cutaway assembly.
 *
 * CRITICAL REALISM UPGRADE:
 * Instead of using a rigid fixed paraboloid (which overhangs or sinks when the RBC
 * morphs between a flat biconcave disc and a compact spherocyte), EVERY SINGLE
 * phospholipid headgroup, hydrophobic tail, Band 3 complex, Ankyrin-1 arch,
 * Protein 4.2 clasp, 4.1R/F-Actin junction, and coiled-coil Spectrin vertex is
 * projected directly onto the LIVE parametric Evans-Fung RBC surface via
 * `evalRbcSurfaceFrame(unitDir, shapeParams)`!
 *
 * The outer rim of the phospholipid bilayer shares the exact same unit-sphere
 * chord radius (`CUT_MAX_CHORD`) as the RBC fragment shader cutaway — guaranteeing
 * a 100% flush, zero-gap fit at every sphericity (0%..100%) and every orbit angle!
 */
export const CUT_UNIT_CENTER = new THREE.Vector3(0.46, 0.85, 0.25).normalize();
export const CUT_MAX_CHORD = 0.56;

export interface MembraneMolecularAssembly {
  root: THREE.Group;
  update: (params: {
    gene: GeneId;
    dive: number;
    shape: RbcShapeParams;
    elapsed: number;
  }) => void;
  /** World-in-RBC-local positions for 3D-to-2D callout labels (updated conformally!) */
  pinAnchors: Record<string, THREE.Vector3>;
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
  // Precomputed per-ring cross-section metadata for fast in-place conformal deformation
  radialSegs: number;
  tubularSegs: number;
}

interface AnchorCluster {
  unitDir: THREE.Vector3;
  tangentAngle: number;
  band3: THREE.Group;
  ankyrin: THREE.Group;
  protein42: THREE.Group;
  compromised: boolean;
  surfPos: THREE.Vector3;
  surfNormal: THREE.Vector3;
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

// Tangent basis around CUT_UNIT_CENTER on the unit sphere
const T1 = new THREE.Vector3(-CUT_UNIT_CENTER.z, 0, CUT_UNIT_CENTER.x).normalize();
const T2 = new THREE.Vector3().crossVectors(CUT_UNIT_CENTER, T1).normalize();

/** Maps tangent-plane polar coords (tx, tz) into exact unit-sphere direction around CUT_UNIT_CENTER */
function tangentToUnitDir(tx: number, tz: number): THREE.Vector3 {
  const r = Math.hypot(tx, tz);
  if (r < 1e-6) return CUT_UNIT_CENTER.clone();
  // Exact geodesic exponential map on unit sphere (so chord distance matches 2*sin(r/2)!)
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

  // Maximum geodesic angle corresponding to chord distance CUT_MAX_CHORD (with tiny overlap tucked cleanly under the rim lip)
  const maxAngle = 2 * Math.asin(Math.min(0.99, (CUT_MAX_CHORD + 0.012) / 2));

  // -------------------------------------------------------------------------
  // 1. Densely Packed Conformal Phospholipid Bilayer Carpet (~1,200 lipids)
  // -------------------------------------------------------------------------
  const lipidSpecs: LipidSpec[] = [];
  const totalSamples = 1280;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < totalSamples; i++) {
    const rAngle = Math.sqrt((i + 0.5) / totalSamples) * maxAngle;
    const theta = i * goldenAngle;
    const tx = Math.cos(theta) * rAngle;
    const tz = Math.sin(theta) * rAngle;

    // Carve an organic viewing window in the center so you see the full double-leaflet
    // bilayer cliff face AND peer straight into the Ankyrin arches & Spectrin mesh below
    const winDist = Math.hypot((tx - 0.02) * 1.04, (tz - 0.03) * 1.08);
    const organicEdge = 0.335 + Math.sin(theta * 3.0) * 0.028 + Math.cos(theta * 5.0) * 0.016;
    if (winDist < organicEdge) continue;

    const unitDir = tangentToUnitDir(tx, tz);
    lipidSpecs.push({
      unitDir,
      chordR: unitDir.distanceTo(CUT_UNIT_CENTER),
      hJitter: (rand() - 0.5) * 0.005,
      tiltX: (rand() - 0.5) * 0.22,
      tiltZ: (rand() - 0.5) * 0.22,
      scale: 0.88 + rand() * 0.22,
    });
  }

  const headCount = lipidSpecs.length;
  const headGeo = new THREE.IcosahedronGeometry(0.0108, 1);
  const tailGeo = new THREE.CylinderGeometry(0.0021, 0.0017, 0.032, 5);

  const outerHeadMat = new THREE.MeshStandardMaterial({
    color: '#9A4248',
    roughness: 0.42,
    metalness: 0.04,
  });
  const innerHeadMat = new THREE.MeshStandardMaterial({
    color: '#B57672',
    roughness: 0.48,
    metalness: 0.02,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: '#D5BFA6',
    roughness: 0.68,
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
  const specOffset = -0.145; // inward along surface normal from outer membrane

  const vertexUnitDirs: THREE.Vector3[] = [tangentToUnitDir(0.01, 0.01)];
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 + Math.PI / 6;
    const jitterR = hexAngleR * (0.94 + rand() * 0.1);
    vertexUnitDirs.push(tangentToUnitDir(Math.cos(a) * jitterR, Math.sin(a) * jitterR));
  }

  const actinMat = new THREE.MeshStandardMaterial({ color: '#9C9288', roughness: 0.52, metalness: 0.04 });
  const p41Mat = new THREE.MeshStandardMaterial({ color: '#6C645C', roughness: 0.46, metalness: 0.06 });

  const junctions: JunctionRef[] = vertexUnitDirs.map((unitDir, vIdx) => {
    const jGroup = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const t = (k - 2.5) * 0.01;
      const ang = k * 1.25;
      const mono = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0098, 1), actinMat);
      mono.position.set(t, Math.sin(ang) * 0.0055, Math.cos(ang) * 0.0055);
      jGroup.add(mono);
    }
    for (let lobe = 0; lobe < 3; lobe++) {
      const la = (lobe * Math.PI * 2) / 3 + vIdx * 0.5;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0115, 1), p41Mat);
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
  // 3. Conformal Wavy Braided Coiled-Coil α/β-Spectrin Filaments
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
  const tubularSegs = 36;
  const radialSegs = 7;

  const createSpectrinShell = (
    iA: number,
    iB: number,
    phaseOffset: number,
    color: string,
    isAlpha: boolean,
    compromised: boolean
  ) => {
    // Placeholder curve; vertices are updated conformally in-place whenever sphericity changes
    const dummyCurve = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0, 0));
    const geo = new THREE.TubeGeometry(dummyCurve, tubularSegs, 0.0054, radialSegs, false);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.44,
      metalness: 0.05,
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
  // 4. Conformal Cryo-EM Band 3 / Ankyrin-1 / Protein 4.2 Vertical Complexes
  // -------------------------------------------------------------------------
  const blobGeo = new THREE.IcosahedronGeometry(1, 2);
  const anchorClusters: AnchorCluster[] = [];

  for (let edgeIdx = 0; edgeIdx < 6; edgeIdx++) {
    const [iA, iB] = edges[edgeIdx];
    const midUnit = new THREE.Vector3()
      .addVectors(vertexUnitDirs[iA], vertexUnitDirs[iB])
      .normalize();

    const tangentAngle = (edgeIdx * Math.PI) / 3;

    // Band 3 (SLC4A1) transmembrane dimer-of-dimers
    const band3Group = new THREE.Group();
    const b3Mat = new THREE.MeshStandardMaterial({
      color: '#AD7243',
      roughness: 0.42,
      metalness: 0.05,
      transparent: true,
      opacity: 0.96,
    });
    const b3Lobes: [number, number, number, number, number, number][] = [
      [-0.014, 0.032, -0.009, 0.013, 0.011, 0.012],
      [0.015, 0.034, -0.008, 0.012, 0.010, 0.013],
      [-0.011, 0.030, 0.013, 0.012, 0.010, 0.012],
      [0.013, 0.032, 0.012, 0.013, 0.011, 0.011],
      [-0.015, 0.004, -0.010, 0.014, 0.020, 0.013],
      [0.015, 0.004, -0.010, 0.014, 0.020, 0.013],
      [-0.014, 0.002, 0.012, 0.013, 0.019, 0.013],
      [0.014, 0.002, 0.012, 0.013, 0.019, 0.013],
      [0.0, -0.006, 0.0, 0.017, 0.024, 0.016],
      [-0.015, -0.034, 0.004, 0.014, 0.016, 0.013],
      [0.015, -0.034, -0.004, 0.014, 0.016, 0.013],
      [-0.010, -0.050, 0.002, 0.012, 0.012, 0.011],
      [0.011, -0.049, -0.003, 0.012, 0.012, 0.011],
    ];
    b3Lobes.forEach(([lx, ly, lz, sx, sy, sz]) => {
      const m = new THREE.Mesh(blobGeo, b3Mat.clone());
      m.position.set(lx, ly, lz);
      m.scale.set(sx, sy, sz);
      band3Group.add(m);
      pickables.push({ mesh: m, gene: 'SLC4A1' });
    });
    root.add(band3Group);

    // Ankyrin-1 (ANK1) C-shaped 24-repeat solenoid arch
    const ankyrinGroup = new THREE.Group();
    const ankMat = new THREE.MeshStandardMaterial({
      color: '#913241',
      roughness: 0.4,
      metalness: 0.06,
      transparent: true,
      opacity: 0.96,
    });
    for (let seg = 0; seg < 11; seg++) {
      const t = seg / 10;
      const theta = (t - 0.5) * Math.PI * 0.92;
      const arcR = 0.048;
      const ax = Math.sin(theta) * 0.02;
      const ay = -Math.sin(theta) * arcR + 0.004;
      const az = (Math.cos(theta) - 0.65) * 0.038;
      const lobe = new THREE.Mesh(blobGeo, ankMat.clone());
      const rBase = 0.0125 + Math.sin(t * Math.PI) * 0.0042;
      lobe.position.set(ax, ay, az);
      lobe.scale.set(rBase * 1.25, rBase * 0.78, rBase * 1.05);
      lobe.rotation.set(theta * 0.6, t * 0.5, 0);
      ankyrinGroup.add(lobe);
      pickables.push({ mesh: lobe, gene: 'ANK1' });
    }
    root.add(ankyrinGroup);

    // Protein 4.2 (EPB42) sculpted globular clasp
    const p42Group = new THREE.Group();
    const p42Mat = new THREE.MeshStandardMaterial({
      color: '#3F6F62',
      roughness: 0.42,
      metalness: 0.05,
      transparent: true,
      opacity: 0.96,
    });
    const p42Lobes: [number, number, number, number][] = [
      [0.025, 0.008, 0.015, 0.014],
      [0.033, -0.005, 0.010, 0.012],
      [0.021, -0.011, 0.020, 0.011],
      [0.030, 0.002, 0.022, 0.010],
    ];
    p42Lobes.forEach(([lx, ly, lz, lr]) => {
      const m = new THREE.Mesh(blobGeo, p42Mat.clone());
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
      ankyrin: ankyrinGroup,
      protein42: p42Group,
      compromised: edgeIdx % 2 === 0 || edgeIdx === 1,
      surfPos: new THREE.Vector3(),
      surfNormal: new THREE.Vector3(0, 1, 0),
    });
  }

  // Conformal callout pin unit-directions & normal offsets
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

  // -------------------------------------------------------------------------
  // CONFORMAL SURFACE DEFORMATION (runs whenever RBC sphericity or gene hints change!)
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
  const upY = new THREE.Vector3(0, 1, 0);
  const dummyObj = new THREE.Object3D();

  // Reusable scratch arrays for in-place TubeGeometry update
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

    // 1. Project every single phospholipid headgroup & twin hydrophobic tails onto live RBC surface!
    for (let i = 0; i < headCount; i++) {
      const sp = lipidSpecs[i];
      if (sp.chordR > activeChord) {
        // Hide lipids outside the currently open circular iris
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

      // Outer polar headgroup flush right along RBC outer membrane surface (+0.008)
      dummyObj.position.copy(tmpPos).addScaledVector(tmpNorm, 0.006 + sp.hJitter);
      dummyObj.quaternion.copy(tmpQuat).multiply(tmpTilt);
      dummyObj.scale.set(sp.scale, sp.scale * 0.9, sp.scale);
      dummyObj.updateMatrix();
      outerHeads.setMatrixAt(i, dummyObj.matrix);

      // Inner cytoplasmic polar headgroup (-0.044 along inward normal)
      dummyObj.position.copy(tmpPos).addScaledVector(tmpNorm, -0.044 + sp.hJitter);
      dummyObj.updateMatrix();
      innerHeads.setMatrixAt(i, dummyObj.matrix);

      // Hydrophobic fatty-acid tails nestled cleanly between the two leaflets
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

    // 2. Project 4.1R / F-Actin junctions onto the exact inner offset surface
    junctions.forEach((j) => {
      evalRbcSurfaceFrame(j.unitDir, staticShape, j.pos, j.normal);
      j.group.position.copy(j.pos).addScaledVector(j.normal, specOffset);
      j.group.quaternion.setFromUnitVectors(upY, j.normal);
    });

    // 3. Conformally update the 24 braided coiled-coil Spectrin cables in-place!
    spectrinRefs.forEach((ref) => {
      const uA = junctions[ref.iA].unitDir;
      const uB = junctions[ref.iB].unitDir;

      for (let s = 0; s <= ref.tubularSegs; s++) {
        const t = s / ref.tubularSegs;
        tmpU.lerpVectors(uA, uB, t).normalize();
        evalRbcSurfaceFrame(tmpU, staticShape, spinePts[s], spineNorms[s]);
        // Offset cleanly inward along exact local surface normal
        spinePts[s].addScaledVector(spineNorms[s], specOffset);
      }

      // Add subtle catenary droop & braided triple-helical wave along exact surface frame
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

      // Rebuild tube ring vertices in-place (zero allocation!)
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

    // 4. Project Band 3, Ankyrin-1, and Protein 4.2 clusters flush to the exact curved wall!
    anchorClusters.forEach((c) => {
      evalRbcSurfaceFrame(c.unitDir, staticShape, c.surfPos, c.surfNormal);
      tmpQuat.setFromUnitVectors(upY, c.surfNormal);
      tmpSpin.setFromAxisAngle(upY, c.tangentAngle);
      tmpQuat.multiply(tmpSpin);

      c.band3.position.copy(c.surfPos).addScaledVector(c.surfNormal, -0.018);
      c.band3.quaternion.copy(tmpQuat);

      c.ankyrin.position.copy(c.surfPos).addScaledVector(c.surfNormal, -0.095);
      c.ankyrin.quaternion.copy(tmpQuat);

      c.protein42.position.copy(c.surfPos).addScaledVector(c.surfNormal, -0.058);
      c.protein42.quaternion.copy(tmpQuat);
    });

    // 5. Project callout pin anchors conformally
    Object.entries(pinSpecs).forEach(([id, spec]) => {
      evalRbcSurfaceFrame(spec.unitDir, staticShape, tmpPos, tmpNorm);
      pinAnchors[id].copy(tmpPos).addScaledVector(tmpNorm, spec.normalOffset);
    });
  };

  // Sculptural stone color for non-targeted complexes
  const mutedStone = new THREE.Color('#AFA69D');

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
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (isTarget && isCompromised) {
        mat.color.copy(baseC);
        mat.opacity = (0.22 + 0.28 * pulse) * reveal;
        mat.emissive.copy(baseC);
        mat.emissiveIntensity = 0.45 * pulse;
      } else if (isTarget) {
        mat.color.copy(baseC);
        mat.opacity = 0.98 * reveal;
        mat.emissive.copy(baseC);
        mat.emissiveIntensity = 0.18;
      } else if (isAnyDefect) {
        mat.color.copy(baseC).lerp(mutedStone, 0.48);
        mat.opacity = 0.72 * reveal;
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      } else {
        mat.color.copy(baseC);
        mat.opacity = 0.96 * reveal;
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      }
    });
  };

  const update: MembraneMolecularAssembly['update'] = ({ gene, dive, shape, elapsed }) => {
    const cutOpen = THREE.MathUtils.smoothstep(dive, 0.1, 0.58);
    const reveal = THREE.MathUtils.smoothstep(dive, 0.12, 0.46);
    root.visible = reveal > 0.01;
    if (!root.visible) return;

    // Re-conform all lipids, spectrin helices, and protein complexes whenever shape or iris changes!
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
      const b3Lift = b3Hit && c.compromised ? 0.012 * pulse : 0;
      c.band3.position.copy(c.surfPos).addScaledVector(c.surfNormal, -0.018 + b3Lift);

      styleGroup(c.ankyrin, '#913241', ankHit, c.compromised, isDefective, reveal, pulse);
      c.ankyrin.scale.setScalar(ankHit && c.compromised ? 0.88 + 0.08 * pulse : 1.0);

      styleGroup(c.protein42, '#3F6F62', p42Hit, c.compromised, isDefective, reveal, pulse);
    });

    const alphaHit = gene === 'SPTA1';
    const betaHit = gene === 'SPTB';
    const alphaBase = new THREE.Color('#6B5A7E');
    const betaBase = new THREE.Color('#49687C');

    spectrinRefs.forEach((ref) => {
      const mat = ref.mesh.material as THREE.MeshStandardMaterial;
      const baseC = ref.isAlpha ? alphaBase : betaBase;
      const isTarget = ref.isAlpha ? alphaHit : betaHit;
      const weak =
        ((ref.isAlpha && (alphaHit || gene === 'ANK1')) || (!ref.isAlpha && betaHit)) &&
        ref.compromised;

      if (isTarget && weak) {
        mat.color.copy(baseC);
        mat.opacity = (0.22 + 0.25 * pulse) * reveal;
        mat.emissive.copy(baseC);
        mat.emissiveIntensity = 0.45 * pulse;
      } else if (isTarget) {
        mat.color.copy(baseC);
        mat.opacity = 0.98 * reveal;
        mat.emissive.copy(baseC);
        mat.emissiveIntensity = 0.16;
      } else if (isDefective) {
        mat.color.copy(baseC).lerp(mutedStone, 0.45);
        mat.opacity = 0.72 * reveal;
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      } else {
        mat.color.copy(baseC);
        mat.opacity = 0.96 * reveal;
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      }
    });
  };

  return { root, update, pinAnchors, pickables };
}
