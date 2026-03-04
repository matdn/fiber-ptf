'use client'

import { useEffect, useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface StarsProps {
  count?: number
  position?: [number, number, number]
  radius?: number
}

export function Stars({ count = 1500, position = [0, 0, 0], radius = 200 }: StarsProps) {
  const pointsRef = useRef<THREE.Points>(null)

  const [px, py, pz] = position
  
  const [positions, scales] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    
    for (let i = 0; i < count; i++) {
      // Répartir dans une sphère autour de la position
      const r = radius * (0.3 + Math.random() * 0.7) // Distance variée du centre
      const theta = Math.random() * Math.PI * 2 // Angle horizontal
      const phi = Math.acos(2 * Math.random() - 1) // Angle vertical pour distribution sphérique
      
      positions[i * 3] = px + r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = py + r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = pz + r * Math.cos(phi)
      
      // Scale aléatoire pour chaque étoile
      scales[i] = Math.random()
    }
    
    return [positions, scales]
  }, [count, radius, px, py, pz])
  
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    return geo
  }, [positions, scales])
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xffffff) },
        mousePosition: { value: new THREE.Vector2(0, 0) },
        mouseInfluence: { value: 0.5 },
        maxPointSize: { value: 12.0 },
        minDepth: { value: 40.0 }
      },
      vertexShader: `
        attribute float scale;
        uniform float time;
        uniform vec2 mousePosition;
        uniform float mouseInfluence;
        uniform float maxPointSize;
        uniform float minDepth;
        varying float vScale;
        varying float vRotation;
        
        void main() {
          vScale = scale;
          // Rotation basée sur la position pour que chaque étoile tourne différemment
          vRotation = time * 0.5 + position.x * 0.1 + position.y * 0.1;
          
          vec3 pos = position;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          
          // Scintillement basé sur la position et le temps
          float flicker = sin(time * 2.0 + position.x * 0.1 + position.y * 0.1) * 0.5 + 0.5;
          float flicker2 = sin(time * 3.0 + position.z * 0.1) * 0.3 + 0.7;

          // Limiter la taille pour éviter des étoiles gigantesques près de la caméra
          float depth = max(minDepth, -mvPosition.z);
          float size = (scale * 2.0 + 1.0) * flicker * flicker2 * (400.0 / depth);
          gl_PointSize = clamp(size, 1.0, maxPointSize);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vScale;
        varying float vRotation;
        
        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          
          // Appliquer la rotation
          float s = sin(vRotation);
          float c = cos(vRotation);
          coord = vec2(c * coord.x - s * coord.y, s * coord.x + c * coord.y);
          
          // Créer une forme d'étoile à 4 branches (croix)
          float horizontal = abs(coord.x);
          float vertical = abs(coord.y);
          
          // Distance minimale aux axes pour créer une croix
          float dist = min(horizontal, vertical);
          
          // Adoucir les bords et créer un glow
          float glow = 1.0 - smoothstep(0.0, 0.15, dist);
          
          // Ajouter un point central plus lumineux
          float centerDist = length(coord);
          float center = 1.0 - smoothstep(0.0, 0.1, centerDist);
          
          float alpha = max(glow * 0.6, center * 0.9);
          
          // Couleur blanche pure avec alpha pour le bloom
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  }, [])
  
  useFrame((state) => {
    if (pointsRef.current) {
      material.uniforms.time.value = state.clock.elapsedTime
      material.uniforms.mousePosition.value.set(state.pointer.x, state.pointer.y)
    }
  })

  useEffect(() => {
    if (!pointsRef.current) return
    // Tag so the water reflector can ignore stars without hiding them from the main render.
    pointsRef.current.userData.excludeFromReflector = true
    pointsRef.current.name = 'Stars'
  }, [])

  // Dispose GPU resources on unmount
  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])
  
  return <points ref={pointsRef} geometry={geometry} material={material} />
}
