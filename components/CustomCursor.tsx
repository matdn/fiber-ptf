'use client'

import { useEffect, useRef } from 'react'

type Environment = 'surface' | 'underwater' | 'space'

export function CustomCursor({
  enabled,
  environment,
  onRequest
}: {
  enabled: boolean
  environment: Environment
  onRequest: (request: 'to-underwater' | 'to-space' | 'to-surface') => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const circleRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLDivElement>(null)

  const mouse = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })
  const actionRef = useRef({ label: '', arrow: '' })

  useEffect(() => {
    if (!enabled) return

    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'none'

    const onPointerMove = (e: PointerEvent) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })

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
        const isHot = false

        circle.style.width = isHot ? '74px' : '26px'
        circle.style.height = isHot ? '74px' : '26px'
        circle.style.borderWidth = isHot ? '2px' : '1px'
        circle.style.opacity = isHot ? '0.95' : '0.75'

        arrow.textContent = action.arrow
        arrow.style.opacity = '0'

        label.textContent = action.label
        label.style.opacity = '0'
        label.style.transform = 'translateY(6px)'
      }

      raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.cancelAnimationFrame(raf)
      document.body.style.cursor = previousCursor
    }
  }, [enabled, environment, onRequest])

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
