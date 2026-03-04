"use client";

import { memo, useMemo } from "react";
import type { ProjectDetailBlock } from "@/lib/projectImages";
import type { ProjectPopoverPayload } from "../UnderwaterProjectsCarousel";

type UnderwaterDetailBlock = Extract<
  ProjectDetailBlock,
  { type: "text" | "image" | "video" }
>;

function isUnderwaterDetailBlock(
  block: ProjectDetailBlock,
): block is UnderwaterDetailBlock {
  return block.type === "text" || block.type === "image" || block.type === "video";
}

export const UnderwaterDetailOverlay = memo(function UnderwaterDetailOverlay({
  isUnderwater,
  isInSpace,
  detailProjectPopover,
}: {
  isUnderwater: boolean;
  isInSpace: boolean;
  detailProjectPopover: ProjectPopoverPayload | null;
}) {
  const hasDetailProject = Boolean(detailProjectPopover);

  const detailBlocks = useMemo<UnderwaterDetailBlock[]>(() => {
    if (!detailProjectPopover) return [];

    if (
      detailProjectPopover.detailBlocks &&
      detailProjectPopover.detailBlocks.length > 0
    ) {
      return detailProjectPopover.detailBlocks.filter(isUnderwaterDetailBlock);
    }

    return [{ type: "text", content: detailProjectPopover.description }];
  }, [detailProjectPopover]);

  const keyedDetailBlocks = useMemo(() => {
    const seenKeys = new Map<string, number>();

    return detailBlocks.map((block) => {
      const baseKey =
        block.type === "text"
          ? `text-${block.content}`
          : `media-${block.type}-${block.src}`;
      const keyCount = seenKeys.get(baseKey) ?? 0;
      seenKeys.set(baseKey, keyCount + 1);

      return {
        block,
        key: keyCount === 0 ? baseKey : `${baseKey}-${keyCount}`,
      };
    });
  }, [detailBlocks]);

  if (!isUnderwater || isInSpace) return null;

  return (
    <>
      <div
        className="fixed pointer-events-none z-20"
        style={{
          left: "max(0vw, 0px)",
          right: 0,
          top: 0,
          bottom: 0,
          background: "rgba(224, 226, 238, 0.58)",
          backdropFilter: "blur(7px)",
          opacity: hasDetailProject ? 1 : 0,
          visibility: hasDetailProject ? "visible" : "hidden",
          transition: "opacity 0.28s ease, visibility 0.28s ease",
        }}
      />
      <aside
        className="fixed pointer-events-none z-30"
        style={{
          left: 0,
          top: 0,
          bottom: 0,
          width: "min(35vw, 470px)",
          background: "rgba(245, 245, 248, 0.98)",
          borderRight: "1px solid rgba(48, 56, 112, 0.12)",
          padding: "24px 24px 28px",
          overflow: "hidden",
          opacity: hasDetailProject ? 1 : 0,
          visibility: hasDetailProject ? "visible" : "hidden",
          transform: `translateX(${hasDetailProject ? "0px" : "-20px"})`,
          transition:
            "opacity 0.3s ease, transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.3s ease",
        }}
      >
        {detailProjectPopover && (
          <>
            <h3
              style={{
                margin: 0,
                color: "#8d97ff",
                fontFamily: "Mabry, sans-serif",
                fontSize: "22px",
                fontWeight: 400,
                letterSpacing: "0.01em",
                textTransform: "uppercase",
              }}
            >
              {detailProjectPopover.title}
            </h3>

            {keyedDetailBlocks.map(({ block, key }, index) => {
              if (block.type === "video") {
                return (
                  <div
                    key={key}
                    style={{
                      marginTop: index === 0 ? "28px" : "16px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: "1px solid rgba(22, 22, 34, 0.08)",
                    }}
                  >
                    <video
                      src={block.src}
                      autoPlay
                      muted
                      loop
                      playsInline
                      style={{
                        width: "100%",
                        height: `${block.height || 280}px`,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                );
              }

              if (block.type === "image") {
                return (
                  <div
                    key={key}
                    style={{
                      marginTop: index === 0 ? "28px" : "16px",
                      borderRadius: "8px",
                      overflow: "hidden",
                      border: "1px solid rgba(22, 22, 34, 0.08)",
                    }}
                  >
                    <img
                      src={block.src}
                      alt={`${detailProjectPopover.title} media ${index + 1}`}
                      style={{
                        width: "100%",
                        height: `${block.height || 220}px`,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                );
              }

              return (
                <p
                  key={key}
                  style={{
                    margin: index === 0 ? "28px 0 0" : "16px 0 0",
                    color: "#282b34",
                    fontFamily: "Mabry, sans-serif",
                    fontSize: "17px",
                    lineHeight: 1.45,
                    letterSpacing: "0.005em",
                  }}
                >
                  {block.content}
                </p>
              );
            })}
          </>
        )}
      </aside>
    </>
  );
});
