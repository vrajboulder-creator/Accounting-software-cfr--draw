"use client";
import { ChangeOrdersTab } from "../project-shell";
import { useProjectData } from "../project-data-context";

export default function ChangeOrdersPage() {
  return <ChangeOrdersTab data={useProjectData()} />;
}
