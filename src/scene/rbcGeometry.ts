import * as THREE from 'three';

/**
 * Generates a high-contrast warm Editorial Alabaster studio softbox environment
 * via PMREMGenerator so the wet biological membrane reflects shaped studio light.
 */
export function createStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#DDD3C7');

  const keyBox = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 7),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.6, 2.48, 2.34),
      side: THREE.DoubleSide,
    })
  );
  keyBox.position.set(2.8, 6.4, 3.6);
  keyBox.lookAt(0, 0, 0);
  envScene.add(keyBox);

  const sideStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 9),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.45, 1.4, 1.35),
      side: THREE.DoubleSide,
    })
  );
  sideStrip.position.set(-7.0, 1.6, 2.2);
  sideStrip.lookAt(0, 0, 0);
  envScene.add(sideStrip);

  const rimStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 3.2),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.9, 1.42, 1.32),
      side: THREE.DoubleSide,
    })
  );
  rimStrip.position.set(-2.0, 2.4, -7.0);
  rimStrip.lookAt(0, 0, 0);
  envScene.add(rimStrip);

  const negFillA = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 7),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.11, 0.08, 0.08),
      side: THREE.DoubleSide,
    })
  );
  negFillA.position.set(6.4, -0.4, -2.0);
  negFillA.lookAt(0, 0, 0);
  envScene.add(negFillA);

  const negFillB = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 5),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.15, 0.11, 0.11),
      side: THREE.DoubleSide,
    })
  );
  negFillB.position.set(-1.5, -5.8, -3.0);
  negFillB.lookAt(0, 0, 0);
  envScene.add(negFillB);

  const floorBounce = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(0.9, 0.85, 0.78),
      side: THREE.DoubleSide,
    })
  );
  floorBounce.position.set(0, -5.6, 2.2);
  floorBounce.rotation.x = -Math.PI / 2;
  envScene.add(floorBounce);

  const envRT = pmrem.fromScene(envScene, 0.04);
  pmrem.dispose();
  return envRT.texture;
}

export interface RbcShapeParams {
  sphericity: number; // 0 = healthy biconcave disc, 1 = dense spherocyte
  time?: number;
  acantho?: number;
  pincer?: number;
  oval?: number;
}

export interface RbcGeometryBundle {
  geometry: THREE.BufferGeometry;
  baseUnitCoords: Float32Array;
  updateShape: (params: RbcShapeParams) => void;
}

const C0 = 0.2072;
const C1 = 2.0026;
const C2 = -1.1228;

/**
 * Single mathematical source of truth for any point on the erythrocyte membrane,
 * shared identically by both the RBC mesh vertices AND the conformal Cryo-EM
 * molecular membrane cutaway assembly so they match with zero gap at every sphericity!
 */
export function evalRbcPoint(
  ux: number,
  uy: number,
  uz: number,
  params: RbcShapeParams,
  outPos?: THREE.Vector3
): { x: number; y: number; z: number; thickness: number } {
  const s = THREE.MathUtils.clamp(params.sphericity, 0, 1);
  const time = params.time ?? 0;
  const acantho = params.acantho ?? 0;
  const pincer = params.pincer ?? 0;
  const oval = params.oval ?? 0;

  const R = THREE.MathUtils.lerp(1.0, 0.77, s);
  const r2 = Math.min(1.0, ux * ux + uz * uz);
  const signY = uy >= 0 ? 1 : -1;
  const rootTerm = Math.sqrt(Math.max(0.0, 1.0 - r2));

  // Authentic Evans & Fung (1972) biconcave half-height profile
  const discHalfH = 0.515 * rootTerm * (C0 + C1 * r2 + C2 * r2 * r2);
  const discY = signY * discHalfH;
  const sphereY = uy;

  // Ultra-subtle organic asymmetry so the cell feels grown, not CAD-lathed
  const bioAsym =
    1.0 +
    (Math.sin(ux * 2.4 + uz * 1.9) * 0.012 + Math.cos(ux * 3.1 - uz * 2.7) * 0.008) *
      (1.0 - s * 0.4);

  let y = THREE.MathUtils.lerp(discY, sphereY, s) * R;
  let x = ux * R * bioAsym;
  let z = uz * R * (2.0 - bioAsym);

  // Subtle genotype morphology hints
  if (acantho > 0.001) {
    const theta = Math.atan2(uz, ux);
    const phi = Math.acos(THREE.MathUtils.clamp(uy, -1, 1));
    const bumps =
      Math.sin(theta * 7.0) * Math.sin(phi * 5.0) * 0.55 +
      Math.cos(theta * 5.0 + phi * 4.0) * 0.45;
    const amp = acantho * 0.045 * Math.max(0, bumps);
    x += ux * amp;
    y += uy * amp;
    z += uz * amp;
  }

  if (pincer > 0.001) {
    const side = Math.max(0, ux - 0.14);
    const pinch = Math.exp(-Math.pow(uz * 3.4, 2)) * side * pincer * 0.2;
    z *= 1.0 - pinch * 0.5;
    x -= pinch * 0.2;
  }

  if (oval > 0.001) {
    x *= 1.0 + oval * 0.12;
    z *= 1.0 - oval * 0.09;
  }

  // Gentle membrane breathing wave (suppressed when spherocytic)
  const flex = (1.0 - s * 0.85) * 0.008;
  if (flex > 0.0002 && time !== 0) {
    const r = Math.sqrt(r2);
    const wave =
      Math.sin(ux * 3.5 + time * 1.05) * Math.cos(uz * 3.1 - time * 0.9) * flex;
    y += wave * (0.35 + 0.65 * r);
  }

  const discThick = THREE.MathUtils.clamp(discHalfH / 0.34, 0.14, 1.0);
  const sphereThick = THREE.MathUtils.clamp(0.8 + 0.2 * Math.abs(uy), 0.76, 1.0);
  const thickness = THREE.MathUtils.lerp(discThick, sphereThick, s);

  if (outPos) outPos.set(x, y, z);
  return { x, y, z, thickness };
}

/**
 * Evaluates exact surface position AND true outward unit normal on the live RBC
 * at unit-sphere direction `u` via finite differences on the tangent frame.
 */
const _eT1 = new THREE.Vector3();
const _eT2 = new THREE.Vector3();
const _eU1 = new THREE.Vector3();
const _eU2 = new THREE.Vector3();
const _eP0 = new THREE.Vector3();
const _eP1 = new THREE.Vector3();
const _eP2 = new THREE.Vector3();
const _eD1 = new THREE.Vector3();
const _eD2 = new THREE.Vector3();

export function evalRbcSurfaceFrame(
  u: THREE.Vector3,
  params: RbcShapeParams,
  outPos: THREE.Vector3,
  outNormal: THREE.Vector3
): void {
  // Build right-handed tangent basis around unit vector u
  if (Math.abs(u.y) < 0.92) {
    _eT1.set(-u.z, 0, u.x).normalize();
  } else {
    _eT1.set(1, 0, 0);
  }
  _eT2.crossVectors(u, _eT1).normalize();

  const eps = 0.012;
  evalRbcPoint(u.x, u.y, u.z, params, _eP0);

  _eU1.copy(u).addScaledVector(_eT1, eps).normalize();
  evalRbcPoint(_eU1.x, _eU1.y, _eU1.z, params, _eP1);

  _eU2.copy(u).addScaledVector(_eT2, eps).normalize();
  evalRbcPoint(_eU2.x, _eU2.y, _eU2.z, params, _eP2);

  _eD1.subVectors(_eP1, _eP0);
  _eD2.subVectors(_eP2, _eP0);

  outPos.copy(_eP0);
  outNormal.crossVectors(_eD1, _eD2).normalize();
  // Ensure outward orientation matches u
  if (outNormal.dot(u) < 0) {
    outNormal.negate();
  }
}

export function createParametricRbcGeometry(
  radialSegments = 128,
  heightSegments = 88
): RbcGeometryBundle {
  const geo = new THREE.SphereGeometry(1, radialSegments, heightSegments);
  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const count = posAttr.count;

  const baseUnitCoords = new Float32Array(count * 3);
  const thicknessAttr = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const len = Math.hypot(x, y, z) || 1;
    baseUnitCoords[i * 3] = x / len;
    baseUnitCoords[i * 3 + 1] = y / len;
    baseUnitCoords[i * 3 + 2] = z / len;
    thicknessAttr[i] = 1.0;
  }

  geo.setAttribute('aUnitPos', new THREE.BufferAttribute(baseUnitCoords, 3));
  geo.setAttribute('aThickness', new THREE.BufferAttribute(thicknessAttr, 1));

  const updateShape: RbcGeometryBundle['updateShape'] = (params) => {
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const thick = geo.attributes.aThickness as THREE.BufferAttribute;

    for (let i = 0; i < count; i++) {
      const ux = baseUnitCoords[i * 3];
      const uy = baseUnitCoords[i * 3 + 1];
      const uz = baseUnitCoords[i * 3 + 2];

      const p = evalRbcPoint(ux, uy, uz, params);
      pos.setXYZ(i, p.x, p.y, p.z);
      thick.setX(i, p.thickness);
    }

    pos.needsUpdate = true;
    thick.needsUpdate = true;
    geo.computeVertexNormals();
  };

  updateShape({ sphericity: 0 });
  return { geometry: geo, baseUnitCoords, updateShape };
}

/**
 * Photorealistic arterial erythrocyte shader with exact unit-sphere conformal cutaway:
 * - Cuts in `aUnitPos` space (`distance(normalize(vUnitPos), uCutUnitCenter) < activeAngle`)
 *   so the cutaway lip matches the outer phospholipid ring of `membraneAssembly.ts` to 0.000 error
 *   at EVERY sphericity (0% flat biconcave disc through 100% compact spherocyte)!
 */
export function createRealisticRbcMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uSphericity: { value: 0.0 },
      uMicroscopeMode: { value: 0.0 },
      uTime: { value: 0.0 },
      uCutOpen: { value: 0.0 },
      uCutUnitCenter: { value: new THREE.Vector3(0.46, 0.85, 0.25).normalize() },
      uCutMaxChord: { value: 0.56 }, // exact chord distance on unit sphere matching bilayer outer ring
      uOpacity: { value: 1.0 },
      uKeyDir: { value: new THREE.Vector3(0.48, 0.8, 0.52).normalize() },
      uRimDir: { value: new THREE.Vector3(-0.68, 0.38, -0.62).normalize() },
      uFillDir: { value: new THREE.Vector3(-0.56, -0.32, 0.72).normalize() },
    },
    vertexShader: /* glsl */ `
      attribute float aThickness;
      attribute vec3 aUnitPos;
      varying vec3 vNormalWorld;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;
      varying vec3 vUnitPos;
      varying float vThickness;

      void main() {
        vThickness = aThickness;
        vLocalPos = position;
        vUnitPos = aUnitPos;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uSphericity;
      uniform float uMicroscopeMode;
      uniform float uTime;
      uniform float uCutOpen;
      uniform vec3 uCutUnitCenter;
      uniform float uCutMaxChord;
      uniform float uOpacity;
      uniform vec3 uKeyDir;
      uniform vec3 uRimDir;
      uniform vec3 uFillDir;

      varying vec3 vNormalWorld;
      varying vec3 vViewDir;
      varying vec3 vLocalPos;
      varying vec3 vUnitPos;
      varying float vThickness;

      float hash31(vec3 p) {
        p = fract(p * 0.1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }

      float noise3(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash31(i + vec3(0,0,0));
        float n100 = hash31(i + vec3(1,0,0));
        float n010 = hash31(i + vec3(0,1,0));
        float n110 = hash31(i + vec3(1,1,0));
        float n001 = hash31(i + vec3(0,0,1));
        float n101 = hash31(i + vec3(1,0,1));
        float n011 = hash31(i + vec3(0,1,1));
        float n111 = hash31(i + vec3(1,1,1));
        return mix(
          mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
          mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
          f.z
        );
      }

      float cellSurfaceNoise(vec3 p) {
        float v = 0.0;
        v += 0.45 * noise3(p * 3.2);
        v += 0.30 * noise3(p * 11.5 + vec3(7.3, 14.1, 3.9));
        v += 0.16 * noise3(p * 32.0 + vec3(19.2, 5.7, 11.4));
        v += 0.09 * noise3(p * 68.0 + vec3(2.1, 21.8, 16.3));
        return v;
      }

      void main() {
        // 1. Exact conformal unit-sphere cutaway iris matching the molecular bilayer perimeter
        vec3 uDir = normalize(vUnitPos);
        float chordDist = distance(uDir, normalize(uCutUnitCenter));
        float activeChord = uCutOpen * uCutMaxChord;
        float distFromEdge = chordDist - activeChord;

        if (uCutOpen > 0.01 && distFromEdge < 0.0) {
          discard;
        }

        bool isInside = !gl_FrontFacing;
        vec3 N = normalize(vNormalWorld) * (isInside ? -1.0 : 1.0);
        vec3 V = normalize(vViewDir);

        // 2. Silky, taut biological lipid micro-sheen
        vec3 sp = vLocalPos + vec3(uTime * 0.005, -uTime * 0.004, uTime * 0.003);
        float eps = 0.018;
        float nC = cellSurfaceNoise(sp);
        float nX = cellSurfaceNoise(sp + vec3(eps, 0.0, 0.0));
        float nY = cellSurfaceNoise(sp + vec3(0.0, eps, 0.0));
        float nZ = cellSurfaceNoise(sp + vec3(0.0, 0.0, eps));
        vec3 grad = vec3(nX - nC, nY - nC, nZ - nC) / eps;

        float relief = mix(0.014, 0.004, uMicroscopeMode);
        N = normalize(N - grad * relief);

        float NdotV = clamp(dot(N, V), 0.0, 1.0);

        // 3. Physically grounded Beer-Lambert oxygenated hemoglobin absorption
        float radialR = length(vLocalPos.xz);
        float pathLen = mix(vThickness * 1.32, 1.68, uSphericity);
        pathLen *= mix(1.0, 1.42, pow(1.0 - NdotV, 1.35));

        vec3 hbExtinction = vec3(0.58, 3.55, 4.05);
        vec3 trans = exp(-hbExtinction * pathLen * mix(1.02, 1.38, uSphericity));

        vec3 arterialDeep = vec3(0.28, 0.020, 0.040);
        vec3 arterialMid  = vec3(0.58, 0.048, 0.076);
        vec3 arterialThin = vec3(0.80, 0.165, 0.155);

        vec3 healthyAlbedo = mix(arterialDeep, arterialMid, smoothstep(0.10, 0.65, trans.r));
        float centerThinMask = clamp(1.0 - vThickness * 1.40, 0.0, 1.0) * (1.0 - uSphericity);
        healthyAlbedo = mix(healthyAlbedo, arterialThin, centerThinMask * 0.78);
        healthyAlbedo *= 0.97 + 0.06 * nC;

        vec3 spheroAlbedo = vec3(0.31, 0.022, 0.046) * (0.96 + 0.07 * nC) + vec3(0.12, 0.014, 0.020) * trans.r;

        vec3 smearDisc = mix(vec3(0.93, 0.84, 0.86), vec3(0.62, 0.23, 0.33), smoothstep(0.24, 0.8, vThickness));
        vec3 smearSphero = vec3(0.38, 0.10, 0.21);

        vec3 albedo = mix(
          mix(healthyAlbedo, spheroAlbedo, uSphericity * 0.9),
          mix(smearDisc, smearSphero, uSphericity * 0.94),
          uMicroscopeMode
        );

        if (isInside) {
          albedo = vec3(0.22, 0.032, 0.048) * (0.9 + 0.15 * nC);
        }

        // 4. Sculptural studio softbox illumination + satin biological sheen
        float keyRaw = dot(N, uKeyDir);
        float keyDiff = clamp((keyRaw + 0.28) / 1.28, 0.0, 1.0);
        float fillDiff = clamp((dot(N, uFillDir) + 0.36) / 1.36, 0.0, 1.0);
        float rimDiff = clamp(dot(N, uRimDir), 0.0, 1.0);

        float valleyAO = mix(
          0.74 + 0.26 * smoothstep(0.05, 0.62, radialR),
          0.96,
          uSphericity
        );

        float backScatter = pow(clamp(dot(V, -uKeyDir + N * 0.45), 0.0, 1.0), 2.6);
        float thinTrans = (1.0 - vThickness * 0.70) * (1.0 - uSphericity * 0.78);
        vec3 sss = vec3(0.86, 0.17, 0.12) * (thinTrans * (0.28 + 0.46 * backScatter) + 0.08 * rimDiff * (1.0 - uSphericity * 0.45));

        vec3 H1 = normalize(uKeyDir + V);
        float NdotH1 = max(dot(N, H1), 0.0);
        float satinBroad = pow(NdotH1, 12.0) * 0.12;
        float wetSoft = pow(NdotH1, mix(36.0, 56.0, uSphericity)) * 0.16;

        vec3 H2 = normalize(uRimDir + V);
        float rimSpec = pow(max(dot(N, H2), 0.0), 20.0) * 0.11;

        float fresnel = pow(1.0 - NdotV, 3.8);
        vec3 envSheen = mix(vec3(0.76, 0.56, 0.54), vec3(0.94, 0.88, 0.82), clamp(N.y * 0.5 + 0.5, 0.0, 1.0));

        vec3 umbra = mix(vec3(0.11, 0.008, 0.018), vec3(0.08, 0.006, 0.015), uSphericity);
        vec3 color = mix(umbra, albedo, (0.24 + 0.76 * keyDiff) * valleyAO);
        color += albedo * fillDiff * 0.22;
        color += sss * mix(1.0, 0.12, uMicroscopeMode);
        color += envSheen * fresnel * mix(0.30, 0.08, uMicroscopeMode);
        color += vec3(0.98, 0.94, 0.90) * (satinBroad + wetSoft + rimSpec) * mix(1.0, 0.06, uMicroscopeMode);

        // 5. Crisp double-leaflet bilayer rim tint seamlessly transitioning into the instanced phospholipid carpet
        if (uCutOpen > 0.01 && distFromEdge < 0.036) {
          float lip = 1.0 - smoothstep(0.0, 0.036, distFromEdge);
          vec3 lipidRim = vec3(0.68, 0.34, 0.35) * (0.85 + 0.15 * nC);
          color = mix(color, lipidRim, lip * 0.65);
        }

        gl_FragColor = vec4(color, uOpacity);
      }
    `,
  });
}
