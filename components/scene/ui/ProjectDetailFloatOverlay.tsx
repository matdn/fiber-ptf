"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Canvas } from "@react-three/fiber";
import { memo, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { FloatingMModels } from "../FloatingMModels";
import type { ProjectItem } from "@/lib/projectImages";
import { getProjectMeshColor } from "@/lib/projectColors";

export const ProjectDetailFloatOverlay = memo(function ProjectDetailFloatOverlay({
  isActive,
  project,
  hideRequestId,
  footerSentinelId = "project-detail-footer-sentinel",
}: {
  isActive: boolean;
  project?: ProjectItem | null;
  hideRequestId?: number;
  footerSentinelId?: string;
}) {
  const [shouldRender, setShouldRender] = useState(isActive);
  const baseOut = useRef({ v: isActive ? 0 : 1 });
  const footerOut = useRef({ v: 0 });
  const outProgressRef = useRef(1);
  const pointerRef = useRef({ x: 0, y: 0 });

  const meshColor = useMemo(
    () => getProjectMeshColor(project?.title),
    [project?.title],
  );

  const combineRefFn = useMemo(() => {
    return () => {
      outProgressRef.current = Math.max(baseOut.current.v, footerOut.current.v);
    };
  }, []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    gsap.ticker.add(combineRefFn);
    return () => {
      gsap.ticker.remove(combineRefFn);
    };
  }, [combineRefFn]);

  useEffect(() => {
    if (!shouldRender) return;

    const onMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -((event.clientY / window.innerHeight) * 2 - 1);
      pointerRef.current.x = Math.max(-1, Math.min(1, x));
      pointerRef.current.y = Math.max(-1, Math.min(1, y));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
    };
  }, [shouldRender]);

  // Hide meshes on demand (e.g. when the user clicks the selected plane to close).
  useEffect(() => {
    if (!shouldRender) return;
    if (hideRequestId === undefined) return;

    gsap.to(baseOut.current, {
      v: 1,
      duration: 0.6,
      ease: "power3.in",
    });
  }, [hideRequestId, shouldRender]);

  // Animate in/out when opening/closing detail view.
  useEffect(() => {
    if (isActive) {
      setShouldRender(true);
      footerOut.current.v = 0;
      gsap.to(baseOut.current, {
        v: 0,
        duration: 0.95,
        ease: "power3.out",
      });
    } else {
      gsap.to(baseOut.current, {
        v: 1,
        duration: 0.75,
        ease: "power3.in",
        onComplete: () => {
          setShouldRender(false);
        },
      });
    }
  }, [isActive]);

  // Footer-driven exit (scrubbed) — starts later and eases out smoothly.
  useEffect(() => {
    if (!shouldRender || !isActive) return;

    const sentinel = document.getElementById(footerSentinelId);
    if (!sentinel) return;

    const scroller = document.querySelector(
      "[data-scene-scroll-root='true']",
    ) as HTMLElement | null;

    const trigger = ScrollTrigger.create({
      trigger: sentinel,
      scroller: scroller ?? undefined,
      start: "top bottom",
      end: "bottom bottom",
      scrub: 1.0,
      onUpdate: (self) => {
        footerOut.current.v = self.progress;
      },
      onLeaveBack: () => {
        footerOut.current.v = 0;
      },
    });

    return () => {
      trigger.kill();
      footerOut.current.v = 0;
    };
  }, [footerSentinelId, isActive, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2 }}>
      <Canvas
        style={{ pointerEvents: "none" }}
        dpr={[1, 2]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        camera={{ position: [0, 0, 20], fov: 40 }}
      >
        <ambientLight intensity={1.25} />
        <directionalLight position={[4, 6, 8]} intensity={2.2} />
        <Suspense fallback={null}>
          <FloatingMModels
            count={5}
            scaleMultiplier={0.22}
            attachToCamera={false}
            outProgressRef={outProgressRef}
            cacheKey="project-detail-floating-m"
            pointerRef={pointerRef}
            color={meshColor}
          />
        </Suspense>
      </Canvas>
    </div>
  );
});
