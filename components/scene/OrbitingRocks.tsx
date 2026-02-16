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
      orbitAxis: THREE.Vector3;
      orbitPlaneNormal: THREE.Vector3;
    }[] = []
    
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const clonedMesh = child.clone()
        
        // Paramètres orbitaux uniques pour chaque rock
        const radius = 15 + Math.random() * 20 // Rayon orbital entre 15 et 35
        const speed = 0.2 + Math.random() * 0.3 // Vitesse de rotation
        const angle = Math.random() * Math.PI * 2 // Angle initial
        
        // Créer un axe d'orbite aléatoire dans l'espace 3D
        const orbitAxis = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize()
        
        // Créer un vecteur perpendiculaire pour définir le plan d'orbite
        const orbitPlaneNormal = new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize()
        
        meshes.push({ mesh: clonedMesh, radius, speed, angle, orbitAxis, orbitPlaneNormal })
      }
    })
    
    return meshes
  }, [scene])
  
  useFrame((state) => {
    if (rocksGroupRef.current && isVisible) {
      rockMeshes.forEach((rock, index) => {
        // Calculer la position orbitale
        const currentAngle = rock.angle + state.clock.elapsedTime * rock.speed
        
        // Créer un vecteur de base dans le plan de l'orbite
        const baseVector = new THREE.Vector3()
          .crossVectors(rock.orbitAxis, rock.orbitPlaneNormal)
          .normalize()
        
        // Créer un second vecteur perpendiculaire pour compléter le plan
        const secondVector = new THREE.Vector3()
          .crossVectors(rock.orbitAxis, baseVector)
          .normalize()
        
        // Position dans le plan orbital
        const orbitalX = Math.cos(currentAngle) * baseVector.x + Math.sin(currentAngle) * secondVector.x
        const orbitalY = Math.cos(currentAngle) * baseVector.y + Math.sin(currentAngle) * secondVector.y
        const orbitalZ = Math.cos(currentAngle) * baseVector.z + Math.sin(currentAngle) * secondVector.z
        
        // Position finale autour du centre
        const x = centerPosition.x + orbitalX * rock.radius
        const y = centerPosition.y + orbitalY * rock.radius
        const z = centerPosition.z + orbitalZ * rock.radius
        
        rock.mesh.position.set(x, y, z)
        
        // Rotation du rock sur lui-même
        rock.mesh.rotation.x += 0.01
        rock.mesh.rotation.y += 0.015
      })
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
