"use client";

import { memo } from "react";
import type { ProjectPopoverPayload } from "../UnderwaterProjectsCarousel";

export const UnderwaterPreviewOverlay = memo(function UnderwaterPreviewOverlay({
  isUnderwater,
  isInSpace,
  activeProjectPreview,
}: {
  isUnderwater: boolean;
  isInSpace: boolean;
  activeProjectPreview: ProjectPopoverPayload | null;
}) {
  if (!isUnderwater || isInSpace) return null;

  return (
    <div
      className="fixed pointer-events-none z-30"
      style={{
        left: "50%",
        bottom: "34px",
        transform: `translate(-50%, ${activeProjectPreview ? "0px" : "10px"})`,
        opacity: activeProjectPreview ? 1 : 0,
        visibility: activeProjectPreview ? "visible" : "hidden",
        transition:
          "opacity 0.28s ease, transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.28s ease",
      }}
    >
      {activeProjectPreview && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.8rem",
            padding: "0.55rem 0.9rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(144, 148, 255, 0.65)",
            background: "rgba(244, 246, 255, 0.96)",
            boxShadow: "0 8px 20px rgba(16, 22, 48, 0.14)",
            minWidth: "230px",
          }}
        >
          <img
            src={activeProjectPreview.imageUrl}
            alt={activeProjectPreview.title}
            width={38}
            height={38}
            style={{
              width: "38px",
              height: "38px",
              objectFit: "cover",
              borderRadius: "0.35rem",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: "Mabry, sans-serif",
              color: "#1d1f2c",
              fontSize: "13px",
              lineHeight: 1.2,
              letterSpacing: "0.01em",
              textTransform: "uppercase",
            }}
          >
            {activeProjectPreview.title}
          </span>
        </div>
      )}
    </div>
  );
});
