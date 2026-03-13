'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useUnderwater } from '@/contexts/UnderwaterContext'

export default function SoundWaveToggle() {
  const { isMuted, setIsMuted } = useUnderwater()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationIdRef = useRef<number>(0)
  const timeRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const oscillatorRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 120
    canvas.height = 120
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    const drawWave = (time: number, alpha: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.save()
      ctx.globalAlpha = alpha

      // Draw animated wave
      const waveHeight = 20
      const waveWidth = 55

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      // Wave 1 (left)
      ctx.beginPath()
      ctx.moveTo(centerX - waveWidth, centerY - waveHeight)
      for (let x = -waveWidth; x <= waveWidth; x += 2) {
        const y = Math.sin(x * 0.15 + time * 0.06) * waveHeight
        ctx.lineTo(centerX + x, centerY + y)
      }
      ctx.stroke()

      // Wave 2 (right, opposite)
      ctx.beginPath()
      ctx.moveTo(centerX - waveWidth, centerY + waveHeight)
      for (let x = -waveWidth; x <= waveWidth; x += 2) {
        const y = Math.sin(x * 0.15 + time * 0.06 + Math.PI) * waveHeight
        ctx.lineTo(centerX + x, centerY + y)
      }
      ctx.stroke()

      ctx.restore()
    }

    const drawLine = (alpha: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.save()
      ctx.globalAlpha = alpha

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'

      // Draw diagonal line
      ctx.beginPath()
      ctx.moveTo(centerX - 20, centerY - 20)
      ctx.lineTo(centerX + 20, centerY + 20)
      ctx.stroke()

      ctx.restore()
    }

    const animate = () => {
      timeRef.current += 1

        if (!isMuted) {
        // Animate wave
        drawWave(timeRef.current, 1)
      } else {
        // Animate to line
        drawLine(1)
      }

      animationIdRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationIdRef.current)
    }
    }, [isMuted])

  const toggleSound = () => {
      setIsMuted(!isMuted)

    // Play a small beep sound for feedback
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    const audioContext = audioContextRef.current
    const now = audioContext.currentTime

    // Kill previous oscillator if exists
    if (oscillatorRef.current) {
      oscillatorRef.current.stop()
      gainRef.current?.disconnect()
    }

    // Create new oscillator
    const osc = audioContext.createOscillator()
    const gain = audioContext.createGain()

    osc.connect(gain)
    gain.connect(audioContext.destination)

      osc.frequency.value = isMuted ? 400 : 600
    osc.type = 'sine'

    gain.gain.setValueAtTime(0.1, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1)

    osc.start(now)
    osc.stop(now + 0.1)

    oscillatorRef.current = osc
    gainRef.current = gain
  }

  return (
    <button
      type="button"
      onClick={toggleSound}
      className="soundButton flex items-center justify-center w-[55px] h-[55px] hover:bg-white/10 transition-colors duration-200 pointer-events-auto cursor-pointer overflow-visible"
        aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
        title={isMuted ? 'Unmute' : 'Mute'}
       
    >
      <canvas
        ref={canvasRef}
        className="w-10 h-10 pointer-events-none"
      />
    </button>
  )
}
