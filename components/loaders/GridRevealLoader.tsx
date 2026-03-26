'use client'

import { useEffect, useRef } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'

const LOGO_PATHS: { key: string; d: string }[] = [
  { key: 'left',        d: 'M0 412H415V1339H200C89.543 1339 0 1249.46 0 1139V412Z' },
  { key: 'right',       d: 'M2072 715C2072 547.658 1936.34 412 1769 412H1660V1333H2072V715Z' },
  { key: 'top-right',   d: 'M1445 9.31052e-06C1334.54 1.41387e-05 1245 89.5431 1245 200V412H1660V2.00001C1660 0.895436 1659.1 -4.83e-08 1658 0L1445 9.31052e-06Z' },
  { key: 'mid-right',   d: 'M830 412V824H1030C1148.74 824 1245 727.741 1245 609V412H830Z' },
  { key: 'top-left',    d: 'M415 412V2.2419e-06L603 0C728.369 -1.495e-06 830 101.631 830 227V412H415Z' },
]

interface GridRevealLoaderProps {
  onLoaded: () => void
  /** Number of columns — use odd for a true center cell */
  cols?: number
  /** Number of rows — use odd for a true center cell */
  rows?: number
  /** Minimum loading screen duration in ms */
  minMs?: number
  /** Delay between each cell disappearing (seconds) */
  stagger?: number
}

export function GridRevealLoader({
  onLoaded,
  cols = 7,
  rows = 5,
  minMs = 1400,
  stagger = 0.02,
}: GridRevealLoaderProps) {
  const { progress } = useProgress()
  const startTimeRef = useRef(Date.now())
  const animStarted = useRef(false)
  const onLoadedRef = useRef(onLoaded)
  const cellRefs = useRef<(HTMLDivElement | null)[]>([])
  const logoRef = useRef<HTMLDivElement>(null)

  const TOTAL = cols * rows
  const centerIdx = Math.floor(rows / 2) * cols + Math.floor(cols / 2)

  useEffect(() => { onLoadedRef.current = onLoaded }, [onLoaded])

  const triggerAnim = useRef(() => {})

  useEffect(() => {
    triggerAnim.current = () => {
      if (animStarted.current) return
      animStarted.current = true

      const remaining = Math.max(0, minMs - (Date.now() - startTimeRef.current))

      const run = () => {
        // Center cell disappears first, then all others in random order
        const others: number[] = []
        for (let i = 0; i < TOTAL; i++) if (i !== centerIdx) others.push(i)
        for (let i = others.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[others[i], others[j]] = [others[j], others[i]]
        }
        const indices = [centerIdx, ...others]

        // Fade out logo before center cell disappears
        if (logoRef.current) {
          gsap.to(logoRef.current, { opacity: 0, duration: 0.2, ease: 'power1.in' })
        }

        const tl = gsap.timeline({
          onComplete: () => { void setTimeout(() => onLoadedRef.current(), 150) },
        })

        indices.forEach((cellIdx, i) => {
          const el = cellRefs.current[cellIdx]
          if (!el) return
          tl.to(el, { scale: 0, duration: 0.01, }, i * stagger)
        })
      }

      if (remaining <= 0) run()
      else setTimeout(run, remaining)
    }
  }, [TOTAL, centerIdx, minMs, stagger])

  // Trigger when assets finish loading
  useEffect(() => {
    if (progress >= 100) triggerAnim.current()
  }, [progress])

  // Hard fallback: fire after minMs + 2s max regardless of progress
  useEffect(() => {
    const t = setTimeout(() => triggerAnim.current(), minMs + 2000)
    return () => clearTimeout(t)
  }, [minMs])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {Array.from({ length: TOTAL }, (_, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        return (
          <div
            key={`r${row}c${col}`}
            ref={(el) => { cellRefs.current[i] = el }}
            style={{
              background: 'white',
              transformOrigin: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {i === centerIdx && (
              <div ref={logoRef} style={{ width: '85%', maxWidth: 280 }}>
                <svg
                  viewBox="0 0 2072 1339"
                  role="img"
                  aria-label="Loading"
                  style={{ width: '100%'}}
                  
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <title>Loading</title>
                  {LOGO_PATHS.map((p) => <path key={p.key} d={p.d} fill="white" />)}
                </svg>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
