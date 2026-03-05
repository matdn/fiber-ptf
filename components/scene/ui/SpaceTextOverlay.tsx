"use client";

import { memo, useEffect, useRef, useState } from "react";
import gsap from "gsap";

const OVERLAY_LINES = [
  {
    text: "gobelins student",
    weight: 300,
    description: [
      "Currently pursuing a Master's in interaction",
      "design & creative technologies at l'École des Gobelins in Paris",
      "exploring the intersection of code, motion and digital craft.",
    ],
  },
  {
    text: "freelancer",
    weight: 300,
    description: [
      "Available for freelance missions",
      "from interactive web experiences to creative direction.",
      "Let's build something unusual together.",
    ],
  },
  {
    text: "creative developer",
    weight: 300,
    description: [
      "I write code that moves, reacts and surprises.",
      "Specialised in WebGL, TSL and Three.js and immersive front-end experiences",
      "where design meets technology.",
    ],
  },
] satisfies ReadonlyArray<{
  text: string;
  weight: number;
  description: readonly string[];
}>;

type OverlayText = (typeof OVERLAY_LINES)[number]["text"] | null;

const OVERLAY_TEXT_STYLE: React.CSSProperties = {
  fontFamily: '"Mabry Pro", sans-serif',
  fontSize: "clamp(3rem, 5vw, 5rem)",
  letterSpacing: "-0.04em",
  lineHeight: 0.8,
  color: "#ffffff",
  textAlign: "center",
};

const OVERLAY_TEXT_STYLE_HOVER: React.CSSProperties = {
  fontSize: "clamp(4.12rem, 6.18vw, 6.18rem)",
};

export const SpaceTextOverlay = memo(function SpaceTextOverlay({
  isInSpace,
  textMaskRef,
}: {
  isInSpace: boolean;
  textMaskRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [hoveredText, setHoveredText] = useState<OverlayText>(null);
  // hit-detection refs (ghost layer h2)
  const lineRefs = useRef<(HTMLElement | null)[]>([]);
  // ghost wrapper divs — for opacity + y entrance
  const ghostWrapperRefs = useRef<(HTMLElement | null)[]>([]);
  // mask layer h2s — for y slide inside overflow:hidden
  const animMaskRefs = useRef<(HTMLElement | null)[]>([]);
  const descriptionLineRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (!isInSpace) return;

    const wrappers = ghostWrapperRefs.current.filter(Boolean) as HTMLElement[];
    const masks = animMaskRefs.current.filter(Boolean) as HTMLElement[];

    // start state
    gsap.set(wrappers, { opacity: 0, y: 40 });
    gsap.set(masks, { y: "110%" });

    wrappers.forEach((wrapper, i) => {
      const delay = 0.15 + i * 0.3;

      // Ghost: slide up + opacity spike then settle to 0.02
      gsap.to(wrapper, {
        y: 0,
        opacity: 0.6,
        duration: 0.7,
        ease: "power3.out",
        delay,
        onComplete: () => {
          gsap.to(wrapper, { opacity: 0.02, duration: 0.8, ease: "power2.out" });
        },
      });

      // Mask: clip slide up
      if (masks[i]) {
        gsap.to(masks[i], {
          y: "0%",
          duration: 0.7,
          ease: "power3.out",
          delay,
        });
      }
    });

    return () => {
      gsap.killTweensOf([...wrappers, ...masks]);
    };
  }, [isInSpace]);

  useEffect(() => {
    if (!isInSpace) return;

    const active = OVERLAY_LINES.find((l) => l.text === hoveredText);
    if (!active) return;

    const nodes = descriptionLineRefs.current.filter(Boolean) as HTMLElement[];
    if (nodes.length === 0) return;

    const hoverDelay = 1;
    gsap.killTweensOf(nodes);
    gsap.set(nodes, { opacity: 0, y: 10 });

    const delayed = gsap.delayedCall(hoverDelay, () => {
      gsap.to(nodes, {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: "power3.out",
        stagger: 0.2,
      });
    });

    return () => {
      delayed.kill();
      gsap.killTweensOf(nodes);
    };
  }, [hoveredText, isInSpace]);

  useEffect(() => {
    if (!isInSpace) return;

    const handlePointerMove = (e: PointerEvent) => {
      const matched = OVERLAY_LINES.findIndex((_, i) => {
        const el = lineRefs.current[i];
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        );
      });
      setHoveredText(matched === -1 ? null : OVERLAY_LINES[matched].text);
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [isInSpace]);

  if (!isInSpace) return null;

  const activeDescription =
    OVERLAY_LINES.find((l) => l.text === hoveredText)?.description ?? null;

  const activeDescriptionLines = activeDescription;

  const renderOverlayLines = () =>
    OVERLAY_LINES.map((line, i) => (
      <div key={line.text} style={{ overflow: "hidden", paddingTop: "2.5rem" }}>
        <h2
          ref={(el) => { animMaskRefs.current[i] = el; }}
          className="text-white text-4xl"
          aria-label={line.text}
          data-overlay-line={line.text}
          data-hovered={hoveredText === line.text ? "true" : "false"}
          style={{
            ...OVERLAY_TEXT_STYLE,
            ...(hoveredText === line.text ? OVERLAY_TEXT_STYLE_HOVER : null),
            fontWeight: line.weight,
            transition: "font-size 0.22s ease",
          }}
        >
          {line.text}
        </h2>
      </div>
    ));

  const renderGhostLines = () =>
    OVERLAY_LINES.map((line, i) => (
      <div
        key={line.text}
        ref={(el) => { ghostWrapperRefs.current[i] = el; }}
        style={{ paddingTop: "2.5rem" }}
      >
        <h2
          ref={(el) => { lineRefs.current[i] = el; }}
          style={{
            ...OVERLAY_TEXT_STYLE,
            ...(hoveredText === line.text ? OVERLAY_TEXT_STYLE_HOVER : null),
            fontWeight: line.weight,
            transition: "font-size 0.22s ease",
          }}
          className="text-white text-4xl"
          aria-hidden="true"
        >
          {line.text}
        </h2>
      </div>
    ));

  return (
    <>
      <div
        className="fixed bottom-[65dvh] left-[6vw] w-[28rem] pointer-events-none mix-blend-difference z-50"
        style={{
          opacity: activeDescription ? 1 : 0,
          transform: activeDescription ? "translateY(20dvh)" : "translateY(5dvh)",
          transition: "opacity 0.35s ease, transform 0.35s ease",
        }}
      >
        <div
          style={{
            fontFamily: '"Mabry Pro", sans-serif',
            fontSize: "clamp(0.95rem, 1.5vw, 0.975rem)",
            letterSpacing: "0.01em",
            lineHeight: 1.55,
            color: "#ffffff",
            opacity: 1,
            fontWeight: 300,
          }}
        >
          {activeDescriptionLines?.map((line, index) => (
            <p
              // biome-ignore lint/suspicious/noArrayIndexKey: stable small list per hovered item
              key={index}
              ref={(el) => {
                descriptionLineRefs.current[index] = el;
              }}
              style={{ margin: 0 }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>

      <div className="fixed bottom-[10dvh] left-[10dvh] w-full h-dvh pointer-events-none mix-blend-difference">
        <div
          className="absolute inset-0 uppercase flex items-start flex-col justify-end gap-0 mix-blend-difference"
        >
          {renderGhostLines()}
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
    </>
  );
});
