'use client'

import { useCallback, useRef } from 'react'

interface AudioConfig {
  url: string
  volume: number
  loop?: boolean
}

export function useAudio() {
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  const initAudio = useCallback((key: string, config: AudioConfig) => {
    if (!audioRefs.current[key]) {
      const audio = new Audio(config.url)
      audio.loop = config.loop ?? true
      audio.volume = config.volume
      audioRefs.current[key] = audio
    }
  }, [])

  const playSound = useCallback((key: string) => {
    if (audioRefs.current[key]) {
      const playPromise = audioRefs.current[key].play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log('Audio autoplay blocked for', key, '- waiting for user interaction')
        })
      }
    }
  }, [])

  const stopSound = useCallback((key: string) => {
    if (audioRefs.current[key]) {
      audioRefs.current[key].pause()
      audioRefs.current[key].currentTime = 0
    }
  }, [])

  const setVolume = useCallback((key: string, volume: number) => {
    if (audioRefs.current[key]) {
      audioRefs.current[key].volume = volume
    }
  }, [])

  const resumeAll = useCallback(() => {
    Object.values(audioRefs.current).forEach(audio => {
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

