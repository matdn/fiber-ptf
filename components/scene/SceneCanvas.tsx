"use client";

import { Preload } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
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
  focusProjectRequest?: { id: number; project: ProjectItem } | null;
  onCreated: (payload: { camera: THREE.Camera; scene: THREE.Scene }) => void;
}) {
  const fallbackOrbitCenter = useMemo(() => new THREE.Vector3(0, 200, 0), []);
  const [isCameraLockedByCarousel, setIsCameraLockedByCarousel] =
    useState(false);
  const cameraLookAtLockRef = useRef<THREE.Vector3 | null>(null);
  const underwaterCarouselSpinAngleRef = useRef(0);
  const setBloomIntensityRef = useRef<((value: number) => void) | null>(null);
  const surfaceBloomTarget = 0.03;

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
  const handleCameraLookAtLockChange = useCallback(
    (target: THREE.Vector3 | null) => {
      cameraLookAtLockRef.current = target ? target.clone() : null;
    },
    [],
  );
  const composerChildren = useMemo(() => {
    const nodes = [];

    // Keep Bloom mounted so we can fade it out via ref without needing rerenders.
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
        luminanceThreshold={0.82}
        luminanceSmoothing={0.3}
        radius={0.5}
        mipmapBlur={false}
      />,
    );

    nodes.push(
      <primitive key="displacement" object={effects.displacementEffect} />,
    );

    // SMAA only when NOT underwater — underwater has heavier post-processing
    // (fluid, fog) and SMAA's edge-pass is visible on surface geometry only.
    if (!isUnderwater) {
      nodes.push(<SMAA key="smaa" />);
    }

    // if (transitionState.showFluidEffect && isUnderwater) {
    //   nodes.unshift(
    //     <Fluid
    //       key="fluid"
    //       rainbow={false}
    //       intensity={0.6}
    //       fluidColor="#000000"
    //       radius={0.5}
    //     />,
    //   );
    // }

    return nodes;
  }, [
    effects.displacementEffect,
    isUnderwater,
    transitionState.bloomIntensity,
  ]);

  return (
    <Canvas
      camera={{ position: [-20, -10, -10], fov: 40 }}
      frameloop={isProjectDetailView && !isUnderwater ? "never" : "always"}
      dpr={[1, 2]}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        alpha: false,
        logarithmicDepthBuffer: false,
        precision: "highp",
      }}
      onCreated={({ camera, scene }) => {
        onCreated({ camera, scene });
        if (isInSpace && instantSpaceEntry) {
          camera.position.set(0, 200, 30);
        }
      }}
    >
      <color attach="background" args={["#000"]} />
      {isUnderwater && (
        <fog
          attach="fog"
          args={[
            "#000",
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
        <Model
          onCurveFound={onCurveFound}
          onCurveRefFound={onCurveRefFound}
          onCurveStarFound={onCurveStarFound}
          isUnderwater={isUnderwater}
          isInSpace={isInSpace}
        />

        {!isInSpace && !isUnderwater && curvePosition && (
          <CurveParticles curvePosition={curvePosition} isUnderwater={false} />
        )}
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
          isVisible={isInSpace}
        />
        <group
          rotation={isUnderwater ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0]}
          position={isUnderwater ? [0, 0, 0] : [0, -20, 0]}
        >
          <Water />
        </group>
      </Suspense>

      {/* {!isUnderwater && <EffectComposer multisampling={0}>{composerChildren}</EffectComposer>} */}
      <EffectComposer multisampling={0}>{composerChildren}</EffectComposer>

      <Preload all />
    </Canvas>
  );
});
