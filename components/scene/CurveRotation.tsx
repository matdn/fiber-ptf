"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface CurveRotationProps {
  curveObject: THREE.Object3D | null;
  isUnderwater: boolean;
  spinAngleRef?: { current: number };
}

export function CurveRotation({
  curveObject,
  isUnderwater,
  spinAngleRef,
}: CurveRotationProps) {
  const baseQuaternionRef = useRef<THREE.Quaternion | null>(null);
  const rotationAxisRef = useRef(new THREE.Vector3(0, 1, 0));
  const rotationQuatRef = useRef(new THREE.Quaternion());

  useEffect(() => {
    if (!curveObject) {
      baseQuaternionRef.current = null;
      return;
    }

    baseQuaternionRef.current = curveObject.quaternion.clone();
  }, [curveObject]);

  useFrame(() => {
    if (!curveObject) return;
    if (!isUnderwater) return;

    const base = baseQuaternionRef.current;
    if (!base) return;

    const angle = -(spinAngleRef?.current ?? 0);
    rotationQuatRef.current.setFromAxisAngle(rotationAxisRef.current, angle);

    // Rotate only around WORLD Y axis.
    curveObject.quaternion.copy(base);
    curveObject.quaternion.premultiply(rotationQuatRef.current);
  });

  return null;
}
