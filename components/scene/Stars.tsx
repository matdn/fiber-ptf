'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface StarsProps {
  count?: number
}

export function Stars({ count = 1500 }: StarsProps) {
  const pointsRef = useRef<THREE.Points>(null)
  
  const [positions, scales] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const scales = new Float32Array(count)
    
    for (let i = 0; i < count; i++) {
      // Répartir dans un plan XY, avec Z dans un intervalle réduit et éloigné
      const radius = 180 + Math.random() * 220 // Rayon pour X et Y
      const theta = Math.random() * Math.PI * 2
      
      positions[i * 3] = radius * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(theta)
      positions[i * 3 + 2] = 250 - Math.random() * 30 // Z entre -150 et -180
      
      // Scale aléatoire pour chaque étoile
      scales[i] = Math.random()
    }
    
    return [positions, scales]
  }, [count])
  
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
        color: { value: new THREE.Color(0xffffff) }
      },
      vertexShader: `
        attribute float scale;
        uniform float time;
        varying float vScale;
        
        void main() {
          vScale = scale;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // Scintillement basé sur la position et le temps
          float flicker = sin(time * 2.0 + position.x * 0.1 + position.y * 0.1) * 0.5 + 0.5;
          float flicker2 = sin(time * 3.0 + position.z * 0.1) * 0.3 + 0.7;
          
          gl_PointSize = (scale * 4.0 + 2.0) * flicker * flicker2 * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vScale;
        
        void main() {
          // Créer un point circulaire
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
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
    }
  })
  
  return <points ref={pointsRef} geometry={geometry} material={material} />
}
