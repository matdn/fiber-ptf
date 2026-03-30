import rawProjects from './projects.json'

export type ProjectDetailBlock =
  | { type: 'text'; content: string }
  | { type: 'image'; src: string; height?: number }
  | { type: 'video'; src: string; height?: number; fullWidth?: boolean; padding?: boolean }
  | {
      type: 'feature-grid'
      heading: string
      videoSrc: string
      imageSrc: string
      paragraphs: string[]
    }

type RawProject = {
  title: string
  imageUrl: string
  detailImageUrl?: string | null
  detailVideoUrl?: string | null
  projectUrl?: string | null
  description: string
  tags?: string[]
  year?: string
  detailBlocks?: Array<
    | { type: 'text'; content: string }
    | { type: 'image'; src: string; height?: number }
    | { type: 'video'; src: string; height?: number; fullWidth?: boolean; padding?: boolean }
    | { type: 'feature-grid'; heading: string; videoSrc: string; imageSrc: string; paragraphs: string[] }
  >
}

export type ProjectItem = {
  title: string
  imageUrl: string
  detailImageUrl?: string
  detailVideoUrl?: string
  projectUrl?: string
  description: string
  detailBlocks: ProjectDetailBlock[]
  tags?: string[]
  year?: string
}

export function slugifyProjectTitle(title: unknown) {
  if (typeof title !== 'string') return ''
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function getProjectSlug(project: Pick<ProjectItem, 'title'> | null | undefined) {
  return slugifyProjectTitle(project?.title)
}

export function getProjectBySlug(slug: unknown) {
  if (typeof slug !== 'string') return null
  const normalized = slug.toLowerCase().trim()
  return PROJECTS.find((p) => getProjectSlug(p) === normalized) ?? null
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
    projectUrl: project.projectUrl || undefined,
    description: project.description,
    tags: project.tags,
    year: project.year,
    detailBlocks: normalizedBlocks,
  }
})

export const PROJECT_IMAGE_URLS = PROJECTS.map((project) => project.imageUrl)
