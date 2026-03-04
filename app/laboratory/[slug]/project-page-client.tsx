'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { ProjectDetailView } from '@/components/scene/ui/ProjectDetailView'
import { getProjectBySlug } from '@/lib/projectImages'
import { useUnderwater } from '@/contexts/UnderwaterContext'

export default function ProjectPageClient({ slug }: { slug: string }) {
  const router = useRouter()
  const { isUnderwater } = useUnderwater()

  const project = useMemo(() => getProjectBySlug(slug), [slug])

  useEffect(() => {
    if (!project) router.replace('/laboratory')
  }, [project, router])

  if (!project) return null

  return (
    <>
      <Header isUnderwater={isUnderwater} />
      <main className="w-full h-screen overflow-y-auto">
        <ProjectDetailView project={project} onClose={() => router.push('/laboratory')} />
      </main>
    </>
  )
}
