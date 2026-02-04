'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface CurveParticlesProps {
  curvePosition: THREE.Vector3 | null
  isUnderwater: boolean
}

export function CurveParticles({ curvePosition, isUnderwater }: CurveParticlesProps) {
  const particlesRef = useRef<THREE.Points>(null)
  
  const particlesGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const particleCount = 20
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    
    for (let i = 0; i < particleCount; i++) {
      // Position aléatoire autour de la courbe
      const radius = Math.random() * 9 + 2
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)
      
      // Vitesse angulaire aléatoire
      velocities[i * 3] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    
    return geometry
  }, [])
  
  const particlesMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: isUnderwater ? 0x5555ff : 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [isUnderwater])
  
  useFrame((state) => {
    if (particlesRef.current && curvePosition) {
      // Positionner les particules autour de la courbe
      particlesRef.current.position.copy(curvePosition)
      
      // Rotation orbitale
      particlesRef.current.rotation.y += 0.005
      particlesRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2
    }
  })
  
  if (!curvePosition) return null
  
  return (
    <points ref={particlesRef} geometry={particlesGeometry} material={particlesMaterial} />
  )
}
