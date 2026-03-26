"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface CameraFollowMouseProps {
  initialPosition: THREE.Vector3 | null;
  curvePosition: THREE.Vector3 | null;
  curveStarPosition: THREE.Vector3 | null;
  scrollOffset: number;
  isInSpace: boolean;
  transitionState?: { isTransitioning: boolean };
  lockedLookAtTargetRef?: { current: THREE.Vector3 | null };
  lockSpaceCamera?: boolean;
  /** When true, snap camera position + lookAt on the first frame instead of lerping */
  skipCameraIntro?: boolean;
}

export function CameraFollowMouse({
  initialPosition,
  curvePosition,
  curveStarPosition,
  scrollOffset,
  isInSpace,
  transitionState,
  lockedLookAtTargetRef,
  lockSpaceCamera = false,
  skipCameraIntro = false,
}: CameraFollowMouseProps) {
  const { camera, pointer, clock } = useThree();
  const lookAtTarget = useRef(new THREE.Vector3());
  const previousIsInSpace = useRef(false);
  const transitionStartTime = useRef(0);
  const spaceBasePosition = useRef<THREE.Vector3 | null>(null);
  const smoothPointer = useRef(new THREE.Vector2(0, 0));
  const pointerTarget = useRef(new THREE.Vector2(0, 0));
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragOffset = useRef(0);
  const dragTarget = useRef(0);
  const hasSnappedRef = useRef(false);

  useEffect(() => {
    if (initialPosition && !isInSpace) {
      camera.position.copy(initialPosition);
    }
  }, [camera, initialPosition, isInSpace]);

  useEffect(() => {
    // Seed lookAtTarget from curvePosition on first available frame.
    if (curvePosition && lookAtTarget.current.length() === 0) {
      lookAtTarget.current.copy(curvePosition);
    }
  }, [curvePosition]);

  useEffect(() => {
    // Detect entry into space and set initial camera target.
    if (isInSpace && !previousIsInSpace.current) {
      transitionStartTime.current = clock.elapsedTime;
      // Don't snap lookAt here — useFrame lerps it smoothly during the flight.

      if (lockSpaceCamera) {
        camera.position.set(0, 200, 30);
        spaceBasePosition.current = new THREE.Vector3(0, 200, 30);
      } else {
        spaceBasePosition.current = null;
      }
      dragOffset.current = 0;
      dragTarget.current = 0;
      // Reset smooth pointer so it lerps gently from center on space entry.
      smoothPointer.current.set(pointer.x, pointer.y);
    }
    previousIsInSpace.current = isInSpace;
  }, [
    camera,
    clock,
    isInSpace,
    lockSpaceCamera,
    pointer.x,
    pointer.y,
  ]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!isInSpace) return;
      isDragging.current = true;
      dragStartY.current = event.clientY;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isInSpace || !isDragging.current) return;
      const dy = event.clientY - dragStartY.current;
      const clamped = Math.min(Math.max(dy, 0), 240);
      dragTarget.current = clamped * 0.06;
    };

    const handlePointerUp = () => {
      if (!isInSpace) return;
      isDragging.current = false;
      dragTarget.current = 0;
    };

    window.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
    });
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isInSpace]);

  useFrame(() => {
    // When arriving via page transition, freeze all camera movement until we can snap.
    // Always return early until snapped — prevents any lerp from running first.
    if (skipCameraIntro && !hasSnappedRef.current) {
      if (!isInSpace && curvePosition && initialPosition) {
        // Surface arrival: snap position + lookAt
        hasSnappedRef.current = true
        camera.position.copy(initialPosition)
        lookAtTarget.current.copy(curvePosition)
        camera.lookAt(lookAtTarget.current)
      } else if (isInSpace && curveStarPosition) {
        // Space arrival: position is handled by instantSpaceEntry — only seed lookAt
        hasSnappedRef.current = true
        lookAtTarget.current.copy(curveStarPosition)
        camera.lookAt(lookAtTarget.current)
      }
      // Either way: return early so no lerp runs before the snap
      return
    }

    // During a scene transition GSAP owns camera.position.
    // We still update lookAt so the camera tracks its target during the flight
    // instead of freezing in the wrong orientation.
    if (transitionState?.isTransitioning) {
      const trackTarget =
        isInSpace && curveStarPosition
          ? curveStarPosition
          : curvePosition ?? lookAtTarget.current;
      lookAtTarget.current.lerp(trackTarget, 0.04);
      camera.lookAt(lookAtTarget.current);
      return;
    }

    if (initialPosition && !isInSpace) {
      if (!lockSpaceCamera) {
        const offsetX = pointer.x * 10;
        const offsetY = pointer.y * 5;

        camera.position.x +=
          (initialPosition.x + offsetX - camera.position.x) * 0.1;
        camera.position.y +=
          (initialPosition.y + offsetY - scrollOffset - camera.position.y) *
          0.1;
        camera.position.z += (initialPosition.z - camera.position.z) * 0.1;
      }
    }

    if (!isInSpace && lockSpaceCamera && lockedLookAtTargetRef?.current) {
      lookAtTarget.current.copy(lockedLookAtTargetRef.current);
      camera.lookAt(lookAtTarget.current);
      return;
    }

    if (isInSpace) {
      const timeSinceTransition =
        clock.elapsedTime - transitionStartTime.current;
      const activationDelay = lockSpaceCamera ? 0 : 4;
      if (timeSinceTransition > activationDelay && !spaceBasePosition.current) {
        spaceBasePosition.current = camera.position.clone();
        // seed smoothPointer so first frame has no jump
        smoothPointer.current.set(pointer.x, pointer.y);
      }

      if (spaceBasePosition.current) {
        pointerTarget.current.set(pointer.x, pointer.y);
        smoothPointer.current.lerp(pointerTarget.current, 0.08);
        const parallaxX = smoothPointer.current.x * 18;
        const parallaxY = smoothPointer.current.y * 10;
        const targetX = spaceBasePosition.current.x + parallaxX;
        const targetY = spaceBasePosition.current.y + parallaxY;

        camera.position.x += (targetX - camera.position.x) * 0.1;
        camera.position.y += (targetY - camera.position.y) * 0.1;
      }

      dragOffset.current += (dragTarget.current - dragOffset.current) * 0.12;
      if (spaceBasePosition.current) {
        const targetZ = spaceBasePosition.current.z + dragOffset.current;
        camera.position.z += (targetZ - camera.position.z) * 0.12;
      }
    }

    // Progressive lerp toward look-at target for all modes.
    const targetPosition =
      isInSpace && curveStarPosition
        ? curveStarPosition
        : (curvePosition ?? lookAtTarget.current);

    // Consistent smooth lerp — no instant snaps.
    const lerpFactor = isInSpace ? 0.05 : 0.3;
    lookAtTarget.current.lerp(targetPosition, lerpFactor);

    camera.lookAt(lookAtTarget.current);
  });

  return null;
}
