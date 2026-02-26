"use client";

import { useEffect } from "react";

export function useSpaceTextMask({
  isInSpace,
  textMaskRef,
}: {
  isInSpace: boolean;
  textMaskRef: React.RefObject<HTMLDivElement | null>;
}) {
  useEffect(() => {
    if (!isInSpace) return;

    const target = textMaskRef.current;
    if (!target) return;

    const minSize = 180;
    const maxSize = 420;
    const lerpFactor = 0.06;
    let currentX = -9999;
    let currentY = -9999;
    let currentSize = minSize;
    let targetX = -9999;
    let targetY = -9999;
    let targetSize = minSize;
    let rafId = 0;

    const setHidden = () => {
      targetX = -9999;
      targetY = -9999;
      targetSize = minSize;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const clampedX = Math.max(0, Math.min(rect.width, x));
      const clampedY = Math.max(0, Math.min(rect.height, y));
      const normX = clampedX / rect.width;
      const normY = clampedY / rect.height;
      const leftProximity = 1 - normX;
      const bottomProximity = normY;
      const proximityToBottomLeft = (leftProximity * bottomProximity) ** 0.6;
      const size = minSize + (maxSize - minSize) * proximityToBottomLeft;

      targetX = x;
      targetY = y;
      targetSize = size;
    };

    const animate = () => {
      currentX += (targetX - currentX) * lerpFactor;
      currentY += (targetY - currentY) * lerpFactor;
      currentSize += (targetSize - currentSize) * lerpFactor;

      target.style.setProperty("--mask-x", `${currentX}px`);
      target.style.setProperty("--mask-y", `${currentY}px`);
      target.style.setProperty("--mask-size", `${currentSize}px`);

      rafId = requestAnimationFrame(animate);
    };

    setHidden();
    rafId = requestAnimationFrame(animate);

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("blur", setHidden);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", setHidden);
    };
  }, [isInSpace, textMaskRef]);
}
