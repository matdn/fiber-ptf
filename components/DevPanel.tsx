'use client'

import { useEffect, useRef, useState } from 'react'
import { TIME_SLOTS } from '@/lib/hdriSlots'

export function DevPanel({
  hdriSlotIndex,
  onSlotChange,
}: {
  hdriSlotIndex: number
  onSlotChange: (i: number) => void
}) {
  if (process.env.NODE_ENV === 'production') return null

  return <DevPanelInner hdriSlotIndex={hdriSlotIndex} onSlotChange={onSlotChange} />
}

function DevPanelInner({
  hdriSlotIndex,
  onSlotChange,
}: {
  hdriSlotIndex: number
  onSlotChange: (i: number) => void
}) {
  const [open, setOpen] = useState(false)
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
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-1"
      style={{ fontFamily: 'monospace', fontSize: '10px' }}
    >
      {/* Expanded panel */}
      {open && (
        <div className="flex flex-col gap-1.5 rounded-md border border-white/10 bg-black/80 px-3 py-2.5 backdrop-blur-sm">
          {/* FPS row */}
          <div className="flex items-center gap-2 text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
            <span ref={fpsRef} className="w-6 text-right tabular-nums text-white">--</span>
            <span className="text-white/35">fps</span>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10" />

          {/* Slot row */}
          <div className="flex items-center gap-0.5">
            <span className="mr-1.5 text-white/30 text-[9px] uppercase tracking-widest">time</span>
            {TIME_SLOTS.map((slot, i) => (
              <button
                key={slot.name}
                type="button"
                onClick={() => onSlotChange(i)}
                className="rounded px-1.5 py-0.5 text-[9px] uppercase tracking-widest transition-colors"
                style={{
                  background: hdriSlotIndex === i ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: hdriSlotIndex === i ? '#fff' : 'rgba(255,255,255,0.35)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {slot.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toggle pill */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/70 px-2.5 py-1.5 backdrop-blur-sm transition-colors hover:border-white/25"
        style={{ cursor: 'pointer' }}
      >
        {/* fps dot — always visible */}
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: open ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }} />
        {!open && (
          <>
            <span ref={fpsRef} className="w-6 text-right tabular-nums text-white">--</span>
            <span className="text-white/35">fps</span>
          </>
        )}
        {open && <span className="text-white/40 text-[9px]">▲ dev</span>}
      </button>
    </div>
  )
}
