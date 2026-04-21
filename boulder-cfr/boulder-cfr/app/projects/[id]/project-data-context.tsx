"use client";
import * as React from "react";
import type { ProjectPageData } from "./page-data";

const Ctx = React.createContext<ProjectPageData | null>(null);

export function ProjectDataProvider({ data, children }: { data: ProjectPageData; children: React.ReactNode }) {
  return <Ctx.Provider value={data}>{children}</Ctx.Provider>;
}

export function useProjectData(): ProjectPageData {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useProjectData must be used inside ProjectDataProvider");
  return ctx;
}
