"use client";

import { useTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ProjectDetailBlock, ProjectItem } from "@/lib/projectImages";
import { PROJECTS } from "@/lib/projectImages";

export type ProjectPopoverPayload = {
  title: string;
  imageUrl: string;
  detailImageUrl?: string;
  detailVideoUrl?: string;
  description: string;
  detailBlocks?: ProjectDetailBlock[];
  x: number;
  y: number;
};

export type FullscreenProjectPayload = {
  title: string;
  imageUrl: string;
};

type ShaderLike = {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
  fragmentShader: string;
};

type CarouselProject = (typeof PROJECTS)[number];

type TubeCell = {
  cellIndex: number;
  rowIndex: number;
  baseRow: number;
  rowY: number;
  baseTheta: number;
  phase: number;
  width: number;
  height: number;
  project: CarouselProject;
  texture: THREE.Texture;
};

const FEATURED_PROJECT_TITLE = "Altitude 101";

function isFeaturedProjectTitle(title: string) {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const featured = FEATURED_PROJECT_TITLE.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalized === featured;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function wrapToNearest(value: number, around: number, period: number) {
  if (period <= 0) return value;
  return value + Math.round((around - value) / period) * period;
}

function wrapCentered(value: number, period: number) {
  if (period <= 0) return value;
  // Map to [-period/2, period/2) while staying continuous in `value`.
  return value - Math.floor((value + period / 2) / period) * period;
}

function shortestAngleDiff(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function UnderwaterProjectsCarousel({
  isActive,
  centerPosition,
  onHoverPopoverChange,
  onFullscreenProjectChange,
  onCameraMotionLockChange,
  onCameraLookAtLockChange,
  onProjectOpen,
  onProjectClose,
  onProjectCloseInitiated,
  bwEnabled = true,
  closeRequestId,
  forceCloseRequestId,
  focusProjectRequest,
  spinAngleRef,
}: {
  isActive: boolean;
  centerPosition: THREE.Vector3 | null;
  onHoverPopoverChange?: (payload: ProjectPopoverPayload | null) => void;
  onFullscreenProjectChange?: (
    payload: FullscreenProjectPayload | null,
  ) => void;
  onCameraMotionLockChange?: (isLocked: boolean) => void;
  onCameraLookAtLockChange?: (target: THREE.Vector3 | null) => void;
  onProjectOpen?: (project: ProjectItem) => void;
  onProjectClose?: () => void;
  onProjectCloseInitiated?: () => void;
  bwEnabled?: boolean;
  closeRequestId?: number;
  forceCloseRequestId?: number;
  focusProjectRequest?: { id: number; project: ProjectItem } | null;
  spinAngleRef?: { current: number };
}) {
  const groupRef = useRef<THREE.Group>(null);
  const cellGroupRefs = useRef<Array<THREE.Group | null>>([]);

  const planeRefs = useRef<Array<THREE.Mesh | null>>([]);
  const hitPlaneRefs = useRef<Array<THREE.Mesh | null>>([]);
  const planeShaderRefs = useRef<Array<ShaderLike | null>>([]);
  const backdropRef = useRef<THREE.Mesh>(null);

  const hoveredCellRef = useRef<number | null>(null);
  const pendingCellRef = useRef<number | null>(null);
  const selectedCellRef = useRef<number | null>(null);
  const selectedProgressRef = useRef<number[]>([]);
  const flatProgressRef = useRef<number[]>([]);
  const selectImpulseStartRef = useRef<number[]>([]);
  const projectOpenFiredRef = useRef(new Set<number>());
  // Cells currently animating back out — onProjectClose fires once selectedProgress < 0.05.
  const projectClosingRef = useRef(new Set<number>());

  const closeTimeoutRef = useRef<number | null>(null);
  const closeDelayMs = 1000;
  const bwEnabledRef = useRef(bwEnabled);

  useEffect(() => {
    bwEnabledRef.current = bwEnabled;
  }, [bwEnabled]);

  const scrollTargetRef = useRef(0);
  const scrollCurrentRef = useRef(0);
  const spinVelocityRef = useRef(0);
  const naturalDirRef = useRef(1);
  const angleRef = useRef(0);
  const clockElapsedRef = useRef(0);

  const { camera } = useThree();

  const textureUrls = useMemo(
    () => PROJECTS.map((project) => project.imageUrl),
    [],
  );
  const textures = useTexture(textureUrls) as THREE.Texture[];

  const rows = 3;
  const cols = 6;
  const repeatCount = 3;

  const radius = 12;
  const ySpacing = 7.4;
  const loopRows = rows % 2 === 0 ? rows : rows * 2;
  const loopHeight = loopRows * ySpacing;
  const scrollLoopHeight = loopHeight * repeatCount;
  // Use a row count that is a multiple of `loopRows` so the alternating row parity
  // (and therefore direction + offsets) repeats seamlessly.
  const totalRows = loopRows * repeatCount;
  const rowSpeeds = useMemo(() => {
    return Array.from({ length: rows }, (_, row) => {
      const t = rows <= 1 ? 0 : row / (rows - 1);
      return 0.65 + t * 0.9;
    });
  }, []);

  const tileHeight = 3.5;
  const cameraPull = 8.5;

  const wheelScrollSensitivity = 0.002;
  const wheelSpinSensitivity = 0.0035;
  const spinDamping = 0.92;
  const baseSpinSpeed = 0.24;

  const widthSegments = 40;
  const heightSegments = 24;
  const tubeScale = 1.8;
  const selectedPullDistance = 2.6;
  const selectedScaleBoost = 0.06;
  const selectedInDamping = 4.8;
  const selectedOutDamping = 6.2;
  const flatInDamping = 9;
  const flatOutDamping = 11;
  const fullscreenDistance = 3.5;
  const minDistanceToCamera = 2.8;

  const orientationHelper = useMemo(() => new THREE.Object3D(), []);

  const tmp = useMemo(
    () => ({
      fallback: new THREE.Vector3(),
      targetPos: new THREE.Vector3(),
      dirWorld: new THREE.Vector3(),
      cameraLocal: new THREE.Vector3(),
      planeNormal: new THREE.Vector3(0, 0, 1),
      cameraForward: new THREE.Vector3(0, 0, -1),
      cameraWorldTarget: new THREE.Vector3(),
      targetLocal: new THREE.Vector3(),
      targetQuaternion: new THREE.Quaternion(),
      cameraWorldQuaternion: new THREE.Quaternion(),
      groupWorldQuaternion: new THREE.Quaternion(),
      groupWorldQuaternionInverse: new THREE.Quaternion(),
      focusWorld: new THREE.Vector3(),
    }),
    [],
  );

  const cells = useMemo<TubeCell[]>(() => {
    const out: TubeCell[] = [];

    for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
      const baseRow = rowIndex % rows;
      const rowOffset = baseRow % 2 === 0 ? 0 : 0.5;
      const rowY = (rowIndex - (totalRows - 1) / 2) * ySpacing;

      for (let col = 0; col < cols; col++) {
        const projectIndex = (baseRow * cols + col) % PROJECTS.length;
        const project = PROJECTS[projectIndex];
        const texture = textures[projectIndex];

        const image = texture.image as
          | { width?: number; height?: number }
          | undefined;
        const imgW = typeof image?.width === "number" ? image.width : 1;
        const imgH = typeof image?.height === "number" ? image.height : 1;
        const aspect = imgH > 0 ? imgW / imgH : 1;

        out.push({
          cellIndex: out.length,
          rowIndex,
          baseRow,
          rowY,
          baseTheta: ((col + rowOffset) / cols) * Math.PI * 2,
          phase: rowIndex * 0.37 + col * 0.61,
          width: tileHeight * aspect,
          height: tileHeight,
          project,
          texture,
        });
      }
    }

    return out;
  }, [textures, totalRows]);

  const buildPopoverPayload = (
    project: CarouselProject,
    event: ThreeEvent<MouseEvent | PointerEvent>,
    offsetX: number,
  ): ProjectPopoverPayload => {
    const isFeatured = isFeaturedProjectTitle(project.title);

    return {
      title: project.title,
      imageUrl: project.imageUrl,
      detailImageUrl: project.detailImageUrl,
      detailVideoUrl: project.detailVideoUrl,
      description: isFeatured ? project.description : "Coming soon",
      detailBlocks: isFeatured ? project.detailBlocks : undefined,
      x: event.nativeEvent.clientX + offsetX,
      y: event.nativeEvent.clientY,
    };
  };

  const clothOnBeforeCompile = (shader: ShaderLike, cellIndex: number) => {
    const cell = cells[cellIndex];
    const isFeatured = cell ? isFeaturedProjectTitle(cell.project.title) : false;
    shader.uniforms.uPull = { value: 0 };
    shader.uniforms.uBulge = { value: 0 };
    // Only the featured project stays in color; everything else is forced B&W.
    shader.uniforms.uBW = { value: isFeatured ? 0 : 1 };
    shader.uniforms.uBlur = { value: 0 };
    shader.uniforms.uFlat = { value: 0 };
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uScroll = { value: 0 };
    shader.uniforms.uRowY = { value: cell?.rowY ?? 0 };
    shader.uniforms.uTheta = { value: cell?.baseTheta ?? 0 };
    shader.uniforms.uWavePhase = { value: cell?.phase ?? cellIndex * 0.37 };
    planeShaderRefs.current[cellIndex] = shader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>\nuniform float uPull;\nuniform float uBulge;\nuniform float uTime;\nuniform float uScroll;\nuniform float uRowY;\nuniform float uTheta;\nuniform float uWavePhase;\nuniform float uFlat;`,
    );

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vec2 centeredUv = uv - vec2(0.5);
      float distToCenter = length(centeredUv);
      float centerFalloff = exp(-distToCenter * distToCenter * 16.0);
      float midFalloff = exp(-pow((distToCenter - 0.28) * 4.2, 2.0));
      float ring = exp(-pow((distToCenter - 0.34) * 4.8, 2.0));
      float edge = clamp(distToCenter / 0.72, 0.0, 1.0);
      float laggedPull = smoothstep(0.0, 1.0, uPull - edge * 0.35);
      float centerLead = smoothstep(0.0, 1.0, uPull * 1.15);
      float pullProfile = mix(laggedPull, centerLead, centerFalloff);
      float progressivePush =
        centerFalloff * (0.64 + pullProfile * 0.38) +
        midFalloff * (0.34 + pullProfile * 0.22) +
        ring * 0.14;
      float clothPull = progressivePush * uBulge;
      float cornerLag = (1.0 - centerFalloff) * (1.0 - pullProfile) * uBulge;
      vec2 radialDir = distToCenter > 1e-5 ? centeredUv / distToCenter : vec2(0.0);
      float radialStretch = (centerFalloff * 0.07 + midFalloff * 0.06 + ring * 0.04) * uBulge;
      float tangentialShear = ring * (uPull * 0.03) * uBulge;
      transformed.z += clothPull;
      transformed.z -= cornerLag * 0.11;
      transformed.x += radialDir.x * radialStretch + centeredUv.y * tangentialShear;
      transformed.y += radialDir.y * radialStretch - centeredUv.x * tangentialShear;
      transformed.xy *= 1.0 - (centerFalloff * 0.08 + midFalloff * 0.05) * uBulge;

      // --- Water-like floating deformation ---
      // Coherent traveling waves (carousel-wide) + smaller ripples.
      float t = uTime;
      float motion = 1.0 - clamp(uFlat, 0.0, 1.0);
      float breathe = 0.9 + 0.7 * sin(t * 0.75 + uTheta * 0.85 + uWavePhase * 0.22);
      float waveMask = 0.65 + centerFalloff * 0.35;

      // Large, slow swell that travels along the carousel (rowY, scroll).
      float yWorld = (uRowY - uScroll);
      float swell1 = sin(yWorld * 0.06 + t * 2.6 + uTheta * 0.7);
      float swell2 = sin(yWorld * 0.035 - t * 1.9 + uTheta * 1.15 + uWavePhase);
      float swell = (swell1 * 0.55 + swell2 * 0.45);

      float swellAmp = 0.62 * waveMask * breathe * (1.0 - uBulge * 0.25) * motion;
      transformed.z += swell * swellAmp;

      // Smaller ripples (surface agitation).
      float w1 = sin((uv.x * 6.2831853 * 1.15) + (t * 2.4) + uWavePhase);
      float w2 = cos((uv.y * 6.2831853 * 1.35) - (t * 2.05) + uWavePhase * 1.7);
      float wave = (w1 + w2) * 0.5;
      float amp = 0.42 * waveMask * breathe * (1.0 - uBulge * 0.25) * motion;
      transformed.z += wave * amp;

      // Gentle up/down bob to sell the breathing motion.
      transformed.z += sin(t * 1.1 + uTheta + uWavePhase) * (0.14 * waveMask) * (1.0 - uBulge * 0.25) * motion;

      // Lateral wobble (makes the motion read as water, not just Z displacement).
      float wobble = swell * (0.08 * waveMask) * (1.0 - uBulge * 0.35) * motion;
      transformed.x += sin(yWorld * 0.03 + t * 2.2 + uv.y * 6.2831853 + uWavePhase) * wobble;
      transformed.y += cos(yWorld * 0.025 - t * 1.85 + uv.x * 6.2831853 + uTheta) * wobble;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      `#include <common>\nuniform float uBW;\nuniform float uBlur;`,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <map_fragment>",
      `#ifdef USE_MAP

  float blur = clamp( uBlur, 0.0, 1.0 );
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );

  if ( blur > 0.001 ) {
    // Cheap multi-tap blur in UV space (version-safe: no derivatives required).
    vec2 o = vec2( 0.008, 0.008 ) * ( 0.45 + blur * 2.8 );

    vec4 sum = vec4( 0.0 );
    sum += texture2D( map, vMapUv ) * 0.22;
    sum += texture2D( map, vMapUv + vec2(  o.x, 0.0 ) ) * 0.14;
    sum += texture2D( map, vMapUv + vec2( -o.x, 0.0 ) ) * 0.14;
    sum += texture2D( map, vMapUv + vec2( 0.0,  o.y ) ) * 0.14;
    sum += texture2D( map, vMapUv + vec2( 0.0, -o.y ) ) * 0.14;
    sum += texture2D( map, vMapUv + vec2(  o.x,  o.y ) ) * 0.055;
    sum += texture2D( map, vMapUv + vec2( -o.x,  o.y ) ) * 0.055;
    sum += texture2D( map, vMapUv + vec2(  o.x, -o.y ) ) * 0.055;
    sum += texture2D( map, vMapUv + vec2( -o.x, -o.y ) ) * 0.055;
    sampledDiffuseColor = mix( sampledDiffuseColor, sum, blur );
  }

  #ifdef DECODE_VIDEO_TEXTURE

    // use inline sRGB decode until browsers properly support SRGB8_ALPHA8 with video textures (#26516)
    sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );

  #endif

  // Dim non-featured tiles in addition to blurring.
  float dim = mix( 1.0, 1., blur );
  sampledDiffuseColor.rgb *= dim;

  diffuseColor *= sampledDiffuseColor;

#endif`,
    );

    // Toggleable black & white (grayscale) in the fragment output.
    // We do it here so it affects the textured meshBasicMaterial maps.
    const bwConditional =
      "float luma = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));\n" +
      "gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(luma), clamp(uBW, 0.0, 1.0));";

    const withDither = shader.fragmentShader.replace(
      "#include <dithering_fragment>",
      `#include <dithering_fragment>\n${bwConditional}`,
    );

    if (withDither !== shader.fragmentShader) {
      shader.fragmentShader = withDither;
    } else {
      const basicOut = "gl_FragColor = vec4( outgoingLight, diffuseColor.a );";
      if (shader.fragmentShader.includes(basicOut)) {
        shader.fragmentShader = shader.fragmentShader.replace(
          basicOut,
          `${basicOut}\n${bwConditional}`,
        );
      }
    }
  };

  useEffect(() => {
    const cellCount = cells.length;

    selectedProgressRef.current = Array.from(
      { length: cellCount },
      (_, index) => selectedProgressRef.current[index] || 0,
    );
    flatProgressRef.current = Array.from(
      { length: cellCount },
      (_, index) => flatProgressRef.current[index] || 0,
    );
    selectImpulseStartRef.current = Array.from(
      { length: cellCount },
      (_, index) =>
        selectImpulseStartRef.current[index] || Number.NEGATIVE_INFINITY,
    );
    planeShaderRefs.current = Array.from(
      { length: cellCount },
      (_, index) => planeShaderRefs.current[index] || null,
    );
    planeRefs.current = Array.from(
      { length: cellCount },
      (_, index) => planeRefs.current[index] || null,
    );
    hitPlaneRefs.current = Array.from(
      { length: cellCount },
      (_, index) => hitPlaneRefs.current[index] || null,
    );
    cellGroupRefs.current = Array.from(
      { length: cellCount },
      (_, index) => cellGroupRefs.current[index] || null,
    );
  }, [cells.length]);

  useEffect(() => {
    if (!isActive) return;

    const onWheel = (event: WheelEvent) => {
      // When the project detail view is open let the browser scroll normally.
      if (projectOpenFiredRef.current.size > 0) return;
      event.preventDefault();
      if (selectedCellRef.current !== null || pendingCellRef.current !== null)
        return;

      scrollTargetRef.current += event.deltaY * wheelScrollSensitivity;
      spinVelocityRef.current += event.deltaY * wheelSpinSensitivity;
      spinVelocityRef.current = clamp(spinVelocityRef.current, -2.2, 2.2);

      if (event.deltaY < 0) naturalDirRef.current = -1;
      else if (event.deltaY > 0) naturalDirRef.current = 1;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [isActive]);

  useEffect(() => {
    if (forceCloseRequestId === undefined) return;

    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    pendingCellRef.current = null;
    selectedCellRef.current = null;
    projectOpenFiredRef.current.clear();
    projectClosingRef.current.clear();
    onCameraMotionLockChange?.(false);
    onCameraLookAtLockChange?.(null);
    onFullscreenProjectChange?.(null);
  }, [
    forceCloseRequestId,
    onCameraLookAtLockChange,
    onCameraMotionLockChange,
    onFullscreenProjectChange,
  ]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!focusProjectRequest || !isActive) return;

    const matchingCellIndices: number[] = [];
    for (const cell of cells) {
      if (
        cell.project.title === focusProjectRequest.project.title &&
        cell.project.imageUrl === focusProjectRequest.project.imageUrl
      ) {
        matchingCellIndices.push(cell.cellIndex);
      }
    }

    if (matchingCellIndices.length === 0) return;

    const currentFocusCell = selectedCellRef.current ?? pendingCellRef.current;
    const targetCell =
      currentFocusCell === null
        ? matchingCellIndices[0]
        : matchingCellIndices.reduce((best, candidate) => {
            const bestScore = Math.abs(best - currentFocusCell);
            const candidateScore = Math.abs(candidate - currentFocusCell);
            return candidateScore < bestScore ? candidate : best;
          }, matchingCellIndices[0]);

    hoveredCellRef.current = null;
    pendingCellRef.current = null;
    selectedCellRef.current = targetCell;
    selectedProgressRef.current = selectedProgressRef.current.map((_, index) =>
      index === targetCell ? 1 : 0,
    );
    selectImpulseStartRef.current[targetCell] = Number.NEGATIVE_INFINITY;
    projectOpenFiredRef.current.clear();
    projectOpenFiredRef.current.add(targetCell);
    projectClosingRef.current.clear();
    onHoverPopoverChange?.(null);
    onCameraMotionLockChange?.(true);
    onCameraLookAtLockChange?.(null);
    onFullscreenProjectChange?.(null);
  }, [
    cells,
    focusProjectRequest,
    isActive,
    onCameraLookAtLockChange,
    onCameraMotionLockChange,
    onFullscreenProjectChange,
    onHoverPopoverChange,
  ]);

  // Soft close triggered externally (e.g. Back button) — starts the reverse animation.
  useEffect(() => {
    if (closeRequestId === undefined) return;

    const openCell = [...projectOpenFiredRef.current][0] ?? -1;
    if (openCell >= 0) {
      projectOpenFiredRef.current.delete(openCell);
      projectClosingRef.current.add(openCell);
    }
    selectedCellRef.current = null;
    pendingCellRef.current = null;
    onCameraMotionLockChange?.(false);
    onCameraLookAtLockChange?.(null);
  }, [closeRequestId, onCameraLookAtLockChange, onCameraMotionLockChange]);

  useFrame((state, delta) => {
    if (!isActive) return;
    if (!groupRef.current) return;

    const hasSelection = selectedCellRef.current !== null;
    const hasPendingSelection =
      pendingCellRef.current !== null && selectedCellRef.current === null;

    if (!hasSelection && !hasPendingSelection) {
      scrollCurrentRef.current +=
        (scrollTargetRef.current - scrollCurrentRef.current) * 0.12;

      // Keep scroll values bounded without changing visuals:
      // positions depend only on (rowY - scroll), so shifting both by the same
      // loop multiple is invisible and avoids precision drift.
      if (scrollLoopHeight > 0) {
        const shift = Math.round(scrollCurrentRef.current / scrollLoopHeight) * scrollLoopHeight;
        if (shift !== 0) {
          scrollCurrentRef.current -= shift;
          scrollTargetRef.current -= shift;
        }
      }

      spinVelocityRef.current *= spinDamping ** (delta * 60);
      const spin =
        baseSpinSpeed * naturalDirRef.current + spinVelocityRef.current;
      angleRef.current += spin * delta;
    } else {
      spinVelocityRef.current = THREE.MathUtils.damp(
        spinVelocityRef.current,
        0,
        8,
        delta,
      );

      if (hasPendingSelection && pendingCellRef.current !== null) {
        const pendingCell = cells[pendingCellRef.current];
        if (pendingCell) {
          if (centerPosition) {
            tmp.dirWorld
              .subVectors(camera.position, centerPosition)
              .normalize();
            tmp.targetPos
              .copy(centerPosition)
              .addScaledVector(tmp.dirWorld, cameraPull);
            groupRef.current.position.lerp(tmp.targetPos, 0.08);
          } else {
            tmp.fallback.set(0, 0, 0);
            groupRef.current.position.lerp(tmp.fallback, 0.1);
          }

          tmp.cameraLocal.copy(camera.position);
          groupRef.current.worldToLocal(tmp.cameraLocal);

          const desiredTheta = Math.atan2(tmp.cameraLocal.z, tmp.cameraLocal.x);
          const rowDirection = pendingCell.rowIndex % 2 === 0 ? 1 : -1;
          const angleFactor = rowSpeeds[pendingCell.baseRow] * rowDirection;
          const rawTargetAngle =
            (desiredTheta - pendingCell.baseTheta) / angleFactor;
          const anglePeriod = (Math.PI * 2) / Math.abs(angleFactor);
          const targetAngle = wrapToNearest(
            rawTargetAngle,
            angleRef.current,
            anglePeriod,
          );

          camera.getWorldDirection(tmp.cameraForward);
          tmp.cameraWorldTarget
            .copy(camera.position)
            .addScaledVector(tmp.cameraForward, fullscreenDistance);
          tmp.targetLocal.copy(tmp.cameraWorldTarget);
          groupRef.current.worldToLocal(tmp.targetLocal);
          const desiredCameraY = tmp.cameraLocal.y;
          const pendingFloatY = 0;

          const targetScroll = wrapToNearest(
            pendingCell.rowY + pendingFloatY - desiredCameraY,
            scrollCurrentRef.current,
            scrollLoopHeight,
          );

          angleRef.current = THREE.MathUtils.damp(
            angleRef.current,
            targetAngle,
            7.8,
            delta,
          );
          scrollCurrentRef.current = THREE.MathUtils.damp(
            scrollCurrentRef.current,
            targetScroll,
            7.8,
            delta,
          );
          scrollTargetRef.current = scrollCurrentRef.current;

          const alignedTheta =
            Math.abs(
              shortestAngleDiff(
                pendingCell.baseTheta + angleRef.current * angleFactor,
                desiredTheta,
              ),
            ) < 0.03;
          const alignedY =
            Math.abs(
              wrapCentered(
                pendingCell.rowY - scrollCurrentRef.current,
                scrollLoopHeight,
              ) +
                pendingFloatY -
                tmp.cameraLocal.y,
            ) < 0.02;

          if (alignedTheta && alignedY) {
            selectedCellRef.current = pendingCell.cellIndex;
            pendingCellRef.current = null;
            selectImpulseStartRef.current[pendingCell.cellIndex] =
              clockElapsedRef.current;
          }
        }
      }
    }

    if (centerPosition) {
      tmp.dirWorld.subVectors(camera.position, centerPosition).normalize();
      tmp.targetPos
        .copy(centerPosition)
        .addScaledVector(tmp.dirWorld, cameraPull);
      groupRef.current.position.lerp(tmp.targetPos, 0.08);
    } else {
      tmp.fallback.set(0, 0, 0);
      groupRef.current.position.lerp(tmp.fallback, 0.1);
    }

    if (spinAngleRef) {
      spinAngleRef.current = angleRef.current;
    }

    tmp.cameraLocal.copy(camera.position);
    groupRef.current.worldToLocal(tmp.cameraLocal);

    const t = state.clock.elapsedTime;
    clockElapsedRef.current = t;

    for (const cell of cells) {
      const cellGroup = cellGroupRefs.current[cell.cellIndex];
      const mesh = planeRefs.current[cell.cellIndex];
      const hitMesh = hitPlaneRefs.current[cell.cellIndex];
      if (!cellGroup || !mesh) continue;

      const rowDirection = cell.rowIndex % 2 === 0 ? 1 : -1;
      const rowAngle =
        angleRef.current * rowSpeeds[cell.baseRow] * rowDirection;
      const theta = cell.baseTheta + rowAngle;
      const selectedTarget = selectedCellRef.current === cell.cellIndex ? 1 : 0;
      const selectedCurrent = selectedProgressRef.current[cell.cellIndex] || 0;
      const selectedDamping =
        selectedTarget > selectedCurrent
          ? selectedInDamping
          : selectedOutDamping;
      const selectedProgress = THREE.MathUtils.damp(
        selectedCurrent,
        selectedTarget,
        selectedDamping,
        delta,
      );
      selectedProgressRef.current[cell.cellIndex] = selectedProgress;

      const impulseStart = selectImpulseStartRef.current[cell.cellIndex];
      const impulseElapsed = t - impulseStart;
      const impulse =
        Number.isFinite(impulseElapsed) && impulseElapsed >= 0
          ? Math.max(
              0,
              Math.exp(-impulseElapsed * 1.9) * Math.sin(impulseElapsed * 10.5),
            )
          : 0;
      const openingEnvelope =
        selectedTarget === 1
          ? 4 * selectedProgress * (1 - selectedProgress)
          : 0;
      const bulgeStrength = clamp(
        openingEnvelope * 0.82 + impulse * 0.34,
        0,
        1,
      );

      const isPendingCell = pendingCellRef.current === cell.cellIndex;
      const isFocusedCell = isPendingCell || selectedTarget === 1;
      const floatY = isFocusedCell ? 0 : Math.sin(t * 0.7 + cell.phase) * 0.09;
      const floatZ = Math.cos(t * 0.9 + cell.phase) * 0.06;

      const wrappedRowY = wrapCentered(
        cell.rowY - scrollCurrentRef.current,
        scrollLoopHeight,
      );

      cellGroup.position.set(
        Math.cos(theta) * radius,
        wrappedRowY + floatY,
        Math.sin(theta) * radius + floatZ,
      );

      if (isPendingCell) {
        // During alignment smoothly slerp to face the camera via quaternion to
        // avoid Euler flip artefacts when theta crosses ±π boundaries.
        orientationHelper.position.copy(cellGroup.position);
        orientationHelper.up.set(0, 1, 0);
        orientationHelper.lookAt(tmp.cameraLocal);
        tmp.targetQuaternion.copy(orientationHelper.quaternion);
        if (cellGroup.quaternion.dot(tmp.targetQuaternion) < 0) {
          tmp.targetQuaternion.x *= -1;
          tmp.targetQuaternion.y *= -1;
          tmp.targetQuaternion.z *= -1;
          tmp.targetQuaternion.w *= -1;
        }
        cellGroup.quaternion.slerp(tmp.targetQuaternion, 0.15);
      } else if (selectedTarget === 0) {
        // Regular tube rotation — set directly from theta.
        cellGroup.rotation.set(0, -(theta + Math.PI / 2), 0);
      }

      tmp.planeNormal.set(0, 0, 1).applyQuaternion(cellGroup.quaternion);
      cellGroup.position.addScaledVector(
        tmp.planeNormal,
        selectedProgress * selectedPullDistance + impulse * 1.2,
      );

      const baseScale = 1 + Math.sin(t * 0.45 + cell.phase) * 0.02;

      if (selectedProgress > 0.001) {
        let viewportHeight = 2;
        let viewportWidth = 2;

        if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
          const perspectiveCamera = camera as THREE.PerspectiveCamera;
          const fov = THREE.MathUtils.degToRad(perspectiveCamera.fov);
          viewportHeight = 2 * Math.tan(fov / 2) * fullscreenDistance;
          viewportWidth = viewportHeight * perspectiveCamera.aspect;
        }

        const finalScale =
          Math.max(viewportWidth / cell.width, viewportHeight / cell.height) /
          tubeScale;
        const boostedScale =
          baseScale *
          (1 + selectedProgress * selectedScaleBoost + impulse * 0.03);
        const scale = THREE.MathUtils.lerp(
          boostedScale,
          finalScale,
          selectedProgress,
        );
        cellGroup.scale.set(scale, scale, 1);

        camera.getWorldDirection(tmp.cameraForward);
        tmp.cameraWorldTarget
          .copy(camera.position)
          .addScaledVector(tmp.cameraForward, fullscreenDistance);
        tmp.targetLocal.copy(tmp.cameraWorldTarget);
        groupRef.current.worldToLocal(tmp.targetLocal);
        tmp.targetLocal.y = tmp.cameraLocal.y;
        tmp.dirWorld.subVectors(tmp.targetLocal, tmp.cameraLocal);
        const targetDistance = tmp.dirWorld.length();
        if (targetDistance > 1e-4 && targetDistance < minDistanceToCamera) {
          tmp.dirWorld.multiplyScalar(minDistanceToCamera / targetDistance);
          tmp.targetLocal.copy(tmp.cameraLocal).add(tmp.dirWorld);
        }

        camera.getWorldQuaternion(tmp.cameraWorldQuaternion);
        groupRef.current.getWorldQuaternion(tmp.groupWorldQuaternion);
        // tmp.groupWorldQuaternionInverse.copy(tmp.groupWorldQuaternion).invert();
        tmp.targetQuaternion
          .copy(tmp.groupWorldQuaternionInverse)
          .multiply(tmp.cameraWorldQuaternion);
        if (cellGroup.quaternion.dot(tmp.targetQuaternion) < 0) {
          tmp.targetQuaternion.x *= -1;
          tmp.targetQuaternion.y *= -1;
          tmp.targetQuaternion.z *= -1;
          tmp.targetQuaternion.w *= -1;
        }

        cellGroup.quaternion.slerp(
          tmp.targetQuaternion,
          THREE.MathUtils.clamp(selectedProgress, 0, 1),
        );
        cellGroup.position.lerp(tmp.targetLocal, selectedProgress);
      } else {
        cellGroup.scale.set(baseScale, baseScale, 1);
      }

      const material = mesh.material as THREE.MeshBasicMaterial;
      const baseOpacity = isFeaturedProjectTitle(cell.project.title) ? 1 : 0.5;
      if (selectedCellRef.current === null) {
        material.opacity = baseOpacity;
      } else if (selectedCellRef.current === cell.cellIndex) {
        material.opacity = 1;
      } else {
        const activeSelectionProgress =
          selectedProgressRef.current[selectedCellRef.current] || 0;
        material.opacity = (1 - activeSelectionProgress * 0.88) * baseOpacity;
      }

      mesh.renderOrder = selectedProgress > 0.02 ? 50 : 0;
      if (hitMesh) {
        hitMesh.renderOrder = mesh.renderOrder;
      }

      // Only lock lookAt once the plane is centered (selectedCellRef), not during pending alignment.
      if (selectedCellRef.current === cell.cellIndex) {
        cellGroup.getWorldPosition(tmp.focusWorld);
        onCameraLookAtLockChange?.(tmp.focusWorld.clone());

        // Fire onProjectOpen once when the animation is nearly complete.
        if (
          selectedProgress > 0.92 &&
          !projectOpenFiredRef.current.has(cell.cellIndex)
        ) {
          projectOpenFiredRef.current.add(cell.cellIndex);
          onProjectOpen?.(cell.project);
        }
      }

      // Fire onProjectClose once the reverse animation settles (selectedProgress almost 0).
      if (
        projectClosingRef.current.has(cell.cellIndex) &&
        selectedProgress < 0.05
      ) {
        projectClosingRef.current.delete(cell.cellIndex);
        onProjectClose?.();
      }

      const shader = planeShaderRefs.current[cell.cellIndex];
      const isOpenedPlane = projectOpenFiredRef.current.has(cell.cellIndex);
      const flatTarget = isOpenedPlane ? 1 : 0;
      const flatCurrent = flatProgressRef.current[cell.cellIndex] || 0;
      const flatDamping = flatTarget > flatCurrent ? flatInDamping : flatOutDamping;
      const flat = THREE.MathUtils.damp(flatCurrent, flatTarget, flatDamping, delta);
      flatProgressRef.current[cell.cellIndex] = flat;

      const motion = 1 - flat;
      if (shader?.uniforms?.uPull) {
        shader.uniforms.uPull.value = selectedProgress * motion;
      }
      if (shader?.uniforms?.uBulge) {
        shader.uniforms.uBulge.value = bulgeStrength * motion;
      }
      if (shader?.uniforms?.uBW) {
        shader.uniforms.uBW.value = isFeaturedProjectTitle(cell.project.title)
          ? 0
          : 1;
      }
      if (shader?.uniforms?.uBlur) {
        shader.uniforms.uBlur.value = isFeaturedProjectTitle(cell.project.title)
          ? 0
          : 0;
      }
      if (shader?.uniforms?.uFlat) {
        shader.uniforms.uFlat.value = flat;
      }
      if (shader?.uniforms?.uTime) {
        shader.uniforms.uTime.value = state.clock.elapsedTime;
      }
      if (shader?.uniforms?.uScroll) {
        shader.uniforms.uScroll.value = scrollCurrentRef.current;
      }
    }

    // --- Backdrop: large white plane that fades in behind the selected project image ---
    const backdrop = backdropRef.current;
    if (backdrop) {
      // Find the cell with the highest selectedProgress.
      let maxProgress = 0;
      let maxCellIndex = -1;
      for (let i = 0; i < selectedProgressRef.current.length; i++) {
        const p = selectedProgressRef.current[i];
        if (p > maxProgress) {
          maxProgress = p;
          maxCellIndex = i;
        }
      }

      const backdropMat = backdrop.material as THREE.MeshBasicMaterial;
      if (maxProgress > 0.001 && maxCellIndex >= 0 && groupRef.current) {
        const cellGroup = cellGroupRefs.current[maxCellIndex];
        if (cellGroup) {
          // Match position and camera-facing orientation of the selected cell.
          backdrop.position.copy(cellGroup.position);
          backdrop.quaternion.copy(cellGroup.quaternion);

          // Push 0.5 local units behind the plane (away from camera).
          tmp.planeNormal.set(0, 0, -1).applyQuaternion(cellGroup.quaternion);
          backdrop.position.addScaledVector(tmp.planeNormal, 0.5);

          // Scale to fill the full viewport at the plane's depth.
          if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
            const perspCam = camera as THREE.PerspectiveCamera;
            const fov = THREE.MathUtils.degToRad(perspCam.fov);
            const vhWorld = 2 * Math.tan(fov / 2) * fullscreenDistance * 1.8;
            const vwWorld = vhWorld * perspCam.aspect;
            // Divide by tubeScale because backdrop is inside the scaled group.
            backdrop.scale.set(vwWorld / tubeScale, vhWorld / tubeScale, 1);
          }

          backdropMat.opacity = maxProgress;
          backdrop.renderOrder = 49;
          backdrop.visible = true;
        }
      } else {
        backdrop.visible = false;
        backdropMat.opacity = 0;
      }
    }
  });

  useEffect(() => {
    if (isActive) return;

    onCameraMotionLockChange?.(false);
    onCameraLookAtLockChange?.(null);
    onHoverPopoverChange?.(null);
    onFullscreenProjectChange?.(null);
  }, [
    isActive,
    onCameraLookAtLockChange,
    onCameraMotionLockChange,
    onFullscreenProjectChange,
    onHoverPopoverChange,
  ]);

  useEffect(() => {
    return () => {
      onCameraMotionLockChange?.(false);
      onCameraLookAtLockChange?.(null);
      onHoverPopoverChange?.(null);
      onFullscreenProjectChange?.(null);
    };
  }, [
    onCameraLookAtLockChange,
    onCameraMotionLockChange,
    onFullscreenProjectChange,
    onHoverPopoverChange,
  ]);

  if (!isActive) return null;

  return (
    <group
      ref={groupRef}
      scale={[tubeScale, tubeScale, tubeScale]}
      onPointerMissed={() => {
        const openCells = [...projectOpenFiredRef.current];
        projectOpenFiredRef.current.clear();
        for (const idx of openCells) projectClosingRef.current.add(idx);
        hoveredCellRef.current = null;
        pendingCellRef.current = null;
        selectedCellRef.current = null;
        onCameraMotionLockChange?.(false);
        onCameraLookAtLockChange?.(null);
        onHoverPopoverChange?.(null);
        onFullscreenProjectChange?.(null);
      }}
    >
      {/* Backdrop — large white plane that fades in behind the focused project image
          to hide the rest of the 3D scene and create continuity with the scroll view. */}
      <mesh ref={backdropRef} visible={false}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {cells.map((cell) => (
        <group
          key={cell.cellIndex}
          ref={(node) => {
            cellGroupRefs.current[cell.cellIndex] = node;
          }}
        >
          <mesh
            ref={(node) => {
              planeRefs.current[cell.cellIndex] = node;
            }}
          >
            <planeGeometry
              args={[cell.width, cell.height, widthSegments, heightSegments]}
            />
            <meshBasicMaterial
              map={cell.texture}
              transparent
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
              onBeforeCompile={(shader) =>
                clothOnBeforeCompile(shader as ShaderLike, cell.cellIndex)
              }
            />
          </mesh>
          {/* Lightweight hit-test mesh to reduce raycast cost on the high-density visual mesh. */}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: React Three Fiber mesh events are intentional here. */}
          <mesh
            ref={(node) => {
              hitPlaneRefs.current[cell.cellIndex] = node;
            }}
            onPointerEnter={(event) => {
              event.stopPropagation();
              if (hoveredCellRef.current === cell.cellIndex) return;
              hoveredCellRef.current = cell.cellIndex;
              onHoverPopoverChange?.(
                buildPopoverPayload(cell.project, event, 18),
              );
            }}
            onPointerLeave={() => {
              if (hoveredCellRef.current !== cell.cellIndex) return;
              hoveredCellRef.current = null;
              onHoverPopoverChange?.(null);
            }}
            onClick={(event) => {
              event.stopPropagation();

              // Only Altitude 101 is interactable; other projects are Coming Soon.
              if (!isFeaturedProjectTitle(cell.project.title)) return;

              const isClosing =
                selectedCellRef.current === cell.cellIndex ||
                pendingCellRef.current === cell.cellIndex;

              if (isClosing) {
                // Delay the close animation to let UI overlays animate out.
                onProjectCloseInitiated?.();
                if (closeTimeoutRef.current !== null) return;

                const cellIndex = cell.cellIndex;
                closeTimeoutRef.current = window.setTimeout(() => {
                  closeTimeoutRef.current = null;
                  pendingCellRef.current = null;
                  selectedCellRef.current = null;
                  hoveredCellRef.current = cellIndex;
                  onCameraMotionLockChange?.(false);
                  onCameraLookAtLockChange?.(null);
                  if (projectOpenFiredRef.current.has(cellIndex)) {
                    // Move from open → closing; onProjectClose fires in useFrame.
                    projectOpenFiredRef.current.delete(cellIndex);
                    projectClosingRef.current.add(cellIndex);
                  } else {
                    projectOpenFiredRef.current.delete(cellIndex);
                  }
                  onFullscreenProjectChange?.(null);
                }, closeDelayMs);
                return;
              }

              pendingCellRef.current = cell.cellIndex;
              selectedCellRef.current = null;
              hoveredCellRef.current = cell.cellIndex;
              onCameraMotionLockChange?.(true);
              onFullscreenProjectChange?.(null);
            }}
          >
            <planeGeometry args={[cell.width, cell.height, 1, 1]} />
            <meshBasicMaterial
              transparent
              opacity={0}
              depthWrite={false}
              depthTest={false}
              toneMapped={false}
              side={THREE.DoubleSide}
              colorWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
