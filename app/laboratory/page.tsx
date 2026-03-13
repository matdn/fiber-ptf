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
import { CustomCursor } from '@/components/CustomCursor'
import type { ProjectItem } from '@/lib/projectImages'
import Image from 'next/image'

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

function LaboratoryProjectPreviewOverlay({
  project,
  onOpen,
}: {
  project: ProjectItem | null
  onOpen: () => void
}) {
  return (
    <div
      className={`fixed z-30 ${project ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{
        left: '50%',
        bottom: '34px',
        transform: `translate(-50%, ${project ? '0px' : '10px'})`,
        opacity: project ? 1 : 0,
        visibility: project ? 'visible' : 'hidden',
        transition:
          'opacity 0.28s ease, transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), visibility 0.28s ease',
      }}
    >
      {project && (
        <button
          type="button"
          onClick={onOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: '0.4rem',
            textAlign: 'left',
            width: '100%',
            borderRadius: '0.5rem',
            border: '1px solid rgba(200,200,200, 0.65)',
            background: 'rgba(255, 255, 255, 0.5)',
            boxShadow: '0 8px 20px rgba(16, 22, 48, 0.14)',
            minWidth: '240px',
            backdropFilter: 'blur(4px)',
            cursor: 'pointer',
          }}
        >
          <Image
            src={project.imageUrl}
            alt={project.title}
            width={52}
            height={40}
            style={{
              width: '52px',
              height: '40px',
              objectFit: 'cover',
              borderRadius: '0.35rem',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontFamily: 'Neopixel, sans-serif',
              color: '#1d1f2c',
              fontSize: '13px',
              lineHeight: 1.2,
              letterSpacing: '0.01em',
              textTransform: 'uppercase',
              flexGrow: 1,
            }}
          >
            {project.title}
          </span>
          <span
            style={{
              fontFamily: 'Neopixel, sans-serif',
              color: '#ffffff',
              mixBlendMode: 'difference',
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Ouvrir
          </span>
        </button>
      )}
    </div>
  )
}

function Grid({ onDistortionChange, onDragVelocity, onProjectClick, onIdleProjectChange }: {
  onDistortionChange: (intensity: number) => void
  onDragVelocity: (velocity: { x: number; y: number }) => void
  onProjectClick: (project: ProjectItem | null) => void
  onIdleProjectChange: (project: ProjectItem | null) => void
}) {
  const { camera, gl } = useThree()
  const hasLoaded = useRef(false)
  const lastPointerPos = useRef({ x: 0, y: 0 })
  const lastPointerTime = useRef(0)
  const isDragging = useRef(false)
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null)
  const lastInteractionAt = useRef(0)
  const interactionActive = useRef(false)
  
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
        interactionActive.current = true
        lastInteractionAt.current = performance.now()
        onIdleProjectChange(null)
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
      interactionActive.current = true
      lastInteractionAt.current = performance.now()
      onIdleProjectChange(null)
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
          onProjectClick(project)
        }
      }

      grid.onPointerUp()
      isDragging.current = false
      interactionActive.current = true
      lastInteractionAt.current = performance.now()
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
      interactionActive.current = true
      lastInteractionAt.current = performance.now()
      onIdleProjectChange(null)
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
  }, [grid, gl, onDragVelocity, onProjectClick, onIdleProjectChange])

  // Mettre à jour la grille chaque frame
  useFrame(() => {
    if (grid) {
      grid.update()

      if (interactionActive.current && performance.now() - lastInteractionAt.current > 220) {
        interactionActive.current = false
        const rect = gl.domElement.getBoundingClientRect()
        const centeredProject = grid.pickProjectAt(rect.width / 2, rect.height / 2, rect.width, rect.height)
        onIdleProjectChange(centeredProject)
      }
    }
  })

  if (!grid) return null

  return <primitive object={grid} />
}

function Scene({ distortionIntensity, onDistortionChange, isUnderwater, dragVelocity, onDragVelocity, onProjectClick, onIdleProjectChange }: {
  distortionIntensity: number
  onDistortionChange: (intensity: number) => void
  isUnderwater: boolean
  dragVelocity: { x: number; y: number }
  onDragVelocity: (velocity: { x: number; y: number }) => void
  onProjectClick: (project: ProjectItem | null) => void
  onIdleProjectChange: (project: ProjectItem | null) => void
}) {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <Grid
        onDistortionChange={onDistortionChange}
        onDragVelocity={onDragVelocity}
        onProjectClick={onProjectClick}
        onIdleProjectChange={onIdleProjectChange}
      />
      <DraggableSphere dragVelocity={dragVelocity} isUnderwater={isUnderwater} />
      <Postprocessing distortionIntensity={distortionIntensity} isUnderwater={isUnderwater} />
    </>
  )
}

export default function LaboratoryPage() {
  const [distortionIntensity, setDistortionIntensity] = useState(0)
  const [dragVelocity, setDragVelocity] = useState({ x: 0, y: 0 })
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null)
  const { isUnderwater } = useUnderwater()

  return (
    <>
      <Header isUnderwater={isUnderwater} />
      <CustomCursor enabled={true} environment="surface" onRequest={() => {}} />
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
            onProjectClick={setSelectedProject}
            onIdleProjectChange={setSelectedProject}
          />
        </Canvas>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 20,
            background:
              'radial-gradient(ellipse at center, rgba(0, 0, 0, 0) 24%, rgba(0, 0, 0, 0.35) 46%, rgba(0, 0, 0, 0.72) 66%, rgba(0, 0, 0, 0.95) 84%, rgba(0, 0, 0, 1) 100%)',
          }}
        />
        <LaboratoryProjectPreviewOverlay
          project={selectedProject}
          onOpen={() => {
            if (!selectedProject) return
            window.location.assign(LABS_EXTERNAL_URL)
          }}
        />
      </main>
    </>
  )
}
