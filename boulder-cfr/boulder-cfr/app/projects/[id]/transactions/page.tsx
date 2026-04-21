"use client";
import { TransactionsTab } from "../project-shell";
import { useProjectData } from "../project-data-context";

export default function TransactionsPage() {
  return <TransactionsTab data={useProjectData()} />;
}
