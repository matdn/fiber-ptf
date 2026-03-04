import ProjectPageClient from './project-page-client'

export default function LaboratoryProjectPage({
  params,
}: {
  params: { slug: string }
}) {
  return <ProjectPageClient slug={params.slug} />
}
