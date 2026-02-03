'use client'

import { Canvas, useThree, useFrame, extend } from '@react-three/fiber'
import { useGLTF, Center, Text3D } from '@react-three/drei'
import { Suspense, useEffect, useState, useRef, useMemo, forwardRef } from 'react'
import { Water } from './Water'
import * as THREE from 'three'
import { EffectComposer, Bloom, SMAA, ChromaticAberration } from '@react-three/postprocessing'
import { Effect } from 'postprocessing'
import gsap from 'gsap'

// Effet personnalisé pour inverser les couleurs
class InvertEffect extends Effect {
  constructor() {
    super(
      'InvertEffect',
      `
        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          outputColor = vec4(1.0 - inputColor.rgb, inputColor.a);
        }
      `,
      {}
    )
  }
}

// Composant React pour l'effet
const Invert = forwardRef((props, ref) => {
  const effect = useMemo(() => new InvertEffect(), [])
  return <primitive ref={ref} object={effect} />
})

function UnderwaterText() {
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

function Model({ onCurveFound, onCurveRefFound, onCurveClick, isUnderwater }: { 
  onCurveFound?: (position: THREE.Vector3) => void
  onCurveRefFound?: (ref: THREE.Object3D) => void
  onCurveClick?: () => void
  isUnderwater: boolean
}) {
  const { scene } = useGLTF('/model.glb')
  const curveRef = useRef<THREE.Object3D | null>(null)
  const { raycaster, pointer, camera } = useThree()

  useEffect(() => {
    scene.traverse((child) => {
      if (child.name.toLowerCase() === 'curve') {
        curveRef.current = child
        if (onCurveFound) {
          onCurveFound(child.position.clone())
        }
        if (onCurveRefFound) {
          onCurveRefFound(child)
        }
        const childObject = child as THREE.Mesh 
        childObject.material = new THREE.MeshStandardMaterial({ 
          color: 0xffffff,
          emissive: new THREE.Color(0xffffff),
          toneMapped: false
        })
      }
    })
  }, [scene, onCurveFound, onCurveRefFound])

  // Gérer la visibilité de la curve
  useEffect(() => {
    if (curveRef.current) {
      curveRef.current.visible = !isUnderwater
    }
  }, [isUnderwater])

  useFrame(() => {
    if (curveRef.current && onCurveClick) {
      raycaster.setFromCamera(pointer, camera)
      const intersects = raycaster.intersectObject(curveRef.current, true)
      
      if (intersects.length > 0) {
        document.body.style.cursor = 'pointer'
      } else {
        document.body.style.cursor = 'default'
      }
    }
  })

  const handleClick = (e: THREE.Event) => {
    e.stopPropagation()
    if (onCurveClick) {
      onCurveClick()
    }
  }
  
  return (
    <group onClick={handleClick}>
      <primitive object={scene} scale={1} />
      {curveRef.current && !isUnderwater && (
        <pointLight 
          position={[curveRef.current.position.x, curveRef.current.position.y, curveRef.current.position.z]} 
          intensity={30} 
          distance={50}
          color={0xffffff}
        />
      )}
      {isUnderwater && curveRef.current && (
        <group position={[curveRef.current.position.x, curveRef.current.position.y, curveRef.current.position.z]}>
          <UnderwaterText />
          <pointLight intensity={100} distance={50} color={0xffffff} />
        </group>
      )}
    </group>
  )
}


function CurveRotation({ curveObject }: { curveObject: THREE.Object3D | null }) {
  const { pointer } = useThree()
  
  useFrame(() => {
    if (curveObject) {
      // Rotation basée sur la position de la souris avec offset pour centrer
      // Inverser le sens et ajuster l'offset
      curveObject.rotation.z = (-pointer.x +4) * Math.PI * 0.2
      // curveObject.rotation.x = -pointer.y * Math.PI * 0.2
    }
  })
  
  return null
}


function CameraFollowMouse({ 
  initialPosition, 
  curvePosition,
  scrollOffset
}: { 
  initialPosition: THREE.Vector3 | null
  curvePosition: THREE.Vector3 | null
  scrollOffset: number
}) {
  const { camera, pointer } = useThree()
  const frameCount = useRef(0)
  
  useEffect(() => {
    if (initialPosition) {
      camera.position.copy(initialPosition)
      console.log('Initial camera position set:', initialPosition)
    }
  }, [initialPosition, camera])
  
  useFrame(() => {
    if (initialPosition) {
      frameCount.current++
      
      const offsetX = pointer.x * 10 
      const offsetY = pointer.y * 5
      
      // Appliquer directement sans double interpolation
      camera.position.x += (initialPosition.x + offsetX - camera.position.x) * 0.1
      camera.position.y += (initialPosition.y + offsetY - scrollOffset - camera.position.y) * 0.1
      camera.position.z += (initialPosition.z - camera.position.z) * 0.1
      
      if (curvePosition) {
        camera.lookAt(curvePosition)
      }
    }
  })
  
  return null
}


export default function Scene({ onUnderwaterToggle, isUnderwater }: { 
  onUnderwaterToggle: (value: boolean) => void
  isUnderwater: boolean
}) {
  const [curvePosition, setCurvePosition] = useState<THREE.Vector3 | null>(null)
  const [curveObject, setCurveObject] = useState<THREE.Object3D | null>(null)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [vignetteIntensity] = useState(0.2)
  const [vignetteColor] = useState('#000000')
  const cameraRef = useRef<THREE.Camera | null>(null)
  
  // Utiliser useMemo pour éviter de recréer l'objet à chaque render
  const initialCameraPosition = useMemo(() => new THREE.Vector3(-20, -10, -10), [])

  useEffect(() => {
    const handleScroll = () => {
      setScrollOffset(window.scrollY * 0.01)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleCurveClick = () => {
    console.log('🌊 Starting underwater transition')
    
    // Descente de la caméra
    if (cameraRef.current) {
      gsap.to(cameraRef.current.position, {
        y: cameraRef.current.position.y - 5,
        duration: 1.5,
        ease: 'power2.in',
        onComplete: () => {
          onUnderwaterToggle(true)
        }
      })
    } else {
      onUnderwaterToggle(true)
    }
  }

  return (
    <div className="w-full h-screen fixed" style={{ mixBlendMode: isUnderwater ? 'screen' : 'normal' }}>
      <Canvas
        camera={{ position: [-20, -10, -10], fov: 40 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          cameraRef.current = camera
        }}
      >
        <color attach="background" args={['#000']} />
        {isUnderwater && <fog attach="fog" args={['#ffffff', 10, 150]} />}
        <pointLight position={[10, 10, 10]} intensity={isUnderwater ? 15000 : 15000} />
        <ambientLight intensity={isUnderwater ? 2 : 0.3} />
        
        <CameraFollowMouse initialPosition={initialCameraPosition} curvePosition={curvePosition} scrollOffset={scrollOffset} />
        <CurveRotation curveObject={curveObject} />
        
        {/* <Stats /> */}
        
        <Suspense fallback={null}>
          <Model 
            onCurveFound={setCurvePosition} 
            onCurveRefFound={setCurveObject}
            onCurveClick={handleCurveClick}
            isUnderwater={isUnderwater}
          />
          <group 
            rotation={isUnderwater ? [Math.PI / 2, 0, 0] : [-Math.PI / 2, 0, 0]}
            position={isUnderwater ? [0, 0, 0] : [0, -20, 0]}
          >
            <Water />
          </group>
        </Suspense>
        
        <EffectComposer multisampling={0}>
          {!isUnderwater && (
            <Bloom 
              intensity={0.1}
              luminanceThreshold={0.1}
              luminanceSmoothing={0.1}
              radius={0.8}
              mipmapBlur
            />
          )}
          <SMAA />
          
          {/* Effets pour underwater */}
          {/* {isUnderwater && (
            <ChromaticAberration 
              offset={[0.002, 0.002]}
            />
          )} */}
        </EffectComposer> 
      </Canvas>
      
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, transparent 60%, ${vignetteColor} 100%)`
        }}
      />
    </div>
  )
}
