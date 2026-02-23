'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Loader } from '@/components/Loader'
import { useUnderwater } from '@/contexts/UnderwaterContext'
import Constellation from '@/components/scene/Constellation'
import { CustomCursor } from '@/components/CustomCursor'
import Header from '@/components/Header'
import { FPSCounter } from '@/components/FPSCounter'

const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
})

export default function Home() {
  const { isUnderwater, setIsUnderwater, isInSpace, setIsInSpace } = useUnderwater()
  const [isLoaded, setIsLoaded] = useState(false)
  const [underwaterRequest, setUnderwaterRequest] = useState<{ toUnderwater: boolean; id: number } | null>(null)
  const [carouselMode, setCarouselMode] = useState<'vertical' | 'horizontal'>('vertical')

  const environment = isInSpace ? 'space' : isUnderwater ? 'underwater' : 'surface'

  // Direct underwater mode from URL param (no animation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('underwater') === '1') {
      setIsUnderwater(true)
      // Clean the URL without triggering a navigation
      window.history.replaceState({}, '', '/')
    }
  }, [setIsUnderwater])

  return (
    <main className="w-full overflow-hidden h-screen">
      {!isLoaded && <Loader onLoaded={() => setIsLoaded(true)} />}
      <Header
        isUnderwater={isUnderwater}
        onSpaceToggle={(value) => {
          setIsUnderwater(false)
          setIsInSpace(value)
        }}
        onWorkToggle={() => {
          setIsInSpace(false)
          setUnderwaterRequest({ toUnderwater: true, id: Date.now() })
        }}
      />

      <CustomCursor
        enabled={isLoaded}
        environment={environment}
        onRequest={(request) => {
          if (request === 'to-underwater') {
            // Animation gérée dans la Scene
            setIsInSpace(false)
            setUnderwaterRequest({ toUnderwater: true, id: Date.now() })
          } else if (request === 'to-space') {
            // Pas de toggle underwater ici
            setIsUnderwater(false)
            setIsInSpace(true)
          } else if (request === 'to-surface') {
            setIsInSpace(false)
            if (isUnderwater) {
              setUnderwaterRequest({ toUnderwater: false, id: Date.now() })
            } else {
              setIsUnderwater(false)
            }
          }
        }}
      />
      
      {/* {isInSpace && <Constellation isVisible={true} />} */}

      {isLoaded && isUnderwater && !isInSpace && (
        <div className="fixed left-6 bottom-6 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={() => {
              setCarouselMode((prev) => (prev === 'vertical' ? 'horizontal' : 'vertical'))
            }}
            className="rounded-full border border-white/30 bg-white/5 px-3 py-2 text-[11px] tracking-[0.22em] text-white/75 backdrop-blur-sm transition hover:border-white/50 hover:text-white/90"
          >
            TUBE {carouselMode === 'vertical' ? 'VERTICAL' : 'HORIZONTAL'}
          </button>
        </div>
      )}
      
      <div className="fixed inset-0 z-0">
        <Scene 
          onUnderwaterToggle={setIsUnderwater} 
          isUnderwater={isUnderwater} 
          isInSpace={isInSpace}
          underwaterRequest={underwaterRequest}
          carouselMode={carouselMode}
        />
      </div>

      <FPSCounter />
    </main>
  )
}
