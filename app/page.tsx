'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Loader } from '@/components/Loader'
import { useUnderwater } from '@/contexts/UnderwaterContext'
import Constellation from '@/components/scene/Constellation'
import { CustomCursor } from '@/components/CustomCursor'
import Header from '@/components/Header'
import { FPSCounter } from '@/components/FPSCounter'
import AudioControls from '@/components/AudioControls'

const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
})

export default function Home() {
  const { isUnderwater, setIsUnderwater, isInSpace, setIsInSpace } = useUnderwater()
  const [isLoaded, setIsLoaded] = useState(false)
  const [instantSpaceEntry, setInstantSpaceEntry] = useState(false)
  const [underwaterRequest, setUnderwaterRequest] = useState<{ toUnderwater: boolean; id: number } | null>(null)
  const [carouselMode, setCarouselMode] = useState<'vertical' | 'horizontal'>('vertical')
  const [volumes, setVolumes] = useState<{ [key: string]: number }>({
    mainSceneBackSound: 0.3,
    mainScenePlusSound: 0.25,
    underwaterSceneBackSound: 0.2,
    spaceSceneBackSound: 0.25,
  })

  const environment = isInSpace ? 'space' : isUnderwater ? 'underwater' : 'surface'

  // Direct underwater mode from URL param (no animation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('underwater') === '1') {
      setIsUnderwater(true)
      // Clean the URL without triggering a navigation
      window.history.replaceState({}, '', '/')
      return
    }

    if (params.get('space') === '1') {
      setIsUnderwater(false)
      setIsInSpace(true)
      setInstantSpaceEntry(true)
      window.history.replaceState({}, '', '/')
    }
  }, [setIsInSpace, setIsUnderwater])

  const handleVolumeChange = (key: string, volume: number) => {
    setVolumes((prev) => ({ ...prev, [key]: volume }))
  }

  return (
    <main className="w-full overflow-hidden h-screen">
      {!isLoaded && <Loader onLoaded={() => setIsLoaded(true)} />}
      
      {isLoaded && (
        <Header
          isUnderwater={isUnderwater}
          isInSpace={isInSpace}
          onSpaceToggle={(value) => {
            setIsUnderwater(false)
            setIsInSpace(value)
          }}
          onWorkToggle={() => {
            setIsInSpace(false)
            setUnderwaterRequest({ toUnderwater: true, id: Date.now() })
          }}
        />
      )}

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

      {isLoaded && !isInSpace && (
        <>
          <AudioControls volumes={volumes} onVolumeChange={handleVolumeChange} />
        </>
      )}
      
      <div className="fixed inset-0 z-0">
        <Scene 
          onUnderwaterToggle={setIsUnderwater} 
          isUnderwater={isUnderwater} 
          isInSpace={isInSpace}
          instantSpaceEntry={instantSpaceEntry}
          underwaterRequest={underwaterRequest}
          volumes={volumes}
        />
      </div>

      {/* <FPSCounter /> */}
    </main>
  )
}
