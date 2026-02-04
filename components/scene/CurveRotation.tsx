'use client'

import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface CurveRotationProps {
  curveObject: THREE.Object3D | null
}

export function CurveRotation({ curveObject }: CurveRotationProps) {
  const { pointer } = useThree()
  
  useFrame(() => {
    if (curveObject) {
      curveObject.rotation.z = (-pointer.x + 4) * Math.PI * 0.2
    }
  })
  
  return null
}
