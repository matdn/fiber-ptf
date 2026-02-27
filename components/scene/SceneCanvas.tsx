"use client";

import { Preload } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, SMAA } from "@react-three/postprocessing";
import { Fluid } from "@whatisjery/react-fluid-distortion";
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
  closeRequestId,
  forceCloseRequestId,
  focusProjectRequest,
  onCreated,
}: {
  isUnderwater: boolean;
  isInSpace: boolean;
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
  closeRequestId?: number;
  forceCloseRequestId: number;
  focusProjectRequest?: { id: number; project: ProjectItem } | null;
  onCreated: (payload: { camera: THREE.Camera; scene: THREE.Scene }) => void;
}) {
  const fallbackOrbitCenter = useMemo(() => new THREE.Vector3(0, 200, 0), []);
  const [isCameraLockedByCarousel, setIsCameraLockedByCarousel] =
    useState(false);
  const cameraLookAtLockRef = useRef<THREE.Vector3 | null>(null);
  const handleCameraLookAtLockChange = useCallback(
    (target: THREE.Vector3 | null) => {
      cameraLookAtLockRef.current = target ? target.clone() : null;
    },
    [],
  );
  const isFluidActive = transitionState.showFluidEffect && isUnderwater;
  const composerChildren = useMemo(() => {
    const nodes = [
      <primitive key="displacement" object={effects.displacementEffect} />,
    ];

    // Only add Bloom when it is actually doing something visible.
    if (transitionState.bloomIntensity > 0.05) {
      nodes.push(
        <Bloom
          key="bloom"
          intensity={transitionState.bloomIntensity}
          luminanceThreshold={0.82}
          luminanceSmoothing={0.3}
          radius={0.5}
          mipmapBlur={false}
        />,
      );
    }

    // SMAA only when NOT underwater — underwater has heavier post-processing
    // (fluid, fog) and SMAA's edge-pass is visible on surface geometry only.
    if (!isUnderwater) {
      nodes.push(<SMAA key="smaa" />);
    }

    if (isFluidActive) {
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
    isFluidActive,
    isUnderwater,
    transitionState.bloomIntensity,
  ]);

  return (
    <Canvas
      camera={{ position: [-20, -10, -10], fov: 40 }}
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
            "#ffffff",
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
      <CurveRotation curveObject={curveObject} />

      {isInSpace && <Stars count={2000} />}
      {isInSpace && <Stars count={800} position={[0, 200, 0]} radius={80} />}

      <Suspense fallback={null}>
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
              closeRequestId={closeRequestId}
              onCameraMotionLockChange={setIsCameraLockedByCarousel}
              onCameraLookAtLockChange={handleCameraLookAtLockChange}
              forceCloseRequestId={forceCloseRequestId}
              focusProjectRequest={focusProjectRequest}
            />
            <CurveParticles curvePosition={curvePosition} isUnderwater={true} />
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
