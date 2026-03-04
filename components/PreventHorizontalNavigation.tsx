'use client'

import { useEffect } from 'react'

function isHorizontallyScrollable(el: HTMLElement) {
  const style = window.getComputedStyle(el)
  const overflowX = style.overflowX
  const canScroll = (overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth
  return canScroll
}

export default function PreventHorizontalNavigation() {
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      // Only care about predominantly horizontal scroll gestures.
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return

      // Allow if the event happened inside an actual horizontal scroller.
      let node = e.target as HTMLElement | null
      while (node && node !== document.body) {
        if (node instanceof HTMLElement && isHorizontallyScrollable(node)) return
        node = node.parentElement
      }

      // Best-effort prevention of browser back/forward swipe.
      e.preventDefault()
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  return null
}
