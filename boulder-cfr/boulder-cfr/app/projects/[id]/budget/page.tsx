"use client";
import { BudgetTab } from "../project-shell";
import { useProjectData } from "../project-data-context";

export default function BudgetPage() {
  return <BudgetTab data={useProjectData()} />;
}
