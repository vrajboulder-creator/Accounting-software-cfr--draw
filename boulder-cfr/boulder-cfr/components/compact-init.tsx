"use client";
import * as React from "react";
import { usePathname } from "next/navigation";

export function pageKey(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  // Project sub-pages: /projects/[id]/[section] → key = "projects-{section}" (shared across projects)
  if (parts[0] === "projects" && parts[1] && parts[2]) return `projects-${parts[2]}`;
  if (parts[0] === "projects" && parts[1]) return "projects-overview";
  return parts[0] ?? "root";
}

export function CompactInit() {
  const pathname = usePathname();
  React.useEffect(() => {
    if (!pathname) return;
    const key = pageKey(pathname);
    try {
      const compactVal = localStorage.getItem(`boulder-compact-${key}`);
      const compactOn = compactVal === null ? true : compactVal === "1";
      document.documentElement.classList.toggle("compact", compactOn);

      const sizeRaw = localStorage.getItem(`boulder-font-size-${key}`);
      const size = sizeRaw ? Number(sizeRaw) : 10;
      if (size >= 8 && size <= 20) {
        document.documentElement.style.fontSize = `${size}px`;
      } else {
        document.documentElement.style.fontSize = "10px";
      }
    } catch {}
  }, [pathname]);
  return null;
}
