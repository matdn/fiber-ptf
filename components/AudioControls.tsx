'use client'

import { useState } from 'react'

interface AudioControlsProps {
  volumes: { [key: string]: number }
  onVolumeChange: (key: string, volume: number) => void
}

export default function AudioControls({ volumes, onVolumeChange }: AudioControlsProps) {
  const [isOpen, setIsOpen] = useState(false)

  const audioTracks = [
    { key: 'mainSceneBackSound', label: 'Main Back' },
    { key: 'mainScenePlusSound', label: 'Main Plus' },
    { key: 'underwaterSceneBackSound', label: 'Underwater' },
  ]

  return (
    <div className="fixed bottom-6 left-6 z-20 pointer-events-auto">
      {/* <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full border border-white/30 bg-white/5 px-3 py-2 text-[11px] tracking-[0.22em] text-white/75 backdrop-blur-sm transition hover:border-white/50 hover:text-white/90"
        >
          audio settings
        </button>
        
        {isOpen && (
          <div className="rounded-2xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 space-y-4 min-w-[200px]">
            {audioTracks.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <label className="text-xs text-white/60 block">
                  {label}
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={(volumes[key] ?? 0) * 100}
                  onChange={(e) => onVolumeChange(key, parseInt(e.target.value) / 100)}
                  className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                />
                <span className="text-xs text-white/40">
                  {Math.round((volumes[key] ?? 0) * 100)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div> */}
    </div>
  )
}
