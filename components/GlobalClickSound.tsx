'use client'

import { useEffect, useRef } from 'react'
import { useUnderwater } from '@/contexts/UnderwaterContext'

// Preload both sounds as AudioBuffers for near-zero latency playback
export default function GlobalClickSound() {
  const { isMuted } = useUnderwater()
  const isMutedRef = useRef(isMuted)
  const ctxRef     = useRef<AudioContext | null>(null)
  const downBuf    = useRef<AudioBuffer | null>(null)
  const upBuf      = useRef<AudioBuffer | null>(null)

  useEffect(() => { isMutedRef.current = isMuted }, [isMuted])

  useEffect(() => {
    const ctx = new AudioContext()
    ctxRef.current = ctx

    const load = async (path: string) => {
      const res = await fetch(path)
      const buf = await res.arrayBuffer()
      return ctx.decodeAudioData(buf)
    }

    load('/sounds/clickDown.mp3').then(b => { downBuf.current = b }).catch(() => {})
    load('/sounds/clickUp.mp3').then(b =>   { upBuf.current   = b }).catch(() => {})

    const play = (buf: AudioBuffer | null) => {
      if (!buf || isMutedRef.current) return
      if (ctx.state === 'suspended') ctx.resume()
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(ctx.destination)
      src.start()
    }

    const onDown = () => play(downBuf.current)
    const onUp   = () => play(upBuf.current)

    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup',   onUp)

    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup',   onUp)
      ctx.close()
    }
  }, [])

  return null
}
