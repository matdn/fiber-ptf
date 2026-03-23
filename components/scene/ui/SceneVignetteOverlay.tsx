"use client";

import { memo } from "react";

// Colors keyed by slot index: 0=morning, 1=middleday, 2=sunset, 3=night
const VIGNETTE_COLORS: Record<number, [string, number]> = {
  0: ["218, 251, 255", 0.1],  // morning  → violet pastel, très léger
  1: ["255, 240, 180", 0.1],  // middleday → jaune doux, quasi invisible
  2: ["255, 160, 180", 0.1],  // sunset   → rose pêche léger
  3: ["0, 0, 0",       1.0],  // night    → noir plein
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
  const [rgb, strength] = hdriSlotIndex !== undefined
    ? (VIGNETTE_COLORS[hdriSlotIndex] ?? VIGNETTE_COLORS[3])
    : VIGNETTE_COLORS[3];

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
