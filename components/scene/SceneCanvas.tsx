"use client";

import { Preload } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { HDRIEnvironment } from "./HDRIEnvironment";
import { Bloom, EffectComposer, SMAA } from "@react-three/postprocessing";
import { memo, Suspense, useCallback, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { ProjectItem } from "@/lib/projectImages";
import { Water } from "../Water";
import { CameraFollowMouse } from "./CameraFollowMouse";
import { CurveParticles } from "./CurveParticles";
import { CurveRotation } from "./CurveRotation";
import { Model } from "./Model";
import { OrbitingRocks } from "./OrbitingRocks";
import { Stars } from "./Stars";
import type { SceneEffects, SceneTransitionState } from "./sceneTypes";
import type {
  FullscreenProjectPayload,
  ProjectPopoverPayload,
} from "./UnderwaterProjectsCarousel";
import { UnderwaterProjectsCarousel } from "./UnderwaterProjectsCarousel";
import { Fluid } from "@whatisjery/react-fluid-distortion";

export const SceneCanvas = memo(function SceneCanvas({
  isUnderwater,
  isInSpace,
  isProjectDetailView,
  isProjectCloseDelayActive,
  instantSpaceEntry,
  transitionState,
  effects,
  initialCameraPosition,
  curvePosition,
  curveObject,
  curveStarPosition,
  onCurveFound,
  onCurveRefFound,
  onCurveStarFound,
  onHoverPopoverChange,
  onFullscreenProjectChange,
  onProjectOpen,
  onProjectClose,
  onProjectCloseInitiated,
  closeRequestId,
  forceCloseRequestId,
  hdriSlotIndex,
  focusProjectRequest,
  onCreated,
}: {
  isUnderwater: boolean;
  isInSpace: boolean;
  isProjectDetailView?: boolean;
  isProjectCloseDelayActive?: boolean;
  instantSpaceEntry?: boolean;
  transitionState: SceneTransitionState;
  effects: SceneEffects;
  initialCameraPosition: THREE.Vector3;
  curvePosition: THREE.Vector3 | null;
  curveObject: THREE.Object3D | null;
  curveStarPosition: THREE.Vector3 | null;
  onCurveFound: (position: THREE.Vector3) => void;
  onCurveRefFound: (ref: THREE.Object3D) => void;
  onCurveStarFound: (position: THREE.Vector3) => void;
  onHoverPopoverChange: (payload: ProjectPopoverPayload | null) => void;
  onFullscreenProjectChange: (payload: FullscreenProjectPayload | null) => void;
  onProjectOpen?: (project: ProjectItem) => void;
  onProjectClose?: () => void;
  onProjectCloseInitiated?: () => void;
  closeRequestId?: number;
  forceCloseRequestId: number;
  hdriSlotIndex?: number;
  focusProjectRequest?: { id: number; project: ProjectItem } | null;
  onCreated: (payload: { camera: THREE.Camera; scene: THREE.Scene }) => void;
}) {
  const fallbackOrbitCenter = useMemo(() => new THREE.Vector3(0, 200, 0), []);
  const [isCameraLockedByCarousel, setIsCameraLockedByCarousel] =
    useState(false);
  const cameraLookAtLockRef = useRef<THREE.Vector3 | null>(null);
  const underwaterCarouselSpinAngleRef = useRef(0);
  const setBloomIntensityRef = useRef<((value: number) => void) | null>(null);
  const spaceTransitionStartTimeRef = useRef<number | null>(null);
  const [spaceTransitionProgress, setSpaceTransitionProgress] = useState(0);
  // Night (slot 3 or undefined) gets a subtle bloom; other times of day have none since the curve is translucent
  // const surfaceBloomTarget = (hdriSlotIndex === undefined || hdriSlotIndex === 3) ? 0.1 : 0;
  const surfaceBloomTarget = 0.08;
  function BloomFadeController() {
    useFrame((_, delta) => {
      const setBloomIntensity = setBloomIntensityRef.current;
      if (!setBloomIntensity) return;

      // During transitions we let the transition code drive bloom.
      if (transitionState.isTransitioning) {
        if (typeof transitionState.bloomIntensity === "number") {
          setBloomIntensity(transitionState.bloomIntensity);
        }
        return;
      }

      // In the main scene (surface), keep a light bloom so the curve stays glowing.
      if (!isUnderwater && !isInSpace) {
        const current = transitionState.bloomIntensity;
        const next = THREE.MathUtils.damp(
          current,
          surfaceBloomTarget,
          8,
          delta,
        );
        setBloomIntensity(next);
        transitionState.bloomIntensity = next;
      }
    });

    return null;
  }

  function SpaceTransitionProgressController() {
    useFrame(({ clock }) => {
      if (isInSpace && spaceTransitionStartTimeRef.current === null) {
        spaceTransitionStartTimeRef.current = clock.elapsedTime;
      }

      if (!isInSpace) {
        spaceTransitionStartTimeRef.current = null;
        setSpaceTransitionProgress(0);
        return;
      }

      if (spaceTransitionStartTimeRef.current !== null) {
        const elapsed = clock.elapsedTime - spaceTransitionStartTimeRef.current;
        // Smooth fade in over 2 seconds
        const progress = Math.min(elapsed / 2, 1);
        setSpaceTransitionProgress(progress);
      }
    });

    return null;
  }

  const handleCameraLookAtLockChange = useCallback(
    (target: THREE.Vector3 | null) => {
      cameraLookAtLockRef.current = target ? target.clone() : null;
    },
    [],
  );
  const composerChildren = useMemo(() => {
    const nodes = [];

    if (!isUnderwater) {
      nodes.push(
        <Bloom
          // biome-ignore lint/suspicious/noExplicitAny: effect instance type comes from postprocessing
          ref={(instance: any) => {
            setBloomIntensityRef.current = instance
              ? (value: number) => {
                  instance.intensity = value;
                }
              : null;
          }}
          key="bloom"
          intensity={transitionState.bloomIntensity}
          luminanceThreshold={0.42}
          luminanceSmoothing={0.45}
          radius={0.65}
          mipmapBlur
        />,
      );
    }

    nodes.push(
      <primitive key="displacement" object={effects.displacementEffect} />,
    );

    // SMAA only when NOT underwater — underwater has heavier post-processing
    // (fluid, fog) and SMAA's edge-pass is visible on surface geometry only.
    if (!isUnderwater) {
      nodes.push(<SMAA key="smaa" />);
    }

    if (isUnderwater && Boolean(isProjectDetailView)) {
      nodes.unshift(
        <Fluid
          key="fluid"
          rainbow={false}
          intensity={0.6}
          fluidColor="#000000"
          radius={0.5}
        />,
      );
    }

    return nodes;
  }, [
    effects.displacementEffect,
    isProjectDetailView,
    isUnderwater,
    transitionState.bloomIntensity,
  ]);

  return (
    <Canvas
      camera={{ position: [-20, -10, -10], fov: 40 }}
      frameloop={isProjectDetailView && !isUnderwater ? "never" : "always"}
      dpr={[1, 1.5]}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        alpha: false,
        logarithmicDepthBuffer: false,
        precision: "highp",
        preserveDrawingBuffer: true,
      }}
      onCreated={({ camera, scene, gl }) => {
        gl.domElement.id = 'r3f-main-canvas';
        onCreated({ camera, scene });
        if (isInSpace && instantSpaceEntry) {
          camera.position.set(0, 200, 30);
        }
      }}
    >
      {/* Solid-colour fallbacks – HDRIEnvironment overrides the surface background when the .hdr file is present */}
      {isUnderwater && <color attach="background" args={["#fff"]} />}
      {!isUnderwater && <color attach="background" args={["#000"]} />}

      {/* HDRI environment – surface + space, degrades gracefully when files are missing */}
      <HDRIEnvironment active={!isUnderwater} forcedSlotIndex={hdriSlotIndex} />
      {isUnderwater && (
        <fog
          attach="fog"
          args={[
            "#fff",
            transitionState.underwaterFog.near,
            transitionState.underwaterFog.far,
          ]}
        />
      )}
      <pointLight position={[10, 10, 10]} intensity={15000} />
      <ambientLight
        intensity={!transitionState.isTransitioning && isUnderwater ? 2 : 0.3}
      />

      <CameraFollowMouse
        initialPosition={initialCameraPosition}
        curvePosition={curvePosition}
        curveStarPosition={curveStarPosition}
        scrollOffset={transitionState.scrollOffset}
        isInSpace={isInSpace}
        transitionState={transitionState}
        lockedLookAtTargetRef={cameraLookAtLockRef}
        lockSpaceCamera={Boolean(
          (instantSpaceEntry && isInSpace) || isCameraLockedByCarousel,
        )}
      />
      {isUnderwater && (
        <CurveRotation
          curveObject={curveObject}
          isUnderwater={isUnderwater}
          spinAngleRef={underwaterCarouselSpinAngleRef}
        />
      )}

      {isInSpace && <Stars count={2000} />}
      {isInSpace && <Stars count={800} position={[0, 200, 0]} radius={80} />}

      <Suspense fallback={null}>
        <BloomFadeController />
        <SpaceTransitionProgressController />
        <Model
          onCurveFound={onCurveFound}
          onCurveRefFound={onCurveRefFound}
          onCurveStarFound={onCurveStarFound}
          isUnderwater={isUnderwater}
          isInSpace={isInSpace}
          spaceTransitionProgress={spaceTransitionProgress}
          hdriSlotIndex={hdriSlotIndex}
        />

        {/* {!isInSpace && !isUnderwater && curvePosition && (
          <CurveParticles curvePosition={curvePosition} isUnderwater={false} />
        )} */}
        {isUnderwater && (
          <>
            <UnderwaterProjectsCarousel
              isActive={!isInSpace}
              centerPosition={curvePosition}
              onHoverPopoverChange={onHoverPopoverChange}
              onFullscreenProjectChange={onFullscreenProjectChange}
              onProjectOpen={onProjectOpen}
              onProjectClose={onProjectClose}
              onProjectCloseInitiated={onProjectCloseInitiated}
              bwEnabled={
                !Boolean(isProjectDetailView) ||
                Boolean(isProjectCloseDelayActive)
              }
              closeRequestId={closeRequestId}
              onCameraMotionLockChange={setIsCameraLockedByCarousel}
              onCameraLookAtLockChange={handleCameraLookAtLockChange}
              forceCloseRequestId={forceCloseRequestId}
              focusProjectRequest={focusProjectRequest}
              spinAngleRef={underwaterCarouselSpinAngleRef}
            />
          </>
        )}
        <OrbitingRocks
          centerPosition={curveStarPosition || fallbackOrbitCenter}
          isVisible={isInSpace && (hdriSlotIndex === undefined || hdriSlotIndex === 3)}
        />
        {!isUnderwater && (
          <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, 0]}>
            <Water />
          </group>
        )}
      </Suspense>

      {/* {!isUnderwater && <EffectComposer multisampling={0}>{composerChildren}</EffectComposer>} */}
      <EffectComposer multisampling={0}>{composerChildren}</EffectComposer>

      <Preload all />
    </Canvas>
  );
});
