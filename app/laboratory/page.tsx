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

const LABS_EXTERNAL_URL = 'https://tympanus.net/Tutorials/3DImageTubeR3F/'

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
  
  // Dispose render targets on unmount
  useEffect(() => {
    return () => { effectComposer.dispose() }
  }, [effectComposer])

  // Update distortion intensity
  useEffect(() => {
    distortionShader.setCenterBias(1)
    distortionShader.setDistortion(distortionIntensity * 1.6)
  }, [distortionIntensity, distortionShader])
  
  // Render with effect composer
  useFrame(() => {
    effectComposer.render()
  }, 1)
 
  return null
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
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)
  
  const grid = useMemo(() => {
    return new ProjectsGrid(camera, onDistortionChange, {
      distortionMax: 0.14,
      snapBackOnIdle: true,
      cursorOffsetStrength: 0,
      viewPaddingX: 42,
      viewPaddingY: 28,
      pruneBuffer: 8,
    })
  }, [camera, onDistortionChange])

  // Animer les cartes au chargement de la page
  useEffect(() => {
    if (grid && !hasLoaded.current) {
      hasLoaded.current = true
      setTimeout(() => {
        grid.showInitialCards()
      }, 300)
    }
  }, [grid])

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
      pointerDownPos.current = { x, y }
      lastPointerPos.current = { x, y }
      lastPointerTime.current = performance.now()
      if (canvas.setPointerCapture) {
        canvas.setPointerCapture(e.pointerId)
      }
    }

    const handlePointerUp = (e?: PointerEvent) => {
      if (e) {
        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const down = pointerDownPos.current
        const dx = down ? x - down.x : 0
        const dy = down ? y - down.y : 0
        const movedSq = dx * dx + dy * dy

        // Treat as a click if pointer barely moved.
        if (movedSq < 36) {
          const project = grid.pickProjectAt(x, y, rect.width, rect.height)
          if (project) {
            window.location.assign(LABS_EXTERNAL_URL)
          }
        }
      }

      grid.onPointerUp()
      isDragging.current = false
      pointerDownPos.current = null
      onDragVelocity({ x: 0, y: 0 })
      if (e && canvas.releasePointerCapture) {
        canvas.releasePointerCapture(e.pointerId)
      }
    }

    const handleWheel = (e: WheelEvent) => {
      // Prevent horizontal swipe from triggering browser back/forward.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
      }
      grid.onWheel(e.deltaX, e.deltaY)
    }

    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerUp)
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerUp)
      canvas.removeEventListener('wheel', handleWheel)
      grid.dispose()
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
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <Grid onDistortionChange={onDistortionChange} onDragVelocity={onDragVelocity} />
      <DraggableSphere dragVelocity={dragVelocity} isUnderwater={isUnderwater} />
      <Postprocessing distortionIntensity={distortionIntensity} isUnderwater={isUnderwater} />
    </>
  )
}

export default function LaboratoryPage() {
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
      </main>
    </>
  )
}
