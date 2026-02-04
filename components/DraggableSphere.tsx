'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
  uniform vec2 offset;
  varying vec3 vPosition;
  
  void main() {
    vPosition = position;
    
    // Appliquer l'offset pour l'animation
    vec3 pos = position;
    pos.x += offset.x;
    pos.y += offset.y;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 4.0;
  }
`

const fragmentShader = `
  uniform vec3 pointColor;
  varying vec3 vPosition;
  
  void main() {
    // Circular point shape
    vec2 coord = gl_PointCoord - vec2(0.5);
    if(length(coord) > 0.5) discard;
    
    // Fade basé sur la distance du centre
    float dist = length(vPosition.xy) * 0.02;
    float fade = 1.0 - smoothstep(0.0, 1.0, dist);
    
    gl_FragColor = vec4(pointColor, fade * 0.4);
  }
`

interface DraggableSphereProps {
  dragVelocity: { x: number; y: number }
  isUnderwater?: boolean
}

export function DraggableSphere({ dragVelocity, isUnderwater = false }: DraggableSphereProps) {
  const meshRef = useRef<THREE.Points>(null!)
  const velocity = useRef({ x: 0, y: 0 })
  
  const { geometry, material } = useMemo(() => {
    // Créer une grille de points
    const gridSize = 100
    const spacing = 2
    const points: THREE.Vector3[] = []
    
    for (let x = -gridSize / 2; x <= gridSize / 2; x += spacing) {
      for (let y = -gridSize / 2; y <= gridSize / 2; y += spacing) {
        points.push(new THREE.Vector3(x, y, 0))
      }
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      uniforms: {
        offset: { value: new THREE.Vector2(0, 0) },
        pointColor: { value: new THREE.Vector3(0.5, 0.5, 0.6) }
      }
    })
    
    return { geometry, material }
  }, [])
  
  // Mettre à jour la couleur quand isUnderwater change
  useFrame(() => {
    if (meshRef.current) {
      const color = isUnderwater ? new THREE.Vector3(0.0, 0.0, 0.0) : new THREE.Vector3(0.5, 0.5, 0.6)
      material.uniforms.pointColor.value = color
    }
  })

  useFrame((state, delta) => {
    if (!meshRef.current) return
    
    // Appliquer la vélocité du drag
    velocity.current.x += dragVelocity.x * 0.001
    velocity.current.y -= dragVelocity.y * 0.001 // Inverser Y pour correspondre au drag
    
    // Damping
    velocity.current.x *= 0.95
    velocity.current.y *= 0.95
    
    // Mettre à jour l'offset avec effet de boucle pour grille infinie
    const currentOffset = material.uniforms.offset.value
    currentOffset.x = (currentOffset.x + velocity.current.x) % 2
    currentOffset.y = (currentOffset.y + velocity.current.y) % 2
  })

  return (
    <points 
      ref={meshRef} 
      geometry={geometry} 
      material={material} 
      position={[0, 0, -20]}
    />
  )
}
