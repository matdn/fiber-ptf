'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import SweatWithSpheres from '../SweatWithSpheres'

interface ModelProps {
  onCurveFound?: (position: THREE.Vector3) => void
  onCurveRefFound?: (ref: THREE.Object3D) => void
  onCurveStarFound?: (position: THREE.Vector3) => void
  isUnderwater: boolean
  isInSpace: boolean
  spaceTransitionProgress?: number
  hdriSlotIndex?: number
}

export function Model({ onCurveFound, onCurveRefFound, onCurveStarFound, isUnderwater, isInSpace, spaceTransitionProgress = 0, hdriSlotIndex }: ModelProps) {
  const { scene } = useGLTF('/model.glb')
  const curveRef = useRef<THREE.Object3D | null>(null)
  const curveStarRef = useRef<THREE.Object3D | null>(null)
  const ellipseGroupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    scene.traverse((child) => {
      if (child.name.toLowerCase() === 'curve') {
        curveRef.current = child
        onCurveFound?.(child.position.clone())
        onCurveRefFound?.(child)

        const curveMesh = child as THREE.Mesh
        curveMesh.material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: new THREE.Color(0xffffff),
          toneMapped: false
        })

        if (!curveStarRef.current) {
          const clonedCurve = child.clone(true)
          curveStarRef.current = clonedCurve
          curveStarRef.current.position.set(0, 200, 0)
        }
      }
    })

    if (curveStarRef.current) {
      onCurveStarFound?.(new THREE.Vector3(0, 200, 0))
    }
  }, [scene, onCurveFound, onCurveRefFound, onCurveStarFound])

  useEffect(() => {
    const curve = curveRef.current as THREE.Mesh | null
    if (curve) {
      // Dispose the previous material before replacing to avoid GPU leak
      ;(curve.material as THREE.Material)?.dispose?.()

      if (isInSpace) {
        curve.material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: new THREE.Color(0xffffff),
          toneMapped: false,
          transparent: true,
          opacity: 0
        })
      } else if (isUnderwater) {
        curve.material = new THREE.MeshPhysicalMaterial({
        transmission: 1,
        thickness: 2,
        roughness: 0,
        metalness: 0.1,
        ior: 1.9,
        dispersion: 1,
        clearcoat: 0.1,
        clearcoatRoughness: 1.1,
        iridescenceThicknessRange: [100, 400],
        color: "transparent",
        transparent: true,
        depthWrite: true,
      })
      } else {
        // const isNight = hdriSlotIndex === undefined || hdriSlotIndex === 3
        // if (isNight) {
          // Night: white glowing emissive with bloom
          curve.material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: 20.2,
            toneMapped: false,
            transparent: true,
            opacity: 1,
          })
      //   } else {
      //     // Day: glass / translucent, no emissive
      //     curve.material = new THREE.MeshPhysicalMaterial({
      //       transmission: 1,
      //       thickness: 1.5,
      //       roughness: 0.0,
      //       metalness: 0,
      //       ior: 1.8,
      //       clearcoat: 1,
      //       clearcoatRoughness: 0,
      //       transparent: true,
      //     })
      //   }
      }
    }

    const curveStar = curveStarRef.current as THREE.Mesh | null
    if (curveStar) {
      curveStar.visible = !isInSpace
    }
  }, [isUnderwater, isInSpace, hdriSlotIndex])

  const isNight = hdriSlotIndex === undefined || hdriSlotIndex === 3

  const ellipseMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      color: { value: new THREE.Color('#ffffff') },
      time: { value: 0 }
    },
    vertexShader: `
      attribute float alpha;
      attribute float phase;
      varying float vAlpha;
      varying float vPhase;
      void main() {
        vAlpha = alpha;
        vPhase = phase;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float time;
      varying float vAlpha;
      varying float vPhase;
      void main() {
        // normalise phase to [0,1]
        float t = fract(vPhase / (2.0 * 3.14159265));
        // moving head position [0,1]
        float head = fract(time * 0.18);
        // angular distance from head (wrapping)
        float d = fract(head - t);
        // sharp trail: full at head, fades over ~40% of the loop
        float trail = 1.0 - smoothstep(0.0, 0.38, d);
        float alpha = 0.0 + 0.95 * trail;
        gl_FragColor = vec4(color, alpha);
      }
    `
  }), [])

  // Dispose ellipse shader on unmount
  useEffect(() => {
    return () => { ellipseMaterial.dispose() }
  }, [ellipseMaterial])

  const curve = curveRef.current

  return (
    <>
      <group>
        {(!isInSpace ) && <primitive object={scene} scale={1} />}
        {curve && !isUnderwater && !isInSpace && (
          <pointLight
            position={[curve.position.x, curve.position.y, curve.position.z]}
            intensity={15}
            distance={30}
            decay={2}
            color={0xffffff}
          />
        )}
      </group>

      {isInSpace && (
        <group ref={ellipseGroupRef} position={[0, 198, 0]} rotation={[0, 0, 0]}>
          <group scale={7} rotateOnAxis={new THREE.Vector3(0, 1, 0)}>
            <SweatWithSpheres interactionCenter={[0, 200, 0]} transitionProgress={spaceTransitionProgress} />
          </group>
        </group>
      )}
    </>
  )
}

useGLTF.preload('/model.glb')
