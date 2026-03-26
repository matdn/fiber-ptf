'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ProjectsGrid } from '@/components/GridClass'
import { EffectComposer as ThreeComposer, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js'
import { DistortionShader } from '@/components/DistortionShader'
import Header from '@/components/Header'
import { useUnderwater } from '@/contexts/UnderwaterContext'
import { DraggableSphere } from '@/components/DraggableSphere'
import { CustomCursor } from '@/components/CustomCursor'
import { HDRIEnvironment, TIME_SLOTS, getCurrentTimeSlot } from '@/components/scene/HDRIEnvironment'
import { DevPanel } from '@/components/DevPanel'
import { usePageTransition } from '@/contexts/TransitionContext'
import { getProjectSlug, type ProjectItem } from '@/lib/projectImages'
import Image from 'next/image'

function SetClearColor({ color }: { color: string }) {
  const { gl } = useThree()
  useEffect(() => {
    gl.setClearColor(color, 0.9)
  }, [gl, color])
  return null
}

function Postprocessing({ distortionIntensity }: { distortionIntensity: number }) {
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
            padding: '0.4rem 1rem 0.4rem 0.4rem',
            textAlign: 'left',
            width: '100%',
            borderRadius: '0.5rem',
            border: '1px solid rgba(200,200,200, 0.65)',
            background: 'rgba(255, 255, 255, 0.5)',
            boxShadow: '0 8px 20px rgba(16, 22, 48, 0.14)',
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
              width: "fit-content",
            }}
          >
            {project.title}
          </span>
          {/* <span
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
          </span> */}
        </button>
      )}
    </div>
  )
}

function Grid({ onDistortionChange, onDragVelocity, onScrollVelocity, onProjectClick, onIdleProjectChange }: {
  onDistortionChange: (intensity: number) => void
  onDragVelocity: (velocity: { x: number; y: number }) => void
  onScrollVelocity: (velocity: { x: number; y: number }) => void
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
  const scrollResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
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

    const finishPointerInteraction = ({ e, shouldPickProject }: { e?: PointerEvent; shouldPickProject: boolean }) => {
      if (e && shouldPickProject) {
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

    const handlePointerUp = (e?: PointerEvent) => {
      finishPointerInteraction({ e, shouldPickProject: true })
    }

    const handlePointerLeave = (e?: PointerEvent) => {
      finishPointerInteraction({ e, shouldPickProject: false })
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
      onScrollVelocity({ x: e.deltaX, y: e.deltaY })
      if (scrollResetRef.current) clearTimeout(scrollResetRef.current)
      scrollResetRef.current = setTimeout(() => onScrollVelocity({ x: 0, y: 0 }), 150)
    }

    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointerup', handlePointerUp)
    canvas.addEventListener('pointerleave', handlePointerLeave)
    canvas.addEventListener('pointercancel', handlePointerLeave)
    canvas.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointerup', handlePointerUp)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
      canvas.removeEventListener('pointercancel', handlePointerLeave)
      canvas.removeEventListener('wheel', handleWheel)
      grid.dispose()
    }
  }, [grid, gl, onDragVelocity, onScrollVelocity, onProjectClick, onIdleProjectChange])

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

function Scene({ distortionIntensity, onDistortionChange, isUnderwater, dragVelocity, onDragVelocity, scrollVelocity, onScrollVelocity, onProjectClick, onIdleProjectChange, hdriSlotIndex, bgColor }: {
  distortionIntensity: number
  onDistortionChange: (intensity: number) => void
  isUnderwater: boolean
  dragVelocity: { x: number; y: number }
  onDragVelocity: (velocity: { x: number; y: number }) => void
  scrollVelocity: { x: number; y: number }
  onScrollVelocity: (velocity: { x: number; y: number }) => void
  onProjectClick: (project: ProjectItem | null) => void
  onIdleProjectChange: (project: ProjectItem | null) => void
  hdriSlotIndex: number
  bgColor: string
}) {
  return (
    <>
      <HDRIEnvironment active={true} forcedSlotIndex={hdriSlotIndex} showBackground={false} />
      <SetClearColor color={bgColor} />
      <ambientLight intensity={100.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <Grid
        onDistortionChange={onDistortionChange}
        onDragVelocity={onDragVelocity}
        onScrollVelocity={onScrollVelocity}
        onProjectClick={onProjectClick}
        onIdleProjectChange={onIdleProjectChange}
      />
      <DraggableSphere dragVelocity={dragVelocity} scrollVelocity={scrollVelocity} isUnderwater={isUnderwater} />
      <Postprocessing distortionIntensity={distortionIntensity} />
    </>
  )
}

export default function LaboratoryPage() {
  const { navigate } = usePageTransition()
  const [distortionIntensity, setDistortionIntensity] = useState(0)
  const [dragVelocity, setDragVelocity] = useState({ x: 0, y: 0 })
  const [scrollVelocity, setScrollVelocity] = useState({ x: 0, y: 0 })
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null)
  const { isUnderwater } = useUnderwater()
  const [hdriSlotIndex, setHdriSlotIndex] = useState<number>(() => TIME_SLOTS.indexOf(getCurrentTimeSlot()))
  const isNight = TIME_SLOTS[hdriSlotIndex]?.name === 'night'
  const bgColor = isNight ? '#000000' : '#ffffff'
  const vignetteRgb = isNight ? '0,0,0' : '255,255,255'

  return (
    <>
      <Header isUnderwater={isUnderwater} hdriSlotIndex={hdriSlotIndex} />
      <CustomCursor enabled={true} environment="surface" showDragOverlay={false} onRequest={() => {}} hdriSlotIndex={hdriSlotIndex} />
      <main className="w-full h-screen relative">
        <Canvas
          camera={{ position: [0, 0, 12], fov: 60 }}
          gl={{ antialias: true}}
          style={{ background: bgColor }}
        >
          <Scene 
            distortionIntensity={distortionIntensity}
            onDistortionChange={setDistortionIntensity}
            isUnderwater={isUnderwater}
            dragVelocity={dragVelocity}
            onDragVelocity={setDragVelocity}
            scrollVelocity={scrollVelocity}
            onScrollVelocity={setScrollVelocity}
            onProjectClick={setSelectedProject}
            onIdleProjectChange={setSelectedProject}
            hdriSlotIndex={hdriSlotIndex}
            bgColor={bgColor}
          />
        </Canvas>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 20,
            background: [
              `linear-gradient(to right,  rgba(${vignetteRgb},1) 0%, rgba(${vignetteRgb},0) 11%)`,
              `linear-gradient(to left,   rgba(${vignetteRgb},1) 0%, rgba(${vignetteRgb},0) 11%)`,
              `linear-gradient(to bottom, rgba(${vignetteRgb},1) 0%, rgba(${vignetteRgb},0) 8%)`,
              `linear-gradient(to top,    rgba(${vignetteRgb},1) 0%, rgba(${vignetteRgb},0) 8%)`,
            ].join(', '),
          }}
        />
        <DevPanel hdriSlotIndex={hdriSlotIndex} onSlotChange={setHdriSlotIndex} />
        <LaboratoryProjectPreviewOverlay
          project={selectedProject}
          onOpen={() => {
            if (!selectedProject) return
            const slug = getProjectSlug(selectedProject)
            if (!slug) return
            navigate(`/laboratory/${slug}`)
          }}
        />
      </main>
    </>
  )
}
