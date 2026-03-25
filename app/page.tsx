'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { Loader } from '@/components/Loader'
import { useUnderwater } from '@/contexts/UnderwaterContext'
import { CustomCursor } from '@/components/CustomCursor'
import Header from '@/components/Header'
import AudioControls from '@/components/AudioControls'
import { TIME_SLOTS, getCurrentTimeSlot } from '@/lib/hdriSlots'
import { HDRIEnvironment } from '@/components/scene/HDRIEnvironment'
import { DevPanel } from '@/components/DevPanel'

const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
})

function MobileHeaderCurve() {
  const { scene } = useGLTF('/3D/m.glb')
  const [curve, setCurve] = useState<THREE.Object3D | null>(null)

  useEffect(() => {
    let clonedCurve: THREE.Object3D | null = null

    scene.traverse((child) => {
      if (child.name.toLowerCase() !== 'curve' || clonedCurve) return
      clonedCurve = child.clone()
      const mesh = clonedCurve as THREE.Mesh
      if (mesh.material) {
        mesh.material = new THREE.MeshBasicMaterial({ color: 0xffffff })
      }
    })

    setCurve(clonedCurve)

    return () => {
      const mesh = clonedCurve as THREE.Mesh | null
      ;(mesh?.material as THREE.Material | undefined)?.dispose?.()
    }
  }, [scene])

  useFrame((state) => {
    if (!curve) return
    curve.rotation.z = state.clock.elapsedTime * 0.5
    curve.rotation.y = Math.PI * 0.12
    curve.scale.setScalar(3.2)
  })

  if (!curve) return null
  return <primitive object={curve} />
}

function MobileSimpleLanding({ hdriSlotIndex }: { hdriSlotIndex: number }) {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }} gl={{ alpha: false, antialias: true }}>
          <HDRIEnvironment active={true} forcedSlotIndex={hdriSlotIndex} />
          <ambientLight intensity={80} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <MobileHeaderCurve />
        </Canvas>
      </div>

      <section
        className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-5 text-center text-white"
        style={{ mixBlendMode: 'difference', fontFamily: 'Neopixel, sans-serif' }}
      >
        <p style={{ fontFamily: 'MabryPro, sans-serif', fontWeight: '300' }} className="max-w-[13ch] text-[16vw] font-medium uppercase leading-[0.9] tracking-[0.08em]">
          MATIS DN 
        </p>
        <p style={{ fontFamily: 'MabryPro, sans-serif', fontWeight: '300' }} className="max-w-[13ch] text-[12vw] font-medium uppercase leading-[0.9] tracking-[0.08em]">
          PORTFOLIO
        </p> 
        <p className="mt-6 max-w-[30ch] text-[3.4vw] lowercase  tracking-[0.12em] text-white/85">
          CREATIVE TECHNOLOGIST, FREELANCEUR, AND STUDENT BUILDING VISUAL, INTERACTIVE, AND IMMERSIVE WEB STORIES.
        </p>
        <p className="mt-3 text-[3.1vw] font-bold uppercase  text-white/80 fixed bottom-8 left-1/2 transform -translate-x-1/2" style={{ fontFamily: 'MabryPro, sans-serif', fontWeight: '300' }}
>
          FOR THE FULL EXPERIENCE, OPEN ON LAPTOP
        </p>
      </section>
    </main>
  )
}

export default function Home() {
  const { isUnderwater, setIsUnderwater, isInSpace, setIsInSpace } = useUnderwater()
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [instantSpaceEntry, setInstantSpaceEntry] = useState(false)
  const [underwaterRequest, setUnderwaterRequest] = useState<{ toUnderwater: boolean; id: number } | null>(null)
  const [hdriSlotIndex, setHdriSlotIndex] = useState<number>(() => {
    const auto = getCurrentTimeSlot()
    return TIME_SLOTS.indexOf(auto)
  })
  const [volumes, setVolumes] = useState<{ [key: string]: number }>({
    mainSceneBackSound: 0.3,
    mainScenePlusSound: 0.25,
    underwaterSceneBackSound: 0.2,
    spaceSceneBackSound: 0.25,
  })

  const environment = isInSpace ? 'space' : isUnderwater ? 'underwater' : 'surface'

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setIsMobile(media.matches)

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

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

  if (isMobile) {
    return <MobileSimpleLanding hdriSlotIndex={hdriSlotIndex} />
  }

  return (
    <main className="w-full overflow-hidden h-screen">
      {!isLoaded && <Loader onLoaded={() => setIsLoaded(true)} />}
      
      {isLoaded && (
        <Header
          isUnderwater={isUnderwater}
          isInSpace={isInSpace}
          hdriSlotIndex={hdriSlotIndex}
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
        hdriSlotIndex={hdriSlotIndex}
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
          hdriSlotIndex={hdriSlotIndex}
        />
      </div>

      <DevPanel hdriSlotIndex={hdriSlotIndex} onSlotChange={setHdriSlotIndex} />
    </main>
  )
}

useGLTF.preload('/3D/m.glb')
