"use client";
import * as React from "react";

export function CompactInit() {
  React.useEffect(() => {
    try {
      if (localStorage.getItem("boulder-compact") === "1") {
        document.documentElement.classList.add("compact");
      }
      const size = Number(localStorage.getItem("boulder-font-size"));
      if (size >= 10 && size <= 20) {
        document.documentElement.style.fontSize = `${size}px`;
      }
    } catch {}
  }, []);
  return null;
}
