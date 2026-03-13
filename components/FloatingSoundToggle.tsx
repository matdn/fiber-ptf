'use client'

import SoundWaveToggle from './SoundWaveToggle'

export default function FloatingSoundToggle() {
  return (
    <div className="fixed top-4 right-4 z-[9999] md:top-6 md:right-6 pointer-events-auto mix-blend-difference">
      <div className="backdrop-blur-xl  rounded-xs w-[55px] h-[55px] flex justify-center items-center py-2 border border-white/10 hover:border-white/20 transition-colors pointer-events-auto">
        <SoundWaveToggle />
      </div>
    </div>
  )
}
