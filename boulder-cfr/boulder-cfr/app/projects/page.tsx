import { getProjectsWithStats } from "@/lib/db/queries";
import { ProjectsClient } from "./projects-client";

export default async function ProjectsPage() {
  const projects = await getProjectsWithStats();
  return <ProjectsClient projects={projects} />;
}
