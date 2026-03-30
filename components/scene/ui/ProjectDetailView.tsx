"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { memo, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ProjectItem } from "@/lib/projectImages";
import { ProjectDetailFooter } from "./ProjectDetailFooter";
import { PROJECTS, getProjectSlug } from "@/lib/projectImages";

type Props = {
  project: ProjectItem;
  onClose: () => void;
};

export const ProjectDetailView = memo(function ProjectDetailView({
  project,
  onClose,
}: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const footerSentinelRef = useRef<HTMLDivElement>(null);
  
  const projectIndex = useMemo(() => {
    return PROJECTS.findIndex((p) => p.title === project.title);
  }, [project.title]);
  
  const prevProject = useMemo(() => {
    const prevIndex = projectIndex === 0 ? PROJECTS.length - 1 : projectIndex - 1;
    return PROJECTS[prevIndex];
  }, [projectIndex]);
  
  const nextProject = useMemo(() => {
    const nextIndex = projectIndex === PROJECTS.length - 1 ? 0 : projectIndex + 1;
    return PROJECTS[nextIndex];
  }, [projectIndex]);
  
  const mediaBlocks = project.detailBlocks.filter(
    (b) => b.type === "image" || b.type === "video",
  );
  const heroMedia   = mediaBlocks[0] ?? null;
  const galleryMedia = mediaBlocks.slice(1);

  useEffect(() => {
    if (!rootRef.current) return;
    const currentProjectTitle = project.title;
    const scrollRoot = rootRef.current.closest(
      "[data-scene-scroll-root='true']",
    ) as HTMLElement | null;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-pdv-hero-title]",
        { autoAlpha: 0, y: 36 },
        { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.06, ease: "power3.out" },
      );
      gsap.fromTo(
        "[data-pdv-hero-copy]",
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.75, delay: 0.14, ease: "power3.out" },
      );
      gsap.fromTo(
        "[data-pdv-tags]",
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.7, delay: 0.22, ease: "power3.out" },
      );
      gsap.fromTo(
        "[data-pdv-hero-media]",
        { autoAlpha: 0, scale: 1.04 },
        { autoAlpha: 1, scale: 1, duration: 1.1, delay: 0.04, ease: "power2.out" },
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
              scroller: scrollRoot || undefined,
              id: `pdv-${currentProjectTitle}-${index}`,
              start: "top 86%",
              once: true,
            },
          },
        );
      });
    }, rootRef);

    return () => { ctx.revert(); };
  }, [project.title]);

  return (
    <div
      ref={rootRef}
      className="w-full"
      style={{ position: "relative", paddingTop: "10dvh" }}
    >
      <div
        id="project-detail-footer-sentinel"
        ref={footerSentinelRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "40vh",
          pointerEvents: "none",
        }}
      />
      {/* Content layer — slides over sticky footer */}
      <div style={{ position: "relative", zIndex: 1, background: "#fefefe" }}>

        {/* ── Back to works button ───────────────────────────────────── */}
        <button
          type="button"
          onClick={() => router.push('/laboratory')}
          style={{
            position: "relative",
            marginLeft: "2.5rem",
            marginTop: "0.5rem",
            marginBottom: "1.25rem",
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.35)",
            background: "none",
            border: "none",
            padding: "0",
            borderRadius: "0px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.8)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.35)";
          }}
        >
          ← Retour
        </button>

        {/* ── Hero: split (text left / video right) ───────────────── */}
        <section style={{ padding: "2rem 2.5rem 0" }}>
          <div
            className=" grid-cols-1 lg:grid-cols-2 flex flex-col-reverse md:flex md:justify-between md:flex-row"
            style={{ gap: "3rem", alignItems: "stretch", fontFamily: "Neopixel, sans-serif" }}
          >
            <div className="flex flex-col w-full md:w-1/2" style={{ minHeight: "62vh" }}>
              <p
                style={{
                  fontSize: "0.95rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "rgba(0,0,0)",
                  paddingTop: "0.4rem",
                  fontWeight: 800,
                }}
              >
                {project.title}
              </p>

              <div style={{ flex: 1 }} />

              <h1
                data-pdv-hero-title
                style={{
                  fontSize: "clamp(1.1rem, 3.2vw, 2.1rem)",
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  lineHeight: 1.12,
                  color: "#000000",
                  marginBottom: "1.4rem",
                }}
              >
                {project.description}
              </h1>

              {project.detailBlocks
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
                        color: "rgba(0,0,0,0.38)",
                        fontFamily: '"Mabry Pro", sans-serif',

                      }}
                    >
                      {b.content}
                    </p>
                  ) : null,
                )}

              {project.projectUrl && (
                <div style={{ paddingTop: "1.5rem" }}>
                  <a
                    href={project.projectUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.9rem 1.2rem",
                      borderRadius: "0px",
                      background: "#000000",
                      color: "#ffffff",
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
              className="relative overflow-hidden md:w-1/2 "
              style={{
                height: "80vh",
                background: "rgba(0,0,0,0.04)",
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
                  className="absolute inset-0 m-w-1/2 h-full object-cover scale-105"
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
                  src={project.imageUrl}
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

        <div style={{ height: "clamp(4rem, 8vw, 7rem)" }} />

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
                    background: "rgba(0,0,0,0.04)",
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
        {project.detailBlocks
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
                    color: "#000",
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

        {/* ── Next/Previous Projects Navigation ──────────────────────────────────── */}
        <div style={{ padding: "4rem 2.5rem 3rem" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "2rem" }}>
            {/* Previous Project */}
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => router.push(`/laboratory/${getProjectSlug(prevProject)}`)}
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: "0.3rem 0",
                  borderRadius: "0px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  color: "rgba(0,0,0,0.35)",
                  transition: "color 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.8)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.35)";
                }}
              >
                <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "currentColor", marginBottom: "0.35rem", fontWeight: 500, transition: "color 0.3s ease" }}>Projet précédent</p>
                <h3 style={{ fontSize: "0.95rem", letterSpacing: "-0.01em", color: "currentColor", fontWeight: 500, transition: "color 0.3s ease" }}>{prevProject.title}</h3>
              </button>
            </div>

            {/* Next Project */}
            <div className="flex justify-start lg:justify-end">
              <button
                type="button"
                onClick={() => router.push(`/laboratory/${getProjectSlug(nextProject)}`)}
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  padding: "0.3rem 0",
                  borderRadius: "0px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "right",
                  color: "rgba(0,0,0,0.35)",
                  transition: "color 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.8)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.35)";
                }}
              >
                <p style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "currentColor", marginBottom: "0.35rem", fontWeight: 500, transition: "color 0.3s ease" }}>Projet suivant</p>
                <h3 style={{ fontSize: "0.95rem", letterSpacing: "-0.01em", color: "currentColor", fontWeight: 500, transition: "color 0.3s ease" }}>{nextProject.title}</h3>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Footer — sticky, revealed as content scrolls past */}
      <div style={{ position: "sticky", bottom: 0, zIndex: 0 }}>
        <ProjectDetailFooter onBack={onClose} projectTitle={project.title} />
      </div>
    </div>
  );
});
