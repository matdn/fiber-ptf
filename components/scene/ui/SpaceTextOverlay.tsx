"use client";

import { memo } from "react";

const OVERLAY_LINES = [
  { text: "gobelins student", weight: 300 },
  { text: "freelancer", weight: 300 },
  { text: "creative developer", weight: 300 },
] as const;

const OVERLAY_TEXT_STYLE: React.CSSProperties = {
  fontFamily: '"Mabry Pro", sans-serif',
  fontSize: "clamp(4rem, 6vw, 6rem)",
  letterSpacing: "-0.04em",
  lineHeight: 0.8,
  color: "#ffffff",
  textAlign: "center",
  paddingTop: "2.5rem",
};

const renderOverlayLines = () =>
  OVERLAY_LINES.map((line) => (
    <h2
      key={line.text}
      style={{ ...OVERLAY_TEXT_STYLE, fontWeight: line.weight }}
      className="text-white text-4xl"
    >
      {line.text}
    </h2>
  ));

export const SpaceTextOverlay = memo(function SpaceTextOverlay({
  isInSpace,
  textMaskRef,
}: {
  isInSpace: boolean;
  textMaskRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!isInSpace) return null;

  return (
    <div className="fixed bottom-[10dvh] left-[10dvh] w-full h-dvh pointer-events-none mix-blend-difference">
      <div
        className="absolute inset-0 uppercase flex items-start flex-col justify-end gap-0 mix-blend-difference"
        style={{ opacity: 0.02 }}
      >
        {renderOverlayLines()}
      </div>
      <div
        ref={textMaskRef}
        className="absolute inset-0 uppercase flex items-start flex-col justify-end gap-0 mix-blend-difference"
        style={{
          WebkitMaskImage:
            "radial-gradient(circle var(--mask-size) at var(--mask-x) var(--mask-y), #ffffff 0%, transparent 70%)",
          WebkitMaskRepeat: "no-repeat",
          maskImage:
            "radial-gradient(circle var(--mask-size) at var(--mask-x) var(--mask-y), #ffffff 0%, transparent 70%)",
          maskRepeat: "no-repeat",
        }}
      >
        {renderOverlayLines()}
      </div>
    </div>
  );
});
