"use client";

import { useEffect, useRef } from "react";

// ── Logo geometry (same paths as contact page) ──────────────────────────────
const SVG_W = 2072;
const SVG_H = 1339;
const LOGO_ASPECT = SVG_H / SVG_W;
const PATHS = [
  "M0 412H415V1339H200C89.543 1339 0 1249.46 0 1139V412Z",
  "M2072 715C2072 547.658 1936.34 412 1769 412H1660V1333H2072V715Z",
  "M1445 9.31052e-06C1334.54 1.41387e-05 1245 89.5431 1245 200V412H1660V2.00001C1660 0.895436 1659.1 -4.83e-08 1658 0L1445 9.31052e-06Z",
  "M830 412V824H1030C1148.74 824 1245 727.741 1245 609V412H830Z",
  "M415 412V2.2419e-06L603 0C728.369 -1.495e-06 830 101.631 830 227V412H415Z",
];

function makeLogoImage(size: number): HTMLCanvasElement {
  const w = size;
  const h = Math.round(size * LOGO_ASPECT);
  const oc = document.createElement("canvas");
  oc.width = w;
  oc.height = h;
  const ctx = oc.getContext("2d");
  if (!ctx) return oc;
  const s = w / SVG_W;
  ctx.scale(s, s);
  ctx.fillStyle = "#0a0a0a";
  for (const d of PATHS) ctx.fill(new Path2D(d));
  return oc;
}

const COUNT = 1360;
const LOGO_W = 28;

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/" },
  { label: "GitHub", href: "https://github.com/" },
  { label: "LinkedIn", href: "https://linkedin.com/in/" },
  { label: "X", href: "https://x.com/" },
  { label: "Behance", href: "https://behance.net/" },
];

interface Props {
  onBack: () => void;
  projectTitle: string;
}

export function ProjectDetailFooter({ onBack, projectTitle }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);

  // Cursor-reveal for the PORTFOLIO headline
  useEffect(() => {
    const footer = footerRef.current;
    const mask = maskRef.current;
    if (!footer || !mask) return;

    let currentX = -9999;
    let currentY = -9999;
    let targetX = -9999;
    let targetY = -9999;
    let currentSize = 0;
    let targetSize = 0;
    let rafId = 0;

    const onLeave = () => {
      targetX = -9999;
      targetY = -9999;
      targetSize = 0;
    };

    const onMove = (e: MouseEvent) => {
      const r = footer.getBoundingClientRect();
      targetX = e.clientX - r.left;
      targetY = e.clientY - r.top;
      targetSize = 300;
    };

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const k = 0.1;
      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;
      currentSize += (targetSize - currentSize) * k;
      mask.style.setProperty("--mx", `${currentX}px`);
      mask.style.setProperty("--my", `${currentY}px`);
      mask.style.setProperty("--ms", `${currentSize}px`);
    };

    rafId = requestAnimationFrame(animate);
    footer.addEventListener("mousemove", onMove);
    footer.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(rafId);
      footer.removeEventListener("mousemove", onMove);
      footer.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cleanup: (() => void) | undefined;

    import("matter-js").then(({ Engine, Bodies, Body, World, Events }) => {
      const logoImg = makeLogoImage(LOGO_W);
      const logoH = logoImg.height;

      const getWH = () => ({ W: canvas.offsetWidth, H: canvas.offsetHeight });

      const setSize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;
      };
      setSize();

      const engine = Engine.create({ gravity: { x: 0, y: 2.2 } });

      const { W, H } = getWH();
      const T = 80;
      const walls = [
        Bodies.rectangle(W / 2, H + T / 2, W * 3, T, { isStatic: true }),
        Bodies.rectangle(-T / 2, H / 2, T, H * 3, { isStatic: true }),
        Bodies.rectangle(W + T / 2, H / 2, T, H * 3, { isStatic: true }),
      ];
      World.add(engine.world, walls);

      const logoBodies: ReturnType<typeof Bodies.rectangle>[] = Array.from(
        { length: COUNT },
        () => {
          const x = LOGO_W / 2 + Math.random() * (W - LOGO_W);
          const y = -logoH - Math.random() * 1600;
          return Bodies.rectangle(x, y, LOGO_W, logoH, {
            restitution: 0.45,
            friction: 0.5,
            frictionAir: 0.015,
            angle: (Math.random() - 0.5) * Math.PI * 2,
          });
        },
      );
      World.add(engine.world, logoBodies);

      const spawnLogo = () => {
        const { W: sW } = getWH();
        const x = LOGO_W / 2 + Math.random() * (sW - LOGO_W);
        const b = Bodies.rectangle(x, -logoH, LOGO_W, logoH, {
          restitution: 0.45,
          friction: 0.5,
          frictionAir: 0.015,
          angle: (Math.random() - 0.5) * Math.PI * 2,
        });
        Body.setVelocity(b, { x: (Math.random() - 0.5) * 4, y: 0 });
        logoBodies.push(b);
        World.add(engine.world, b);
      };

      const scheduleSpawn = () => {
        const delay = 1500 + Math.random() * 2500;
        return window.setTimeout(() => {
          spawnLogo();
          spawnIntervalId = scheduleSpawn();
        }, delay);
      };
      let spawnIntervalId = scheduleSpawn();

      const mouse = { x: -9999, y: -9999 };
      const REPULSE_R = 100;
      const REPULSE_STR = 0.2;

      const onMouseMove = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left;
        mouse.y = e.clientY - r.top;
      };
      const onTouchMove = (e: TouchEvent) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.touches[0].clientX - r.left;
        mouse.y = e.touches[0].clientY - r.top;
      };
      const onClick = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect();
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        for (const b of logoBodies) {
          const dx = b.position.x - cx;
          const dy = b.position.y - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < 280 && dist > 1) {
            const f = (1 - dist / 280) ** 2 * 0.06;
            Body.applyForce(b, b.position, {
              x: (dx / dist) * f,
              y: (dy / dist) * f,
            });
            Body.setAngularVelocity(
              b,
              b.angularVelocity + (Math.random() - 0.5) * 0.4,
            );
          }
        }
      };

      canvas.addEventListener("mousemove", onMouseMove);
      canvas.addEventListener("touchmove", onTouchMove, {
        passive: true,
      } as AddEventListenerOptions);
      canvas.addEventListener("click", onClick);

      Events.on(engine, "beforeUpdate", () => {
        for (const b of logoBodies) {
          const dx = b.position.x - mouse.x;
          const dy = b.position.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < REPULSE_R && dist > 1) {
            const f = (1 - dist / REPULSE_R) ** 2 * REPULSE_STR;
            Body.applyForce(b, b.position, {
              x: (dx / dist) * f,
              y: (dy / dist) * f,
            });
            Body.setAngularVelocity(
              b,
              b.angularVelocity + (dy / dist) * f * 0.3,
            );
          }
        }
      });

      const ro = new ResizeObserver(setSize);
      ro.observe(canvas);

      const DT = 1000 / 60;
      let last = 0;
      let rafId: number;

      const render = (now: number) => {
        rafId = requestAnimationFrame(render);
        if (now - last < DT - 1) return;
        last = now;

        Engine.update(engine, DT);

        const { H: cH } = getWH();
        for (let i = logoBodies.length - 1; i >= 0; i--) {
          if (logoBodies[i].position.y > cH + 400) {
            World.remove(engine.world, logoBodies[i]);
            logoBodies.splice(i, 1);
          }
        }

        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(dpr, dpr);

        for (const b of logoBodies) {
          ctx.save();
          ctx.translate(b.position.x, b.position.y);
          ctx.rotate(b.angle);
          ctx.drawImage(logoImg, -LOGO_W / 2, -logoH / 2, LOGO_W, logoH);
          ctx.restore();
        }

        ctx.restore();
      };

      rafId = requestAnimationFrame(render);

      cleanup = () => {
        cancelAnimationFrame(rafId);
        clearTimeout(spawnIntervalId);
        ro.disconnect();
        canvas.removeEventListener("mousemove", onMouseMove);
        canvas.removeEventListener("touchmove", onTouchMove);
        canvas.removeEventListener("click", onClick);
        World.clear(engine.world, false);
        Engine.clear(engine);
      };
    });

    return () => cleanup?.();
  }, []);

  return (
    <footer
      ref={footerRef}
      className="relative w-full bg-[#F9F9F9] overflow-hidden"
      style={{ maxHeight: "100vh" }}
    >
      {/* Matter.js canvas */}
      <canvas
        ref={canvasRef}
        className="absolute bottom-0 inset-0 w-full h-full"
        style={{ display: "block", backgroundColor: "#F9F9F9" }}
      />

      {/* Content overlay */}
      <div className="relative z-10 flex flex-col justify-between h-full min-h-[100vh] pointer-events-none">
        {/* Centre headline — hidden by default, revealed by cursor */}
        <div className="flex-1 relative flex flex-col items-center justify-center px-6">
          {/* Ghost: invisible, holds layout height */}
          <div
            aria-hidden
            className="font-light text-transparent text-center leading-none select-none"
            style={{
              fontSize: "clamp(5rem, 15vw, 14rem)",
              letterSpacing: "-0.04em",
            }}
          >
            PORTFOLIO
          </div>
          {/* Mask layer: only visible under cursor */}
          <div
            ref={maskRef}
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{
              WebkitMaskImage:
                "radial-gradient(circle var(--ms, 0px) at var(--mx, -9999px) var(--my, -9999px), #000 0%, transparent 80%)",
              WebkitMaskRepeat: "no-repeat",
              maskImage:
                "radial-gradient(circle var(--ms, 0px) at var(--mx, -9999px) var(--my, -9999px), #000 0%, transparent 80%)",
              maskRepeat: "no-repeat",
            }}
          >
            <h2
              className="font-light text-black text-center leading-none select-none"
              style={{
                fontSize: "clamp(5rem, 15vw, 14rem)",
                letterSpacing: "-0.04em",
              }}
            >
              PORTFOLIO
            </h2>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="px-8 pb-10 pt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between pointer-events-auto">
          {/* Socials */}
          <nav className="flex flex-wrap gap-x-7 gap-y-2 absolute">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-black/40 hover:text-black transition-colors"
                style={{
                  fontSize: "0.68rem",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                }}
              >
                {s.label}
              </a>
            ))}
          </nav>

          {/* Project title + back */}
          <div className="flex items-center gap-8">
            <span
              className="text-black/20 uppercase"
              style={{ fontSize: "0.68rem", letterSpacing: "0.22em" }}
            >
              {projectTitle}
            </span>
            <button
              type="button"
              onClick={onBack}
              className="uppercase text-black/40 hover:text-black transition-colors"
              style={{ fontSize: "0.68rem", letterSpacing: "0.22em" }}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
