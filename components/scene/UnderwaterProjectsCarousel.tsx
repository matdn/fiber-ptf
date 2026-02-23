'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { PROJECT_IMAGE_URLS } from '@/lib/projectImages'

function wrap(value: number, range: number) {
  return ((value % range) + range) % range
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

type ShaderLike = {
  uniforms: Record<string, { value: unknown }>
  vertexShader: string
}

export function UnderwaterProjectsCarousel({
  isActive,
  centerPosition
}: {
  isActive: boolean
  centerPosition: THREE.Vector3 | null
}) {
  const groupRef = useRef<THREE.Group>(null)
  const planeRefs = useRef<Array<THREE.Mesh | null>>([])

  const { camera } = useThree()

  const textureUrls = useMemo(() => [...PROJECT_IMAGE_URLS] as string[], [])
  const textures = useTexture(textureUrls) as THREE.Texture[]

  const itemCount = 14
  const spacing = 6.2
  const radius = 18
  const sizeMultiplier = 2.6
  // Plus la valeur est grande, plus ça "glisse" en spirale autour du tube en descendant.
  const turnsPerLoop = 1.6
  const spiralSpeed = 0.25
  const tubeRotationSpeed = 0.45
  const focusRange = 4.8
  const focusRadiusBump = 1.2
  const cameraPull = 8.5

  const wheelSensitivity = 0.00055
  const maxDownVelocity = -0.28
  const maxUpVelocity = 0.06
  const inertia = 0.63

  const widthSegments = 48

  const tmp = useMemo(
    () => ({
      fallback: new THREE.Vector3(0, 0, 0),
      cameraLocal: new THREE.Vector3(),
      cameraXZ: new THREE.Vector3(),
      axisLocal: new THREE.Vector3(),
      axisWorld: new THREE.Vector3(),
      radial: new THREE.Vector3(),
      dirWorld: new THREE.Vector3(),
      targetPos: new THREE.Vector3()
    }),
    []
  )

  const bendOnBeforeCompile = (shader: ShaderLike) => {
    shader.uniforms.bendRadius = { value: radius }

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>\nuniform float bendRadius;`
    )

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nfloat theta = transformed.x / bendRadius;\nfloat s = sin(theta);\nfloat c = cos(theta);\ntransformed.x = s * bendRadius;\ntransformed.z += (1.0 - c) * bendRadius;`
    )
  }

  const scrollOffset = useRef(0)
  const scrollVelocity = useRef(0)

  const items = useMemo(() => {
    return Array.from({ length: itemCount }, (_, index) => {
      const texture = textures[index % textures.length]
      const image = texture.image as { width?: number; height?: number } | undefined
      const imgW = typeof image?.width === 'number' ? image.width : 1
      const imgH = typeof image?.height === 'number' ? image.height : 1
      const aspect = imgH > 0 ? imgW / imgH : 1

      const targetHeight = 2.8 * sizeMultiplier
      const targetWidth = targetHeight * aspect

      return {
        index,
        texture,
        width: targetWidth,
        height: targetHeight,
        phase: index * 0.9
      }
    })
  }, [textures])

  useEffect(() => {
    if (!isActive) return

    const onWheel = (e: WheelEvent) => {
      // Si la page est scrollable, empêcher le scroll natif pour garder le contrôle du carousel.
      e.preventDefault()

      const delta = Math.max(-120, Math.min(120, e.deltaY))
      // deltaY positif = scroll down => on fait descendre la liste (donc offset -)
      scrollVelocity.current += (-delta * wheelSensitivity)
      scrollVelocity.current = Math.max(maxDownVelocity, Math.min(maxUpVelocity, scrollVelocity.current))
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [isActive])

  useFrame((state, delta) => {
    if (!isActive) return

    // Inertie (feeling flottant)
    scrollOffset.current += scrollVelocity.current
    scrollVelocity.current *= inertia

    // Petit drift continu
    scrollOffset.current += Math.sin(state.clock.elapsedTime * 0.25) * 0.002

    const total = itemCount * spacing
    const t = state.clock.elapsedTime

    if (groupRef.current) {
      if (centerPosition) {
        tmp.dirWorld.subVectors(camera.position, centerPosition).normalize()
        tmp.targetPos.copy(centerPosition).addScaledVector(tmp.dirWorld, cameraPull)
        groupRef.current.position.lerp(tmp.targetPos, 0.08)
      } else {
        groupRef.current.position.lerp(tmp.fallback, 0.1)
      }

      // Rotation continue du tube autour de l'axe Y (orbite naturelle)
      groupRef.current.rotation.y += tubeRotationSpeed * delta

      // Wobble léger (eau)
      groupRef.current.rotation.x = Math.sin(t * 0.25) * 0.05
      groupRef.current.rotation.z = Math.cos(t * 0.22) * 0.04

      // Direction caméra en espace local du tube (pour savoir quel côté est "face caméra")
      tmp.cameraLocal.copy(camera.position)
      groupRef.current.worldToLocal(tmp.cameraLocal)
      tmp.cameraXZ.set(tmp.cameraLocal.x, 0, tmp.cameraLocal.z)
      if (tmp.cameraXZ.lengthSq() > 0.00001) {
        tmp.cameraXZ.normalize()
      } else {
        tmp.cameraXZ.set(0, 0, 1)
      }
    } else {
      tmp.cameraXZ.set(0, 0, 1)
    }

    for (const item of items) {
      const mesh = planeRefs.current[item.index]
      if (!mesh) continue

      const rawY = item.index * spacing + scrollOffset.current
      const wrappedY = wrap(rawY + total / 2, total) - total / 2

      // Spirale: en descendant, l'objet tourne autour de la curve (glisse le long d'un tube)
      const baseAngle = (item.index / itemCount) * Math.PI * 2
      const angle = baseAngle + (wrappedY / spacing) * (Math.PI * 2) * turnsPerLoop + t * spiralSpeed
      const floatX = Math.sin(t * 0.9 + item.phase) * 0.35
      const floatY = Math.sin(t * 0.7 + item.phase) * 0.25
      const floatZ = Math.cos(t * 0.8 + item.phase) * 0.4

      // Focus: plus proche du centre => plus "présent" (sans reculer en Z)
      const centerFactor = 1 - smoothstep(0, focusRange, Math.abs(wrappedY))
      tmp.radial.set(Math.cos(angle), 0, Math.sin(angle))
      const frontness = clamp(tmp.radial.dot(tmp.cameraXZ), 0, 1)
      const focus = centerFactor * frontness
      const effectiveRadius = radius + focusRadiusBump * focus

      mesh.position.set(
        tmp.radial.x * effectiveRadius + floatX,
        wrappedY + floatY,
        tmp.radial.z * effectiveRadius + floatZ
      )

      // Former un tube: les plans regardent l'axe du tube (pas la caméra)
      if (groupRef.current) {
        tmp.axisLocal.set(0, wrappedY, 0)
        tmp.axisWorld.copy(tmp.axisLocal)
        groupRef.current.localToWorld(tmp.axisWorld)
        mesh.lookAt(tmp.axisWorld)
      }
      mesh.rotateZ(Math.sin(t * 0.6 + item.phase) * 0.12)
      mesh.rotateX(Math.cos(t * 0.55 + item.phase) * 0.06)

      // Mini breathing sur l’échelle
      const s = (0.9 + focus * 0.35) * (1 + Math.sin(t * 0.5 + item.phase) * 0.03)
      mesh.scale.set(s, s, 1)

      const material = mesh.material as THREE.MeshStandardMaterial
    //   material.opacity = 0.35 + focus * 0.65
    }

    // Eviter des gros sauts si l’onglet a freeze
    if (delta > 0.2) {
      scrollVelocity.current = 0
    }
  })

  if (!isActive) return null

  return (
    <group ref={groupRef}>
      {items.map((item) => (
        <mesh
          key={item.index}
          ref={(node) => {
            planeRefs.current[item.index] = node
          }}
        >
          <planeGeometry args={[item.width, item.height, widthSegments, 1]} />
          <meshBasicMaterial
            map={item.texture}
            transparent
            // opacity={0.88}
            // roughness={0.65}
            // metalness={0.0}
            // emissive={new THREE.Color('#0a1b3d')}
            // emissiveIntensity={0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
            onBeforeCompile={bendOnBeforeCompile}
          />
        </mesh>
      ))}
    </group>
  )
}
