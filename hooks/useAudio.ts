'use client'

import { useCallback } from 'react'

interface AudioConfig {
  url: string
  volume: number
  loop?: boolean
}

// Module-level singleton — audio elements survive component remounts
// so they can always be paused even after a re-mount orphans the ref
const audioStore: { [key: string]: HTMLAudioElement } = {}

export function useAudio() {
  const initAudio = useCallback((key: string, config: AudioConfig) => {
    if (!audioStore[key]) {
      const audio = new Audio(config.url)
      audio.loop = config.loop ?? true
      audio.volume = config.volume
      audioStore[key] = audio
    }
  }, [])

  const playSound = useCallback((key: string) => {
    if (audioStore[key]) {
      const playPromise = audioStore[key].play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {})
      }
    }
  }, [])

  const stopSound = useCallback((key: string) => {
    if (audioStore[key]) {
      audioStore[key].pause()
      audioStore[key].currentTime = 0
    }
  }, [])

  const setVolume = useCallback((key: string, volume: number) => {
    if (audioStore[key]) {
      audioStore[key].volume = volume
    }
  }, [])

  const resumeAll = useCallback(() => {
    Object.values(audioStore).forEach(audio => {
      if (!audio.paused) {
        audio.play().catch(() => {})
      }
    })
  }, [])

  return {
    initAudio,
    playSound,
    stopSound,
    setVolume,
    resumeAll,
  }
}

