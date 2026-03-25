"use client";

import { memo } from "react";
import { TIME_SLOTS } from "@/lib/hdriSlots";

// Colors keyed by slot name
const VIGNETTE_COLORS: Record<string, [string, number]> = {
  morning:   ["218, 251, 255", 0.1],
  middleday: ["255, 240, 180", 0.1],
  sunset:    ["255, 160, 180", 0.1],
  night:     ["0, 0, 0",       1.0],
};

function buildVignette(rgb: string, strength: number) {
  const s = strength;
  return `radial-gradient(ellipse at center, rgba(${rgb}, 0) 26%, rgba(${rgb}, ${(0.22 * s).toFixed(2)}) 48%, rgba(${rgb}, ${(0.55 * s).toFixed(2)}) 68%, rgba(${rgb}, ${(0.82 * s).toFixed(2)}) 84%, rgba(${rgb}, ${s.toFixed(2)}) 100%)`;
}

export const SceneVignetteOverlay = memo(function SceneVignetteOverlay({
  isUnderwater,
  hdriSlotIndex,
}: {
  isUnderwater: boolean;
  hdriSlotIndex?: number;
}) {
  const slotName = hdriSlotIndex !== undefined ? (TIME_SLOTS[hdriSlotIndex]?.name ?? 'night') : 'night'
  const [rgb, strength] = VIGNETTE_COLORS[slotName] ?? VIGNETTE_COLORS['night'];

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: !isUnderwater ? buildVignette(rgb, strength) : "none",
        zIndex: 30,
        opacity: isUnderwater ? 0 : 1,
        transition: "opacity 0.5s ease-out, background 1.5s ease",
      }}
    />
  );
});
