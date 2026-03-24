'use client'

import { useEffect, useRef } from 'react'

type Environment = 'surface' | 'underwater' | 'space'

const SQUARE = 14
const PAD = 8
const LERP = 0.28
const LERP_SNAP = 0.18

// Per slot: [line color, square border color, label color]
const SLOT_COLORS: Record<number, [string, string, string]> = {
  0: ['rgba(180,140,255,0.55)', 'rgba(180,140,255,0.7)', 'rgba(180,140,255,0.55)'],  // morning – violet
  1: ['rgba(255,230,100,0.55)', 'rgba(255,230,100,0.7)', 'rgba(255,230,100,0.55)'], // middleday – yellow
  2: ['rgba(255,150,170,0.55)', 'rgba(255,150,170,0.7)', 'rgba(255,150,170,0.55)'], // sunset – rose
  3: ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.34)', 'rgba(255,255,255,0.35)'], // night – white
}

export function CustomCursor({
  enabled,
  environment: _environment,
  onRequest: _onRequest,
  showDragOverlay = true,
  hdriSlotIndex,
}: {
  enabled: boolean
  environment?: Environment
  onRequest?: (request: 'to-underwater' | 'to-space' | 'to-surface') => void
  showDragOverlay?: boolean
  hdriSlotIndex?: number
}) {
  const hLineRef = useRef<HTMLDivElement>(null)
  const vLineRef = useRef<HTMLDivElement>(null)
  const squareRef = useRef<HTMLDivElement>(null)
  const labelLeftRef = useRef<HTMLDivElement>(null)
  const labelRightRef = useRef<HTMLDivElement>(null)
  const labelTopRef = useRef<HTMLDivElement>(null)
  const labelBottomRef = useRef<HTMLDivElement>(null)

  const mouse = useRef({ x: 0, y: 0 })
  const current = useRef({ x: 0, y: 0 })
  // Square animated state (position + size)
  const sq = useRef({ x: -200, y: -200, w: SQUARE, h: SQUARE })
  // Currently locked element
  const lockedEl = useRef<Element | null>(null)

  // Drag-rectangle state
  const dragStartLineHRef = useRef<HTMLDivElement>(null)
  const dragStartLineVRef = useRef<HTMLDivElement>(null)
  const dragRectRef = useRef<HTMLDivElement>(null)
  const dragPixelCanvasRef = useRef<HTMLCanvasElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const dragCurrentRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!enabled) return

    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'none'

    const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"], [data-cursor-target]'

    const getInteractiveUnderPointer = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y)
      return el?.closest(INTERACTIVE) ?? null
    }

    const onPointerMove = (e: PointerEvent) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
      // Keep lock in sync with the real element under pointer for stable hover detection.
      lockedEl.current = getInteractiveUnderPointer(e.clientX, e.clientY)
    }

    const onPointerOver = (e: PointerEvent) => {
      const el = (e.target as Element).closest(INTERACTIVE)
      if (el) lockedEl.current = el
    }

    const onPointerOut = () => {
      lockedEl.current = getInteractiveUnderPointer(mouse.current.x, mouse.current.y)
    }

    const PIXEL_SIZE = 40
    let offscreenCanvas: HTMLCanvasElement | null = null

    const onMouseDown = (e: MouseEvent) => {
      if (!showDragOverlay) return
      isDraggingRef.current = true
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      dragCurrentRef.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseUp = () => {
      if (!showDragOverlay) return
      isDraggingRef.current = false
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerover', onPointerOver, { passive: true })
    window.addEventListener('pointerout', onPointerOut, { passive: true })
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)

    let raf = 0
    const tick = () => {
      current.current.x += (mouse.current.x - current.current.x) * LERP
      current.current.y += (mouse.current.y - current.current.y) * LERP

      const x = current.current.x
      const y = current.current.y
      const isDragging = isDraggingRef.current

      // Lines follow cursor directly without smoothing during drag, smoothed normally otherwise
      const lineX = isDragging ? mouse.current.x : x
      const lineY = isDragging ? mouse.current.y : y
      if (hLineRef.current) hLineRef.current.style.transform = `translateY(${lineY}px)`
      if (vLineRef.current) vLineRef.current.style.transform = `translateX(${lineX}px)`

      // Square: snap to element or follow cursor - use same smoothed position as lines for consistent timing
      let targetX: number
      let targetY: number
      let targetW: number
      let targetH: number

      if (lockedEl.current) {
        const rect = lockedEl.current.getBoundingClientRect()
        targetX = rect.left - PAD
        targetY = rect.top - PAD
        targetW = rect.width + PAD * 2
        targetH = rect.height + PAD * 2
      } else {
        targetX = x - SQUARE / 2
        targetY = y - SQUARE / 2
        targetW = SQUARE
        targetH = SQUARE
      }

      const lerpFactor = lockedEl.current ? LERP_SNAP : 0.3
      sq.current.x += (targetX - sq.current.x) * lerpFactor
      sq.current.y += (targetY - sq.current.y) * lerpFactor
      sq.current.w += (targetW - sq.current.w) * lerpFactor
      sq.current.h += (targetH - sq.current.h) * lerpFactor

      if (squareRef.current) {
        squareRef.current.style.transform = `translate(${sq.current.x}px, ${sq.current.y}px)`
        squareRef.current.style.width = `${sq.current.w}px`
        squareRef.current.style.height = `${sq.current.h}px`
        squareRef.current.style.opacity = isDragging ? '0' : '1'
      }

      // Drag rectangle - follows cursor directly without smoothing
      const sx = dragStartRef.current.x
      const sy = dragStartRef.current.y
      const dcx = mouse.current.x
      const dcy = mouse.current.y
      const rx = Math.min(sx, dcx)
      const ry = Math.min(sy, dcy)
      const rw = Math.abs(dcx - sx)
      const rh = Math.abs(dcy - sy)

      if (dragStartLineHRef.current) {
        dragStartLineHRef.current.style.transform = `translateY(${sy}px)`
        dragStartLineHRef.current.style.opacity = showDragOverlay && isDragging ? '1' : '0'
      }
      if (dragStartLineVRef.current) {
        dragStartLineVRef.current.style.transform = `translateX(${sx}px)`
        dragStartLineVRef.current.style.opacity = showDragOverlay && isDragging ? '1' : '0'
      }
      if (dragRectRef.current) {
        dragRectRef.current.style.transform = `translate(${rx}px, ${ry}px)`
        dragRectRef.current.style.width = `${rw}px`
        dragRectRef.current.style.height = `${rh}px`
        dragRectRef.current.style.opacity = showDragOverlay && isDragging ? '1' : '0'
      }

      // Pixelation canvas — always full-viewport size, content drawn only in drag region
      const overlayCanvas = dragPixelCanvasRef.current
      if (overlayCanvas) {
        const dpr = window.devicePixelRatio || 1
        const vw = window.innerWidth
        const vh = window.innerHeight
        const bvw = Math.round(vw * dpr)
        const bvh = Math.round(vh * dpr)
        // Keep bitmap in sync with viewport (resize guard)
        if (overlayCanvas.width !== bvw || overlayCanvas.height !== bvh) {
          overlayCanvas.width = bvw
          overlayCanvas.height = bvh
          overlayCanvas.style.width = `${vw}px`
          overlayCanvas.style.height = `${vh}px`
        }
        const ctx = overlayCanvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, bvw, bvh)
          if (showDragOverlay && isDragging && rw > 4 && rh > 4) {
            const srcCanvas = document.getElementById('r3f-main-canvas') as HTMLCanvasElement | null
            if (srcCanvas) {
              // getBoundingClientRect gives the actual CSS rect of the R3F canvas
              const srcBCR = srcCanvas.getBoundingClientRect()
              const scaleX = srcCanvas.width / srcBCR.width
              const scaleY = srcCanvas.height / srcBCR.height
              if (!offscreenCanvas) offscreenCanvas = document.createElement('canvas')
              const lowW = Math.max(1, Math.floor(rw / PIXEL_SIZE))
              const lowH = Math.max(1, Math.floor(rh / PIXEL_SIZE))
              offscreenCanvas.width = lowW
              offscreenCanvas.height = lowH
              const offCtx = offscreenCanvas.getContext('2d')
              if (offCtx) {
                offCtx.imageSmoothingEnabled = false
                offCtx.drawImage(
                  srcCanvas,
                  (rx - srcBCR.left) * scaleX, (ry - srcBCR.top) * scaleY,
                  rw * scaleX, rh * scaleY,
                  0, 0, lowW, lowH
                )
                ctx.imageSmoothingEnabled = false
                // Draw pixelated content into the drag region (bitmap coordinates)
                ctx.drawImage(offscreenCanvas, 0, 0, lowW, lowH, rx * dpr, ry * dpr, rw * dpr, rh * dpr)
              }
            }
          }
        }
        overlayCanvas.style.opacity = showDragOverlay && isDragging && rw > 4 && rh > 4 ? '1' : '0'
      }

      // Coordinate labels - also follow cursor directly during drag
      const labelX = isDragging ? mouse.current.x : x
      const labelY = isDragging ? mouse.current.y : y
      const xInt = Math.round(labelX)
      const yInt = Math.round(labelY)

      if (labelLeftRef.current) {
        labelLeftRef.current.style.transform = `translateY(${labelY}px)`
        labelLeftRef.current.textContent = `${xInt}`
      }
      if (labelRightRef.current) {
        labelRightRef.current.style.transform = `translateY(${labelY}px)`
        labelRightRef.current.textContent = `${xInt}`
      }
      if (labelTopRef.current) {
        labelTopRef.current.style.transform = `translateX(${labelX}px)`
        labelTopRef.current.textContent = `${yInt}`
      }
      if (labelBottomRef.current) {
        labelBottomRef.current.style.transform = `translateX(${labelX}px)`
        labelBottomRef.current.textContent = `${yInt}`
      }

      raf = window.requestAnimationFrame(tick)
    }

    raf = window.requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerover', onPointerOver)
      window.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.cancelAnimationFrame(raf)
      document.body.style.cursor = previousCursor
    }
  }, [enabled, showDragOverlay])

  if (!enabled) return null

  const slotIdx = hdriSlotIndex !== undefined ? hdriSlotIndex : 3
  const [lineColor, squareColor, labelColor] = SLOT_COLORS[slotIdx] ?? SLOT_COLORS[3]

  return (
    <>
      {/* Horizontal line */}
      <div
        ref={hLineRef}
        className="fixed left-0 top-0 z-9999 pointer-events-none w-screen"
        style={{
          height: '0.5px',
          backgroundColor: lineColor,
          mixBlendMode: 'difference',
          transform: 'translateY(-200px)',
        }}
      />
      {/* Vertical line */}
      <div
        ref={vLineRef}
        className="fixed left-0 top-0 z-9999 pointer-events-none h-screen"
        style={{
          width: '0.5px',
          backgroundColor: lineColor,
          mixBlendMode: 'difference',
          transform: 'translateX(-200px)',
        }}
      />
      {/* Square */}
      <div
        ref={squareRef}
        className="fixed left-0 top-0 z-9999 pointer-events-none"
        style={{
          width: SQUARE,
          height: SQUARE,
          border: `1px solid ${squareColor}`,
          mixBlendMode: 'difference',
          transform: 'translate(-200px, -200px)',
          transition: 'border-color 0.2s ease, opacity 0.2s ease',
          willChange: 'transform, width, height',
        }}
      />

      {/* Drag — anchor H line (fixed at drag-start Y) */}
      <div
        ref={dragStartLineHRef}
        className="fixed left-0 top-0 z-9999 pointer-events-none w-screen"
        style={{
          height: '0.5px',
          backgroundColor: lineColor,
          mixBlendMode: 'difference',
          transform: 'translateY(-200px)',
          opacity: 0,
          transition: 'opacity 0.25s ease',
        }}
      />
      {/* Drag — anchor V line (fixed at drag-start X) */}
      <div
        ref={dragStartLineVRef}
        className="fixed left-0 top-0 z-9999 pointer-events-none h-screen"
        style={{
          width: '0.5px',
          backgroundColor: lineColor,
          mixBlendMode: 'difference',
          transform: 'translateX(-200px)',
          opacity: 0,
          transition: 'opacity 0.25s ease',
        }}
      />
      {/* Drag — pixelation canvas, full-viewport, content drawn in drag region */}
      <canvas
        ref={dragPixelCanvasRef}
        className="fixed pointer-events-none"
        style={{
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9998,
          imageRendering: 'pixelated',
          opacity: 0,
        }}
      />
      {/* Drag — border rect on top of the canvas */}
      <div
        ref={dragRectRef}
        className="fixed left-0 top-0 z-9999 pointer-events-none"
        style={{
          outline: '0.1px solid rgba(255, 255, 255, 0.2)',
          transform: 'translate(-200px, -200px)',
          opacity: 0,
          willChange: 'transform, width, height',
        }}
      />

      {/* Label left */}
      <div
        ref={labelLeftRef}
        className="fixed left-0 top-0 z-9999 pointer-events-none select-none"
        style={{
          fontFamily: 'monospace',
          fontSize: '9px',
          fontWeight: 300,
          color: labelColor,
          mixBlendMode: 'difference',
          transform: 'translateY(-200px)',
          padding: '0 6px',
          lineHeight: '1',
          marginTop: '-8px',
        }}
      />

      {/* Label right */}
      <div
        ref={labelRightRef}
        className="fixed right-0 top-0 z-9999 pointer-events-none select-none"
        style={{
          fontFamily: 'monospace',
          fontSize: '9px',
          fontWeight: 300,
          color: labelColor,
          mixBlendMode: 'difference',
          transform: 'translateY(-200px)',
          padding: '0 6px',
          lineHeight: '1',
          marginTop: '-8px',
        }}
      />

      {/* Label top */}
      <div
        ref={labelTopRef}
        className="fixed left-0 top-0 z-9999 pointer-events-none select-none"
        style={{
          fontFamily: 'monospace',
          fontSize: '9px',
          fontWeight: 300,
          color: labelColor,
          mixBlendMode: 'difference',
          transform: 'translateX(-200px)',
          writingMode: 'vertical-rl',
          padding: '6px 0',
          lineHeight: '1',
          marginLeft: '3px',
        }}
      />

      {/* Label bottom */}
      <div
        ref={labelBottomRef}
        className="fixed left-0 bottom-0 z-9999 pointer-events-none select-none"
        style={{
          fontFamily: 'monospace',
          fontSize: '9px',
          fontWeight: 300,
          color: labelColor,
          mixBlendMode: 'difference',
          transform: 'translateX(-200px)',
          writingMode: 'vertical-rl',
          padding: '6px 0',
          lineHeight: '1',
          marginLeft: '3px',
        }}
      />
    </>
  )
}
