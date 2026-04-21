"use client";
import { CFRTab } from "../project-shell";
import { useProjectData } from "../project-data-context";

export default function CFRPage() {
  return <CFRTab data={useProjectData()} />;
}
