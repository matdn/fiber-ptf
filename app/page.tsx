'use client'

import dynamic from 'next/dynamic'

const Scene = dynamic(() => import('@/components/Scene'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-black">
      <p className="text-white text-2xl">Loading 3D Scene...</p>
    </div>
  ),
})

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden">
      <Scene  />
    </main>
  )
}
