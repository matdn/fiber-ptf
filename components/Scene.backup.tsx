'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Water } from './Water'
import * as THREE from 'three'
import { EffectComposer, Bloom, SMAA, ChromaticAberration } from '@react-three/postprocessing'
import { Preload } from '@react-three/drei'
import gsap from 'gsap'
import { Model } from './scene/Model'
import { CameraFollowMouse } from './scene/CameraFollowMouse'
import { CurveRotation } from './scene/CurveRotation'
import { UnderwaterRaysEffect } from './scene/UnderwaterRaysEffect'
import { DisplacementTransitionEffect } from './scene/DisplacementTransitionEffect'
import { Fluid } from '@whatisjery/react-fluid-distortion'
import { CurveParticles } from './scene/CurveParticles'
import { Stars } from './scene/Stars'
import { OrbitingRocks } from './scene/OrbitingRocks'
import { UnderwaterProjectsCarousel } from './scene/UnderwaterProjectsCarousel'
import { useAudio } from '@/hooks/useAudio'

export default function Scene({ onUnderwaterToggle, isUnderwater, isInSpace, underwaterRequest, carouselMode, volumes, onVolumeChange }: { 
  onUnderwaterToggle: (value: boolean) => void
  isUnderwater: boolean
  isInSpace: boolean
  underwaterRequest?: { toUnderwater: boolean; id: number } | null
  carouselMode?: 'vertical' | 'horizontal'
  volumes?: { [key: string]: number }
  onVolumeChange?: (key: string, volume: number) => void
}) {
  const [curvePosition, setCurvePosition] = useState<THREE.Vector3 | null>(null)
  const [curveObject, setCurveObject] = useState<THREE.Object3D | null>(null)
  const [curveStarPosition, setCurveStarPosition] = useState<THREE.Vector3 | null>(null)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [bloomIntensity, setBloomIntensity] = useState(0.1)
  const [underwaterFog, setUnderwaterFog] = useState({ near: 10, far: 150 })
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false)
  const [pendingUnderwaterReveal, setPendingUnderwaterReveal] = useState(false)
  const [showFluidEffect, setShowFluidEffect] = useState(false)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const flashOverlayRef = useRef<HTMLDivElement>(null)
  const { initAudio, playSound, stopSound, setVolume } = useAudio()
  
  const initialCameraPosition = useMemo(() => new THREE.Vector3(-20, -10, -10), [])
  const vignetteColor = useMemo(() => '#000000', [])
  const underwaterRaysEffect = useMemo(() => new UnderwaterRaysEffect(), [])
  const displacementEffect = useMemo(() => new DisplacementTransitionEffect(), [])

  const ULTRA_FOG = useMemo(() => ({ near: 0.005, far: 0.45 }), [])
  const DEFAULT_UNDERWATER_FOG = useMemo(() => ({ near: 10, far: 150 }), [])

  useEffect(() => {
    const handleScroll = () => {
      if (isInSpace) return
      setScrollOffset(window.scrollY * 0.01)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isInSpace])

  // Initialize audio
  useEffect(() => {
    const volumeSettings = volumes || {
      mainSceneBackSound: 0.3,
      mainScenePlusSound: 0.25,
      underwaterSceneBackSound: 0.2,
    }
    
    initAudio('mainSceneBackSound', {
      url: '/sounds/mainSceneBackSound.mp3',
      volume: volumeSettings.mainSceneBackSound,
      loop: true,
    })
    initAudio('mainScenePlusSound', {
      url: '/sounds/mainScenePlusSound.mp3',
      volume: volumeSettings.mainScenePlusSound,
      loop: true,
    })
    initAudio('underwaterSceneBackSound', {
      url: '/sounds/underwaterSceneBackSound.mp3',
      volume: volumeSettings.underwaterSceneBackSound,
      loop: true,
    })
  }, [initAudio, volumes])

  // Update volume when it changes
  useEffect(() => {
    if (volumes) {
      Object.entries(volumes).forEach(([key, volume]) => {
        setVolume(key, volume)
      })
    }
  }, [volumes, setVolume])

  // Play/stop sounds based on environment
  const syncEnvironmentAudio = useCallback(() => {
    if (isInSpace) {
      stopSound('mainSceneBackSound')
      stopSound('mainScenePlusSound')
      stopSound('underwaterSceneBackSound')
    } else if (isUnderwater) {
      stopSound('mainSceneBackSound')
      stopSound('mainScenePlusSound')
      playSound('underwaterSceneBackSound')
    } else {
      playSound('mainSceneBackSound')
      playSound('mainScenePlusSound')
      stopSound('underwaterSceneBackSound')
    }
  }, [isUnderwater, isInSpace, playSound, stopSound])

  useEffect(() => {
    syncEnvironmentAudio()
  }, [syncEnvironmentAudio])

  // Retry once after first user interaction (required by autoplay policies)
  useEffect(() => {
    const retryPlayback = () => {
      syncEnvironmentAudio()
    }

    window.addEventListener('pointerdown', retryPlayback, { once: true })
    window.addEventListener('touchstart', retryPlayback, { once: true })
    window.addEventListener('keydown', retryPlayback, { once: true })

    return () => {
      window.removeEventListener('pointerdown', retryPlayback)
      window.removeEventListener('touchstart', retryPlayback)
      window.removeEventListener('keydown', retryPlayback)
    }
  }, [syncEnvironmentAudio])

  useEffect(() => {
    const noop = (e: Event) => e.preventDefault()

    if (isInSpace) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      window.addEventListener('wheel', noop, { passive: false })
      window.addEventListener('touchmove', noop, { passive: false })
      // also block on the canvas so nothing beneath can react to scroll
      const canvas = document.querySelector('canvas')
      if (canvas) canvas.addEventListener('wheel', noop, { passive: false })
    }

    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      window.removeEventListener('wheel', noop)
      window.removeEventListener('touchmove', noop)
      const canvas = document.querySelector('canvas')
      if (canvas) canvas.removeEventListener('wheel', noop)
    }
  }, [isInSpace])

  const triggerUnderwaterTransition = useCallback((toUnderwater: boolean) => {
    if (cameraRef.current && !isTransitioning) {
      setIsTransitioning(true)
      const duration = toUnderwater ? 4.5 : 4.0

      Promise.resolve().then(() => setBloomIntensity(0))

      // Caméra qui plonge / remonte
      gsap.to(cameraRef.current.position, {
        y: cameraRef.current.position.y + (toUnderwater ? -15 : 15),
        duration,
        ease: 'power2.inOut',
        onUpdate: function() {
          const progress = this.progress()
          displacementEffect.setProgress(progress)
          if (progress >= 0.5 && progress < 0.52 && isUnderwater !== toUnderwater) {
            if (toUnderwater) {
              setPendingUnderwaterReveal(true)
              // Lazy-load Fluid effect after mode switch to avoid FPS spike
              setTimeout(() => setShowFluidEffect(true), 100)
            }
            Promise.resolve().then(() => onUnderwaterToggle(toUnderwater))
          }
        },
        onComplete: () => {
          displacementEffect.setProgress(0)
          setIsTransitioning(false)
          setBloomIntensity(toUnderwater ? 0 : 0.1)
        }
      })

      // Splash du curve : scale up brutal puis elastic retour
      if (curveObject) {
        const s = curveObject.scale
        const sx = s.x, sy = s.y, sz = s.z
        gsap.timeline()
          .to(s, {
            x: sx * 28, y: sy * 28, z: sz * 28,
            duration: duration * 0.20,
            delay: duration * (toUnderwater ? 0.22 : 0.16),
            ease: 'power3.out'
          })
          .to(s, {
            x: sx, y: sy, z: sz,
            duration: duration * 0.48,
            ease: 'elastic.out(1, 0.48)'
          })
      }

      // Fade blanc couplé à la transition
      setShowTransitionOverlay(true)

      gsap.delayedCall(0, () => {
        if (!flashOverlayRef.current) return

        const flashTimeline = gsap.timeline({ delay: duration * 0.25 })

        if (toUnderwater) {
          flashTimeline
            .set(flashOverlayRef.current, { opacity: 0 })
            .to(flashOverlayRef.current, {
              opacity: 1,
              duration: duration * 0.24,
              ease: 'power3.inOut',
            })
            .call(() => {
              setUnderwaterFog(ULTRA_FOG)
            })
        } else {
          flashTimeline
            .to(flashOverlayRef.current, { opacity: 1, duration: duration * 0.20, ease: 'power3.inOut' })
            .to(flashOverlayRef.current, {
              opacity: 0,
              duration: duration * 0.55,
              ease: 'power2.out',
              onComplete: () => setShowTransitionOverlay(false),
            })
        }
      })
    }
  }, [onUnderwaterToggle, isUnderwater, isTransitioning, displacementEffect, curveObject, ULTRA_FOG])

  useEffect(() => {
    if (!underwaterRequest) return
    if (underwaterRequest.toUnderwater === isUnderwater) return
    if (isInSpace) return
    triggerUnderwaterTransition(underwaterRequest.toUnderwater)
  }, [underwaterRequest, isUnderwater, isInSpace, triggerUnderwaterTransition])

  // Gérer la transition vers l'espace
  useEffect(() => {
    if (cameraRef.current && isInSpace && !isTransitioning) {
      setIsTransitioning(true)
      
      gsap.to(cameraRef.current.position, {
        x: 0,
        y: 200,
        z: 30,
        duration: 4,
        ease: 'power2.inOut',
        onComplete: () => {
          setIsTransitioning(false)
        }
      })
    }
  }, [isInSpace, isTransitioning])

  useEffect(() => {
    if (!isUnderwater || !pendingUnderwaterReveal) return

    setUnderwaterFog(ULTRA_FOG)

    const fogValues = { ...ULTRA_FOG }
    let updateCount = 0
    const revealTimeline = gsap.timeline({
      onComplete: () => {
        setPendingUnderwaterReveal(false)
        setShowTransitionOverlay(false)
      }
    })

    revealTimeline.to(fogValues, {
      near: DEFAULT_UNDERWATER_FOG.near,
      far: DEFAULT_UNDERWATER_FOG.far,
      duration: 3.2,
      ease: 'power2.out',
      onUpdate: () => {
        // Throttle state updates: skip every other frame (~30 FPS instead of 60)
        updateCount++
        if (updateCount % 2 === 0) {
          setUnderwaterFog({ near: fogValues.near, far: fogValues.far })
        }
      }
    }, 0)

    if (flashOverlayRef.current) {
      revealTimeline.to(flashOverlayRef.current, {
        opacity: 0,
        duration: 2.2,
        ease: 'power2.out'
      }, 0.2)
    }

    return () => {
      revealTimeline.kill()
    }
  }, [isUnderwater, pendingUnderwaterReveal, ULTRA_FOG, DEFAULT_UNDERWATER_FOG])

  return (
    <div className="w-full h-screen fixed" style={{ mixBlendMode: isUnderwater ? 'screen' : 'normal' }}>
      <Canvas
        camera={{ position: [-20, -10, -10], fov: 40 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          cameraRef.current = camera
        }}
      >
        <color attach="background" args={['#000']} />
        {isUnderwater && <fog attach="fog" args={['#ffffff', underwaterFog.near, underwaterFog.far]} />}
        <pointLight position={[10, 10, 10]} intensity={15000} />
        {/* Lazy ambientLight: avoid re-renders during transition */}
        <ambientLight intensity={isUnderwater && !isTransitioning ? 2 : 0.3} />
        
        <CameraFollowMouse 
          initialPosition={initialCameraPosition} 
          curvePosition={curvePosition} 
          curveStarPosition={curveStarPosition}
          scrollOffset={scrollOffset}
          isInSpace={isInSpace}
        />
        <CurveRotation curveObject={curveObject} />
        
        {isInSpace && <Stars count={2000} />}
        {isInSpace && <Stars count={800} position={[0, 200, 0]} radius={80} />}
        
        <Suspense fallback={null}>
          <Model 
            onCurveFound={setCurvePosition} 
            onCurveRefFound={setCurveObject}
            onCurveStarFound={setCurveStarPosition}
            isUnderwater={isUnderwater}
            isInSpace={isInSpace}
          />
          <UnderwaterProjectsCarousel
            isActive={isUnderwater && !isInSpace}
            centerPosition={curvePosition}
            mode={carouselMode}
          />
          <CurveParticles curvePosition={curvePosition} isUnderwater={isUnderwater} />
          <OrbitingRocks 
            centerPosition={curveStarPosition || new THREE.Vector3(0, 200, 0)} 
            isVisible={isInSpace}
          />
          <group 
            rotation={isUnderwater ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0]}
            position={isUnderwater ? [0, 0, 0] : [0, -20, 0]}
          >
            <Water />
          </group>
        </Suspense>
        
        <EffectComposer multisampling={0}>
          {isUnderwater && showFluidEffect ? (
            <Fluid 
              rainbow={false} 
              intensity={1} 
              fluidColor="#000000"
              radius={0.5}
            />
          ) : (
            <></>
          )}
          <primitive object={displacementEffect} />
          {bloomIntensity > 0 ? (
            <Bloom 
              intensity={bloomIntensity}
              luminanceThreshold={0.9}
              luminanceSmoothing={0.3}
              radius={0.8}
              mipmapBlur
            />
          ) : (
            <></>
          )}
          <SMAA />
          {isUnderwater ? (
            <>
              <primitive object={underwaterRaysEffect} />
              <ChromaticAberration 
                offset={[0.002, 0.002]}
              />
            </>
          ) : (
            <></>
          )}
        </EffectComposer>
        
        <Preload all />
      </Canvas>
      
      {showTransitionOverlay && (
        <div
          ref={flashOverlayRef}
          className="absolute inset-0 pointer-events-none bg-white"
          style={{ opacity: 0, zIndex: 10 }}
        />
      )}

      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: !isUnderwater 
            ? `radial-gradient(circle at center, transparent 60%, ${vignetteColor} 100%)` 
            : 'none',
          opacity: isUnderwater ? 0 : 1,
          transition: 'opacity 0.5s ease-out'
        }}
      />
    </div>
  )
}
