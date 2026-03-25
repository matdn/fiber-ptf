'use client'

import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useUnderwater } from '@/contexts/UnderwaterContext'

type SweatWithSpheresProps = {
  interactionCenter?: [number, number, number]
  transitionProgress?: number
}

export default function SweatWithSpheres({ interactionCenter = [0, 0, 0], transitionProgress = 1 }: SweatWithSpheresProps) {
  const { scene } = useGLTF('3D/sweat.glb')
  const groupRef = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.Points>(null)
  const modelRef = useRef<THREE.Object3D>(null)
  const { camera } = useThree()
  const { isMuted } = useUnderwater()
  const interactionCenterRef = useRef(new THREE.Vector3(...interactionCenter))
  const planeRef = useRef(new THREE.Plane())
  const planeNormalRef = useRef(new THREE.Vector3())
  const intersectionRef = useRef(new THREE.Vector3())
  const intersectionLocalRef = useRef(new THREE.Vector3())
  const audioPoolRef = useRef<HTMLAudioElement[]>([])
  const audioPoolIndexRef = useRef(0)
  const lastChimeAtRef = useRef(0)
  const previousPointerLocalRef = useRef(new THREE.Vector3())
  const hasPointerSampleRef = useRef(false)
  // Hoist raycaster — avoid allocating a new one every frame
  const raycasterRef = useRef(new THREE.Raycaster())

  const originalPositions = useMemo(() => {
  const positions: THREE.Vector3[] = []
  const normals: THREE.Vector3[] = []
  const isWhite: boolean[] = []
  const opacities: number[] = []
  let index = 0
  const MIN_DIST = 0.04
  const MIN_DIST_SQ = MIN_DIST * MIN_DIST
  const cellSize = MIN_DIST
  const grid = new Map<string, number[]>()
  const getKey = (x: number, y: number, z: number) => `${x},${y},${z}`
  const isFarEnough = (pos: THREE.Vector3, normal: THREE.Vector3) => {
    const cx = Math.floor(pos.x / cellSize)
    const cy = Math.floor(pos.y / cellSize)
    const cz = Math.floor(pos.z / cellSize)

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const key = getKey(cx + dx, cy + dy, cz + dz)
            const list = grid.get(key)
            if (!list) continue

            for (const idx of list) {
              const existing = positions[idx]
              const distSq = existing.distanceToSquared(pos)
              if (distSq < MIN_DIST_SQ) return false

              const existingNormal = normals[idx]
              const normalDot = existingNormal.dot(normal)
              if (normalDot < 0.1) return false
            }
          }
        }
      }

      const cellKey = getKey(cx, cy, cz)
      const cell = grid.get(cellKey)
      if (cell) cell.push(positions.length)
      else grid.set(cellKey, [positions.length])
      return true
    }
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        const geometry = child.geometry
        const positionAttribute = geometry.attributes.position
        const normalAttribute = geometry.attributes.normal
        const isCap = child.name.toLowerCase().includes('cap')
        child.updateWorldMatrix(true, false)

        if (positionAttribute) {
          const tempVector = new THREE.Vector3()
          const tempNormal = new THREE.Vector3()
          const normalMatrix = new THREE.Matrix3().getNormalMatrix(child.matrixWorld)
          
          const step = isCap ? 1 : 10
          for (let i = 0; i < positionAttribute.count; i += step) {
            tempVector.fromBufferAttribute(positionAttribute, i)
            tempVector.applyMatrix4(child.matrixWorld)
            if (normalAttribute) {
              tempNormal.fromBufferAttribute(normalAttribute, i)
              tempNormal.applyMatrix3(normalMatrix).normalize()
            } else {
              tempNormal.set(0, 0, 1)
            }

            if (!isCap && !isFarEnough(tempVector, tempNormal)) continue
            positions.push(tempVector.clone())
            normals.push(tempNormal.clone())
            isWhite.push(index % 2 === 0)
            opacities.push(0.4 + Math.random() * 0.6)
            index++
          }
        }
      }
    })
    
    return { positions, isWhite, opacities }
  }, [scene])

  const physicsData = useRef<{
    currentPositions: THREE.Vector3[]
    velocities: THREE.Vector3[]
  }>({
    currentPositions: originalPositions.positions.map(p => p.clone()),
    velocities: originalPositions.positions.map(() => new THREE.Vector3()),
  })

  // Compter le nombre total de vertices
  const vertexCount = originalPositions.positions.length

  const starsGeometry = useMemo(() => {
    const positions = new Float32Array(vertexCount * 3)
    const colors = new Float32Array(vertexCount * 3)
    const opacities = new Float32Array(vertexCount)
    const sizes = new Float32Array(vertexCount)

    for (let i = 0; i < vertexCount; i++) {
      const pos = originalPositions.positions[i]
      positions[i * 3] = pos.x
      positions[i * 3 + 1] = pos.y
      positions[i * 3 + 2] = pos.z

      const isWhite = originalPositions.isWhite[i]
      const baseColor = isWhite ? 1.0 : 0.75
      colors[i * 3] = baseColor
      colors[i * 3 + 1] = baseColor
      colors[i * 3 + 2] = baseColor

      opacities[i] = originalPositions.opacities[i]
      sizes[i] = 0.6 + Math.random() * 0.1
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geometry
  }, [originalPositions, vertexCount])

  const starsMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          maxPointSize: { value: 10.0 },
          minDepth: { value: 2.0 },
          globalOpacity: { value: 0.0 },
        },
        vertexShader: `
          attribute float size;
          attribute float opacity;
          attribute vec3 aColor;
          uniform float time;
          uniform float maxPointSize;
          uniform float minDepth;
          varying float vOpacity;
          varying vec3 vColor;
          varying float vRotation;

          void main() {
            vOpacity = opacity;
            vColor = aColor;
            vRotation = time * 0.6 + position.x * 0.08 + position.y * 0.08;

            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            float depth = max(minDepth, -mvPosition.z);
            float sizePx = (size * 1.6 + 0.6) * (360.0 / depth);
            gl_PointSize = clamp(sizePx, 1.0, maxPointSize);
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform float globalOpacity;
          varying float vOpacity;
          varying vec3 vColor;
          varying float vRotation;

          void main() {
            vec2 coord = gl_PointCoord - vec2(0.5);

            float s = sin(vRotation);
            float c = cos(vRotation);
            coord = vec2(c * coord.x - s * coord.y, s * coord.x + c * coord.y);

            float horizontal = abs(coord.x);
            float vertical = abs(coord.y);
            float dist = min(horizontal, vertical);

            float glow = 1.0 - smoothstep(0.0, 0.16, dist);
            float centerDist = length(coord);
            float center = 1.0 - smoothstep(0.0, 0.12, centerDist);

            float alpha = max(glow * 0.65, center * 0.9) * vOpacity * globalOpacity;
            if (alpha < 0.005) discard;
            gl_FragColor = vec4(vColor, alpha);
          }
        `,
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false,
        vertexColors: false,
      }),
    []
  )

    useEffect(() => {
      if (!pointsRef.current) return
      pointsRef.current.frustumCulled = false
    }, [])

    useEffect(() => {
      interactionCenterRef.current.set(interactionCenter[0], interactionCenter[1], interactionCenter[2])
    }, [interactionCenter])

  useEffect(() => {
    const poolSize = 12
    const pool: HTMLAudioElement[] = []

    for (let i = 0; i < poolSize; i++) {
      const audio = new Audio('/sounds/starSound.mp3')
      audio.preload = 'auto'
      audio.volume = 0.2
      pool.push(audio)
    }

    audioPoolRef.current = pool

    return () => {
      pool.forEach((audio) => {
        audio.pause()
        audio.src = ''
      })
      audioPoolRef.current = []
    }
  }, [])

  const stopAllChimes = () => {
    audioPoolRef.current.forEach((audio) => {
      audio.pause()
      audio.currentTime = 0
    })
  }

  const playChime = (intensity: number, cursorSpeed: number) => {
    if (isMuted || audioPoolRef.current.length === 0) return
    if (cursorSpeed < 0.08) return

    const now = performance.now()
    const cooldown = intensity > 5 ? 24 : intensity > 1 ? 4 : 46
    if (now - lastChimeAtRef.current < cooldown) return
    lastChimeAtRef.current = now

    const audio = audioPoolRef.current[audioPoolIndexRef.current]
    audioPoolIndexRef.current = (audioPoolIndexRef.current + 1) % audioPoolRef.current.length

    audio.currentTime = Math.random() * 0.07
    audio.volume = Math.min(0.36, 0.12 + intensity * 0.024 + Math.min(cursorSpeed, 0.8) * 0.08)
    audio.play().catch(() => {})
  }

  useEffect(() => {
    if (!isMuted) return
    stopAllChimes()
  }, [isMuted])

  // Dispose GPU resources on unmount
  useEffect(() => {
    return () => {
      starsGeometry.dispose()
      starsMaterial.dispose()
    }
  }, [starsGeometry, starsMaterial])

  useFrame((state, delta) => {
   
    if (pointsRef.current) {
      const raycaster = raycasterRef.current
      raycaster.setFromCamera(state.pointer, camera)
      
      planeNormalRef.current.copy(camera.getWorldDirection(planeNormalRef.current)).normalize()
      planeRef.current.setFromNormalAndCoplanarPoint(planeNormalRef.current, interactionCenterRef.current)
      const intersection = intersectionRef.current
      raycaster.ray.intersectPlane(planeRef.current, intersection)
      const intersectionLocal = intersectionLocalRef.current
      intersectionLocal.copy(intersection)
      pointsRef.current.worldToLocal(intersectionLocal)

      let cursorSpeed = 0
      if (hasPointerSampleRef.current) {
        const pointerDelta = intersectionLocal.distanceTo(previousPointerLocalRef.current)
        cursorSpeed = pointerDelta / Math.max(delta, 0.0001)
      }
      previousPointerLocalRef.current.copy(intersectionLocal)
      hasPointerSampleRef.current = true

      const REPULSE_R = 0.6
      const REPULSE_STR = 0.8
      const SPRING_STRENGTH = 0.05
      const DAMPING = 0.4

      const positionAttr = starsGeometry.getAttribute('position') as THREE.BufferAttribute
      const positions = positionAttr.array as Float32Array
      let interactionEnergy = 0
      
      for (let i = 0; i < originalPositions.positions.length; i++) {
        const originalPos = originalPositions.positions[i]
        const currentPos = physicsData.current.currentPositions[i]
        const velocity = physicsData.current.velocities[i]
        
        const dx = currentPos.x - intersectionLocal.x
        const dy = currentPos.y - intersectionLocal.y
        const dz = currentPos.z - intersectionLocal.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
        
        let forceX = 0
        let forceY = 0
        let forceZ = 0
        
        if (dist < REPULSE_R && dist > 0.01) {
          const repulseForce = ((1 - dist / REPULSE_R) ** 2) * REPULSE_STR
          forceX += (dx / dist) * repulseForce
          forceY += (dy / dist) * repulseForce
          forceZ += (dz / dist) * repulseForce
          interactionEnergy += repulseForce
        }
        
        const springX = (originalPos.x - currentPos.x) * SPRING_STRENGTH
        const springY = (originalPos.y - currentPos.y) * SPRING_STRENGTH
        const springZ = (originalPos.z - currentPos.z) * SPRING_STRENGTH
        
        velocity.x += forceX + springX
        velocity.y += forceY + springY
        velocity.z += forceZ + springZ
        
        velocity.multiplyScalar(DAMPING)
        
        currentPos.add(velocity)

        positions[i * 3] = currentPos.x
        positions[i * 3 + 1] = currentPos.y
        positions[i * 3 + 2] = currentPos.z
      }

      positionAttr.needsUpdate = true
      starsMaterial.uniforms.time.value = state.clock.elapsedTime
      starsMaterial.uniforms.globalOpacity.value = transitionProgress

      if (cursorSpeed < 0.08) {
        stopAllChimes()
      } else if (interactionEnergy > 0.7) {
        playChime(interactionEnergy, cursorSpeed)
      }
    }
  })

  return (
    <>
      <group ref={groupRef}>
        <primitive ref={modelRef} object={scene} visible={false} />
      </group>
      {vertexCount > 0 && (
        <points ref={pointsRef} geometry={starsGeometry} material={starsMaterial} />
      )}
    </>
  )
}

