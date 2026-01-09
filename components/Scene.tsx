'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import { Suspense, useEffect, useState } from 'react'
import { Water } from './Water'
import * as THREE from 'three'

function Model({ onCameraPositionFound }: { onCameraPositionFound?: (pos: THREE.Vector3) => void }) {
  const { scene } = useGLTF('/model.glb')
  
  useEffect(() => {
    // Trouver l'objet cam1pos dans la scène
    let cam1pos: THREE.Object3D | undefined
    scene.traverse((child) => {
      if (child.name.toLowerCase() === 'cam1pos') {
        cam1pos = child
      }
    })
    
    if (cam1pos && onCameraPositionFound) {
      onCameraPositionFound(cam1pos.position.clone())
    }
  }, [scene, onCameraPositionFound])
  
  return <primitive object={scene} scale={1} />
}

function CameraController({ targetPosition }: { targetPosition: THREE.Vector3 | null }) {
  const { camera } = useThree()
  
  useEffect(() => {
    if (targetPosition) {
      const adjustedPosition = targetPosition.clone()
      adjustedPosition.y += 20 // Ajouter 2 unités en hauteur
      camera.position.copy(adjustedPosition)
    }
  }, [camera, targetPosition])
  
  return null
}

function Loader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-white text-xl">Loading 3D Model...</div>
    </div>
  )
}

export default function Scene() {
  const [cameraPosition, setCameraPosition] = useState<THREE.Vector3 | null>(null)
  
  return (
    <div className="w-full h-screen">
      <Canvas
        camera={{ position: cameraPosition ? [cameraPosition.x, cameraPosition.y, cameraPosition.z] : [0, 2, 50], fov: 50 }}
        shadows
      >
        <color attach="background" args={['#000']} />
        
        <CameraController targetPosition={cameraPosition} />
        
        {/* Lights */}
        <ambientLight intensity={10} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        <pointLight position={[0, 0, 5]} intensity={1000.5} />
        
        <Suspense fallback={null}>
          {/* Model */}
          <Model onCameraPositionFound={setCameraPosition} />
                    {/* Water plane with reflections */}
          <Water />
                    {/* Environment for reflections */}
          {/* <Environment preset="studio" /> */}
        </Suspense>
        
        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={10}
        />
        
        {/* Grid Helper */}
        {/* <gridHelper args={[10, 10]} /> */}
      </Canvas>
    </div>
  )
}
