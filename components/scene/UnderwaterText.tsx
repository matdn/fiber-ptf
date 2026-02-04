'use client'

import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Center, Text3D } from '@react-three/drei'
import * as THREE from 'three'

export function UnderwaterText() {
  const textRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  
  useFrame(() => {
    if (textRef.current) {
      textRef.current.lookAt(camera.position)
    }
  })
  
  return (
    <Center ref={textRef}>
      <Text3D
        font="/fonts/IvyPrestoDisplayLight_Italic.json"
        size={2}
        height={0.5}
        curveSegments={12}
        bevelEnabled
        bevelThickness={0.01}
        bevelSize={0.05}
        bevelSegments={5}
      >
        UNDERWATER
        <meshBasicMaterial 
          color={0x000000}
          toneMapped={false}
          transparent
          opacity={1}
          fog={false}
        />
      </Text3D>
    </Center>
  )
}
