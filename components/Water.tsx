'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { extend } from '@react-three/fiber'

extend({ Reflector })

export function Water() {
  const reflectorRef = useRef<any>(null!)
  
  // Charger la texture DUDV depuis public
  const dudvTexture = useTexture('/waterudv.png')
  
  // Configurer le wrapping de la texture
  useMemo(() => {
    dudvTexture.wrapS = THREE.RepeatWrapping
    dudvTexture.wrapT = THREE.RepeatWrapping
  }, [dudvTexture])

  // Options pour le Reflector avec shader personnalisé
  const reflectorOptions = useMemo(() => {
    const shader = {
      name: 'ReflectorShader',
      uniforms: {
        color: { value: new THREE.Color(0x000000) },
        tDiffuse: { value: null },
        tDudv: { value: dudvTexture },
        textureMatrix: { value: new THREE.Matrix4() },
        time: { value: 0 },
        waveStrength: { value: 1 },
        waveSpeed: { value: 0.005 },
        transmission: { value: 0 },
        dudvScale: { value: 0.01 },
        opacity: { value: 1.0 },
      },
      vertexShader: `
        uniform mat4 textureMatrix;
        varying vec4 vUv;
        
        void main() {
          vUv = textureMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float dudvScale;
        uniform sampler2D tDiffuse;
        uniform sampler2D tDudv;
        uniform float time;
        uniform float waveStrength;
        uniform float waveSpeed;
        uniform float transmission;
        uniform float opacity;
        
        varying vec4 vUv;
        
        void main() {
          vec2 scaledUv = vUv.xy * dudvScale;
          vec2 distortedUv = texture2D(tDudv, vec2(scaledUv.x + time * waveSpeed, scaledUv.y)).rg * waveStrength;
          distortedUv = scaledUv + vec2(distortedUv.x, distortedUv.y + time * waveSpeed);
          vec2 distortion = (texture2D(tDudv, distortedUv).rg * 2.0 - 1.0) * waveStrength;
          
          vec4 uv = vec4(vUv);
          uv.xy += distortion;
          
          vec4 base = texture2DProj(tDiffuse, uv);
          gl_FragColor = vec4(mix(base.rgb, color, transmission), opacity);
        }
      `,
    }

    return {
      clipBias: 0.003,
      textureWidth: window.innerWidth * 0.5, // Réduire de 2x à 0.5x pour améliorer les performances
      textureHeight: window.innerHeight * 0.5,
      color: 0x000000,
      shader,
    }
  }, [dudvTexture])

  // Animation du shader
  useFrame((state) => {
    if (reflectorRef.current) {
      const material = reflectorRef.current.material as THREE.ShaderMaterial
      if (material && material.uniforms) {
        material.uniforms.time.value = state.clock.elapsedTime
      }
    }
  })

  return (
    <reflector
      ref={reflectorRef}
      args={[
        new THREE.PlaneGeometry(400, 400, 10, 10), // Réduire la taille et les segments
        reflectorOptions
      ]}
    />
  )
}
