'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface CameraFollowMouseProps {
  initialPosition: THREE.Vector3 | null
  curvePosition: THREE.Vector3 | null
  scrollOffset: number
}

export function CameraFollowMouse({ 
  initialPosition, 
  curvePosition,
  scrollOffset
}: CameraFollowMouseProps) {
  const { camera, pointer } = useThree()
  const frameCount = useRef(0)
  
  useEffect(() => {
    if (initialPosition) {
      camera.position.copy(initialPosition)
    }
  }, [initialPosition, camera])
  
  useFrame(() => {
    if (initialPosition) {
      frameCount.current++
      
      const offsetX = pointer.x * 10 
      const offsetY = pointer.y * 5
      
      camera.position.x += (initialPosition.x + offsetX - camera.position.x) * 0.1
      camera.position.y += (initialPosition.y + offsetY - scrollOffset - camera.position.y) * 0.1
      camera.position.z += (initialPosition.z - camera.position.z) * 0.1
      
      if (curvePosition) {
        camera.lookAt(curvePosition)
      }
    }
  })
  
  return null
}
