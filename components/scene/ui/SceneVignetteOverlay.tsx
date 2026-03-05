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
          ? "radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 26%, rgba(0, 0, 0, 0.28) 48%, rgba(0, 0, 0, 0.68) 68%, rgba(0, 0, 0, 0.92) 84%, rgba(0, 0, 0, 1) 100%)"
          : "none",
        zIndex: 30,
        opacity: isUnderwater ? 0 : 1,
        transition: "opacity 0.5s ease-out",
      }}
    />
  );
});
