'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Water } from './Water'
import * as THREE from 'three'
import { EffectComposer, Bloom, SMAA, ChromaticAberration } from '@react-three/postprocessing'
import gsap from 'gsap'
import { Model } from './scene/Model'
import { CameraFollowMouse } from './scene/CameraFollowMouse'
import { CurveRotation } from './scene/CurveRotation'
import { UnderwaterRaysEffect } from './scene/UnderwaterRaysEffect'
import { DisplacementTransitionEffect } from './scene/DisplacementTransitionEffect'
import { Fluid } from '@whatisjery/react-fluid-distortion'

export default function Scene({ onUnderwaterToggle, isUnderwater }: { 
  onUnderwaterToggle: (value: boolean) => void
  isUnderwater: boolean
}) {
  const [curvePosition, setCurvePosition] = useState<THREE.Vector3 | null>(null)
  const [curveObject, setCurveObject] = useState<THREE.Object3D | null>(null)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const cameraRef = useRef<THREE.Camera | null>(null)
  
  const initialCameraPosition = useMemo(() => new THREE.Vector3(-20, -10, -10), [])
  const vignetteColor = useMemo(() => '#000000', [])
  const underwaterRaysEffect = useMemo(() => new UnderwaterRaysEffect(), [])
  const displacementEffect = useMemo(() => new DisplacementTransitionEffect(), [])

  useEffect(() => {
    const handleScroll = () => {
      setScrollOffset(window.scrollY * 0.01)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleCurveClick = useCallback(() => {
    if (cameraRef.current && !isTransitioning) {
      setIsTransitioning(true)
      const toUnderwater = !isUnderwater
      const duration = toUnderwater ? 2.5 : 2.0
      
      gsap.to(cameraRef.current.position, {
        y: cameraRef.current.position.y + (toUnderwater ? -5 : 5),
        duration: duration,
        ease: 'power2.inOut',
        onUpdate: function() {
          const progress = this.progress()
          
          displacementEffect.setProgress(progress)
          
          if (progress >= 0.5 && progress < 0.52 && isUnderwater !== toUnderwater) {
            onUnderwaterToggle(toUnderwater)
          }
        },
        onComplete: () => {
          displacementEffect.setProgress(0)
          setIsTransitioning(false)
        }
      })
    } else if (!cameraRef.current) {
      onUnderwaterToggle(!isUnderwater)
    }
  }, [onUnderwaterToggle, isUnderwater, isTransitioning, displacementEffect])

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
        {isUnderwater && <fog attach="fog" args={['#ffffff', 10, 150]} />}
        <pointLight position={[10, 10, 10]} intensity={15000} />
        <ambientLight intensity={isUnderwater ? 2 : 0.3} />
        
        <CameraFollowMouse 
          initialPosition={initialCameraPosition} 
          curvePosition={curvePosition} 
          scrollOffset={scrollOffset} 
        />
        <CurveRotation curveObject={curveObject} />
        
        <Suspense fallback={null}>
          <Model 
            onCurveFound={setCurvePosition} 
            onCurveRefFound={setCurveObject}
            onCurveClick={handleCurveClick}
            isUnderwater={isUnderwater}
          />
          <group 
            rotation={isUnderwater ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0]}
            position={isUnderwater ? [0, 0, 0] : [0, -20, 0]}
          >
            <Water />
          </group>
        </Suspense>
        
        <EffectComposer multisampling={0}>
          {isUnderwater && (
            <Fluid 
              rainbow={false} 
              intensity={1} 
              fluidColor="#000000"
              radius={0.5}
            />
          )}
          <primitive object={displacementEffect} />
          {!isUnderwater && !isTransitioning ? (
            <Bloom 
              intensity={0.1}
              luminanceThreshold={0.1}
              luminanceSmoothing={0.1}
              radius={0.8}
              mipmapBlur
            />
          ) : null}
          <SMAA />
          {isUnderwater ? (
            <>
              <primitive object={underwaterRaysEffect} />
              <ChromaticAberration 
                offset={[0.002, 0.002]}
              />
            </>
          ) : null}
        </EffectComposer> 
      </Canvas>
      
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: !isUnderwater 
            ? `radial-gradient(circle at center, transparent 60%, ${vignetteColor} 100%)` 
            : 'radial-gradient(circle at center, transparent 60%, #ffffff 100%)'
        }}
      />
    </div>
  )
}
