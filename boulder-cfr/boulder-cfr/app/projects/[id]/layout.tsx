import { loadProjectData } from "./page-data";
import { ProjectDataProvider } from "./project-data-context";
import { ProjectNav } from "./project-nav";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadProjectData(id);

  return (
    <ProjectDataProvider data={data}>
      <div className="min-h-screen bg-neutral-50/50">
        <ProjectNav projectId={id} />
        {children}
      </div>
    </ProjectDataProvider>
  );
}
