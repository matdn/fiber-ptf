"use client";

import { memo } from "react";

export const SceneVignetteOverlay = memo(function SceneVignetteOverlay({
  isUnderwater,
}: {
  isUnderwater: boolean;
}) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: !isUnderwater
          ? "radial-gradient(circle at center, transparent 60%, #000000 100%)"
          : "none",
        opacity: isUnderwater ? 0 : 1,
        transition: "opacity 0.5s ease-out",
      }}
    />
  );
});
