'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ProjectsGrid } from '@/components/GridClass'
import { EffectComposer as ThreeComposer, RenderPass, ShaderPass } from 'three/examples/jsm/Addons.js'
import { EffectComposer, SMAA, ChromaticAberration } from '@react-three/postprocessing'
import { DistortionShader } from '@/components/DistortionShader'
import Header from '@/components/Header'
import { useUnderwater } from '@/contexts/UnderwaterContext'

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
  
  // Render with effect composer (only if not underwater, let drei handle it otherwise)
  useFrame(() => {
    if (!isUnderwater) {
      effectComposer.render()
    }
  }, 1)
 
  return isUnderwater ? (
    <EffectComposer multisampling={0}>
      <ChromaticAberration offset={[0.0015, 0.0015]} />
      <SMAA />
    </EffectComposer>
  ) : null
}

function Grid({ onDistortionChange }: { onDistortionChange: (intensity: number) => void }) {
  const { camera, gl } = useThree()
  const hasLoaded = useRef(false)
  
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

function Scene({ distortionIntensity, onDistortionChange, isUnderwater }: { 
  distortionIntensity: number
  onDistortionChange: (intensity: number) => void
  isUnderwater: boolean
}) {
  return (
    <>
      <color attach="background" args={isUnderwater ? ['#ffffff'] : ['#000000']} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.5} />
      <Grid onDistortionChange={onDistortionChange} />
      <Postprocessing distortionIntensity={distortionIntensity} isUnderwater={isUnderwater} />
    </>
  )
}

export default function WorksPage() {
  const [distortionIntensity, setDistortionIntensity] = useState(0)
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
