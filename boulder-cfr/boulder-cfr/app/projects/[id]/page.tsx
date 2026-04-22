"use client";
import { useRouter } from "next/navigation";
import { OverviewTab } from "./project-shell";
import { useProjectData } from "./project-data-context";

export default function OverviewPage() {
  const data = useProjectData();
  const router = useRouter();
  return (
    <OverviewTab
      data={data}
      onOpenDraw={(id) => router.push(`/projects/${data.project.id}/draws?draw=${id}`)}
    />
  );
}
