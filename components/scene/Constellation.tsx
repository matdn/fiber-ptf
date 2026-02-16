'use client'

import { useEffect, useRef, useState } from 'react'

interface ConstellationPoint {
  x: number
  y: number
  baseX: number
  baseY: number
  label: string
  scale: number
  targetScale: number
  velocityX: number
  velocityY: number
  opacity: number
  targetOpacity: number
}

export default function Constellation({ isVisible }: { isVisible: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 50, y: 50 })
  const animationFrameRef = useRef<number | undefined>(undefined)
  const [isStable, setIsStable] = useState(false)
  const [selectedPoint, setSelectedPoint] = useState<ConstellationPoint | null>(null)
  const [showLayer, setShowLayer] = useState(false)

  const MIN_POINT_SCALE = 1
  const MAX_POINT_SCALE = 1.6
  
  const connections = useRef<[number, number][]>([
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
    [5, 6], [6, 7], [7, 0], [1, 8], [8, 9],
    [9, 11], [10, 0], [10, 7], [11, 4], [11, 13],
    [12, 7], [12, 14], [14, 15], [15, 16], [16, 13],
    [13, 17], [5, 16], [2, 9]
  ])

    const points = useRef<ConstellationPoint[]>([
    { x: 25, y: 20, baseX: 25, baseY: 20, label: 'who am i', scale: 1, targetScale: 1, velocityX: 0, velocityY: 0, opacity: 0, targetOpacity: 1 },
    { x: 50, y: 15, baseX: 50, baseY: 15, label: 'studies', scale: 1, targetScale: 1, velocityX: 0, velocityY: 0, opacity: 0, targetOpacity: 1 },
    { x: 75, y: 20, baseX: 75, baseY: 20, label: 'freelance', scale: 1, targetScale: 1, velocityX: 0, velocityY: 0, opacity: 0, targetOpacity: 1 },
    { x: 85, y: 38, baseX: 85, baseY: 38, label: 'why to chose me for ur project', scale: 1, targetScale: 1, velocityX: 0, velocityY: 0, opacity: 0, targetOpacity: 1 },
    { x: 85, y: 62, baseX: 85, baseY: 62, label: 'passions', scale: 1, targetScale: 1, velocityX: 0, velocityY: 0, opacity: 0, targetOpacity: 1 },
    { x: 75, y: 80, baseX: 75, baseY: 80, label: 'other stuff', scale: 1, targetScale: 1, velocityX: 0, velocityY: 0, opacity: 0, targetOpacity: 1 },
  ])

  

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        setIsStable(true)
      }, 4500)
      
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isVisible) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const layoutPointsInCircle = (width: number, height: number) => {
      const count = points.current.length
      if (count === 0) return

      const centerXPct = 50
      const centerYPct = 50
      const radiusPx = Math.min(width, height) * 0.32

      for (let i = 0; i < count; i++) {
        const theta = (i / count) * Math.PI * 2 - Math.PI / 2
        const xPct = centerXPct + (Math.cos(theta) * radiusPx * 100) / width
        const yPct = centerYPct + (Math.sin(theta) * radiusPx * 100) / height
        const point = points.current[i]
        point.x = xPct
        point.y = yPct
        point.baseX = xPct
        point.baseY = yPct
      }

      // Nettoyer les connexions si elles ne matchent plus les indexes actuels.
      const filtered = connections.current.filter(
        ([a, b]) => a >= 0 && b >= 0 && a < count && b < count
      )

      // Si quasi tout est invalide (ou vide), recréer un anneau simple.
      if (filtered.length < Math.max(1, Math.floor(count / 2))) {
        connections.current = Array.from({ length: count }, (_, i) => [i, (i + 1) % count])
      } else {
        connections.current = filtered
      }
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      layoutPointsInCircle(canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 100
      mouseRef.current.y = ((e.clientY - rect.top) / rect.height) * 100
    }

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mouseX = ((e.clientX - rect.left) / rect.width) * 100
      const mouseY = ((e.clientY - rect.top) / rect.height) * 100
      
      // Trouver le point cliqué
      for (const point of points.current) {
        const dx = point.x - mouseX
        const dy = point.y - mouseY
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 10) {
          setSelectedPoint(point)
          setShowLayer(true)
          return
        }
      }
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('click', handleClick)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const attractionRadius = 20 // Rayon d'attraction en %
      const attractionForce = 0.03 // Force d'attraction
      const returnForce = 0.02 // Force de retour à la position de base
      const damping = 0.85 // Amortissement
      
      // Détecter le point survolé
      
      // Log pour debug (seulement toutes les 60 frames pour ne pas spam)
      if (Math.random() < 0.016) {
        const point = points.current[0]
        if (point) {
          console.log('🎨 Constellation debug:', {
            isStable,
            opacity: point.opacity.toFixed(2),
            targetOpacity: point.targetOpacity.toFixed(2),
            scale: point.scale.toFixed(2),
            targetScale: point.targetScale.toFixed(2)
          })
        }
      }
      
      points.current.forEach((point) => {
        // Lerp pour l'animation de l'opacité - augmenter la vitesse
        point.opacity += (point.targetOpacity - point.opacity) * 0.1

        // Calculer la distance à la souris
        const dx = point.x - mouseRef.current.x
        const dy = point.y - mouseRef.current.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        // Gérer l'apparition et l'interaction
        if (isStable) {
          // Scale et opacité basés sur la distance (plus proche = plus grand et plus opaque)
          if (distance < 30) {
            const proximity = (30 - distance) / 30 // 0 = loin, 1 = très proche
            point.targetScale = MIN_POINT_SCALE + proximity * (MAX_POINT_SCALE - MIN_POINT_SCALE)
            point.targetOpacity = 0.4 + proximity * 0.6 // Opacité de 0.4 à 1.0 pour plus de contraste
            
            // Détecter le point le plus proche pour le hover
            if (distance < 10) {
              // no-op (cursor géré globalement)
            }
          } else {
            point.targetScale = MIN_POINT_SCALE
            point.targetOpacity = 0.4 // Opacité de base réduite à 0.4
          }
        } else {
          point.targetScale = MIN_POINT_SCALE
          point.targetOpacity = 0 // Invisible avant stabilisation
        }

        // Sécurité: éviter toute valeur de scale extrême
        point.targetScale = Math.min(Math.max(point.targetScale, MIN_POINT_SCALE), MAX_POINT_SCALE)

        // Attraction vers la souris si proche
        if (distance < attractionRadius && distance > 0) {
          const force = (attractionRadius - distance) / attractionRadius
          const angle = Math.atan2(-dy, -dx) // Inverser pour attraction
          point.velocityX += Math.cos(angle) * force * attractionForce
          point.velocityY += Math.sin(angle) * force * attractionForce
        }

        // Force de retour vers la position de base
        const returnDx = point.baseX - point.x
        const returnDy = point.baseY - point.y
        point.velocityX += returnDx * returnForce
        point.velocityY += returnDy * returnForce

        // Appliquer le damping
        point.velocityX *= damping
        point.velocityY *= damping

        // Mettre à jour la position
        point.x += point.velocityX
        point.y += point.velocityY

        // Lerp pour l'animation du scale
        point.scale += (point.targetScale - point.scale) * 0.15
        point.scale = Math.min(Math.max(point.scale, MIN_POINT_SCALE), MAX_POINT_SCALE)
      })

      // Changer le curseur si un point est survolé
      // Le curseur est géré globalement (custom cursor)

      // Dessiner les lignes de connexion en constellation
      const avgOpacity =
        points.current.length > 0
          ? points.current.reduce((sum, p) => sum + p.opacity, 0) / points.current.length
          : 0
      connections.current.forEach(([startIdx, endIdx]) => {
        const startPoint = points.current[startIdx]
        const endPoint = points.current[endIdx]

        // Si tu enlèves des points, certains indexes peuvent ne plus exister
        if (!startPoint || !endPoint) return
        
        ctx.beginPath()
        ctx.moveTo(
          (startPoint.x / 100) * canvas.width,
          (startPoint.y / 100) * canvas.height
        )
        ctx.lineTo(
          (endPoint.x / 100) * canvas.width,
          (endPoint.y / 100) * canvas.height
        )
        ctx.strokeStyle = `rgba(255, 255, 255, ${avgOpacity * 0.15})`
        ctx.lineWidth = 1
        ctx.stroke()
      })

      // Dessiner les mots
      points.current.forEach((point) => {
        const x = (point.x / 100) * canvas.width
        const y = (point.y / 100) * canvas.height

        // Dessiner le texte avec scale en blanc
        const fontSize = 13 + (point.scale - 1) * 12
        ctx.font = `${fontSize}px Mabry`
        const textOpacity = point.opacity
        ctx.fillStyle = `rgba(255, 255, 255, ${textOpacity})`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(point.label, x, y)

        // Point central blanc - commenté pour ne plus l'afficher
        // ctx.beginPath()
        // ctx.arc(x, y, 2.5 * point.scale, 0, Math.PI * 2)
        // ctx.fillStyle = `rgba(255, 255, 255, ${point.opacity})`
        // ctx.fill()
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('click', handleClick)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isVisible, isStable])

  if (!isVisible) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-auto"
        style={{ zIndex: 10 }}
      />
      
      {showLayer && selectedPoint && (
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-auto"
          style={{ zIndex: 20 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 cursor-default"
            onClick={() => setShowLayer(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative bg-black/90 backdrop-blur-sm p-8 rounded-lg max-w-md mx-4"
          >
            <h2 className="text-3xl font-light text-white mb-4">{selectedPoint.label}</h2>
            <p className="text-white/70 mb-6">
              Analyze if I should expand internationally and help me set it up.
            </p>
            <button
              type="button"
              className="flex items-center gap-2 text-white hover:text-white/80 transition-colors"
              onClick={() => setShowLayer(false)}
            >
              <span className="text-xl">🎮</span>
              Try it with Sidekick
            </button>
          </div>
        </div>
      )}
    </>
  )
}
