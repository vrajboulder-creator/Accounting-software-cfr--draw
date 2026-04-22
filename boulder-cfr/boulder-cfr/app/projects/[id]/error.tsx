"use client";
import { useEffect } from "react";

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Project page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-neutral-50/50 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">Failed to load project</h2>
        <p className="text-sm text-neutral-500 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-boulder-500 text-white rounded-lg text-sm hover:bg-boulder-600 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
