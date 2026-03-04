"use client";

import { memo } from "react";
import type { ProjectPopoverPayload } from "../UnderwaterProjectsCarousel";

export const UnderwaterPreviewOverlay = memo(function UnderwaterPreviewOverlay({
  isUnderwater,
  isInSpace,
  activeProjectPreview,
  isProjectDetailView,
  onSwitchProject,
}: {
  isUnderwater: boolean;
  isInSpace: boolean;
  activeProjectPreview: ProjectPopoverPayload | null;
  isProjectDetailView: boolean;
  onSwitchProject?: () => void;
}) {
  if (!isUnderwater || isInSpace) return null;
  const canSwitchProject = isProjectDetailView && Boolean(onSwitchProject);

  return (
    <div
      
      className={`fixed z-30 ${canSwitchProject ? "pointer-events-auto" : "pointer-events-none"}`}
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
        <button
          type="button"
          onClick={onSwitchProject}
          disabled={!canSwitchProject}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.8rem",
            padding: "0.4rem",
            textAlign: "left",
            width: "100%",
            borderRadius: "0.5rem",
            border: "1px solid rgba(200,200,200, 0.65)",
            background: "rgba(255, 255, 255, 0.5)",
            boxShadow: "0 8px 20px rgba(16, 22, 48, 0.14)",
            minWidth: "230px",
            backdropFilter: "blur(4px)",
            cursor: canSwitchProject ? "pointer" : "default",
          }}
        >
          <img
            src={activeProjectPreview.imageUrl}
            alt={activeProjectPreview.title}
            width={48}
            height={38}
            style={{
              width: "48px",
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
            {!canSwitchProject && activeProjectPreview.title }
          </span>
          {canSwitchProject && (
            <span
              style={{
                fontFamily: "Mabry, sans-serif",
                color: "#ffffff",
                mixBlendMode: "difference",
                fontSize: "12px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                
              }}
            >
              Projet suivant
            </span>
          )}
        </button>
      )}
    </div>
  );
});
