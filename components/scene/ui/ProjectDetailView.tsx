"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { memo, useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import type { ProjectItem } from "@/lib/projectImages";
import { ProjectDetailFooter } from "./ProjectDetailFooter";

// ── Switch theme here ──────────────────────────────────────────────────────
const THEME: "light" | "dark" = "dark";

const T = {
  light: {
    panel:        "#fefefe",
    backdrop:     "rgba(0,0,0,0.1)",
    textPrimary:  "#000000",
    textMuted:    "rgba(0,0,0,0.38)",
    titleLabel:   "rgba(0,0,0,1)",
    mediaBg:      "rgba(0,0,0,0.04)",
    ctaBg:        "#000000",
    ctaText:      "#ffffff",
    featureHeading: "#000",
  },
  dark: {
    panel:        "#111111",
    backdrop:     "rgba(0,0,0,0.7)",
    textPrimary:  "#f0f0f0",
    textMuted:    "rgba(255,255,255,0.38)",
    titleLabel:   "rgba(255,255,255,0.9)",
    mediaBg:      "rgba(255,255,255,0.04)",
    ctaBg:        "#ffffff",
    ctaText:      "#000000",
    featureHeading: "#f0f0f0",
  },
} as const;

const C = T[THEME];

type Props = {
  project: ProjectItem | null;
  onClose: () => void;
};

export const ProjectDetailView = memo(function ProjectDetailView({
  project,
  onClose,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [displayedProject, setDisplayedProject] = useState<ProjectItem | null>(null);

  useEffect(() => {
    if (project) {
      setDisplayedProject(project);
      setMounted(true);
    }
  }, [project]);

  // Entrance animation — useLayoutEffect to set initial position before paint
  useLayoutEffect(() => {
    if (!mounted || !panelRef.current) return;
    // Set initial states synchronously before browser paints
    gsap.set(backdropRef.current, { opacity: 0 });
    gsap.set(panelRef.current, { y: "60%" });
    // Then animate
    gsap.to(backdropRef.current, { opacity: 1, duration: 0.8, ease: "power2.out" });
    gsap.to(panelRef.current, { y: "0vh", duration: 0.75, ease: "expo.out" });
  }, [mounted]);

  const animateOut = useCallback((then: () => void) => {
    if (!panelRef.current) { then(); return; }
    gsap.to(backdropRef.current, { opacity: 0, duration: 0.4, ease: "power2.in" });
    gsap.to(panelRef.current, {
      y: "60%",
      duration: 0.45,
      ease: "expo.in",
      onComplete: then,
    });
  }, []);

  const handleClose = useCallback(() => {
    animateOut(() => {
      setMounted(false);
      onClose();
    });
  }, [animateOut, onClose]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, handleClose]);

  // GSAP scroll-reveal animations
  useEffect(() => {
    if (!scrollRef.current || !displayedProject) return;
    const currentProjectTitle = displayedProject.title;
    const scrollRoot = scrollRef.current;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-pdv-hero-title]",
        { autoAlpha: 0, y: 36 },
        { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.32, ease: "power3.out" },
      );
      gsap.fromTo(
        "[data-pdv-hero-copy]",
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.75, delay: 0.4, ease: "power3.out" },
      );
      gsap.fromTo(
        "[data-pdv-tags]",
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.7, delay: 0.48, ease: "power3.out" },
      );
      gsap.fromTo(
        "[data-pdv-hero-media]",
        { autoAlpha: 0, scale: 1.04 },
        { autoAlpha: 1, scale: 1, duration: 1.1, delay: 0.18, ease: "power2.out" },
      );

      const revealTargets = gsap.utils.toArray<HTMLElement>("[data-pdv-animate]");
      revealTargets.forEach((target, index) => {
        gsap.fromTo(
          target,
          { autoAlpha: 0, y: 48 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: target,
              scroller: scrollRoot,
              id: `pdv-${currentProjectTitle}-${index}`,
              start: "top 86%",
              once: true,
            },
          },
        );
      });
    }, scrollRef);

    return () => { ctx.revert(); };
  }, [displayedProject]);

  if (!mounted || !displayedProject) return null;

  const mediaBlocks = displayedProject.detailBlocks.filter(
    (b) => b.type === "image" || b.type === "video",
  );
  const heroMedia   = mediaBlocks[0] ?? null;
  const galleryMedia = mediaBlocks.slice(1);

  return (
    <div
      ref={overlayRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      {/* Backdrop */}
      <button
        ref={backdropRef}
        type="button"
        style={{
          position: "absolute",
          inset: 0,
          background: C.backdrop,
          border: "none",
          cursor: "default",
          pointerEvents: "auto",
          opacity: 0,
        }}
        onClick={handleClose}
        aria-label="Fermer"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        style={{
          position: "relative",
          width: "90vw",
          height: "90vh",
          // borderRadius: "1rem",
          background: C.panel,
          display: "flex",
          flexDirection: "column",
          pointerEvents: "auto",
          boxShadow: "0 24px 72px rgba(0,0,0,0.22)",
          willChange: "transform",
        }}
      >
        {/* Close button */}
        {/* <button
          type="button"
          onClick={handleClose}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: "1rem",
            right: "1.2rem",
            zIndex: 10,
            width: "2rem",
            height: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.07)",
            border: "none",
            borderRadius: "50%",
            cursor: "pointer",
            fontSize: "0.9rem",
            color: "#1a1a1a",
          }}
        >
          ✕
        </button> */}

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          data-scene-scroll-root="true"
          className="pdv-scroll"
          style={{ overflowY: "auto", flex: 1, position: "relative" }}
        >

      <div style={{ position: "relative", background: C.panel, paddingTop: "3dvh" }}>

        {/* ── Hero: split (text left / video right) ───────────────── */}
        <section style={{ padding: "1rem 1.5rem 0", display: "flex", justifyContent: "center" }}>
          <div
            className="flex flex-col-reverse md:flex md:justify-between md:flex-row h-[80dvh]"
            style={{ gap: "3rem", alignItems: "stretch", fontFamily: "Neopixel, sans-serif", maxWidth: "95%" }}
          >
            <div className="flex flex-col w-full md:w-1/2" style={{ minHeight: "40vh" }}>
              <p
                style={{
                  fontSize: "0.95rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: C.titleLabel,
                  paddingTop: "0.4rem",
                  fontWeight: 800,
                  transform: "translateY(50px)",
                }}
              >
              {displayedProject.title}
            </p>

              <div style={{ flex: 1 }} />

              <h1
                data-pdv-hero-title
                style={{
                  fontSize: "clamp(1.1rem, 3.2vw, 2.1rem)",
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.12,
                  color: C.textPrimary,
                  marginBottom: "1.4rem",
                }}
              >
                {displayedProject.description}
              </h1>

              {displayedProject.detailBlocks
                .filter((b) => b.type === "text")
                .slice(0, 1)
                .map((b, i) =>
                  b.type === "text" ? (
                    <p
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable index
                      key={i}
                      data-pdv-hero-copy
                      style={{
                        fontSize: "0.8rem",
                        lineHeight: 1.82,
                        color: C.textMuted,
                        fontFamily: '"Mabry Pro", sans-serif',

                      }}
                    >
                      {b.content}
                    </p>
                  ) : null,
                )}

              {displayedProject.projectUrl && (
                <div style={{ paddingTop: "1.5rem" }}>
                  <a
                    href={displayedProject.projectUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.9rem 1.2rem",
                      borderRadius: "0px",
                      background: C.ctaBg,
                      color: C.ctaText,
                      fontSize: "0.72rem",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                    }}
                  >
                    Voir le projet
                  </a>
                </div>
              )}

              {/* {project.tags && project.tags.length > 0 && (
                <div
                  data-pdv-tags
                  className="flex flex-wrap gap-2"
                  style={{ paddingTop: "1.2rem" }}
                >
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: "0.3rem 0.8rem",
                        borderRadius: "999px",
                        border: "1px solid rgba(0,0,0,0.12)",
                        fontSize: "0.62rem",
                        letterSpacing: "0.08em",
                        color: "rgba(0,0,0,0.4)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )} */}
            </div>

            <div
              data-pdv-hero-media
              className="relative overflow-hidden md:w-1/2"
              style={{
                height: "80vh",
                background: C.mediaBg,
                borderRadius: "0px",
              }}
            >
              {heroMedia?.type === "video" ? (
                <video
                  src={heroMedia.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                  className="absolute inset-0 w-full h-full object-cover scale-105"
                />
              ) : heroMedia?.type === "image" ? (
                <Image
                  src={heroMedia.src}
                  alt=""
                  fill
                  sizes="45vw"
                  draggable={false}
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <Image
                  src={displayedProject.imageUrl}
                  alt=""
                  fill
                  sizes="45vw"
                  draggable={false}
                  style={{ objectFit: "cover" }}
                />
              )}
            </div>
          </div>
        </section>

        <div style={{ height: "clamp(2rem, 4vw, 4rem)" }} />

        {/* ── Gallery grid ──────────────────────────────────── */}
        {galleryMedia.length > 0 && (
          <div  style={{ padding: "0 2.5rem 2.5rem" }}>
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "0.6rem" }}>
              {galleryMedia.map((block, i) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable index
                  key={i}
                  className="relative overflow-hidden"
                  style={{
                    height: "400px",
                    background: C.mediaBg,
                  }}
                >
                  {block.type === "video" ? (
                    <video src={block.src} autoPlay muted loop playsInline draggable={false} onDragStart={(event) => event.preventDefault()} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <Image src={block.src} alt="" fill draggable={false} style={{ objectFit: "cover" }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Feature-grid blocks ──────────────────────────────────── */}
        {displayedProject.detailBlocks
          .filter((b) => b.type === "feature-grid")
          .map((block, i) => {
            if (block.type !== "feature-grid") return null;
            return (
              <section
                // biome-ignore lint/suspicious/noArrayIndexKey: stable index
                key={i}
                style={{ padding: "3rem 2.5rem 2.5rem" }}
              >
                <h2
                  style={{
                    fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
                    fontWeight: 200,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.1,
                    color: C.featureHeading,
                    maxWidth: "26ch",
                    marginBottom: "2rem",
                    textTransform: "uppercase",
                  }}
                >
                  {block.heading}
                </h2>
                <div style={{display: "flex", flexDirection: "column", gap: "2rem", marginBottom: "0.6rem" }}>
                  <div className="relative overflow-hidden" style={{ height: "80dvh", borderRadius: "0px" }}>
                    <video src={block.videoSrc} autoPlay muted loop playsInline draggable={false} onDragStart={(event) => event.preventDefault()} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <div className="relative overflow-hidden" style={{ height: "80dvh", borderRadius: "0px" }}>
                    <Image src={block.imageSrc} alt="" fill sizes="45vw" draggable={false} style={{ objectFit: "cover" }} />
                  </div>
                </div>
                {/* <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: "0.6rem" }}>
                  {block.paragraphs.map((p, pi) => (
                    <p
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable index
                      key={pi}
                      style={{
                        fontSize: "0.78rem",
                        lineHeight: 1.8,
                        color: "rgba(0,0,0,0.35)",
                        padding: "1.4rem",
                        border: "1px solid rgba(0,0,0,0.07)",
                        borderRadius: "0px",
                      }}
                    >
                      {p}
                    </p>
                  ))}
                </div> */}
              </section>
            );
          })}
               <ProjectDetailFooter />

      </div>

        </div>
      </div>
     
    </div>
  );
});
