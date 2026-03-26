'use client'

import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

// ─── Page-transition overlay (image-sequence, kept as-is for TransitionContext) ─

const TRANSITION_FRAMES: number[] = [
  ...Array.from({ length: 37 }, (_, i) => i + 8), // 8 → 44
  54,
  ...Array.from({ length: 35 }, (_, i) => i + 55), // 55 → 89
]
const BLACK_FRAME_IDX = 37 // index of frame 54 in TRANSITION_FRAMES
const toUrl = (n: number) => `/loader_textures/transition-${n} 1.png`
const FPS = 60

export type TransitionOverlayProps = { href: string; onDone: () => void }

export function TransitionOverlay({ href, onDone }: TransitionOverlayProps) {
  const router = useRouter()
  const [frameIndex, setFrameIndex] = useState(0)
  const navigatedRef = useRef(false)
  const onDoneRef = useRef(onDone)
  useEffect(() => { onDoneRef.current = onDone }, [onDone])

  useEffect(() => {
    let rafId: number
    let lastTick = performance.now()
    const idxRef = { current: 0 }

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick)
      const elapsed = now - lastTick
      if (elapsed < 1000 / FPS) return
      lastTick = now

      idxRef.current++
      if (idxRef.current >= TRANSITION_FRAMES.length) {
        cancelAnimationFrame(rafId)
        onDoneRef.current()
        return
      }
      setFrameIndex(idxRef.current)
      if (idxRef.current === BLACK_FRAME_IDX && !navigatedRef.current) {
        navigatedRef.current = true
        router.push(href)
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [href, router])

  const frame = TRANSITION_FRAMES[frameIndex]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, overflow: 'hidden', pointerEvents: 'all' }}>
      <div style={{ display: 'none' }}>
        {TRANSITION_FRAMES.slice(BLACK_FRAME_IDX + 1).map((n) => (
          <Image key={n} src={toUrl(n)} alt="" width={1} height={1} unoptimized />
        ))}
      </div>
      <Image src={toUrl(frame)} alt="" fill unoptimized priority style={{ objectFit: 'cover' }} />
    </div>
  )
}

interface SequenceLoaderProps {
  onLoaded: () => void
  /** Accepted for API compatibility — shader drives readiness internally */
  canvasReady?: boolean
  /** Minimum ms to hold before revealing */
  holdMs?: number
  /** RGB 0–1 fill color — matches current vignette */
  color?: [number, number, number]
}

// ─── Ink-reveal shader canvas ─────────────────────────────────────────────────
import { InkRevealCanvas } from './InkRevealCanvas'

// ─── SequenceLoader ───────────────────────────────────────────────────────────

const REVEAL_DURATION = 1500 // ms

export function SequenceLoader({ onLoaded, canvasReady, holdMs = 300, color = [0, 0, 0] }: SequenceLoaderProps) {
  const { progress } = useProgress()
  const [stage, setStage]     = useState<'logo' | 'sequence'>('logo')
  const [shaderP, setShaderP] = useState(1.0) // 1 = black, 0 = fully revealed

  const sceneReadyRef  = useRef(false)
  const canvasReadyRef = useRef(canvasReady ?? false)
  const onLoadedRef    = useRef(onLoaded)
  const phaseRef       = useRef<'holding' | 'revealing' | 'done'>('holding')
  const holdStartRef   = useRef<number | null>(null)
  const revealStartRef = useRef<number | null>(null)

  useEffect(() => { onLoadedRef.current = onLoaded }, [onLoaded])
  useEffect(() => { if (canvasReady) canvasReadyRef.current = true }, [canvasReady])
  useEffect(() => { if (progress >= 100) sceneReadyRef.current = true }, [progress])

  // Logo intro (1 500 ms) → sequence stage
  useEffect(() => {
    const t = setTimeout(() => { setStage('sequence'); holdStartRef.current = performance.now() }, 1500)
    return () => clearTimeout(t)
  }, [])

  // Hard fallback after 8 s
  useEffect(() => {
    const t = setTimeout(() => { sceneReadyRef.current = true; canvasReadyRef.current = true }, 8000)
    return () => clearTimeout(t)
  }, [])

  // Animation loop — only active during sequence stage
  useEffect(() => {
    if (stage !== 'sequence') return
    let rafId: number

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick)

      if (phaseRef.current === 'holding') {
        const held = holdStartRef.current ? now - holdStartRef.current : 0
        if (sceneReadyRef.current && canvasReadyRef.current && held >= holdMs) {
          phaseRef.current = 'revealing'
          revealStartRef.current = now
        }
      } else if (phaseRef.current === 'revealing') {
        const t = Math.min((now - (revealStartRef.current ?? now)) / REVEAL_DURATION, 1.0)
        // Ease-out cubic: fast open, slow corner fade — matches original animation feel
        const eased = 1 - (1 - t) ** 3
        setShaderP(1.0 - eased)
        if (t >= 1.0) {
          phaseRef.current = 'done'
          cancelAnimationFrame(rafId)
          onLoadedRef.current()
        }
      }
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [stage, holdMs])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden' }}>
      <style>{`
        @keyframes logo-breathe {
          0%   { opacity: 0; }
          30%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* ── Logo phase ── */}
      {stage === 'logo' && (
        <div style={{ position: 'absolute', inset: 0, background: `rgb(${color.map(c => Math.round(c*255)).join(',')})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* biome-ignore lint/performance/noImgElement: logo in loader */}
          <img src="/logo.svg" alt="logo" style={{ width: '20vw', maxWidth: 120, filter: 'invert(1)', animation: 'logo-breathe 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards' }} />
        </div>
      )}

      {/* ── Sequence phase: WebGL ink-reveal shader ── */}
      {stage === 'sequence' && (
        <div style={{ position: 'absolute', inset: 0 }}>
          {/* Color fallback behind shader during hold (prevents any flash) */}
          {shaderP >= 1 && <div style={{ position: 'absolute', inset: 0, background: `rgb(${color.map(c => Math.round(c*255)).join(',')})`, zIndex: -1 }} />}
          <InkRevealCanvas progress={shaderP} color={color} />
        </div>
      )}
    </div>
  )
}
