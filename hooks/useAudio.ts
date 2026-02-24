'use client'

import { useRef } from 'react'

interface AudioConfig {
  url: string
  volume: number
  loop?: boolean
}

export function useAudio() {
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  const initAudio = (key: string, config: AudioConfig) => {
    if (!audioRefs.current[key]) {
      const audio = new Audio(config.url)
      audio.loop = config.loop ?? true
      audio.volume = config.volume
      audioRefs.current[key] = audio
    }
  }

  const playSound = (key: string) => {
    if (audioRefs.current[key]) {
      audioRefs.current[key].play().catch(() => {
        // Autoplay policy restriction
      })
    }
  }

  const stopSound = (key: string) => {
    if (audioRefs.current[key]) {
      audioRefs.current[key].pause()
      audioRefs.current[key].currentTime = 0
    }
  }

  const setVolume = (key: string, volume: number) => {
    if (audioRefs.current[key]) {
      audioRefs.current[key].volume = volume
    }
  }

  return {
    initAudio,
    playSound,
    stopSound,
    setVolume,
  }
}

