"use client";
import { useSearchParams } from "next/navigation";
import { DrawsTab } from "../project-shell";
import { useProjectData } from "../project-data-context";

export default function DrawsPage() {
  const data = useProjectData();
  const params = useSearchParams();
  const drawId = params.get("draw");
  return <DrawsTab data={data} initialDrawId={drawId} />;
}
