import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GeneId } from '../data/hsContent';
import {
  createMembraneAssembly,
  CUT_MAX_CHORD,
  CUT_UNIT_CENTER,
  MembraneMolecularAssembly,
} from './membraneAssembly';
import {
  createParametricRbcGeometry,
  createRealisticRbcMaterial,
  createStudioEnvironment,
  evalRbcSurfaceFrame,
  RbcGeometryBundle,
  RbcShapeParams,
} from './rbcGeometry';

export interface SceneState {
  dive: number; // 0.0 = Whole Cell (7.5 μm) -> 1.0 = Molecular Cutaway (40 nm)
  severity: number; // 0..1 biconcave disc -> dense spherocyte
  selectedGene: GeneId;
  microscopeMode: boolean;
  isolateMembrane: boolean;
  paused: boolean;
}

export interface ProjectedPin {
  id: string;
  x: number; // 0..100 %
  y: number; // 0..100 %
  visible: boolean;
}

interface CompanionCell {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  basePos: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  phase: number;
}

export interface EngineCallbacks {
  onPinsUpdate?: (pins: ProjectedPin[]) => void;
  onDiveRequest?: (targetDive: number) => void;
  onGenePick?: (gene: GeneId) => void;
}

export class RbcSceneEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private resizeObserver: ResizeObserver;
  private rafId = 0;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private reducedMotion: boolean;

  private state: SceneState;
  private callbacks: EngineCallbacks;

  // Pointer, raycasting & two-finger mobile pinch state
  private raycaster = new THREE.Raycaster();
  private pointerDownPos = new THREE.Vector2();
  private pointerNdc = new THREE.Vector2();
  private lastPinchDist: number | null = null;

  // Smooth interpolated state
  private curDive = 0.0;
  private curSeverity = 0.0;
  private curMicroscope = 0.0;
  private curShellOpacity = 1.0;
  private curIsolate = 0.0;
  // Fine zoom extensions beyond [0, 1] so mouse wheel zooms smoothly past whole-cell or deep into 40 nm
  private targetExtraOut = 0.0; // 0..0.38 (zoom further out from whole cell)
  private curExtraOut = 0.0;
  private targetExtraIn = 0.0; // 0..0.38 (zoom extra close inside 40 nm proteins)
  private curExtraIn = 0.0;
  private userOrbiting = false;
  private orbitOffset = new THREE.Vector3();

  // Scene objects
  private studioEnv: THREE.Texture;
  private heroPivot = new THREE.Group();
  private heroRbc: RbcGeometryBundle;
  private heroMat: THREE.ShaderMaterial;
  private heroMesh: THREE.Mesh;
  private membraneAssembly: MembraneMolecularAssembly;
  private floorShadow: THREE.Mesh;
  private companions: CompanionCell[] = [];

  // Reusable vectors
  private tmpVecA = new THREE.Vector3();
  private tmpVecB = new THREE.Vector3();
  private apertureLocalPos = new THREE.Vector3();
  private apertureLocalNormal = new THREE.Vector3(0, 1, 0);
  private apertureWorldPos = new THREE.Vector3();
  private apertureWorldNormal = new THREE.Vector3(0, 1, 0);

  constructor(
    container: HTMLElement,
    initialState: SceneState,
    callbacks: EngineCallbacks = {}
  ) {
    this.container = container;
    this.state = { ...initialState };
    this.curDive = initialState.dive;
    this.curSeverity = initialState.severity;
    this.curMicroscope = initialState.microscopeMode ? 1 : 0;
    this.callbacks = callbacks;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#F5F0E8');
    this.scene.fog = new THREE.FogExp2('#F5F0E8', 0.07);

    const w = container.clientWidth || 1200;
    const h = container.clientHeight || 720;

    this.camera = new THREE.PerspectiveCamera(34, w / h, 0.04, 50);
    this.camera.position.set(-0.14, 1.48, 3.92);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.04;
    container.appendChild(this.renderer.domElement);

    this.studioEnv = createStudioEnvironment(this.renderer);
    this.scene.environment = this.studioEnv;
    this.scene.environmentIntensity = 0.85;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.addEventListener('start', () => {
      this.userOrbiting = true;
    });

    this.setupLighting();

    this.floorShadow = this.createSoftShadowPlane();
    this.floorShadow.position.set(0, -1.25, 0);
    this.scene.add(this.floorShadow);

    // Build Hero Photorealistic Red Blood Cell
    this.heroRbc = createParametricRbcGeometry(128, 88);
    this.heroMat = createRealisticRbcMaterial();
    this.heroMat.uniforms.uCutUnitCenter.value.copy(CUT_UNIT_CENTER);
    this.heroMat.uniforms.uCutMaxChord.value = CUT_MAX_CHORD;

    this.heroMesh = new THREE.Mesh(this.heroRbc.geometry, this.heroMat);
    this.heroPivot.scale.setScalar(1.08);
    this.heroPivot.add(this.heroMesh);

    // Mount the conformal Cryo-EM Molecular Assembly directly at heroPivot's origin (0,0,0)
    // so every single lipid & protein sits in the exact same coordinate frame as the RBC mesh!
    this.membraneAssembly = createMembraneAssembly();
    this.heroPivot.add(this.membraneAssembly.root);

    this.scene.add(this.heroPivot);
    this.buildCompanionCells();

    this.updateGeometryAndAperture(0);
    this.applyDiveCamera(true);
    this.bindInteractions();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    this.animate();
  }

  private setupLighting(): void {
    const hemi = new THREE.HemisphereLight('#FFFDF8', '#D9CEC0', 1.1);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight('#FFFBF3', 1.65);
    key.position.set(3.2, 5.4, 3.8);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight('#F2E9E1', 0.62);
    fill.position.set(-4.2, 1.4, 2.8);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight('#F7CFC8', 0.82);
    rim.position.set(-2.4, 2.6, -4.6);
    this.scene.add(rim);
  }

  private createSoftShadowPlane(): THREE.Mesh {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(54, 22, 26, 0.16)');
    grad.addColorStop(0.45, 'rgba(54, 22, 26, 0.06)');
    grad.addColorStop(1, 'rgba(54, 22, 26, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.2), mat);
    plane.rotation.x = -Math.PI / 2;
    return plane;
  }

  private buildCompanionCells(): void {
    const compGeo = createParametricRbcGeometry(44, 32).geometry;
    const specs: { pos: [number, number, number]; scale: number; rot: [number, number, number] }[] = [
      { pos: [-3.2, 1.35, -4.6], scale: 0.68, rot: [0.6, 0.2, 0.4] },
      { pos: [3.4, -1.05, -5.2], scale: 0.56, rot: [-0.5, 0.7, -0.3] },
      { pos: [-2.1, -1.7, -6.4], scale: 0.48, rot: [0.9, -0.4, 0.2] },
    ];

    specs.forEach((s, i) => {
      const mat = createRealisticRbcMaterial();
      mat.uniforms.uOpacity.value = 0.32;
      mat.uniforms.uSphericity.value = 0.1;
      const mesh = new THREE.Mesh(compGeo, mat);
      mesh.position.set(...s.pos);
      mesh.scale.setScalar(s.scale);
      mesh.rotation.set(...s.rot);
      this.scene.add(mesh);
      this.companions.push({
        mesh,
        mat,
        basePos: new THREE.Vector3(...s.pos),
        rotSpeed: new THREE.Vector3(0.06 + i * 0.02, 0.1 - i * 0.015, 0.04),
        phase: i * 2.1,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // POINTER, PROTEIN PICKING, DESKTOP PINCH & MOBILE TWO-FINGER PINCH-TO-DIVE
  // ---------------------------------------------------------------------------
  private onPointerDown = (e: PointerEvent) => {
    this.pointerDownPos.set(e.clientX, e.clientY);
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.curDive < 0.48) {
      this.renderer.domElement.style.cursor = 'grab';
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const meshes = this.membraneAssembly.pickables.map((p) => p.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    this.renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
  };

  private onPointerUp = (e: PointerEvent) => {
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist > 6) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    if (this.curDive > 0.48) {
      const meshes = this.membraneAssembly.pickables.map((p) => p.mesh);
      const hits = this.raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const found = this.membraneAssembly.pickables.find((p) => p.mesh === hitObj);
        if (found) {
          this.callbacks.onGenePick?.(found.gene);
        }
      }
    }
  };

  private onDoubleClick = () => {
    this.userOrbiting = false;
    const nextDive = this.state.dive < 0.5 ? 1.0 : 0.0;
    this.callbacks.onDiveRequest?.(nextDive);
  };

  private onWheel = (e: WheelEvent) => {
    // If the user has already scrolled down into the editorial guide below, let normal page scroll work
    if (window.scrollY > 20 && !e.ctrlKey) {
      return;
    }

    const clampedY = THREE.MathUtils.clamp(e.deltaY, -120, 120);
    // Standard mouse wheel: wheel forward/up (deltaY < 0) = zoom IN; wheel back/down (deltaY > 0) = zoom OUT
    const step = -clampedY * (e.ctrlKey ? 0.009 : 0.0022);

    // If zooming OUT while already at the outer zoom limit, release scroll to the page naturally
    if (step < 0 && this.state.dive <= 0.001 && this.targetExtraOut >= 0.37 && !e.ctrlKey) {
      return;
    }

    e.preventDefault();

    if (step > 0) {
      // Zooming IN: first close any extra pull-back, then dive 0 -> 1, then zoom extra close inside 40 nm
      let rem = step;
      if (this.targetExtraOut > 0) {
        const used = Math.min(this.targetExtraOut, rem);
        this.targetExtraOut -= used;
        rem -= used;
      }
      if (rem > 0 && this.state.dive < 1) {
        const nextDive = Math.min(1, this.state.dive + rem);
        rem -= nextDive - this.state.dive;
        this.userOrbiting = false;
        this.callbacks.onDiveRequest?.(nextDive);
      }
      if (rem > 0 && this.state.dive >= 0.999) {
        this.targetExtraIn = Math.min(0.38, this.targetExtraIn + rem * 0.9);
      }
    } else {
      // Zooming OUT: first back out of extra molecular close-up, then pull back 1 -> 0, then pull back from whole cell
      let rem = -step;
      if (this.targetExtraIn > 0) {
        const used = Math.min(this.targetExtraIn, rem);
        this.targetExtraIn -= used;
        rem -= used;
      }
      if (rem > 0 && this.state.dive > 0) {
        const nextDive = Math.max(0, this.state.dive - rem);
        rem -= this.state.dive - nextDive;
        this.userOrbiting = false;
        this.callbacks.onDiveRequest?.(nextDive);
      }
      if (rem > 0 && this.state.dive <= 0.001) {
        this.targetExtraOut = Math.min(0.38, this.targetExtraOut + rem * 0.9);
      }
    }
  };

  private onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.lastPinchDist = Math.hypot(dx, dy);
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && this.lastPinchDist !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const delta = (dist - this.lastPinchDist) * 0.0045;
      this.lastPinchDist = dist;
      this.userOrbiting = false;
      const nextDive = THREE.MathUtils.clamp(this.state.dive + delta, 0, 1);
      this.callbacks.onDiveRequest?.(nextDive);
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) {
      this.lastPinchDist = null;
    }
  };

  private bindInteractions(): void {
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('dblclick', this.onDoubleClick);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('touchstart', this.onTouchStart, { passive: true });
    el.addEventListener('touchmove', this.onTouchMove, { passive: false });
    el.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  public updateState(next: Partial<SceneState>): void {
    const diveChanged = next.dive !== undefined && Math.abs(next.dive - this.state.dive) > 0.001;
    const microChanged =
      next.microscopeMode !== undefined && next.microscopeMode !== this.state.microscopeMode;
    const isolateChanged =
      next.isolateMembrane !== undefined && next.isolateMembrane !== this.state.isolateMembrane;
    this.state = { ...this.state, ...next };
    if (diveChanged) {
      if (this.state.dive > 0.01) this.targetExtraOut = 0;
      if (this.state.dive < 0.99) this.targetExtraIn = 0;
    }
    if (diveChanged || microChanged || isolateChanged) {
      this.userOrbiting = false;
    }
  }

  public resetCamera(): void {
    this.userOrbiting = false;
    this.targetExtraOut = 0;
    this.targetExtraIn = 0;
    this.applyDiveCamera(false);
  }

  private updateGeometryAndAperture(dt: number): void {
    const gene = this.state.selectedGene;

    // Gentle breathing only at whole-cell scale; pause breathing wave once cutaway opens
    // so the phospholipid rim stays 100.0% locked flush to the shader lip!
    const breathWeight = 1.0 - THREE.MathUtils.smoothstep(this.curDive, 0.05, 0.2);

    const shapeParams: RbcShapeParams = {
      sphericity: this.curSeverity,
      time: breathWeight > 0.01 ? this.elapsed : 0,
      acantho: gene === 'SPTB' ? this.curSeverity * 0.55 : 0,
      pincer: gene === 'SLC4A1' ? this.curSeverity * 0.6 : 0,
      oval: gene === 'EPB42' ? this.curSeverity * 0.5 : 0,
    };

    this.heroRbc.updateShape(shapeParams);

    const cutOpen = THREE.MathUtils.smoothstep(this.curDive, 0.1, 0.58);
    this.heroMat.uniforms.uCutOpen.value = cutOpen;
    this.heroMat.uniforms.uSphericity.value = this.curSeverity;
    this.heroMat.uniforms.uMicroscopeMode.value = this.curMicroscope;
    this.heroMat.uniforms.uTime.value = this.elapsed;

    // Smoothly dissolve the outer RBC shell when Isolate Membrane is active in molecular view
    const isolateActive = this.state.isolateMembrane && this.curDive > 0.35;
    this.curIsolate = THREE.MathUtils.lerp(this.curIsolate, isolateActive ? 1.0 : 0.0, 0.11);
    this.curShellOpacity = 1.0 - this.curIsolate;
    this.heroMat.uniforms.uOpacity.value = this.curShellOpacity;
    this.heroMesh.visible = this.curShellOpacity > 0.015;
    // Unlock full underside orbiting when viewing the isolated cross-section slab
    this.controls.maxPolarAngle = THREE.MathUtils.lerp(Math.PI * 0.85, Math.PI * 0.96, this.curIsolate);

    // Evaluate exact aperture center & outward normal on live RBC surface
    evalRbcSurfaceFrame(
      CUT_UNIT_CENTER,
      { ...shapeParams, time: 0 },
      this.apertureLocalPos,
      this.apertureLocalNormal
    );

    // Gentle gallery turntable at whole-cell scale; smoothly present aperture when diving in
    if (this.curDive < 0.08 && !this.state.microscopeMode) {
      this.heroPivot.rotation.y += dt * 0.13;
      this.heroPivot.rotation.x = THREE.MathUtils.lerp(this.heroPivot.rotation.x, 0.24, 0.05);
      this.heroPivot.position.y = Math.sin(this.elapsed * 0.95) * 0.04;
    } else if (this.state.microscopeMode && this.curDive < 0.2) {
      this.heroPivot.rotation.x = THREE.MathUtils.lerp(this.heroPivot.rotation.x, 0.04, 0.08);
      this.heroPivot.position.y = THREE.MathUtils.lerp(this.heroPivot.position.y, 0.0, 0.08);
    } else {
      const normY =
        (((this.heroPivot.rotation.y % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      this.heroPivot.rotation.y = THREE.MathUtils.lerp(normY, -0.35, 0.09);
      this.heroPivot.rotation.x = THREE.MathUtils.lerp(this.heroPivot.rotation.x, 0.14, 0.09);
      this.heroPivot.position.y = THREE.MathUtils.lerp(this.heroPivot.position.y, 0.0, 0.08);
    }

    this.heroPivot.updateMatrixWorld(true);

    this.apertureWorldPos.copy(this.apertureLocalPos).applyMatrix4(this.heroPivot.matrixWorld);
    this.apertureWorldNormal
      .copy(this.apertureLocalNormal)
      .transformDirection(this.heroPivot.matrixWorld)
      .normalize();

    // Update conformal Cryo-EM molecular assembly flush inside the living RBC wall!
    this.membraneAssembly.update({
      gene,
      dive: this.curDive,
      shape: shapeParams,
      elapsed: this.elapsed,
    });

    // Background companion erythrocytes
    const compVis = 1.0 - THREE.MathUtils.smoothstep(this.curDive, 0.08, 0.42);
    this.companions.forEach((c) => {
      c.mesh.visible = compVis > 0.02 && !this.state.microscopeMode;
      c.mat.uniforms.uOpacity.value = 0.32 * compVis;
      c.mat.uniforms.uSphericity.value = this.curSeverity * 0.65;
      c.mesh.position.y = c.basePos.y + Math.sin(this.elapsed * 0.55 + c.phase) * 0.12;
      c.mesh.rotation.x += dt * c.rotSpeed.x;
      c.mesh.rotation.y += dt * c.rotSpeed.y;
    });

    const shadowScale = THREE.MathUtils.lerp(1.08, 0.78, this.curSeverity);
    this.floorShadow.scale.set(shadowScale, shadowScale, 1);
    (this.floorShadow.material as THREE.MeshBasicMaterial).opacity =
      1.0 - THREE.MathUtils.smoothstep(this.curDive, 0.25, 0.7);
  }

  private applyDiveCamera(immediate: boolean): void {
    const aspect = this.camera.aspect;
    const isPortrait = aspect < 1.0;
    // Automatically pull camera back proportionally on narrow portrait mobile screens
    // so neither the whole RBC nor the 40 nm Cryo-EM cutaway clips horizontally!
    const portraitBoost = isPortrait ? Math.min(1.9, 1.05 / Math.max(aspect, 0.48)) : 1.0;

    const macroZoomMult = 1.0 + this.curExtraOut * 1.15;
    const macroPos = this.tmpVecA.set(
      isPortrait ? 0.0 : -0.14,
      (this.state.microscopeMode ? 3.85 : 1.48) *
        (isPortrait ? portraitBoost * 0.92 : 1.0) *
        macroZoomMult,
      (this.state.microscopeMode ? 0.48 : 3.92) * portraitBoost * macroZoomMult
    );
    const macroLook = this.tmpVecB.set(
      isPortrait ? 0.0 : -0.08,
      isPortrait ? -0.18 : -0.22,
      0
    );

    const sideTangent = new THREE.Vector3(0.4, 0.0, 0.92).normalize();
    const microScale =
      (isPortrait ? Math.min(1.75, portraitBoost * 0.96) : 1.0) * (1.0 - this.curExtraIn * 0.78);
    // When membrane is isolated, lower camera elevation slightly to reveal the vertical
    // Band 3 -> Ankyrin-1 -> Coiled Spectrin profile cleanly against the alabaster studio!
    const normalLift = THREE.MathUtils.lerp(0.96, 0.62, this.curIsolate);
    const sidePull = THREE.MathUtils.lerp(0.84, 1.12, this.curIsolate);
    const microPos = this.apertureWorldPos
      .clone()
      .addScaledVector(this.apertureWorldNormal, normalLift * microScale)
      .addScaledVector(sideTangent, sidePull * microScale);
    const microLook = this.apertureWorldPos
      .clone()
      .addScaledVector(this.apertureWorldNormal, -0.14)
      .add(new THREE.Vector3(0, isPortrait ? -0.18 : -0.13, 0));

    const d = this.curDive;
    const ease = d * d * (3 - 2 * d);

    const desiredPos = new THREE.Vector3().lerpVectors(macroPos, microPos, ease);
    desiredPos.y += Math.sin(ease * Math.PI) * 0.28;
    const desiredLook = new THREE.Vector3().lerpVectors(macroLook, microLook, ease);

    if (immediate) {
      this.camera.position.copy(desiredPos);
      this.controls.target.copy(desiredLook);
      this.controls.update();
    } else if (!this.userOrbiting) {
      this.camera.position.lerp(desiredPos, 0.11);
      this.controls.target.lerp(desiredLook, 0.12);
    } else {
      // Preserve the user's custom orbit direction while still honoring scroll-wheel zoom distance!
      this.orbitOffset.subVectors(this.camera.position, this.controls.target);
      const desiredDist = desiredPos.distanceTo(desiredLook);
      const curDist = this.orbitOffset.length() || desiredDist;
      const nextDist = THREE.MathUtils.lerp(curDist, desiredDist, 0.12);
      this.orbitOffset.setLength(nextDist);
      this.controls.target.lerp(desiredLook, 0.08);
      this.camera.position.copy(this.controls.target).add(this.orbitOffset);
    }
  }

  private projectPins(): void {
    if (!this.callbacks.onPinsUpdate) return;
    const pins: ProjectedPin[] = [];

    const projectWorld = (id: string, worldPos: THREE.Vector3, allow: boolean) => {
      const v = worldPos.clone().project(this.camera);
      const visible =
        allow && v.z < 1 && v.x > -0.92 && v.x < 0.92 && v.y > -0.88 && v.y < 0.88;
      pins.push({
        id,
        x: (v.x * 0.5 + 0.5) * 100,
        y: (-v.y * 0.5 + 0.5) * 100,
        visible,
      });
    };

    projectWorld('diveHotspot', this.apertureWorldPos, this.curDive < 0.28);

    const showMolPins = this.curDive > 0.62;
    Object.entries(this.membraneAssembly.pinAnchors).forEach(([id, localPos]) => {
      const worldP = localPos.clone().applyMatrix4(this.heroPivot.matrixWorld);
      projectWorld(id, worldP, showMolPins);
    });

    this.callbacks.onPinsUpdate(pins);
  }

  private animate = (): void => {
    this.rafId = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const animStep = this.state.paused || this.reducedMotion ? 0 : dt;
    this.elapsed += animStep;

    this.curDive = THREE.MathUtils.lerp(this.curDive, this.state.dive, 0.12);
    this.curExtraOut = THREE.MathUtils.lerp(this.curExtraOut, this.targetExtraOut, 0.12);
    this.curExtraIn = THREE.MathUtils.lerp(this.curExtraIn, this.targetExtraIn, 0.12);
    this.curSeverity = THREE.MathUtils.lerp(this.curSeverity, this.state.severity, 0.11);
    this.curMicroscope = THREE.MathUtils.lerp(
      this.curMicroscope,
      this.state.microscopeMode ? 1 : 0,
      0.1
    );

    this.updateGeometryAndAperture(animStep);
    this.applyDiveCamera(false);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
    this.projectPins();
  };

  private handleResize(): void {
    const w = this.container.clientWidth || 1200;
    const h = this.container.clientHeight || 720;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.applyDiveCamera(false);
  }

  public dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('dblclick', this.onDoubleClick);
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('touchstart', this.onTouchStart);
    el.removeEventListener('touchmove', this.onTouchMove);
    el.removeEventListener('touchend', this.onTouchEnd);
    this.controls.dispose();
    this.studioEnv.dispose();
    this.renderer.dispose();
    if (el.parentNode === this.container) {
      this.container.removeChild(el);
    }
  }
}
