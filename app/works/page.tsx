'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ProjectsGrid } from '@/components/GridClass'
import { EffectComposer as ThreeComposer, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js'
import { EffectComposer, SMAA, ChromaticAberration } from '@react-three/postprocessing'
import { DistortionShader } from '@/components/DistortionShader'
import Header from '@/components/Header'
import { useUnderwater } from '@/contexts/UnderwaterContext'
import { DraggableSphere } from '@/components/DraggableSphere'

function Postprocessing({ distortionIntensity, isUnderwater }: { distortionIntensity: number; isUnderwater: boolean }) {
  const { gl, scene, camera } = useThree()
  
  const { effectComposer, distortionShader } = useMemo(() => {
    const renderPass = new RenderPass(scene, camera)
    const distortionShader = new DistortionShader()
    const distortionPass = new ShaderPass(distortionShader)

    const effectComposer = new ThreeComposer(gl)
    effectComposer.addPass(renderPass)
    effectComposer.addPass(distortionPass)

    return { effectComposer, distortionShader }
  }, [gl, scene, camera])
  
  // Update distortion intensity
  useEffect(() => {
    distortionShader.setDistortion(distortionIntensity)
  }, [distortionIntensity, distortionShader])
  
  // Render with effect composer
  useFrame(() => {
    effectComposer.render()
  }, 1)
 
  return isUnderwater ? (
    <EffectComposer multisampling={0}>
      <ChromaticAberration offset={[0.0015, 0.0015]} />
      <SMAA />
    </EffectComposer>
  ) : null
}

function Grid({ onDistortionChange, onDragVelocity }: { 
  onDistortionChange: (intensity: number) => void
  onDragVelocity: (velocity: { x: number; y: number }) => void
}) {
  const { camera, gl } = useThree()
  const hasLoaded = useRef(false)
  const lastPointerPos = useRef({ x: 0, y: 0 })
  const lastPointerTime = useRef(0)
  const isDragging = useRef(false)
  
  const grid = useMemo(() => {
    return new ProjectsGrid(camera, onDistortionChange)
  }, [camera, onDistortionChange])

  // Animer les cartes au chargement de la page
  useEffect(() => {
    if (grid && !hasLoaded.current) {
      hasLoaded.current = true
      console.log('💚 SHOW CARDS on page load')
      // Délai pour laisser le temps à la page de se charger
      setTimeout(() => {
        grid.showInitialCards()
      }, 300)
    }
  }, [grid])

  // Gérer les événements de souris
  useEffect(() => {
    if (!grid) return

    const canvas = gl.domElement
    
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      grid.onPointerMove(x, y, rect.width, rect.height)
      
      // Calculate drag velocity
      if (isDragging.current) {
        const now = performance.now()
        const dt = Math.max(now - lastPointerTime.current, 1)
        const baseScale = 16.67 / dt
        const touchBoost = e.pointerType === 'touch' ? 1.8 : 1
        const velocityX = (x - lastPointerPos.current.x) * baseScale * touchBoost
        const velocityY = (y - lastPointerPos.current.y) * baseScale * touchBoost
        onDragVelocity({ x: velocityX, y: velocityY })
        lastPointerTime.current = now
      }
      
      lastPointerPos.current = { x, y }
    }

    const handlePointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      
      grid.onPointerDown(x, y)
      isDragging.current = true
      lastPointerPos.current = { x, y }
      lastPointerTime.current = performance.now()
      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(e.pointerId)
      }
    }

    const handlePointerUp = (e?: PointerEvent) => {
      grid.onPointerUp()
      isDragging.current = false
      onDragVelocity({ x: 0, y: 0 })
      if (e && canvas.releasePointerCapture) {
        canvas.releasePointerCapture(e.pointerId)
      }
    }

    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
    }
  }, [grid, gl, onDragVelocity])

  // Mettre à jour la grille chaque frame
  useFrame(() => {
    if (grid) {
      grid.update()
    }
  })

  if (!grid) return null

  return <primitive object={grid} />
}

function Scene({ distortionIntensity, onDistortionChange, isUnderwater, dragVelocity, onDragVelocity }: { 
  distortionIntensity: number
  onDistortionChange: (intensity: number) => void
  isUnderwater: boolean
  dragVelocity: { x: number; y: number }
  onDragVelocity: (velocity: { x: number; y: number }) => void
}) {
  return (
    <>
      <color attach="background" args={isUnderwater ? ['#ffffff'] : ['#000000']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <Grid onDistortionChange={onDistortionChange} onDragVelocity={onDragVelocity} />
      <DraggableSphere dragVelocity={dragVelocity} isUnderwater={isUnderwater} />
      <Postprocessing distortionIntensity={isUnderwater ? distortionIntensity : distortionIntensity} isUnderwater={isUnderwater} />
    </>
  )
}

export default function WorksPage() {
  const [distortionIntensity, setDistortionIntensity] = useState(0)
  const [dragVelocity, setDragVelocity] = useState({ x: 0, y: 0 })
  const { isUnderwater } = useUnderwater()

  return (
    <>
      <Header isUnderwater={isUnderwater} />
      <main className="w-full h-screen relative">
        <Canvas
          camera={{ position: [0, 0, 12], fov: 60 }}
          gl={{ antialias: true }}
        >
          <Scene 
            distortionIntensity={distortionIntensity}
            onDistortionChange={setDistortionIntensity}
            isUnderwater={isUnderwater}
            dragVelocity={dragVelocity}
            onDragVelocity={setDragVelocity}
          />
        </Canvas>
        
        {/* Overlay avec gradient sur les bords */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div 
            className="absolute inset-0"
            style={{
              background: isUnderwater 
                ? 'radial-gradient(circle at center, transparent 50%, rgba(255,255,255,0.3) 100%)'
                : undefined
            }}
          />
          {!isUnderwater && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
            </>
          )}
        </div>
      </main>
    </>
  )
}
