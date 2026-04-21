import * as React from "react";
import { cn } from "@/lib/utils";

interface BoulderLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  filled?: boolean;
}

const sizeMap = {
  sm: "text-lg tracking-tight",
  md: "text-2xl tracking-tight",
  lg: "text-4xl tracking-tight",
  xl: "text-6xl tracking-tighter",
};

export function BoulderLogo({ size = "md", filled = false, className, ...props }: BoulderLogoProps) {
  return (
    <div
      className={cn("inline-flex items-center font-display font-black leading-none select-none", sizeMap[size], className)}
      {...props}
    >
      {filled ? (
        <span className="text-boulder-500">BOULDER</span>
      ) : (
        <span className="outline-text text-boulder-500">BOULDER</span>
      )}
    </div>
  );
}

/** Full mark: logo + optional subtitle */
export function BoulderMark({
  subtitle,
  size = "md",
  className,
}: {
  subtitle?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <BoulderLogo size={size} filled />
      {subtitle && (
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.25em] text-neutral-500">
          {subtitle}
        </span>
      )}
    </div>
  );
}
