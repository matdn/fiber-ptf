'use client'

import Header from '@/components/Header'
import SweatWithSpheres from '@/components/SweatWithSpheres'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function AboutPage() {
  return (
    <main className="relative w-full h-screen bg-black overflow-hidden">
      <Header isUnderwater={false} />
      
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 3], fov: 50 }}
          gl={{ antialias: false, alpha: false }}
        >
          <color attach="background" args={['#000000']} />
          <ambientLight intensity={1} />
          <pointLight position={[5, 5, 5]} intensity={0.5} />
          
          <SweatWithSpheres />
          
          <OrbitControls 
            enableZoom={true}
            enablePan={false}
            minDistance={1.5}
            maxDistance={5}
            autoRotate={false}
          />
        </Canvas>
      </div>

    </main>
  )
}
