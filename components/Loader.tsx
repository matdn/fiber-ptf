'use client'

import { useEffect, useState, useRef } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'

interface LoaderProps {
  onLoaded: () => void
}

export function Loader({ onLoaded }: LoaderProps) {
  const { progress } = useProgress()
  const [circleRadius, setCircleRadius] = useState(0)
  const [startTime] = useState(Date.now())
  const animationStartedRef = useRef(false)
  const onLoadedRef = useRef(onLoaded)

  // Garder la référence à jour
  useEffect(() => {
    onLoadedRef.current = onLoaded
  }, [onLoaded])

  useEffect(() => {
    if (progress === 100 && !animationStartedRef.current) {
      animationStartedRef.current = true
      const elapsed = Date.now() - startTime
      const remainingTime = Math.max(0, 1500 - elapsed) // 4 secondes minimum
      
      setTimeout(() => {
        // Animer le cercle avec GSAP
        gsap.to({ value: 0 }, {
          value: 150,
          duration: 2,
          ease: 'power2.inOut',
          onUpdate: function() {
            setCircleRadius(this.targets()[0].value)
          },
          onComplete: () => {
            setTimeout(() => {
              onLoadedRef.current()
            }, 300)
          }
        })
      }, remainingTime)
    }
  }, [progress, startTime])

  return (
    <div 
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      style={{
        maskImage: circleRadius > 0 
          ? `radial-gradient(circle at center, transparent ${circleRadius}%, black ${circleRadius}%)`
          : 'none',
        WebkitMaskImage: circleRadius > 0
          ? `radial-gradient(circle at center, transparent ${circleRadius}%, black ${circleRadius}%)`
          : 'none'
      }}
    >
      <div className="relative w-48 h-48">
        <svg 
          viewBox="0 0 2072 1339" 
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <clipPath id="progressClip">
              <rect 
                x="0" 
                y={1339 - (1339 * progress / 100)} 
                width="2072" 
                height={1339 * progress / 100}
                style={{
                  transition: 'y 0.3s ease-out, height 0.3s ease-out'
                }}
              />
            </clipPath>
          </defs>
          
          {/* Logo gris en arrière-plan */}
          <g opacity="0.2">
            <path d="M0 412H415V1339H200C89.543 1339 0 1249.46 0 1139V412Z" fill="white"/>
            <path d="M2072 715C2072 547.658 1936.34 412 1769 412H1660V1333H2072V715Z" fill="white"/>
            <path d="M1445 9.31052e-06C1334.54 1.41387e-05 1245 89.5431 1245 200V412H1660V2.00001C1660 0.895436 1659.1 -4.83e-08 1658 0L1445 9.31052e-06Z" fill="white"/>
            <path d="M830 412V824H1030C1148.74 824 1245 727.741 1245 609V412H830Z" fill="white"/>
            <path d="M415 412V2.2419e-06L603 0C728.369 -1.495e-06 830 101.631 830 227V412H415Z" fill="white"/>
          </g>
          
          {/* Logo qui se remplit */}
          <g clipPath="url(#progressClip)">
            <path d="M0 412H415V1339H200C89.543 1339 0 1249.46 0 1139V412Z" fill="white"/>
            <path d="M2072 715C2072 547.658 1936.34 412 1769 412H1660V1333H2072V715Z" fill="white"/>
            <path d="M1445 9.31052e-06C1334.54 1.41387e-05 1245 89.5431 1245 200V412H1660V2.00001C1660 0.895436 1659.1 -4.83e-08 1658 0L1445 9.31052e-06Z" fill="white"/>
            <path d="M830 412V824H1030C1148.74 824 1245 727.741 1245 609V412H830Z" fill="white"/>
            <path d="M415 412V2.2419e-06L603 0C728.369 -1.495e-06 830 101.631 830 227V412H415Z" fill="white"/>
          </g>
        </svg>
      </div>
    </div>
  )
}
