'use client'

import { createContext, useContext, useCallback, useState, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { InkRevealCanvas } from '@/components/loaders/InkRevealCanvas'

const CLOSE_MS  = 1000  // ink sweeps in  (uP: 0 → 1, ease-in cubic)
const HOLD_MS   = 500  // fully black hold + route push
const REVEAL_MS = 1000  // ink sweeps out (uP: 1 → 0, ease-out cubic)

type RGB = [number, number, number]
type TransitionContextType = { navigate: (href: string, onCovered?: () => void, color?: RGB) => void; isTransitioning: boolean; pendingHref: string | null }
const TransitionContext = createContext<TransitionContextType>({ navigate: () => {}, isTransitioning: false, pendingHref: null })

function SequenceTransitionOverlay({ href, onCovered, onDone, color }: { href: string; onCovered?: () => void; onDone: () => void; color?: RGB }) {
  const router = useRouter()
  const [shaderP, setShaderP] = useState(0.0)
  const onDoneRef    = useRef(onDone)
  const onCoveredRef = useRef(onCovered)
  useEffect(() => { onDoneRef.current = onDone },       [onDone])
  useEffect(() => { onCoveredRef.current = onCovered }, [onCovered])

  useEffect(() => {
    let rafId: number
    let cancelled = false

    // Phase 1: close — ink fills screen (shaderP 0→1, ease-in cubic)
    const closeStart = performance.now()
    const animateClose = (now: number) => {
      if (cancelled) return
      const t = Math.min((now - closeStart) / CLOSE_MS, 1)
      const eased = t * t * t // ease-in cubic
      setShaderP(eased)
      if (t < 1) {
        rafId = requestAnimationFrame(animateClose)
      } else {
        // Fully covered — fire onCovered and push route
        onCoveredRef.current?.()
        router.push(href)
        // Hold phase
        setTimeout(() => {
          if (cancelled) return
          // Phase 2: reveal — ink recedes (shaderP 1→0, ease-out cubic)
          const revealStart = performance.now()
          const animateReveal = (now: number) => {
            if (cancelled) return
            const t = Math.min((now - revealStart) / REVEAL_MS, 1)
            const eased = 1 - (1 - t) * (1 - t) * (1 - t) // ease-out cubic
            setShaderP(1 - eased)
            if (t < 1) {
              rafId = requestAnimationFrame(animateReveal)
            } else {
              onDoneRef.current()
            }
          }
          rafId = requestAnimationFrame(animateReveal)
        }, HOLD_MS)
      }
    }
    rafId = requestAnimationFrame(animateClose)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
    }
  }, [href, router])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'all' }}>
      <InkRevealCanvas progress={shaderP} color={color} />
    </div>
  )
}

export function TransitionProvider({ children }: { children: ReactNode }) {
  const [transition, setTransition] = useState<{ href: string; onCovered?: () => void; color?: RGB } | null>(null)

  const navigate = useCallback((href: string, onCovered?: () => void, color?: RGB) => {
    if (transition) return
    setTransition({ href, onCovered, color })
  }, [transition])

  return (
    <TransitionContext.Provider value={{ navigate, isTransitioning: transition !== null, pendingHref: transition?.href ?? null }}>
      {children}
      {transition && (
        <SequenceTransitionOverlay
          href={transition.href}
          onCovered={transition.onCovered}
          onDone={() => setTransition(null)}
          color={transition.color}
        />
      )}
    </TransitionContext.Provider>
  )
}

export const usePageTransition = () => useContext(TransitionContext)

