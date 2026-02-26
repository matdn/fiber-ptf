"use client";

import Image from "next/image";
import { memo } from "react";
import type { ProjectItem } from "@/lib/projectImages";

type Props = {
  project: ProjectItem;
  onClose: () => void;
};

// Static lorem blocks that simulate editorial depth
const LOREM_OVERVIEW =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque vehicula augue vel diam ornare, nec efficitur tortor commodo. Pellentesque habitant morbi tristique senectus et netus.";

const LOREM_SECTIONS = [
  {
    index: "01",
    label: "CONCEPT",
    heading: "Form follows signal",
    body: "Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae. Duis posuere augue vel urna luctus, quis euismod mi pretium. Curabitur viverra diam at nunc fermentum elementum.",
  },
  {
    index: "02",
    label: "PROCESS",
    heading: "Iterative by nature",
    body: "Fusce tincidunt nisl at libero fermentum, id ultrices risus consequat. Nullam sed libero ut nunc volutpat gravida nec non enim. Aenean eu metus quis libero ultrices auctor in sit amet lorem.",
  },
  {
    index: "03",
    label: "RESULT",
    heading: "Precision at scale",
    body: "Praesent ultrices risus id tortor egestas, ac facilisis felis interdum. Sed condimentum, metus ac venenatis condimentum, neque lacus viverra libero.",
  },
];

export const ProjectDetailView = memo(function ProjectDetailView({
  project,
  onClose,
}: Props) {
  // Separate media blocks from text-only blocks
  const mediaBlocks = project.detailBlocks.filter(
    (b) => b.type === "image" || b.type === "video",
  );
  const firstMedia = mediaBlocks[0] ?? null;

  return (
    <div className="w-full bg-white min-h-screen text-black" style={{ fontFamily: "inherit" }}>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-8 py-5 border-b border-black/10"
        style={{ fontSize: "0.72rem", letterSpacing: "0.15em" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="uppercase tracking-[0.18em] text-black/40 hover:text-black transition-colors"
          style={{ fontSize: "0.7rem" }}
        >
          ← Back
        </button>
        <span className="uppercase text-black/30">Work</span>
      </div>

      {/* ── Hero: large title + first media side-by-side ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[90vh]">

        {/* Left: editorial title block */}
        <div className="flex flex-col justify-between px-8 pt-16 pb-16">
          <div>
            {/* section tag */}
            <p
              className="uppercase text-black/30 mb-8"
              style={{ fontSize: "0.68rem", letterSpacing: "0.22em" }}
            >
              <span className="mr-3 text-black/20">01</span>PROJECT
            </p>

            {/* Main headline — fills width deliberately */}
            <h1
              className="font-light leading-[1.0] text-black mb-8"
              style={{ fontSize: "clamp(3.2rem, 7vw, 6.5rem)", letterSpacing: "-0.02em" }}
            >
              {project.title}
            </h1>

            {/* Sub-tags row */}
            <div
              className="flex flex-wrap gap-x-6 gap-y-1 text-black/30 mb-12"
              style={{ fontSize: "0.7rem", letterSpacing: "0.18em" }}
            >
              {["Design", "Motion", "3D", "Interactive"].map((tag, i) => (
                <span key={tag}>
                  <sup className="mr-0.5 text-black/20">{String(i + 1).padStart(2, "0")}</sup>
                  {tag.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {/* Overview text */}
          <div>
            <p
              className="text-black/50 leading-relaxed max-w-sm mb-6"
              style={{ fontSize: "0.82rem" }}
            >
              {project.description || LOREM_OVERVIEW}
            </p>
            <p
              className="text-black/30 leading-relaxed max-w-sm"
              style={{ fontSize: "0.82rem" }}
            >
              {LOREM_OVERVIEW}
            </p>
          </div>
        </div>

        {/* Right: first media — full-bleed */}
        <div className="relative bg-black/5 overflow-hidden">
          {firstMedia?.type === "video" && (
            <video
              src={firstMedia.src}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {firstMedia?.type === "image" && (
            <Image
              src={firstMedia.src}
              alt=""
              fill
              sizes="50vw"
              style={{ objectFit: "cover" }}
            />
          )}
          {!firstMedia && (
            <div className="absolute inset-0 bg-black/[0.04]" />
          )}
        </div>
      </div>

      {/* ── Numbered sections ───────────────────────────────────── */}
      <div className="border-t border-black/10">
        {LOREM_SECTIONS.map((sec) => (
          <div
            key={sec.index}
            className="grid grid-cols-[1fr_2fr] lg:grid-cols-[200px_1fr_1fr] border-b border-black/10 px-8 py-16 gap-8"
          >
            {/* Label */}
            <div className="flex flex-col gap-2">
              <span
                className="text-black/20"
                style={{ fontSize: "0.68rem", letterSpacing: "0.22em" }}
              >
                {sec.index}
              </span>
              <span
                className="uppercase text-black/50"
                style={{ fontSize: "0.68rem", letterSpacing: "0.22em" }}
              >
                {sec.label}
              </span>
            </div>

            {/* Heading */}
            <h2
              className="font-light leading-tight text-black self-start"
              style={{ fontSize: "clamp(1.6rem, 3vw, 2.6rem)", letterSpacing: "-0.01em" }}
            >
              {sec.heading}
            </h2>

            {/* Body copy */}
            <p
              className="text-black/50 leading-relaxed self-start hidden lg:block"
              style={{ fontSize: "0.82rem" }}
            >
              {sec.body}
            </p>
          </div>
        ))}
      </div>

      {/* ── Remaining media blocks ───────────────────────────────── */}
      {mediaBlocks.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {mediaBlocks.slice(1).map((block, i) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: stable index
              key={i}
              className="relative overflow-hidden"
              style={{ height: block.height ?? 440 }}
            >
              {block.type === "image" && (
                <Image
                  src={block.src}
                  alt=""
                  fill
                  sizes="50vw"
                  style={{ objectFit: "cover" }}
                />
              )}
              {block.type === "video" && (
                <video
                  src={block.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────── */}
      <div
        className="flex items-end justify-between px-8 pt-20 pb-12 border-t border-black/10"
      >
        <p
          className="uppercase text-black/20"
          style={{ fontSize: "0.68rem", letterSpacing: "0.22em" }}
        >
          {project.title}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="uppercase text-black/40 hover:text-black transition-colors"
          style={{ fontSize: "0.7rem", letterSpacing: "0.2em" }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
});
