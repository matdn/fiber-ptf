import rawProjects from './projects.json'

export type ProjectDetailBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; src: string; height?: number }
  | { type: 'video'; src: string; height?: number }

type RawProject = {
  title: string
  imageUrl: string
  detailImageUrl?: string | null
  detailVideoUrl?: string | null
  description: string
  detailBlocks?: Array<
    | { type: 'text'; content: string }
    | { type: 'image'; src: string; height?: number }
    | { type: 'video'; src: string; height?: number }
  >
}

export type ProjectItem = {
  title: string
  imageUrl: string
  detailImageUrl?: string
  detailVideoUrl?: string
  description: string
  detailBlocks: ProjectDetailBlock[]
}

const projects = rawProjects as RawProject[]

export const PROJECTS: ProjectItem[] = projects.map((project) => {
  const fallbackBlocks: ProjectDetailBlock[] = []
  if (project.detailVideoUrl) {
    fallbackBlocks.push({ type: 'video', src: project.detailVideoUrl, height: 280 })
  }
  if (project.detailImageUrl) {
    fallbackBlocks.push({ type: 'image', src: project.detailImageUrl, height: 180 })
  }
  fallbackBlocks.push({ type: 'text', content: project.description })

  const normalizedBlocks = (project.detailBlocks && project.detailBlocks.length > 0
    ? project.detailBlocks
    : fallbackBlocks) as ProjectDetailBlock[]

  return {
    title: project.title,
    imageUrl: project.imageUrl,
    detailImageUrl: project.detailImageUrl || undefined,
    detailVideoUrl: project.detailVideoUrl || undefined,
    description: project.description,
    detailBlocks: normalizedBlocks,
  }
})

export const PROJECT_IMAGE_URLS = PROJECTS.map((project) => project.imageUrl)
