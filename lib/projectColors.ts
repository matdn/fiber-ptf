export function getProjectMeshColor(projectTitle?: string | null): string {
  const title = (projectTitle ?? "").toLowerCase();

  // Keep in sync with the ProjectDetail floating meshes.
  if (title.includes("noir")) return "#000000";
  if (title.includes("altitude")) return "#cbb8ff";

  return "#ffffff";
}
