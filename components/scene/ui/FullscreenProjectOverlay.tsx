"use client";

import Image from "next/image";
import { memo, useEffect } from "react";
import type { FullscreenProjectPayload } from "../UnderwaterProjectsCarousel";

export const FullscreenProjectOverlay = memo(function FullscreenProjectOverlay({
  project,
  onClose,
}: {
  project: FullscreenProjectPayload | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!project) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [project, onClose]);

  if (!project) return null;

  return (
    <button
      type="button"
      className="fixed inset-0 z-40 cursor-zoom-out"
      style={{
        opacity: 1,
        transition: "opacity 0.3s ease",
        background: "#000",
        border: "none",
        padding: 0,
      }}
      onClick={onClose}
      aria-label={`Close ${project.title} fullscreen`}
    >
      <Image
        src={project.imageUrl}
        alt={project.title}
        fill
        sizes="100vw"
        priority
        style={{
          objectFit: "cover",
          display: "block",
        }}
      />
    </button>
  );
});
