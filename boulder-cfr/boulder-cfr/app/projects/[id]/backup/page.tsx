"use client";
import { BackupTab } from "../project-shell";
import { useProjectData } from "../project-data-context";

export default function BackupPage() {
  return <BackupTab data={useProjectData()} />;
}
