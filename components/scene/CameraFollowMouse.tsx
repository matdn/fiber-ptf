'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface CameraFollowMouseProps {
  initialPosition: THREE.Vector3 | null
  curvePosition: THREE.Vector3 | null
  curveStarPosition: THREE.Vector3 | null
  scrollOffset: number
  isInSpace: boolean
}

export function CameraFollowMouse({ 
  initialPosition, 
  curvePosition,
  curveStarPosition,
  scrollOffset,
  isInSpace
}: CameraFollowMouseProps) {
  const { camera, pointer } = useThree()
  const frameCount = useRef(0)
  const lookAtTarget = useRef(new THREE.Vector3())
  const previousIsInSpace = useRef(false)
  const transitionStartTime = useRef(0)
  
  useEffect(() => {
    if (initialPosition) {
      camera.position.copy(initialPosition)
    }
  }, [initialPosition, camera])
  
  useEffect(() => {
    // Initialiser le lookAtTarget avec la position actuelle
    if (curvePosition && lookAtTarget.current.length() === 0) {
      lookAtTarget.current.copy(curvePosition)
    }
  }, [curvePosition])
  
  useEffect(() => {
    // Détecter le début de la transition vers l'espace
    if (isInSpace && !previousIsInSpace.current) {
      transitionStartTime.current = Date.now()
    }
    previousIsInSpace.current = isInSpace
  }, [isInSpace])
  
  useFrame(() => {
    if (initialPosition && !isInSpace) {
      frameCount.current++
      
      const offsetX = pointer.x * 10 
      const offsetY = pointer.y * 5
      
      camera.position.x += (initialPosition.x + offsetX - camera.position.x) * 0.1
      camera.position.y += (initialPosition.y + offsetY - scrollOffset - camera.position.y) * 0.1
      camera.position.z += (initialPosition.z - camera.position.z) * 0.1
    }
    
    // Gestion du lookAt avec lerp progressif pour tous les modes
    const targetPosition = (isInSpace && curveStarPosition) ? curveStarPosition : (curvePosition || lookAtTarget.current)
    
    // Calculer un lerp progressif pour la transition vers l'espace
    let lerpFactor = 0.3
    if (isInSpace && curveStarPosition) {
      const timeSinceTransition = (Date.now() - transitionStartTime.current) / 1000
      // Commencer très lent (0.005) et accélérer progressivement jusqu'à 0.03 sur 3 secondes
      lerpFactor = Math.min(0.005 + (timeSinceTransition / 4) * 0.025, 0.03)
    }
    
    // Lerp progressif vers la cible
    lookAtTarget.current.lerp(targetPosition, lerpFactor)
    
    camera.lookAt(lookAtTarget.current)
  })
  
  return null
}
