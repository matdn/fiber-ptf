"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import gsap from "gsap";
import type { ProjectItem } from "@/lib/projectImages";



// ─── Main overlay ─────────────────────────────────────────────────────────────
export type ProjectDetailV2Props = {
  project: ProjectItem | null;
  onClose: () => void;
};

export function ProjectDetailV2({ project, onClose }: ProjectDetailV2Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const videoCardRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [displayedProject, setDisplayedProject] = useState<ProjectItem | null>(null);

  useEffect(() => {
    if (project) {
      setDisplayedProject(project);
      setMounted(true);
    }
  }, [project]);

  useEffect(() => {
    if (!mounted || !panelRef.current) return;

    const ctx = gsap.context(() => {
      // Backdrop: fade in progressively
      gsap.fromTo(backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1.1, ease: "power2.out" },
      );

      // Panel: slides in from the right
      gsap.fromTo(panelRef.current,
        { x: "100%" },
        { x: "0%", duration: 1.0, ease: "expo.out" },
      );

      // Video card: slides in from behind the right panel
      if (videoCardRef.current) {
        const startX = window.innerWidth;
        gsap.fromTo(videoCardRef.current,
          { x: startX },
          { x: 0, duration: 1.1, delay: 0.12, ease: "expo.out" },
        );
      }
    });

    return () => ctx.revert();
  }, [mounted]);

  const animateOut = useCallback((then: () => void) => {
    if (!panelRef.current) { then(); return; }
    // Backdrop: fade out
    gsap.to(backdropRef.current, { opacity: 0, duration: 0.55, ease: "power2.in" });
    // Panel: slides back out to the right
    gsap.to(panelRef.current, {
      x: "100%",
      duration: 0.65,
      ease: "expo.in",
      onComplete: then,
    });
    if (videoCardRef.current) {
      gsap.to(videoCardRef.current, {
        x: window.innerWidth,
        duration: 0.55,
        ease: "expo.in",
      });
    }
  }, []);

  const handleClose = useCallback(() => {
    animateOut(() => {
      setMounted(false);
      setDisplayedProject(null);
      onClose();
    });
  }, [animateOut, onClose]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, handleClose]);

  if (!mounted || !displayedProject) return null;

  const p = displayedProject;
  const textBlock = p.detailBlocks.find((b) => b.type === "text");
  const descriptionText = textBlock?.type === "text" ? textBlock.content : null;
  const category = p.tags?.[0] ?? "";
  const stackTags = p.tags?.slice(1) ?? [];
  const videoBlock = p.detailBlocks.find((b) => b.type === "video");
  const videoSrc = p.detailVideoUrl ?? (videoBlock?.type === "video" ? videoBlock.src : null);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0"
      style={{ zIndex: 50, pointerEvents: "none" }}
    >
      {/* Opaque progressive backdrop — no blur, click to close */}
      <button
        ref={backdropRef}
        type="button"
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", border: "none", cursor: "default", pointerEvents: "auto", opacity: 0 }}
        onClick={handleClose}
        aria-label="Fermer"
      />

      {/* Floating video card: outside and to the left of the panel */}
      <div
        ref={videoCardRef}
        style={{
          position: "absolute",
          right: "calc(clamp(340px, 40%, 540px) + 1.8rem)",
          top: "32%",
          transform: "translateY(-50%)",
          width: "60%",
          height: "60%",
          borderRadius: "1rem",
          overflow: "hidden",
          boxShadow: "0 20px 56px rgba(0,0,0,0.26)",
          pointerEvents: "none",
        }}
      >
        {videoSrc ? (
          <video
            src={videoSrc}
            autoPlay
            muted
            loop
            playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <Image
            src={p.imageUrl}
            alt={p.title}
            fill
            sizes="100%"
            priority
            style={{ objectFit: "cover", filter: "none" }}
          />
        )}
        <div style={{ position: "absolute", inset: 0, background: "rgba(8,12,16,0.30)", pointerEvents: "none" }} />
        {/* <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: [
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "56px 56px",
            pointerEvents: "none",
          }}
        /> */}
      </div>

      {/* Right panel: anchored to right edge */}
      <div
        ref={panelRef}
        style={{
          position: "absolute",
          top: "1rem",
          borderRadius: "1rem",
          right: "1rem",
          bottom: 0,
          width: "clamp(340px, 40%, 540px)",
          background: "#161616",
          overflowY: "auto",
          padding: "3rem 2.8rem 3rem",
          display: "flex",
          flexDirection: "column",
          pointerEvents: "auto",
          boxShadow: "-12px 0 48px rgba(0,0,0,0.12)",
        }}
      >
        {/* Category tag */}
        {category && (
          <div data-panel-item style={{ marginBottom: "1.6rem" }}>
            <span style={{
              display: "inline-block",
              padding: "0.3rem 0.75rem",
              borderRadius: "2rem",
              background: "rgba(255,255,255,0.1)",
              fontSize: "0.65rem",
              letterSpacing: "0.11em",
              textTransform: "uppercase",
              fontFamily: "Mabry Pro, Neopixel, sans-serif",
              color: "rgba(255,255,255,0.55)",
              fontWeight: 600,
            }}>
              {category}
            </span>
          </div>
        )}

        {/* Title */}
        <h2 data-panel-item style={{
          fontSize: "clamp(2.2rem, 3.5vw, 3.4rem)",
          fontFamily: "Mabry Pro,sans-serif",
          fontWeight: 400,
          letterSpacing: "-0.025em",
          lineHeight: 1.05,
          color: "#f0f0f0",
        }}>
          {p.title}
        </h2>

        {/* Tagline */}
        <p data-panel-item style={{
          fontSize: "0.9rem",
          fontFamily: "Mabry Pro, sans-serif",
          fontWeight: 400,
          color: "rgba(255,255,255,0.6)",
          marginBottom: "1.4rem",
          lineHeight: 1.45,
        }}>
          {p.description}
        </p>

        {/* Divider */}
        {/* <div data-panel-item style={{ height: 1, background: "#e5e5e3", marginBottom: "1.4rem", width: "100%" }} /> */}

        {/* Description text */}
        {descriptionText && (
          <p data-panel-item style={{
            fontSize: "0.8rem",
            lineHeight: 1.82,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "Mabry Pro, sans-serif",
            marginBottom: "1.8rem",
          }}>
            {descriptionText}
          </p>
        )}

        {/* Stack */}
        {stackTags.length > 0 && (
          <p data-panel-item style={{
            fontSize: "0.8rem",
            fontFamily: "Mabry Pro, sans-serif",
            color: "rgba(255,255,255,0.55)",
            marginBottom: "2rem",
            lineHeight: 1.6,
          }}>
            <strong style={{ color: "#ffffff", fontWeight: 700 }}>Stack</strong>
            {" : "}
            {stackTags.join(", ")}
          </p>
        )}

        <div style={{ flex: 1 }} />

        {/* CTA */}
        {p.projectUrl && (
          <a data-panel-item
            href={p.projectUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.85rem 1.6rem",
              borderRadius: "3rem",
              background: "#fff",
              color: "#080808",
              fontSize: "0.68rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              textDecoration: "none",
              fontFamily: "Neopixel, sans-serif",
              fontWeight: 600,
              transition: "background 0.22s ease",
              alignSelf: "flex-start",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.15)"; (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "#fff"; (e.currentTarget as HTMLAnchorElement).style.color = "#080808"; }}
          >
            SEE THE WEBSITE
            <span style={{ fontSize: "1rem", fontWeight: 300, lineHeight: 1 }}>+</span>
          </a>
        )}
      </div>
    </div>
  );
}
