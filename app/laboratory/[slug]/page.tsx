import ProjectPageClient from './project-page-client'

export default async function LaboratoryProjectPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string }
}) {
  const resolvedParams = await Promise.resolve(params)
  return <ProjectPageClient slug={resolvedParams.slug} />
}
