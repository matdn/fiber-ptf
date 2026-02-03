'use client'

import dynamic from 'next/dynamic'
import Header from '@/components/Header'
import { useState } from 'react'

const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-black">
      <p className="text-white text-2xl">Loading 3D Scene...</p>
    </div>
  ),
})

export default function Home() {
  const [isUnderwater, setIsUnderwater] = useState(false)

  return (
    <main className="w-full overflow-hidden h-screen">
      <Header isUnderwater={isUnderwater} />
      
      <div className="fixed inset-0 z-0">
        <Scene onUnderwaterToggle={setIsUnderwater} isUnderwater={isUnderwater} />
      </div>
    </main>
  )
}
