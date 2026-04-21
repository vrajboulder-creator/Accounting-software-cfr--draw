"use client";
import { DrawsTab } from "../project-shell";
import { useProjectData } from "../project-data-context";

export default function DrawsPage() {
  return <DrawsTab data={useProjectData()} />;
}
