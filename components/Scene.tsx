"use client";

import gsap from "gsap";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useUnderwater } from "@/contexts/UnderwaterContext";
import { DisplacementTransitionEffect } from "./scene/DisplacementTransitionEffect";
import { useFpsTracker } from "./scene/hooks/useFpsTracker";
import { useSceneAudio } from "./scene/hooks/useSceneAudio";
import { useSpaceTextMask } from "./scene/hooks/useSpaceTextMask";
import { SceneCanvas } from "./scene/SceneCanvas";
import type { SceneEffects, SceneTransitionState } from "./scene/sceneTypes";
import type { ProjectItem } from "@/lib/projectImages";
import type {
  FullscreenProjectPayload,
  ProjectPopoverPayload,
} from "./scene/UnderwaterProjectsCarousel";
import { UnderwaterRaysEffect } from "./scene/UnderwaterRaysEffect";
import { FullscreenProjectOverlay } from "./scene/ui/FullscreenProjectOverlay";
import { ProjectDetailView } from "./scene/ui/ProjectDetailView";
import { SceneVignetteOverlay } from "./scene/ui/SceneVignetteOverlay";
import { SpaceTextOverlay } from "./scene/ui/SpaceTextOverlay";
import { TransitionFlashOverlay } from "./scene/ui/TransitionFlashOverlay";
import { UnderwaterPreviewOverlay } from "./scene/ui/UnderwaterPreviewOverlay";

class EffectsManager {
  private static instance: EffectsManager;
  readonly underwaterRaysEffect = new UnderwaterRaysEffect();
  readonly displacementEffect = new DisplacementTransitionEffect();

  static getInstance() {
    if (!EffectsManager.instance) {
      EffectsManager.instance = new EffectsManager();
    }
    return EffectsManager.instance;
  }
}

export default function Scene({
  onUnderwaterToggle,
  isUnderwater,
  isInSpace,
  instantSpaceEntry,
  underwaterRequest,
  volumes,
}: {
  onUnderwaterToggle: (value: boolean) => void;
  isUnderwater: boolean;
  isInSpace: boolean;
  instantSpaceEntry?: boolean;
  underwaterRequest?: { toUnderwater: boolean; id: number } | null;
  volumes?: { [key: string]: number };
}) {
  const { isMuted } = useUnderwater();

  const [curvePosition, setCurvePosition] = useState<THREE.Vector3 | null>(
    null,
  );
  const [curveObject, setCurveObject] = useState<THREE.Object3D | null>(null);
  const [curveStarPosition, setCurveStarPosition] =
    useState<THREE.Vector3 | null>(null);
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false);
  const [hoverProjectPopover, setHoverProjectPopover] =
    useState<ProjectPopoverPayload | null>(null);
  const [fullscreenProject, setFullscreenProject] =
    useState<FullscreenProjectPayload | null>(null);
  const [carouselCloseRequestId, setCarouselCloseRequestId] = useState(0);

  // Project detail open/close state
  const [openProject, setOpenProject] = useState<ProjectItem | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [carouselCloseAnimRequestId, setCarouselCloseAnimRequestId] = useState(0);

  const transitionStateRef = useRef<SceneTransitionState>({
    isTransitioning: false,
    bloomIntensity: 0.1,
    underwaterFog: { near: 20, far: 15 },
    showFluidEffect: false,
    showUnderwaterEffects: false,
    scrollOffset: 0,
  });

  const cameraRef = useRef<THREE.Camera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const flashOverlayRef = useRef<HTMLDivElement | null>(null);
  const textMaskRef = useRef<HTMLDivElement | null>(null);
  const fpsTrackerRef = useRef<number[]>([]);

  const effectsManager = useMemo(() => EffectsManager.getInstance(), []);
  const effects = effectsManager as SceneEffects;

  const ULTRA_FOG = useMemo(() => ({ near: 0.005, far: 0.45 }), []);
  const DEFAULT_UNDERWATER_FOG = useMemo(() => ({ near: 15, far: 140 }), []);
  const INITIAL_CAMERA_POSITION = useMemo(
    () => new THREE.Vector3(-20, -10, -10),
    [],
  );

  useSceneAudio({
    volumes,
    isMuted,
    isInSpace,
    isUnderwater,
  });

  useFpsTracker(fpsTrackerRef);

  useSpaceTextMask({
    isInSpace,
    textMaskRef,
  });

  useEffect(() => {
    if (
      !underwaterRequest ||
      underwaterRequest.toUnderwater === isUnderwater ||
      isInSpace
    )
      return;

    const toUnderwater = underwaterRequest.toUnderwater;
    const transState = transitionStateRef.current;

    if (transState.isTransitioning) return;
    transState.isTransitioning = true;

    const duration = toUnderwater ? 4.5 : 4.0;
    transState.bloomIntensity = 0;

    const fadeOutFlashWhenStable = (maxChecks: number) => {
      let checkCount = 0;
      let stableFpsCount = 0;

      const waitForStableFps = () => {
        checkCount++;

        if (fpsTrackerRef.current.length >= 20) {
          const recentFps = fpsTrackerRef.current.slice(-20);
          const avgFps =
            recentFps.reduce((sum, fps) => sum + fps, 0) / recentFps.length;
          stableFpsCount = avgFps >= 55 ? stableFpsCount + 1 : 0;
        }

        if (stableFpsCount >= 10 || checkCount >= maxChecks) {
          if (!flashOverlayRef.current) return;

          gsap.to(flashOverlayRef.current, {
            opacity: 0,
            duration: 1.5,
            ease: "power2.out",
            onComplete: () => {
              setShowTransitionOverlay(false);
            },
          });
          return;
        }

        requestAnimationFrame(waitForStableFps);
      };

      requestAnimationFrame(waitForStableFps);
    };

    if (cameraRef.current) {
      gsap.to(cameraRef.current.position, {
        y: cameraRef.current.position.y + (toUnderwater ? -15 : 15),
        duration,
        ease: "power2.inOut",
        onUpdate: function onUpdate() {
          const progress = this.progress();
          effects.displacementEffect.setProgress(progress);

          if (progress >= 0.5 && progress < 0.52) {
            if (toUnderwater) {
              transState.showFluidEffect = true;
              setTimeout(() => {
                transState.showUnderwaterEffects = true;
              }, 200);
            }
            onUnderwaterToggle(toUnderwater);
          }
        },
        onComplete: () => {
          effects.displacementEffect.setProgress(0);
          transState.isTransitioning = false;
          transState.bloomIntensity = 0;
        },
      });
    }

    if (curveObject) {
      const scale = curveObject.scale;
      const initialScale = { x: scale.x, y: scale.y, z: scale.z };
      const curveDelay = duration * (toUnderwater ? 0.22 : 0.16);

      gsap.delayedCall(curveDelay, () => {
        setShowTransitionOverlay(true);
      });

      gsap
        .timeline()
        .to(scale, {
          x: initialScale.x * 28,
          y: initialScale.y * 28,
          z: initialScale.z * 28,
          duration: duration * 0.2,
          delay: curveDelay,
          ease: "power3.out",
        })
        .to(scale, {
          x: initialScale.x,
          y: initialScale.y,
          z: initialScale.z,
          duration: duration * 0.48,
          ease: "elastic.out(1, 0.48)",
        });
    }

    gsap.delayedCall(duration * 0.25, () => {
      if (!flashOverlayRef.current) return;

      const timeline = gsap.timeline();

      if (toUnderwater) {
        timeline
          .to(flashOverlayRef.current, {
            opacity: 1,
            duration: duration * 0.24,
          })
          .call(() => {
            transState.underwaterFog = { ...ULTRA_FOG };
            const fogTarget = { ...ULTRA_FOG };
            let frameCount = 0;

            gsap.to(fogTarget, {
              near: DEFAULT_UNDERWATER_FOG.near,
              far: DEFAULT_UNDERWATER_FOG.far,
              duration: 3.2,
              ease: "power2.out",
              onUpdate: () => {
                frameCount++;
                if (frameCount % 4 !== 0 || !sceneRef.current) return;

                const fog = sceneRef.current.fog as THREE.Fog | null;
                if (!fog) return;

                fog.near = fogTarget.near;
                fog.far = fogTarget.far;
              },
            });
          })
          .add(
            () => {
              fadeOutFlashWhenStable(200);
            },
            `+=${duration * 0.3}`,
          );
      } else {
        timeline
          .to(flashOverlayRef.current, { opacity: 1, duration: duration * 0.2 })
          .add(
            () => {
              fadeOutFlashWhenStable(150);
            },
            `+=${duration * 0.3}`,
          );
      }
    });
  }, [
    underwaterRequest,
    isUnderwater,
    isInSpace,
    onUnderwaterToggle,
    ULTRA_FOG,
    DEFAULT_UNDERWATER_FOG,
    curveObject,
    effects,
  ]);

  useEffect(() => {
    if (!isInSpace || transitionStateRef.current.isTransitioning) return;

    if (!cameraRef.current) return;

    if (instantSpaceEntry) {
      cameraRef.current.position.set(0, 200, 30);
      transitionStateRef.current.isTransitioning = false;
      return;
    }

    transitionStateRef.current.isTransitioning = true;
    gsap.to(cameraRef.current.position, {
      x: 0,
      y: 200,
      z: 30,
      duration: 4,
      ease: "power2.inOut",
      onComplete: () => {
        transitionStateRef.current.isTransitioning = false;
      },
    });
  }, [isInSpace, instantSpaceEntry]);

  const transitionState = transitionStateRef.current;
  const activeProjectPreview = fullscreenProject ? null : hoverProjectPopover;

  // --- Project open ---
  const handleProjectOpen = (project: ProjectItem) => {
    if (openProject) return;
    setOpenProject(project);
    if (scrollContainerRef.current) scrollContainerRef.current.style.overflowY = "auto";
  };

  // Called when the carousel closes itself (click on plane or click outside).
  // No carousel reset needed — the carousel already cleared its own state.
  const handleProjectClosedByCarousel = () => {
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTo({ top: 0 });
    if (scrollContainerRef.current) scrollContainerRef.current.style.overflowY = "hidden";
    setOpenProject(null);
  };

  // --- Project close from Back button: triggers the GL reverse animation.
  // The view is cleared only once the animation finishes (handleProjectClosedByCarousel).
  const handleProjectClose = () => {
    setCarouselCloseAnimRequestId((v) => v + 1);
  };

  return (
    <div
      className="w-full h-screen fixed"
      style={{ mixBlendMode: isUnderwater ? "screen" : "normal" }}
    >
      {/* Scroll column: canvas strip on top, project detail below */}
      <div
        ref={scrollContainerRef}
        style={{ height: "100%", overflowY: "hidden" }}
      >
        {/* Canvas container — always 100 vh */}
        <div
          style={{ position: "relative", width: "100%", height: "100vh", flexShrink: 0 }}
        >
          <SceneCanvas
            isUnderwater={isUnderwater}
            isInSpace={isInSpace}
            instantSpaceEntry={instantSpaceEntry}
            transitionState={transitionState}
            effects={effects}
            initialCameraPosition={INITIAL_CAMERA_POSITION}
            curvePosition={curvePosition}
            curveObject={curveObject}
            curveStarPosition={curveStarPosition}
            onCurveFound={setCurvePosition}
            onCurveRefFound={setCurveObject}
            onCurveStarFound={setCurveStarPosition}
            onHoverPopoverChange={setHoverProjectPopover}
            onFullscreenProjectChange={setFullscreenProject}
            onProjectOpen={handleProjectOpen}
            onProjectClose={handleProjectClosedByCarousel}
            closeRequestId={carouselCloseAnimRequestId}
            forceCloseRequestId={carouselCloseRequestId}
            onCreated={({ camera, scene }) => {
              cameraRef.current = camera;
              sceneRef.current = scene;
            }}
          />
        </div>
        {openProject && (
          <ProjectDetailView project={openProject} onClose={handleProjectClose} />
        )}
      </div>

      {/* Fixed UI overlays */}
      <SpaceTextOverlay isInSpace={isInSpace} textMaskRef={textMaskRef} />

      <TransitionFlashOverlay
        show={showTransitionOverlay}
        flashOverlayRef={flashOverlayRef}
      />

      <UnderwaterPreviewOverlay
        isUnderwater={isUnderwater}
        isInSpace={isInSpace}
        activeProjectPreview={activeProjectPreview}
      />

      <FullscreenProjectOverlay
        project={fullscreenProject}
        onClose={() => {
          setFullscreenProject(null);
          setCarouselCloseRequestId((value) => value + 1);
        }}
      />

      <SceneVignetteOverlay isUnderwater={isUnderwater} />
    </div>
  );
}
