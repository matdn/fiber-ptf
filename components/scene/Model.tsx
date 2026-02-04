'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface ModelProps {
  onCurveFound?: (position: THREE.Vector3) => void
  onCurveRefFound?: (ref: THREE.Object3D) => void
  onCurveClick?: () => void
  isUnderwater: boolean
}

export function Model({ onCurveFound, onCurveRefFound, onCurveClick, isUnderwater }: ModelProps) {
  const { scene } = useGLTF('/model.glb')
  const curveRef = useRef<THREE.Object3D | null>(null)
  const { raycaster, pointer, camera } = useThree()

  useEffect(() => {
    scene.traverse((child) => {
      if (child.name.toLowerCase() === 'curve') {
        curveRef.current = child
        if (onCurveFound) {
          onCurveFound(child.position.clone())
        }
        if (onCurveRefFound) {
          onCurveRefFound(child)
        }
        const childObject = child as THREE.Mesh 
        childObject.material = new THREE.MeshStandardMaterial({ 
          color: 0xffffff,
          emissive: new THREE.Color(0xffffff),
          toneMapped: false
        })
      }
    })
  }, [scene, onCurveFound, onCurveRefFound])

  // Gérer le materiau de la curve
  useEffect(() => {
    if (curveRef.current) {
      const mesh = curveRef.current as THREE.Mesh
      mesh.material = new THREE.MeshStandardMaterial({ 
        color: isUnderwater ? 0x5555ff : 0xffffff,
        emissive: new THREE.Color(isUnderwater ? 0x2222ff : 0xffffff),
        toneMapped: false
      })
    }
  }, [isUnderwater])

  useFrame(() => {
    if (curveRef.current && onCurveClick) {
      raycaster.setFromCamera(pointer, camera)
      const intersects = raycaster.intersectObject(curveRef.current, true)
      
      document.body.style.cursor = intersects.length > 0 ? 'pointer' : 'default'
    }
  })

  const handleClick = useCallback((e: any) => {
    e?.stopPropagation?.()
    if (onCurveClick) {
      onCurveClick()
    }
  }, [onCurveClick])
  
  return (
    <group onClick={handleClick}>
      <primitive object={scene} scale={1} />
      {curveRef.current && !isUnderwater && (
        <pointLight 
          position={[curveRef.current.position.x, curveRef.current.position.y, curveRef.current.position.z]} 
          intensity={15} 
          distance={30}
          decay={2}
          color={0xffffff}
        />
      )}
    </group>
  )
}

useGLTF.preload('/model.glb')
