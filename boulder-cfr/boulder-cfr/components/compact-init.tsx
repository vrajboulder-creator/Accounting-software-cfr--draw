"use client";
import * as React from "react";

export function CompactInit() {
  React.useEffect(() => {
    try {
      if (localStorage.getItem("boulder-compact") === "1") {
        document.documentElement.classList.add("compact");
      }
    } catch {}
  }, []);
  return null;
}
