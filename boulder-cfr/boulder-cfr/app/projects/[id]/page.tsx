"use client";
import { OverviewTab } from "./project-shell";
import { useProjectData } from "./project-data-context";

export default function OverviewPage() {
  const data = useProjectData();
  return <OverviewTab data={data} />;
}
