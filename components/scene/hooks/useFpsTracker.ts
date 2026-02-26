"use client";

import { useEffect } from "react";

export function useFpsTracker(fpsTrackerRef: React.MutableRefObject<number[]>) {
  useEffect(() => {
    let lastTime = performance.now();
    let rafId = 0;

    const trackFps = () => {
      const now = performance.now();
      const deltaTime = now - lastTime;
      lastTime = now;

      if (deltaTime > 0) {
        const fps = 1000 / deltaTime;
        fpsTrackerRef.current.push(fps);
        if (fpsTrackerRef.current.length > 30) {
          fpsTrackerRef.current.shift();
        }
      }

      rafId = requestAnimationFrame(trackFps);
    };

    rafId = requestAnimationFrame(trackFps);

    return () => cancelAnimationFrame(rafId);
  }, [fpsTrackerRef]);
}
