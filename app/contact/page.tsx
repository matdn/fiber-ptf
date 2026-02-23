'use client'

import Header from '@/components/Header'
import { useEffect, useRef } from 'react'

const SVG_W = 2072
const SVG_H = 1339
const LOGO_ASPECT = SVG_H / SVG_W

const PATHS = [
  'M0 412H415V1339H200C89.543 1339 0 1249.46 0 1139V412Z',
  'M2072 715C2072 547.658 1936.34 412 1769 412H1660V1333H2072V715Z',
  'M1445 9.31052e-06C1334.54 1.41387e-05 1245 89.5431 1245 200V412H1660V2.00001C1660 0.895436 1659.1 -4.83e-08 1658 0L1445 9.31052e-06Z',
  'M830 412V824H1030C1148.74 824 1245 727.741 1245 609V412H830Z',
  'M415 412V2.2419e-06L603 0C728.369 -1.495e-06 830 101.631 830 227V412H415Z',
]

// Pre-render the full logo once to an offscreen canvas
function makeLogoImage(size: number): HTMLCanvasElement {
  const w = size
  const h = Math.round(size * LOGO_ASPECT)
  const oc = document.createElement('canvas')
  oc.width = w
  oc.height = h
  const ctx = oc.getContext('2d')
  if (!ctx) return oc
  const s = w / SVG_W
  ctx.scale(s, s)
  ctx.fillStyle = '#0a0a0a'
  for (const d of PATHS) ctx.fill(new Path2D(d))
  return oc
}

const COUNT = 1000
const LOGO_W = 28

export default function ContactPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cleanup: (() => void) | undefined

    import('matter-js').then(({ Engine, Bodies, Body, World, Events }) => {
      const logoImg = makeLogoImage(LOGO_W)
      const logoH = logoImg.height

      const getWH = () => ({ W: canvas.offsetWidth, H: canvas.offsetHeight })

      const setSize = () => {
        const dpr = window.devicePixelRatio || 1
        canvas.width = canvas.offsetWidth * dpr
        canvas.height = canvas.offsetHeight * dpr
      }
      setSize()

      const engine = Engine.create({ gravity: { x: 0, y: 2.2 } })

      const { W, H } = getWH()
      const T = 80
      const walls = [
        Bodies.rectangle(W / 2, H + T / 2, W * 3, T, { isStatic: true }),
        Bodies.rectangle(-T / 2, H / 2, T, H * 3, { isStatic: true }),
        Bodies.rectangle(W + T / 2, H / 2, T, H * 3, { isStatic: true }),
      ]
      World.add(engine.world, walls)

      const logoBodies: ReturnType<typeof Bodies.rectangle>[] = Array.from({ length: COUNT }, () => {
        const x = LOGO_W / 2 + Math.random() * (W - LOGO_W)
        const y = -logoH - Math.random() * 1800
        return Bodies.rectangle(x, y, LOGO_W, logoH, {
          restitution: 0.45,
          friction: 0.5,
          frictionAir: 0.015,
          angle: (Math.random() - 0.5) * Math.PI * 2,
        })
      })
      World.add(engine.world, logoBodies)

      // Spawn a random logo from above every 1.5-4s
      const spawnLogo = () => {
        const { W: sW } = getWH()
        const x = LOGO_W / 2 + Math.random() * (sW - LOGO_W)
        const b = Bodies.rectangle(x, -logoH, LOGO_W, logoH, {
          restitution: 0.45,
          friction: 0.5,
          frictionAir: 0.015,
          angle: (Math.random() - 0.5) * Math.PI * 2,
        })
        // Give it a random lateral nudge
        Body.setVelocity(b, { x: (Math.random() - 0.5) * 4, y: 0 })
        logoBodies.push(b)
        World.add(engine.world, b)
      }

      const scheduleSpawn = () => {
        const delay = 1500 + Math.random() * 2500
        return window.setTimeout(() => {
          spawnLogo()
          spawnIntervalId = scheduleSpawn()
        }, delay)
      }
      let spawnIntervalId = scheduleSpawn()

      const mouse = { x: -9999, y: -9999 }
      const REPULSE_R = 250
      const REPULSE_STR = 0.05

      const onMouseMove = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect()
        mouse.x = e.clientX - r.left
        mouse.y = e.clientY - r.top
      }
      const onTouchMove = (e: TouchEvent) => {
        const r = canvas.getBoundingClientRect()
        mouse.x = e.touches[0].clientX - r.left
        mouse.y = e.touches[0].clientY - r.top
      }
      // Click: explosion blast
      const onClick = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect()
        const cx = e.clientX - r.left
        const cy = e.clientY - r.top
        for (const b of logoBodies) {
          const dx = b.position.x - cx
          const dy = b.position.y - cy
          const dist = Math.hypot(dx, dy)
          if (dist < 280 && dist > 1) {
            const f = ((1 - dist / 280) ** 2) * 0.06
            Body.applyForce(b, b.position, { x: (dx / dist) * f, y: (dy / dist) * f })
            Body.setAngularVelocity(b, b.angularVelocity + (Math.random() - 0.5) * 0.4)
          }
        }
      }

      canvas.addEventListener('mousemove', onMouseMove)
      canvas.addEventListener('touchmove', onTouchMove, { passive: true } as AddEventListenerOptions)
      canvas.addEventListener('click', onClick)

      Events.on(engine, 'beforeUpdate', () => {
        for (const b of logoBodies) {
          const dx = b.position.x - mouse.x
          const dy = b.position.y - mouse.y
          const dist = Math.hypot(dx, dy)
          if (dist < REPULSE_R && dist > 1) {
            const f = ((1 - dist / REPULSE_R) ** 2) * REPULSE_STR
            Body.applyForce(b, b.position, { x: (dx / dist) * f, y: (dy / dist) * f })
            Body.setAngularVelocity(b, b.angularVelocity + (dy / dist) * f * 0.3)
          }
        }
      })

      const ro = new ResizeObserver(setSize)
      ro.observe(canvas)

      const DT = 1000 / 60
      let last = 0
      let rafId: number

      const render = (now: number) => {
        rafId = requestAnimationFrame(render)
        if (now - last < DT - 1) return
        last = now

        Engine.update(engine, DT)

        // Remove bodies that fell way below the viewport to cap total count
        const { W: cW, H: cH } = getWH()
        for (let i = logoBodies.length - 1; i >= 0; i--) {
          if (logoBodies[i].position.y > cH + 400) {
            World.remove(engine.world, logoBodies[i])
            logoBodies.splice(i, 1)
          }
        }

        const dpr = window.devicePixelRatio || 1
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.save()
        ctx.scale(dpr, dpr)

        for (const b of logoBodies) {
          ctx.save()
          ctx.translate(b.position.x, b.position.y)
          ctx.rotate(b.angle)
          ctx.drawImage(logoImg, -LOGO_W / 2, -logoH / 2, LOGO_W, logoH)
          ctx.restore()
        }

        // White gradient mask so logos fade out behind the heading
        const grad = ctx.createLinearGradient(0, 0, 0, cH * 0.5)
        grad.addColorStop(0, 'rgba(255,255,255,1)')
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, cW, cH * 0.5)

        ctx.restore()
      }

      rafId = requestAnimationFrame(render)

      cleanup = () => {
        cancelAnimationFrame(rafId)
        clearTimeout(spawnIntervalId)
        ro.disconnect()
        World.clear(engine.world, false)
        Engine.clear(engine)
        canvas.removeEventListener('mousemove', onMouseMove)
        canvas.removeEventListener('touchmove', onTouchMove)
        canvas.removeEventListener('click', onClick)
      }
    })

    return () => cleanup?.()
  }, [])

  return (
    <main className="relative w-full h-screen bg-white overflow-hidden select-none">
      <Header isUnderwater={false} />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: 'crosshair',
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-start pt-[24dvh] px-6 pointer-events-none mix-blend-difference">
        <h1
          style={{
            fontFamily: 'Mabry, sans-serif',
            fontSize: 'clamp(3rem, 9vw, 9rem)',
            fontWeight: 400,
            letterSpacing: '-0.04em',
            lineHeight: 1.0,
            color: '#ffffff',
            textAlign: 'center',
          }}
        >
          {"let's work"}
          <br />
          together!
        </h1>
      </div>
    </main>
  )
}
