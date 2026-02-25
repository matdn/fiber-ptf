import rawProjects from './projects.json'

type RawProject = {
  title: string
  imageUrl: string
  detailImageUrl?: string | null
  detailVideoUrl?: string | null
  description: string
}

export type ProjectItem = {
  title: string
  imageUrl: string
  detailImageUrl?: string
  detailVideoUrl?: string
  description: string
}

const projects = rawProjects as RawProject[]

export const PROJECTS: ProjectItem[] = projects.map((project) => ({
  title: project.title,
  imageUrl: project.imageUrl,
  detailImageUrl: project.detailImageUrl || undefined,
  detailVideoUrl: project.detailVideoUrl || undefined,
  description: project.description,
}))

export const PROJECT_IMAGE_URLS = PROJECTS.map((project) => project.imageUrl)
