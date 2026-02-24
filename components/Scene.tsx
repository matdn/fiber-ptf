'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState, useRef, useMemo } from 'react'
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

class EffectsManager {
  private static instance: EffectsManager
  readonly underwaterRaysEffect = new UnderwaterRaysEffect()
  readonly displacementEffect = new DisplacementTransitionEffect()

  static getInstance() {
    if (!EffectsManager.instance) {
      EffectsManager.instance = new EffectsManager()
    }
    return EffectsManager.instance
  }
}

export default function Scene({ 
  onUnderwaterToggle, 
  isUnderwater, 
  isInSpace, 
  underwaterRequest, 
  volumes, 
}: { 
  onUnderwaterToggle: (value: boolean) => void
  isUnderwater: boolean
  isInSpace: boolean
  underwaterRequest?: { toUnderwater: boolean; id: number } | null
  volumes?: { [key: string]: number }
}) {
  // Minimal state: only what absolutely needs to trigger re-renders
  const [curvePosition, setCurvePosition] = useState<THREE.Vector3 | null>(null)
  const [curveObject, setCurveObject] = useState<THREE.Object3D | null>(null)
  const [curveStarPosition, setCurveStarPosition] = useState<THREE.Vector3 | null>(null)
  const [showTransitionOverlay, setShowTransitionOverlay] = useState(false)

  // All animation state lives in refs to prevent re-renders
  const transitionStateRef = useRef({
    isTransitioning: false,
    bloomIntensity: 0.1,
    underwaterFog: { near: 10, far: 150 },
    showFluidEffect: false,
    showUnderwaterEffects: false,
    scrollOffset: 0,
  })

  const cameraRef = useRef<THREE.Camera | null>(null)
  const flashOverlayRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const fpsTrackerRef = useRef<number[]>([])
  const textMaskRef = useRef<HTMLDivElement>(null)
  const { initAudio, playSound, stopSound } = useAudio()
  
  const effectsManager = useMemo(() => EffectsManager.getInstance(), [])
  const ULTRA_FOG = useMemo(() => ({ near: 0.005, far: 0.45 }), [])
  const DEFAULT_UNDERWATER_FOG = useMemo(() => ({ near: 10, far: 150 }), [])
  const overlayLines = useMemo(() => [
    { text: 'gobelins student', weight: 300 },
    { text: 'freelancer', weight: 300 },
    { text: 'creative developer', weight: 600 },
  ], [])
  const overlayTextStyle = useMemo(() => ({
    fontFamily: '"Mabry Pro", sans-serif',
    fontSize: 'clamp(4rem, 6vw, 6rem)',
    letterSpacing: '-0.04em',
    lineHeight: 0.8,
    color: '#ffffff',
    textAlign: 'center' as const,
    paddingTop: '2.5rem',
  }), [])
  const renderOverlayLines = () =>
    overlayLines.map((line) => (
      <h2
        key={line.text}
        style={{ ...overlayTextStyle, fontWeight: line.weight }}
        className="text-white text-4xl"
      >
        {line.text}
      </h2>
    ))

  // Audio initialization (run once)
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

  // Audio sync only
  useEffect(() => {
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

  // Main transition orchestration - all animation logic lives here, preventing re-renders
  useEffect(() => {
    if (!underwaterRequest || underwaterRequest.toUnderwater === isUnderwater || isInSpace) return

    const toUnderwater = underwaterRequest.toUnderwater
    const transState = transitionStateRef.current

    if (transState.isTransitioning) return
    transState.isTransitioning = true

    const duration = toUnderwater ? 4.5 : 4.0
    transState.bloomIntensity = 0

    if (cameraRef.current) {
      gsap.to(cameraRef.current.position, {
        y: cameraRef.current.position.y + (toUnderwater ? -15 : 15),
        duration,
        ease: 'power2.inOut',
        onUpdate: function() {
          const progress = this.progress()
          effectsManager.displacementEffect.setProgress(progress)
          
          if (progress >= 0.5 && progress < 0.52) {
            if (toUnderwater) {
              transState.showFluidEffect = true
              setTimeout(() => {
                transState.showUnderwaterEffects = true
              }, 200)
            }
            onUnderwaterToggle(toUnderwater)
          }
        },
        onComplete: () => {
          effectsManager.displacementEffect.setProgress(0)
          transState.isTransitioning = false
          transState.bloomIntensity = 0
        }
      })
    }

    if (curveObject) {
      const s = curveObject.scale
      const sx = s.x, sy = s.y, sz = s.z
      const curveDelay = duration * (toUnderwater ? 0.22 : 0.16)
      
      gsap.delayedCall(curveDelay, () => {
        setShowTransitionOverlay(true)
      })
      
      gsap.timeline()
        .to(s, {
          x: sx * 28, y: sy * 28, z: sz * 28,
          duration: duration * 0.20,
          delay: curveDelay,
          ease: 'power3.out'
        })
        .to(s, {
          x: sx, y: sy, z: sz,
          duration: duration * 0.48,
          ease: 'elastic.out(1, 0.48)'
        })
    }

    gsap.delayedCall(duration * 0.25, () => {
      if (!flashOverlayRef.current) return
      
      const timeline = gsap.timeline()
      if (toUnderwater) {
        timeline
          .to(flashOverlayRef.current, { opacity: 1, duration: duration * 0.24 })
          .call(() => {
            transState.underwaterFog = { ...ULTRA_FOG }
            const fogTarget = { ...ULTRA_FOG }
            let frameCount = 0
            
            gsap.to(fogTarget, {
              near: DEFAULT_UNDERWATER_FOG.near,
              far: DEFAULT_UNDERWATER_FOG.far,
              duration: 3.2,
              ease: 'power2.out',
              onUpdate: () => {
                frameCount++
                if (frameCount % 4 === 0 && sceneRef.current) {
                  const fog = sceneRef.current.fog as THREE.Fog
                  if (fog) {
                    fog.near = fogTarget.near
                    fog.far = fogTarget.far
                  }
                }
              }
            })
          })
          .add(() => {
            if (!flashOverlayRef.current) return
            
            let checkCount = 0
            let stableFpsCount = 0
            const maxChecks = 200 
            
            const waitForStableFps = () => {
              checkCount++
              
              if (fpsTrackerRef.current.length >= 20) {
                const recentFps = fpsTrackerRef.current.slice(-20)
                const avgFps = recentFps.reduce((a, b) => a + b) / recentFps.length
                
                if (avgFps >= 55) {
                  stableFpsCount++
                } else {
                  stableFpsCount = 0
                }
              }
              
              if (stableFpsCount >= 10 || checkCount >= maxChecks) {
                if (flashOverlayRef.current) {
                  gsap.to(flashOverlayRef.current, {
                    opacity: 0,
                    duration: 1.5,
                    ease: 'power2.out',
                    onComplete: () => {
                      setShowTransitionOverlay(false)
                    }
                  })
                }
              } else {
                requestAnimationFrame(waitForStableFps)
              }
            }
            
            requestAnimationFrame(waitForStableFps)
          }, `+=${duration * 0.3}`)
      } else {
        timeline
          .to(flashOverlayRef.current, { opacity: 1, duration: duration * 0.20 })
          .add(() => {
            if (!flashOverlayRef.current) return
            
            let checkCount = 0
            let stableFpsCount = 0
            const maxChecks = 150
            
            const waitForStableFps = () => {
              checkCount++
              
              if (fpsTrackerRef.current.length >= 20) {
                const recentFps = fpsTrackerRef.current.slice(-20)
                const avgFps = recentFps.reduce((a, b) => a + b) / recentFps.length
                
                if (avgFps >= 55) {
                  stableFpsCount++
                } else {
                  stableFpsCount = 0
                }
              }
              
              if (stableFpsCount >= 10 || checkCount >= maxChecks) {
                if (flashOverlayRef.current) {
                  gsap.to(flashOverlayRef.current, { 
                    opacity: 0, 
                    duration: 1.5,
                    onComplete: () => {
                      setShowTransitionOverlay(false)
                    }
                  })
                }
              } else {
                requestAnimationFrame(waitForStableFps)
              }
            }
            
            requestAnimationFrame(waitForStableFps)
          }, `+=${duration * 0.3}`)
      }
    })

}, [underwaterRequest, isUnderwater, isInSpace, onUnderwaterToggle, effectsManager, ULTRA_FOG, DEFAULT_UNDERWATER_FOG, curveObject])

  useEffect(() => {
    if (!isInSpace || transitionStateRef.current.isTransitioning) return

    if (cameraRef.current) {
      transitionStateRef.current.isTransitioning = true
      gsap.to(cameraRef.current.position, {
        x: 0,
        y: 200,
        z: 30,
        duration: 4,
        ease: 'power2.inOut',
        onComplete: () => {
          transitionStateRef.current.isTransitioning = false
        }
      })
    }
  }, [isInSpace])

  useEffect(() => {
    let lastTime = performance.now()
    const trackFps = () => {
      const now = performance.now()
      const deltaTime = now - lastTime
      lastTime = now
      
      if (deltaTime > 0) {
        const fps = 1000 / deltaTime
        fpsTrackerRef.current.push(fps)
        if (fpsTrackerRef.current.length > 30) {
          fpsTrackerRef.current.shift()
        }
      }
      
      requestAnimationFrame(trackFps)
    }
    
    const animFrameId = requestAnimationFrame(trackFps)
    return () => cancelAnimationFrame(animFrameId)
  }, [])

  useEffect(() => {
    if (!isInSpace) return

    const target = textMaskRef.current
    if (!target) return

    const minSize = 180
    const maxSize = 420
    const lerpFactor = 0.06
    let currentX = -9999
    let currentY = -9999
    let currentSize = minSize
    let targetX = -9999
    let targetY = -9999
    let targetSize = minSize
    let rafId = 0

    const setHidden = () => {
      targetX = -9999
      targetY = -9999
      targetSize = minSize
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = target.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const clampedX = Math.max(0, Math.min(rect.width, x))
      const clampedY = Math.max(0, Math.min(rect.height, y))
      const normX = clampedX / rect.width
      const normY = clampedY / rect.height
      const leftProximity = 1 - normX
      const bottomProximity = normY
      const proximityToBottomLeft = Math.pow(leftProximity * bottomProximity, 0.6)
      const size = minSize + (maxSize - minSize) * proximityToBottomLeft

      targetX = x
      targetY = y
      targetSize = size
    }

    const animate = () => {
      currentX += (targetX - currentX) * lerpFactor
      currentY += (targetY - currentY) * lerpFactor
      currentSize += (targetSize - currentSize) * lerpFactor

      target.style.setProperty('--mask-x', `${currentX}px`)
      target.style.setProperty('--mask-y', `${currentY}px`)
      target.style.setProperty('--mask-size', `${currentSize}px`)

      rafId = requestAnimationFrame(animate)
    }

    setHidden()
    rafId = requestAnimationFrame(animate)

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('blur', setHidden)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('blur', setHidden)
    }
  }, [isInSpace])

  const transState = transitionStateRef.current

  return (
    <div 
      className="w-full h-screen fixed" 
      style={{ mixBlendMode: isUnderwater ? 'screen' : 'normal' }}
    >
      <Canvas
        camera={{ position: [-20, -10, -10], fov: 40 }}
        gl={{
          antialias: false, 
          powerPreference: "high-performance",
          alpha: false,
          logarithmicDepthBuffer: false,
          precision: 'mediump',
        }}
        onCreated={({ camera, scene }) => {
          cameraRef.current = camera
          sceneRef.current = scene
        }}
      >
        <color attach="background" args={['#000']} />
        {isUnderwater && <fog attach="fog" args={['#ffffff', transState.underwaterFog.near, transState.underwaterFog.far]} />}
        <pointLight position={[10, 10, 10]} intensity={15000} />
        <ambientLight intensity={!transState.isTransitioning && isUnderwater ? 2 : 0.3} />
        
        <CameraFollowMouse 
          initialPosition={new THREE.Vector3(-20, -10, -10)}
          curvePosition={curvePosition} 
          curveStarPosition={curveStarPosition}
          scrollOffset={transState.scrollOffset}
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
           
          {!isInSpace && !isUnderwater && curvePosition && (
            <CurveParticles curvePosition={curvePosition} isUnderwater={false} />
          )}
          {isUnderwater && (
            <>
              <UnderwaterProjectsCarousel
                isActive={!isInSpace}
                centerPosition={curvePosition}
              />
              <CurveParticles curvePosition={curvePosition} isUnderwater={true} />
            </>
          )}
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
          {transState.showFluidEffect && isUnderwater ? (
            <Fluid 
              rainbow={false} 
              intensity={0.6}
              fluidColor="#000000"
              radius={0.5}
            />
          ) : <></>}
          <primitive object={effectsManager.displacementEffect} />
          {transState.bloomIntensity > 0 ? (
            <Bloom 
              intensity={transState.bloomIntensity}
              luminanceThreshold={0.95}
              luminanceSmoothing={0.4}
              radius={0.5}
              mipmapBlur
            />
          ) : <></>}
          <SMAA />
          {transState.showUnderwaterEffects && isUnderwater ? (
            <>
              <primitive object={effectsManager.underwaterRaysEffect} />
              <ChromaticAberration offset={[0.002, 0.002]} />
            </>
          ) : <></>}
        </EffectComposer>
        
        <Preload all />
      </Canvas>
      {isInSpace && (
        <div className='fixed bottom-[10dvh] left-[10dvh] w-full h-dvh pointer-events-none mix-blend-difference'>
          <div
            className='absolute inset-0 uppercase flex items-start flex-col justify-end gap-0 mix-blend-difference'
            style={{ opacity: 0.02 }}
          >
            {renderOverlayLines()}
          </div>
          <div
            ref={textMaskRef}
            className='absolute inset-0 uppercase flex items-start flex-col justify-end gap-0 mix-blend-difference'
            style={{
              WebkitMaskImage: 'radial-gradient(circle var(--mask-size) at var(--mask-x) var(--mask-y), #ffffff 0%, transparent 70%)',
              WebkitMaskRepeat: 'no-repeat',
              maskImage: 'radial-gradient(circle var(--mask-size) at var(--mask-x) var(--mask-y), #ffffff 0%, transparent 70%)',
              maskRepeat: 'no-repeat'
            }}
          >
            {renderOverlayLines()}
          </div>
        </div>
      )}
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
            ? `radial-gradient(circle at center, transparent 60%, #000000 100%)` 
            : 'none',
          opacity: isUnderwater ? 0 : 1,
          transition: 'opacity 0.5s ease-out'
        }}
      />
    </div>
  )
}
