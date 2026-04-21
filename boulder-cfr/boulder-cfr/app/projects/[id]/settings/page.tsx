"use client";
import { SettingsTab } from "../project-shell";
import { useProjectData } from "../project-data-context";

export default function SettingsPage() {
  return <SettingsTab data={useProjectData()} />;
}
