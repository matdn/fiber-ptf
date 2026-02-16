'use client'

import { useEffect, useMemo, useRef } from 'react'

type Environment = 'surface' | 'underwater' | 'space'

type EnvironmentRequest = 'to-underwater' | 'to-space' | 'to-surface'

type CursorAction =
  | { type: 'to-underwater'; label: 'WORK'; arrow: '↓' }
  | { type: 'to-space'; label: 'ABOUT'; arrow: '↑' }
  | { type: 'to-surface'; label: 'HOME'; arrow: '↑' | '↓' }
  | { type: 'none'; label: ''; arrow: '' }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function CustomCursor({
  enabled,
  environment,
  onRequest
}: {
  enabled: boolean
  environment: Environment
  onRequest: (request: EnvironmentRequest) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const circleRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const mouse = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })
  const actionRef = useRef<CursorAction>({ type: 'none', label: '', arrow: '' })
  const lastClickRef = useRef(0)

  const thresholds = useMemo(
    () => ({ top: 0.13, bottom: 0.87 }),
    []
  )

  useEffect(() => {
    if (!enabled) return

    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'none'

    const computeAction = (yNorm: number): CursorAction => {
      if (environment === 'surface') {
        if (yNorm < thresholds.top) return { type: 'to-space', label: 'ABOUT', arrow: '↑' }
        if (yNorm > thresholds.bottom) return { type: 'to-underwater', label: 'WORK', arrow: '↓' }
        return { type: 'none', label: '', arrow: '' }
      }

      if (environment === 'underwater') {
        if (yNorm < thresholds.top) return { type: 'to-surface', label: 'MOUNTAIN', arrow: '↑' }
        return { type: 'none', label: '', arrow: '' }
      }

      // space
      if (yNorm > thresholds.bottom) return { type: 'to-surface', label: 'MOUNTAIN', arrow: '↓' }
      return { type: 'none', label: '', arrow: '' }
    }

    const onPointerMove = (e: PointerEvent) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY

      const yNorm = clamp(e.clientY / Math.max(1, window.innerHeight), 0, 1)
      actionRef.current = computeAction(yNorm)
    }

    const onPointerDown = () => {
      const now = performance.now()
      if (now - lastClickRef.current < 450) return
      lastClickRef.current = now

      const action = actionRef.current
      if (action.type === 'to-underwater') onRequest('to-underwater')
      else if (action.type === 'to-space') onRequest('to-space')
      else if (action.type === 'to-surface') onRequest('to-surface')
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown)

    let raf = 0
    const tick = () => {
      const root = rootRef.current
      const circle = circleRef.current
      const arrow = arrowRef.current
      const label = labelRef.current

      if (root && circle && arrow && label) {
        current.current.x += (mouse.current.x - current.current.x) * 0.18
        current.current.y += (mouse.current.y - current.current.y) * 0.18

        root.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0)`

        const action = actionRef.current
        const isHot = action.type !== 'none'

        circle.style.width = isHot ? '74px' : '26px'
        circle.style.height = isHot ? '74px' : '26px'
        circle.style.borderWidth = isHot ? '2px' : '1px'
        circle.style.opacity = isHot ? '0.95' : '0.75'

        arrow.textContent = action.arrow
        arrow.style.opacity = isHot ? '1' : '0'

        label.textContent = action.label
        label.style.opacity = isHot ? '1' : '0'
        label.style.transform = isHot ? 'translateY(0px)' : 'translateY(6px)'
      }

      raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.cancelAnimationFrame(raf)
      document.body.style.cursor = previousCursor
    }
  }, [enabled, environment, onRequest, thresholds.bottom, thresholds.top])

  if (!enabled) return null

  return (
    <div
      ref={rootRef}
      className="fixed left-0 top-0 z-9999 pointer-events-none mix-blend-difference"
      style={{ transform: 'translate3d(-100px, -100px, 0)' }}
    >
      <div
        ref={circleRef}
        className="rounded-full border border-white transition-[width,height,opacity,border-width] duration-200 ease-out"
      >
          <div
        ref={arrowRef}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none text-[18px] font-light text-white transition-opacity duration-200 ease-out"
        style={{ opacity: 0 }}
      />
        </div>
      <div
        ref={labelRef}
        className="absolute left-1/2 top-[120%] -translate-x-1/2 select-none text-[11px] tracking-[0.25em] text-white transition-[opacity,transform] duration-200 ease-out"
      />
    </div>
  )
}
