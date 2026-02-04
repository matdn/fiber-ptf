'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { Reflector } from 'three/examples/jsm/objects/Reflector.js'
import { extend } from '@react-three/fiber'

extend({ Reflector })

export function Water() {
  const reflectorRef = useRef<any>(null!)
  const [mousePos, setMousePos] = useState(new THREE.Vector2(0, 0))
  const prevMousePos = useRef(new THREE.Vector2(0, 0))
  const smoothMousePos = useRef(new THREE.Vector2(0, 0))
  const smoothPrevMousePos = useRef(new THREE.Vector2(0, 0))
  const ripples = useRef<Array<{ pos: THREE.Vector2; time: number }>>([])
  const lastAddTime = useRef(0)
  const lastMoveTime = useRef(0)
  const staticRipplePos = useRef(new THREE.Vector2(0, 0))
  const { size, camera } = useThree()
  
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
        ripplePositions: { value: new Array(20).fill(0).map(() => new THREE.Vector2(0, 0)) },
        rippleTimes: { value: new Array(20).fill(-100.0) },
        currentTime: { value: 0 },
        staticRipplePos: { value: new THREE.Vector2(0, 0) },
        lastMoveTime: { value: 0 },
      },
      vertexShader: `
        uniform mat4 textureMatrix;
        varying vec4 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = textureMatrix * vec4(position, 1.0);
          vPosition = position;
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
        uniform vec2 ripplePositions[20];
        uniform float rippleTimes[20];
        uniform float currentTime;
        uniform vec2 staticRipplePos;
        uniform float lastMoveTime;
        
        varying vec4 vUv;
        varying vec3 vPosition;
        
        void main() {
          vec2 pos = vPosition.xy;
          float totalWave = 0.0;
          
          // Check if cursor is static (hasn't moved in 0.1 seconds)
          bool isStatic = (currentTime - lastMoveTime) > 0.1;
          
          // Add static ripple when cursor is not moving
          if (isStatic) {
            float dist = distance(pos, staticRipplePos);
            float staticWave = sin(dist * 2.5 - currentTime * 3.0) * exp(-dist * 0.08);
            totalWave += staticWave * 0.6;
          }
          
          // Accumulate all moving ripples
          for(int i = 0; i < 20; i++) {
            float timeSinceImpact = currentTime - rippleTimes[i];
            
            // Skip old or invalid ripples
            if(timeSinceImpact < 0.0 || timeSinceImpact > 5.0) continue;
            
            float dist = distance(pos, ripplePositions[i]);
            
            // Wave propagating outward with slower speed
            float waveSpeed = 18.0;
            float waveRadius = timeSinceImpact * waveSpeed;
            float waveDist = abs(dist - waveRadius);
            
            // Smoother wave front with gentler decay
            float damping = exp(-timeSinceImpact * 0.35);
            float sharpness = exp(-waveDist * 1.3);
            float wave = sin(dist * 2.8 - timeSinceImpact * 4.5) * sharpness * damping;
            
            totalWave += wave;
          }
          
          // Apply smooth wave distortion
          float ripple = totalWave * 1.2;
          
          vec2 scaledUv = vUv.xy * dudvScale;
          vec2 distortedUv = texture2D(tDudv, vec2(scaledUv.x + time * waveSpeed, scaledUv.y)).rg * waveStrength;
          distortedUv = scaledUv + vec2(distortedUv.x, distortedUv.y + time * waveSpeed);
          vec2 distortion = (texture2D(tDudv, distortedUv).rg * 2.0 - 1.0) * waveStrength;
          
          // Add smooth ripple distortion
          distortion += vec2(ripple, ripple);
          
          vec4 uv = vec4(vUv);
          uv.xy += distortion;
          
          vec4 base = texture2DProj(tDiffuse, uv);
          gl_FragColor = vec4(base.rgb, opacity);
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

  // Track mouse position and update shader
  useFrame((state) => {
    if (reflectorRef.current) {
      const material = reflectorRef.current.material as THREE.ShaderMaterial
      if (material && material.uniforms) {
        const currentTime = state.clock.elapsedTime
        material.uniforms.time.value = currentTime
        material.uniforms.currentTime.value = currentTime
        
        // Use raycaster to get actual intersection with water plane
        const raycaster = new THREE.Raycaster()
        const mouse = new THREE.Vector2(state.pointer.x, state.pointer.y)
        raycaster.setFromCamera(mouse, camera)
        
        const intersects = raycaster.intersectObject(reflectorRef.current)
        if (intersects.length > 0) {
          const localPoint = reflectorRef.current.worldToLocal(intersects[0].point.clone())
          const newPos = new THREE.Vector2(localPoint.x, localPoint.y)
          
          // Smooth the mouse positions
          smoothPrevMousePos.current.lerp(smoothMousePos.current, 0.15)
          smoothMousePos.current.lerp(newPos, 0.2)
          
          // Add ripple when mouse moves or every 50ms
          const distance = smoothMousePos.current.distanceTo(smoothPrevMousePos.current)
          if (currentTime - lastAddTime.current > 0.05 && distance > 0.5) {
            // Add new ripple
            ripples.current.push({
              pos: smoothMousePos.current.clone(),
              time: currentTime
            })
            
            // Keep only recent ripples (max 20)
            if (ripples.current.length > 20) {
              ripples.current.shift()
            }
            
            lastAddTime.current = currentTime
            lastMoveTime.current = currentTime
            staticRipplePos.current.copy(smoothMousePos.current)
          }
          
          // Update shader uniforms
          material.uniforms.staticRipplePos.value.copy(staticRipplePos.current)
          material.uniforms.lastMoveTime.value = lastMoveTime.current
          
          // Update shader uniforms with ripple data
          for (let i = 0; i < 20; i++) {
            if (i < ripples.current.length) {
              material.uniforms.ripplePositions.value[i].copy(ripples.current[i].pos)
              material.uniforms.rippleTimes.value[i] = ripples.current[i].time
            } else {
              material.uniforms.rippleTimes.value[i] = -100.0
            }
          }
        }
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
