'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import * as THREE from 'three'
import SweatWithSpheres from '../SweatWithSpheres'

interface ModelProps {
  onCurveFound?: (position: THREE.Vector3) => void
  onCurveRefFound?: (ref: THREE.Object3D) => void
  onCurveStarFound?: (position: THREE.Vector3) => void
  isUnderwater: boolean
  isInSpace: boolean
}

const ELLIPSE_LABELS = ['creative technologist', 'freelance developer', 'gobelins student', 'ux/ui learner'] as const

export function Model({ onCurveFound, onCurveRefFound, onCurveStarFound, isUnderwater, isInSpace }: ModelProps) {
  const { scene } = useGLTF('/model.glb')
  const curveRef = useRef<THREE.Object3D | null>(null)
  const curveStarRef = useRef<THREE.Object3D | null>(null)
  const ellipseLineRef = useRef<THREE.Line>(null)
  const ellipsePointsRef = useRef<THREE.Points>(null)
  const ellipseGroupRef = useRef<THREE.Group>(null)
  const labelRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null])

  useEffect(() => {
    scene.traverse((child) => {
      if (child.name.toLowerCase() === 'curve') {
        curveRef.current = child
        onCurveFound?.(child.position.clone())
        onCurveRefFound?.(child)

        const curveMesh = child as THREE.Mesh
        curveMesh.material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: new THREE.Color(0xffffff),
          toneMapped: false
        })

        if (!curveStarRef.current) {
          const clonedCurve = child.clone(true)
          curveStarRef.current = clonedCurve
          curveStarRef.current.position.set(0, 200, 0)
        }
      }
    })

    if (curveStarRef.current) {
      onCurveStarFound?.(new THREE.Vector3(0, 200, 0))
    }
  }, [scene, onCurveFound, onCurveRefFound, onCurveStarFound])

  useEffect(() => {
    const curve = curveRef.current as THREE.Mesh | null
    if (curve) {
      if (isInSpace) {
        curve.material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: new THREE.Color(0xffffff),
          toneMapped: false,
          transparent: true,
          opacity: 0
        })
      } else {
        curve.material = new THREE.MeshStandardMaterial({
          color: isUnderwater ? 0x5555ff : 0xffffff,
          emissive: new THREE.Color(isUnderwater ? 0x2222ff : 0xffffff),
          toneMapped: false,
          transparent: true,
          opacity: 1
        })
      }
    }

    const curveStar = curveStarRef.current as THREE.Mesh | null
    if (curveStar && isInSpace) {
      curveStar.material = null
    }
  }, [isUnderwater, isInSpace])

  const ellipseMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      color: { value: new THREE.Color('#ffffff') },
      time: { value: 0 }
    },
    vertexShader: `
      attribute float alpha;
      attribute float phase;
      varying float vAlpha;
      varying float vPhase;
      void main() {
        vAlpha = alpha;
        vPhase = phase;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float time;
      varying float vAlpha;
      varying float vPhase;
      void main() {
        // normalise phase to [0,1]
        float t = fract(vPhase / (2.0 * 3.14159265));
        // moving head position [0,1]
        float head = fract(time * 0.18);
        // angular distance from head (wrapping)
        float d = fract(head - t);
        // sharp trail: full at head, fades over ~40% of the loop
        float trail = 1.0 - smoothstep(0.0, 0.38, d);
        float alpha = 0.0 + 0.95 * trail;
        gl_FragColor = vec4(color, alpha);
      }
    `
  }), [])

  const ellipseData = useMemo(() => {
    const radiusX = 10
    const radiusZ = 9
    const curve = new THREE.EllipseCurve(0, 0, radiusX, radiusZ, 0, Math.PI * 2, false, 0)
    const segments = 256
    const pts2 = curve.getPoints(segments)
    const positions = new Float32Array((segments + 1) * 3)
    const alphas = new Float32Array(segments + 1)
    const phases = new Float32Array(segments + 1)
    pts2.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = p.y
      const t = i / segments
      alphas[i] = 0.2 + 0.8 * Math.sin(Math.PI * t)
      phases[i] = t * Math.PI * 2
    })

    const pointPositions = new Float32Array(4 * 3)
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      pointPositions[i * 3] = Math.cos(angle) * radiusX
      pointPositions[i * 3 + 1] = 0
      pointPositions[i * 3 + 2] = Math.sin(angle) * radiusZ
    }

    return { positions, pointPositions, alphas, phases, segments: segments + 1 }
  }, [])

  useFrame(() => {
    if (isInSpace) {
      const t = performance.now() * 0.001
      ellipseMaterial.uniforms.time.value = t
      const head = ((t * 0.18) % 1 + 1) % 1
      for (let i = 0; i < ELLIPSE_LABELS.length; i++) {
        const el = labelRefs.current[i]
        if (!el) continue
        const tPoint = i / 4
        const d = ((head - tPoint) % 1 + 1) % 1
        let opacity = 0
        const window = 0.10
        if (d < window) {
          opacity = 1 - d / window         
        } else if (d > 1 - window) {
          opacity = (d - (1 - window)) / window  
        }
        el.style.opacity = String(opacity)
      }
    }
  })

  const curve = curveRef.current

  return (
    <>
      <group>
        <primitive object={scene} scale={1} />
        {curve && !isUnderwater && !isInSpace && (
          <pointLight
            position={[curve.position.x, curve.position.y, curve.position.z]}
            intensity={15}
            distance={30}
            decay={2}
            color={0xffffff}
          />
        )}
      </group>

      {isInSpace && (
        <group ref={ellipseGroupRef} position={[0, 198, 0]} rotation={[0, 0, 0]}>
          <group scale={7} rotateOnAxis={new THREE.Vector3(0, 1, 0)}>
            <SweatWithSpheres interactionCenter={[0, 200, 0]} />
          </group>
          <group
            rotation={[0, Math.PI / 4, Math.PI/8]}
          >
            {/* <line ref={ellipseLineRef}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[ellipseData.positions, 3]}
                />
                <bufferAttribute
                  attach="attributes-alpha"
                  args={[ellipseData.alphas, 1]}
                />
                <bufferAttribute
                  attach="attributes-phase"
                  args={[ellipseData.phases, 1]}
                />
              </bufferGeometry>
              <primitive object={ellipseMaterial} />
            </line> */}
            {/* <points ref={ellipsePointsRef}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[ellipseData.pointPositions, 3]}
                />
              </bufferGeometry>
              <pointsMaterial size={0.45} color="#ffffff" transparent opacity={0.95} />
            </points> */}
          </group>
        </group>
      )}
    </>
  )
}

useGLTF.preload('/model.glb')
