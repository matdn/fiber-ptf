'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import Header from '@/components/Header'
import { Loader } from '@/components/Loader'
import { useUnderwater } from '@/contexts/UnderwaterContext'

const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
})

export default function Home() {
  const { isUnderwater, setIsUnderwater } = useUnderwater()
  const [isLoaded, setIsLoaded] = useState(false)

  return (
    <main className="w-full overflow-hidden h-screen">
      {!isLoaded && <Loader onLoaded={() => setIsLoaded(true)} />}
      
      {isLoaded && <Header isUnderwater={isUnderwater} />}
      
      <div className="fixed inset-0 z-0">
        <Scene onUnderwaterToggle={setIsUnderwater} isUnderwater={isUnderwater} />
      </div>
    </main>
  )
}
