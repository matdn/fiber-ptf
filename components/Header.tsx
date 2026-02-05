'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Link from 'next/link'

gsap.registerPlugin(ScrollTrigger)

function MiniCurve({ opacity, scale: animScale, rotationY }: { opacity: number; scale: number; rotationY: number }) {
  const { scene } = useGLTF('/m.glb')
  const { camera } = useThree()
  const curveClone = useRef<THREE.Object3D | null>(null)

  useEffect(() => {
    scene.traverse((child) => {
      if (child.name.toLowerCase() === 'curve' && !curveClone.current) {
        curveClone.current = child.clone()
        const childMesh = curveClone.current as THREE.Mesh
        if (childMesh.material) {
          childMesh.material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
        
          })
        }
      }
    })
  }, [scene])

  useFrame((state) => {
    if (curveClone.current) {
      curveClone.current.rotation.z = state.clock.elapsedTime * 0.5
      curveClone.current.rotation.y = rotationY
      curveClone.current.scale.setScalar(animScale)
      camera.lookAt(curveClone.current.position)
      
      const childMesh = curveClone.current as THREE.Mesh
      if (childMesh.material) {
        (childMesh.material as THREE.MeshBasicMaterial).opacity = opacity
      }
    }
  })

  return curveClone.current ? <primitive object={curveClone.current} scale={3} /> : null
}

export default function Header({ isUnderwater = false }: { isUnderwater?: boolean }) {
  const [curveOpacity, setCurveOpacity] = useState(0)
  const [curveScale, setCurveScale] = useState(0)
  const [curveRotation, setCurveRotation] = useState(Math.PI)
  const animStateRef = useRef({ opacity: 0, scale: 0, rotation: Math.PI })
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const lastProgressRef = useRef(0)
  const header = useRef<HTMLElement>(null)
  const [animClass, setAnimClass] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Animation d'apparition au montage
  useEffect(() => {
    const animState = animStateRef.current
    gsap.to(animState, {
      opacity: 1,
      scale: 3,
      rotation: 0,
      duration: 1.5,
      delay: 0.3,
      ease: 'elastic.out(1, 0.6)',
      onUpdate: () => {
        setCurveOpacity(animState.opacity)
        setCurveScale(animState.scale)
        setCurveRotation(animState.rotation)
      }
    })
  }, [])

  useEffect(() => {
    if (header.current) {
      // Retirer la classe pour forcer le re-déclenchement
      setAnimClass('headerNormal')
      
      // Attendre un frame puis ajouter la nouvelle classe
      requestAnimationFrame(() => {
        setAnimClass(isUnderwater ? 'headerReverse' : 'headerSlide')
      })
    }
  }, [isUnderwater])



  useEffect(() => {
    const animState = animStateRef.current
    
    const scrollTrigger = ScrollTrigger.create({
      trigger: '.first',
      start: 'top bottom',
      end: 'top top',
      onUpdate: (self) => {
        const progress = self.progress
        const wasAboveThreshold = lastProgressRef.current >= 0.66
        const isAboveThreshold = progress >= 0.66
        
        // Only animate if the threshold state changes
        if (wasAboveThreshold !== isAboveThreshold) {
          // Kill previous tween to avoid conflicts
          if (tweenRef.current) {
            tweenRef.current.kill()
          }
          
          if (isAboveThreshold) {
            tweenRef.current = gsap.to(animState, {
              opacity: 1,
              scale: 3,
              rotation: 0,
              duration: 1.2,
              ease: 'elastic.out(1, 0.6)',
              onUpdate: () => {
                setCurveOpacity(animState.opacity)
                setCurveScale(animState.scale)
                setCurveRotation(animState.rotation)
              }
            })
          } else {
            tweenRef.current = gsap.to(animState, {
              opacity: 0,
              scale: 0,
              rotation: Math.PI,
              duration: 0.8,
              ease: 'power3.inOut',
              onUpdate: () => {
                setCurveOpacity(animState.opacity)
                setCurveScale(animState.scale)
                setCurveRotation(animState.rotation)
              }
            })
          }
        }
        
        lastProgressRef.current = progress
      }
    })

    return () => {
      if (tweenRef.current) {
        tweenRef.current.kill()
      }
      scrollTrigger.kill()
    }
  }, [])

  return (
    <>
      <header ref={header} className={`${isUnderwater ? ' md:bottom-0' : 'md:top-2 '} fixed z-50 w-full ${animClass} w-32 h-32 md:-translate-x-1/2 md:left-1/2 right-0  bottom-2`} style={{ mixBlendMode: 'difference' }}>
        {/* Desktop Menu */}
        <nav className="hidden md:block left-1/2 md:-translate-x-1/2 absolute top-4 backdrop-blur-xl bg-white/5 rounded px-6 py-3 shadow-lg " style={{ fontFamily: 'Mabry, sans-serif' }}>
          <ul className="flex w-full justify-around items-center gap-4">
            <li>
              <a href="#portfolio" className="text-white/80 hover:text-white transition-colors">
                portfolio
              </a>
            </li>
            <li>
              <Link href="/works" className="text-white/80 hover:text-white transition-colors">
                works
              </Link>
            </li>
            
            <li className="w-10 h-10 rounded-full overflow-hidden">
              <a href="/">
                <Canvas camera={{ position: [0, 0, 5], fov: 50 }} gl={{ alpha: true, antialias: true }}>
                  <ambientLight intensity={100.5} />
                  <pointLight position={[10, 10, 10]} intensity={1} />
                  <MiniCurve opacity={curveOpacity} scale={curveScale} rotationY={curveRotation} />
                </Canvas>
              </a>
            </li>
            
            <li>
              <a href="#about" className="text-white/80 hover:text-white transition-colors">
                about
              </a>
            </li>
            <li>
              <a href="#contact" className="text-white/80 hover:text-white transition-colors">
                contact
              </a>
            </li>
          </ul>
        </nav>
        
        {/* Mobile Menu Button */}
        <button
          type="button"
          className={`${isMobileMenuOpen ? 'w-[80%] md:hidden fixed bottom-6 right-2 transition-all h-16 rounded-full overflow-hidden backdrop-blur-xl bg-white/10 border border-white/20 shadow-lg' : 'md:hidden fixed bottom-6 right-0 w-16 h-16 rounded-full overflow-hidden backdrop-blur-xl bg-white/10 border border-white/20 shadow-lg'} `}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Menu"
        >
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }} gl={{ alpha: true, antialias: true }}>
            <ambientLight intensity={100.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <MiniCurve opacity={curveOpacity} scale={curveScale} rotationY={curveRotation} />
          </Canvas>
           <nav 
            className="md:hidden backdrop-blur-l bg-white/5 rounded-2xl p-6 shadow-2xl"
            style={{ fontFamily: 'Mabry, sans-serif' }}
          >
            <ul className="flexgap-4">
              <li>
                <a 
                  href="#portfolio" 
                  className="text-white/80 hover:text-white transition-colors block text-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  portfolio
                </a>
              </li>
              <li>
                <Link 
                  href="/works" 
                  className="text-white/80 hover:text-white transition-colors block text-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  works
                </Link>
              </li>
              <li>
                <a 
                  href="#about" 
                  className="text-white/80 hover:text-white transition-colors block text-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  about
                </a>
              </li>
              <li>
                <a 
                  href="#contact" 
                  className="text-white/80 hover:text-white transition-colors block text-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  contact
                </a>
              </li>
            </ul>
          </nav>
        </button>
        
        {/* {isMobileMenuOpen && (
         
        )} */}
      </header>
      
      {/* Mobile Menu Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}
