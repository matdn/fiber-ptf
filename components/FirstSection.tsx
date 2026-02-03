'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ProjectsGrid } from './GridClass'
import { EffectComposer, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js'
import { DistortionShader } from './DistortionShader'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

function Postprocessing({ distortionIntensity }: { distortionIntensity: number }) {
  const { gl, scene, camera } = useThree()
  
  const { effectComposer, distortionShader } = useMemo(() => {
    const renderPass = new RenderPass(scene, camera)
    const distortionShader = new DistortionShader()
    const distortionPass = new ShaderPass(distortionShader)

    const effectComposer = new EffectComposer(gl)
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
 
  return null
}

function Grid({ scrollProgress, onDistortionChange, containerRef }: { 
  scrollProgress: number, 
  onDistortionChange: (intensity: number) => void,
  containerRef: React.RefObject<HTMLDivElement>
}) {
  const { camera, gl } = useThree()
  const isVisible = useRef(false)
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null)
  
  const grid = useMemo(() => {
    return new ProjectsGrid(camera, onDistortionChange)
  }, [camera, onDistortionChange])

  // Utiliser GSAP ScrollTrigger pour les animations
  useEffect(() => {
    if (!grid || !containerRef.current) return

    // Nettoyer l'ancien ScrollTrigger
    if (scrollTriggerRef.current) {
      scrollTriggerRef.current.kill()
    }

    scrollTriggerRef.current = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top 10%',
      end: 'bottom bottom',
      markers: true,
      onEnter: () => {
        console.log('💚 SHOW CARDS - onEnter')
        if (!isVisible.current) {
          isVisible.current = true
          grid.showInitialCards()
        }
      },
      onLeaveBack: () => {
        console.log('❌ HIDE CARDS - onLeaveBack')
        if (isVisible.current) {
          isVisible.current = false
          grid.hideAllCards()
        }
      }
    })

    return () => {
      if (scrollTriggerRef.current) {
        scrollTriggerRef.current.kill()
      }
    }
  }, [grid, containerRef])

  // Gérer les événements de souris
  useEffect(() => {
    if (!grid) return

    const canvas = gl.domElement
    
    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      grid.onPointerMove(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height)
    }

    const handlePointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      grid.onPointerDown(e.clientX - rect.left, e.clientY - rect.top)
    }

    const handlePointerUp = () => {
      grid.onPointerUp()
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
  }, [grid, gl])

  // Mettre à jour la grille chaque frame
  useFrame(() => {
    if (grid) {
      grid.update()
    }
  })

  if (!grid) return null

  return <primitive object={grid} />
}

function Scene({ scrollProgress, distortionIntensity, onDistortionChange, containerRef }: { 
  scrollProgress: number
  distortionIntensity: number
  onDistortionChange: (intensity: number) => void
  containerRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <Grid scrollProgress={scrollProgress} onDistortionChange={onDistortionChange} containerRef={containerRef} />
      <Postprocessing distortionIntensity={distortionIntensity} />
    </>
  )
}

export default function FirstSection() {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [distortionIntensity, setDistortionIntensity] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const windowHeight = window.innerHeight
        const progress = Math.max(0, Math.min(1, (windowHeight - rect.top) / windowHeight))
        setScrollProgress(progress)
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        gl={{ antialias: true }}
      >
        <Scene 
          scrollProgress={scrollProgress} 
          distortionIntensity={distortionIntensity}
          onDistortionChange={setDistortionIntensity}
          containerRef={containerRef}
        />
      </Canvas>
      
      {/* Overlay avec gradient sur les bords */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black" />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
      </div>
    </div>
  )
}
