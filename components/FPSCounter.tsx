'use client'

import { useEffect, useRef } from 'react'

export function FPSCounter() {
  const fpsRef = useRef<HTMLSpanElement>(null)
  const frames = useRef(0)
  const lastTime = useRef(performance.now())

  useEffect(() => {
    let rafId: number

    const loop = () => {
      frames.current++
      const now = performance.now()
      const delta = now - lastTime.current
      if (delta >= 500) {
        const fps = Math.round((frames.current * 1000) / delta)
        if (fpsRef.current) fpsRef.current.textContent = String(fps)
        frames.current = 0
        lastTime.current = now
      }
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border border-white/10 bg-black/70 px-2.5 py-1.5 font-mono text-[10px] backdrop-blur-sm"
      style={{ pointerEvents: 'none' }}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
      <span ref={fpsRef} className="w-6 text-right tabular-nums text-green-400">
        --
      </span>
      <span className="text-white/35">fps</span>
    </div>
  )
}
