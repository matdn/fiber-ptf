'use client'

import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface ModelProps {
  onCurveFound?: (position: THREE.Vector3) => void
  onCurveRefFound?: (ref: THREE.Object3D) => void
  onCurveStarFound?: (position: THREE.Vector3) => void
  isUnderwater: boolean
  isInSpace: boolean
}

export function Model({ onCurveFound, onCurveRefFound, onCurveStarFound, isUnderwater, isInSpace }: ModelProps) {
  const { scene } = useGLTF('/model.glb')
  const curveRef = useRef<THREE.Object3D | null>(null)
  const curveStarRef = useRef<THREE.Object3D | null>(null)

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
      if (isInSpace) {
        curve.material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: new THREE.Color(0xffffff),
          toneMapped: false,
          transparent: true,
          opacity: 0
        })
      } else {
        curve.material = new THREE.MeshStandardMaterial({
          color: isUnderwater ? 0x5555ff : 0xffffff,
          emissive: new THREE.Color(isUnderwater ? 0x2222ff : 0xffffff),
          toneMapped: false,
          transparent: true,
          opacity: 1
        })
      }
    }

    const curveStar = curveStarRef.current as THREE.Mesh | null
    if (curveStar && isInSpace) {
      curveStar.material = new THREE.MeshPhysicalMaterial({
        transmission: 1,
        thickness: 10,
        roughness: 0,
        metalness: 0.1,
        ior: 1.2,
        dispersion: 1,
        clearcoat: 0.1,
        clearcoatRoughness: 1.1,
        iridescence: 1.1,
        iridescenceIOR: 1,
        iridescenceThicknessRange: [100, 400],
        color: 'transparent',
        transparent: true,
        depthWrite: true
      })
    }
  }, [isUnderwater, isInSpace])

  useFrame(() => {
    if (curveStarRef.current && isInSpace) {
      curveStarRef.current.rotation.z += 0.005
    }
  })

  const curve = curveRef.current

  return (
    <>
      <group>
        <primitive object={scene} scale={1} />
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

      {isInSpace && curveStarRef.current && <primitive object={curveStarRef.current} scale={5} />}
    </>
  )
}

useGLTF.preload('/model.glb')
