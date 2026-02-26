'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface OrbitingRocksProps {
  centerPosition: THREE.Vector3
  isVisible: boolean
}

export function OrbitingRocks({ centerPosition, isVisible }: OrbitingRocksProps) {
  const { scene } = useGLTF('/rocks.glb')
  const rocksGroupRef = useRef<THREE.Group>(null)
  
  const rockMeshes = useMemo(() => {
    const meshes: { 
      mesh: THREE.Object3D; 
      radius: number; 
      speed: number; 
      angle: number;
      // Pre-computed orbit basis vectors — avoids per-frame allocations.
      baseX: number; baseY: number; baseZ: number;
      secondX: number; secondY: number; secondZ: number;
    }[] = []
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const clonedMesh = child.clone()
        const radius = 15 + Math.random() * 20
        const speed = 0.2 + Math.random() * 0.3
        const angle = Math.random() * Math.PI * 2
        
        const orbitAxis = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize()
        
        const orbitPlaneNormal = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize()
        
        // Pre-compute and freeze the two basis vectors for this orbit.
        const base = new THREE.Vector3().crossVectors(orbitAxis, orbitPlaneNormal).normalize()
        const second = new THREE.Vector3().crossVectors(orbitAxis, base).normalize()
        
        meshes.push({
          mesh: clonedMesh, radius, speed, angle,
          baseX: base.x, baseY: base.y, baseZ: base.z,
          secondX: second.x, secondY: second.y, secondZ: second.z,
        })
      }
    })
    
    return meshes
  }, [scene])
  
  useFrame((state) => {
    if (rocksGroupRef.current && isVisible) {
      const t = state.clock.elapsedTime
      for (const rock of rockMeshes) {
        const a = rock.angle + t * rock.speed
        const cos = Math.cos(a)
        const sin = Math.sin(a)
        rock.mesh.position.set(
          centerPosition.x + (cos * rock.baseX + sin * rock.secondX) * rock.radius,
          centerPosition.y + (cos * rock.baseY + sin * rock.secondY) * rock.radius,
          centerPosition.z + (cos * rock.baseZ + sin * rock.secondZ) * rock.radius,
        )
        rock.mesh.rotation.x += 0.01
        rock.mesh.rotation.y += 0.015
      }
    }
  })
  
  if (!isVisible) return null
  
  return (
    <group ref={rocksGroupRef}>      <pointLight 
        position={[centerPosition.x, centerPosition.y + 20, centerPosition.z]} 
        intensity={1000} 
        distance={50}
        color={0xffffff}
      />      {rockMeshes.map((rock, index) => (
        <primitive key={index} object={rock.mesh} scale={3.8} />
      ))}
    </group>
  )
}

useGLTF.preload('/rocks.glb')
