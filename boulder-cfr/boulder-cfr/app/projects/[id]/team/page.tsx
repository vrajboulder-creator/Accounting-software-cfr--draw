"use client";
import { TeamTab } from "../project-shell";
import { useProjectData } from "../project-data-context";

export default function TeamPage() {
  return <TeamTab data={useProjectData()} />;
}
