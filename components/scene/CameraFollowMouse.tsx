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
  const spaceBasePosition = useRef<THREE.Vector3 | null>(null)
  const smoothPointer = useRef(new THREE.Vector2(0, 0))
  const pointerTarget = useRef(new THREE.Vector2(0, 0))
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragOffset = useRef(0)
  const dragTarget = useRef(0)
  
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
      spaceBasePosition.current = null
      dragOffset.current = 0
      dragTarget.current = 0
      // Reset smooth pointer so it lerps gently from center when space starts
      smoothPointer.current.set(0, 0)
    }
    previousIsInSpace.current = isInSpace
  }, [isInSpace])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!isInSpace) return
      isDragging.current = true
      dragStartY.current = event.clientY
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!isInSpace || !isDragging.current) return
      const dy = event.clientY - dragStartY.current
      const clamped = Math.min(Math.max(dy, 0), 240)
      dragTarget.current = clamped * 0.06
    }

    const handlePointerUp = () => {
      if (!isInSpace) return
      isDragging.current = false
      dragTarget.current = 0
    }

    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
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

    if (isInSpace) {
      const timeSinceTransition = (Date.now() - transitionStartTime.current) / 1000
      if (timeSinceTransition > 4 && !spaceBasePosition.current) {
        spaceBasePosition.current = camera.position.clone()
        // seed smoothPointer so first frame has no jump
        smoothPointer.current.set(pointer.x, pointer.y)
      }

      if (spaceBasePosition.current) {
        pointerTarget.current.set(pointer.x, pointer.y)
        smoothPointer.current.lerp(pointerTarget.current, 0.08)
        const parallaxX = smoothPointer.current.x * 18
        const parallaxY = smoothPointer.current.y * 10
        const targetX = spaceBasePosition.current.x + parallaxX
        const targetY = spaceBasePosition.current.y + parallaxY

        camera.position.x += (targetX - camera.position.x) * 0.1
        camera.position.y += (targetY - camera.position.y) * 0.1
      }

      dragOffset.current += (dragTarget.current - dragOffset.current) * 0.12
      if (spaceBasePosition.current) {
        const targetZ = spaceBasePosition.current.z + dragOffset.current
        camera.position.z += (targetZ - camera.position.z) * 0.12
      }
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
