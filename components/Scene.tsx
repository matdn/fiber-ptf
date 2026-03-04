"use client";

import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useUnderwater } from "@/contexts/UnderwaterContext";
import { PROJECTS, type ProjectItem } from "@/lib/projectImages";
import { DisplacementTransitionEffect } from "./scene/DisplacementTransitionEffect";
import { useFpsTracker } from "./scene/hooks/useFpsTracker";
import { useSceneAudio } from "./scene/hooks/useSceneAudio";
import { useSpaceTextMask } from "./scene/hooks/useSpaceTextMask";
import { SceneCanvas } from "./scene/SceneCanvas";
import type { SceneEffects, SceneTransitionState } from "./scene/sceneTypes";
import type {
  FullscreenProjectPayload,
  ProjectPopoverPayload,
} from "./scene/UnderwaterProjectsCarousel";
import { UnderwaterRaysEffect } from "./scene/UnderwaterRaysEffect";
import { FullscreenProjectOverlay } from "./scene/ui/FullscreenProjectOverlay";
import { ProjectDetailView } from "./scene/ui/ProjectDetailView";
import { ProjectDetailFloatOverlay } from "./scene/ui/ProjectDetailFloatOverlay";
import { SceneVignetteOverlay } from "./scene/ui/SceneVignetteOverlay";
import { SpaceTextOverlay } from "./scene/ui/SpaceTextOverlay";
import { TransitionFlashOverlay } from "./scene/ui/TransitionFlashOverlay";
import { UnderwaterPreviewOverlay } from "./scene/ui/UnderwaterPreviewOverlay";

const FEATURED_PROJECT_TITLE = "Altitude 101";

function isFeaturedProjectTitle(title: string) {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const featured = FEATURED_PROJECT_TITLE.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalized === featured;
}

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
  const [projectCloseInitiatedId, setProjectCloseInitiatedId] = useState(0);
  const [isProjectCloseDelayActive, setIsProjectCloseDelayActive] =
    useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [carouselCloseAnimRequestId, setCarouselCloseAnimRequestId] =
    useState(0);
  const openProjectRef = useRef<ProjectItem | null>(null);
  const [focusProjectRequest, setFocusProjectRequest] = useState<{
    id: number;
    project: ProjectItem;
  } | null>(null);

  // If we arrive already underwater (e.g. navigating back from contact/about),
  // initialise fog and effects to their final values immediately so the scene
  // is visible without needing a transition to run first.
  const transitionStateRef = useRef<SceneTransitionState>({
    isTransitioning: false,
    bloomIntensity: isUnderwater ? 0 : 0.1,
    underwaterFog: isUnderwater
      ? { near: 15, far: 140 }
      : { near: 20, far: 15 },
    showFluidEffect: isUnderwater,
    showUnderwaterEffects: isUnderwater,
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
      // If arriving from space the camera is at y≈200 — snap it back to the
      // surface position before running the underwater transition so the scene
      // stays centred.
      if (
        Math.abs(cameraRef.current.position.y - INITIAL_CAMERA_POSITION.y) > 50
      ) {
        cameraRef.current.position.copy(INITIAL_CAMERA_POSITION);
      }

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
      const curveDelay = duration * (toUnderwater ? 0.22 : 0.16);

      gsap.delayedCall(curveDelay, () => {
        setShowTransitionOverlay(true);
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
    INITIAL_CAMERA_POSITION,
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

  const nextProject = useMemo(() => {
    if (!openProject || PROJECTS.length === 0) return null;

    const openIndex = PROJECTS.findIndex(
      (project) =>
        project.title === openProject.title &&
        project.imageUrl === openProject.imageUrl,
    );

    if (openIndex === -1) return PROJECTS[0];
    return PROJECTS[(openIndex + 1) % PROJECTS.length];
  }, [openProject]);

  const detailViewPreview = useMemo<ProjectPopoverPayload | null>(() => {
    if (!openProject || !nextProject) return null;

    return {
      title: nextProject.title,
      imageUrl: nextProject.imageUrl,
      detailImageUrl: nextProject.detailImageUrl,
      detailVideoUrl: nextProject.detailVideoUrl,
      description: nextProject.description,
      detailBlocks: nextProject.detailBlocks,
      x: 0,
      y: 0,
    };
  }, [openProject, nextProject]);

  const activeProjectPreview = openProject
    ? detailViewPreview
    : fullscreenProject
      ? null
      : hoverProjectPopover;

  // --- Project open ---
  const handleProjectOpen = useCallback((project: ProjectItem) => {
    setOpenProject((prev) => {
      if (prev) return prev; // already open — ignore
      if (scrollContainerRef.current)
        scrollContainerRef.current.style.overflowY = "auto";
      return project;
    });
    setIsProjectCloseDelayActive(false);
  }, []);

  // Called when the carousel closes itself (click on plane or click outside).
  // No carousel reset needed — the carousel already cleared its own state.
  const handleProjectClosedByCarousel = useCallback(() => {
    if (scrollContainerRef.current)
      scrollContainerRef.current.scrollTo({ top: 0 });
    if (scrollContainerRef.current)
      scrollContainerRef.current.style.overflowY = "hidden";
    setIsProjectCloseDelayActive(false);
    setOpenProject(null);
  }, []);

  // --- Project close from Back button: triggers the GL reverse animation.
  // The view is cleared only once the animation finishes (handleProjectClosedByCarousel).
  const handleProjectClose = useCallback(() => {
    setCarouselCloseAnimRequestId((v) => v + 1);
  }, []);

  const handleProjectCloseInitiated = useCallback(() => {
    setProjectCloseInitiatedId((v) => v + 1);
    setIsProjectCloseDelayActive(true);
  }, []);

  const handleHoverPopoverChange = useCallback(
    (payload: ProjectPopoverPayload | null) => {
      if (openProjectRef.current) return;
      setHoverProjectPopover(payload);
    },
    [],
  );

  const handleSwitchToNextProject = useCallback(() => {
    if (!nextProject) return;
    if (!isFeaturedProjectTitle(nextProject.title)) return;

    setOpenProject(nextProject);
    setFocusProjectRequest({ id: Date.now(), project: nextProject });
    setHoverProjectPopover(null);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.clientHeight,
      });
    }
  }, [nextProject]);

  useEffect(() => {
    openProjectRef.current = openProject;
  }, [openProject]);

  useEffect(() => {
    if (!openProject) return;
    setHoverProjectPopover(null);
  }, [openProject]);

  useEffect(() => {
    if (openProject) return;
    setIsProjectCloseDelayActive(false);
  }, [openProject]);

  return (
    <div
      className="w-full h-screen fixed"
      style={{ mixBlendMode: isUnderwater ? "screen" : "normal" }}
    >
      {/* Scroll column: canvas strip on top, project detail below */}
      <div
        ref={scrollContainerRef}
        data-scene-scroll-root="true"
        style={{ height: "100%", overflowY: "hidden" }}
      >
        {/* Canvas container — always 100 vh */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100vh",
            flexShrink: 0,
          }}
        >
          <SceneCanvas
            isUnderwater={isUnderwater}
            isInSpace={isInSpace}
            isProjectDetailView={Boolean(openProject)}
            isProjectCloseDelayActive={isProjectCloseDelayActive}
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
            onHoverPopoverChange={handleHoverPopoverChange}
            onFullscreenProjectChange={setFullscreenProject}
            onProjectOpen={handleProjectOpen}
            onProjectClose={handleProjectClosedByCarousel}
            onProjectCloseInitiated={handleProjectCloseInitiated}
            closeRequestId={carouselCloseAnimRequestId}
            forceCloseRequestId={carouselCloseRequestId}
            focusProjectRequest={focusProjectRequest}
            onCreated={({ camera, scene }) => {
              cameraRef.current = camera;
              sceneRef.current = scene;
            }}
          />
        </div>
        {openProject && (
          <ProjectDetailView
            project={openProject}
            onClose={handleProjectClose}
          />
        )}
      </div>

      {/* Fixed UI overlays */}
      <ProjectDetailFloatOverlay
        isActive={Boolean(openProject)}
        project={openProject}
        hideRequestId={projectCloseInitiatedId}
      />

      <SpaceTextOverlay isInSpace={isInSpace} textMaskRef={textMaskRef} />

      <TransitionFlashOverlay
        show={showTransitionOverlay}
        flashOverlayRef={flashOverlayRef}
      />

      <UnderwaterPreviewOverlay
        isUnderwater={isUnderwater}
        isInSpace={isInSpace}
        activeProjectPreview={activeProjectPreview}
        isProjectDetailView={Boolean(openProject)}
        onSwitchProject={handleSwitchToNextProject}
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
