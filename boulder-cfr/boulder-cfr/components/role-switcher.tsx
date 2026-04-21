"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, ChevronDown, Lock } from "lucide-react";
import { ROLES } from "@/lib/roles";
import { useRole } from "./role-context";
import { cn } from "@/lib/utils";

export function RoleSwitcher() {
  const { role, setRole, user } = useRole();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = ROLES.find((r) => r.id === role)!;

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-[calc(100%+8px)] right-0 w-80 rounded-xl border border-neutral-200 bg-white p-2 shadow-2xl"
          >
            <div className="px-3 py-2 border-b border-neutral-100">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-semibold text-neutral-500">
                <Eye className="h-3 w-3" />
                Preview as role
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Data visibility changes based on the selected role. Owner never sees CFR.
              </p>
            </div>
            <div className="py-1">
              {ROLES.map((r) => {
                const active = r.id === role;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRole(r.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors",
                      active ? "bg-boulder-50" : "hover:bg-neutral-50",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 h-2 w-2 rounded-full shrink-0",
                        active ? "bg-boulder-500" : "bg-neutral-300",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-medium", active ? "text-boulder-700" : "text-neutral-900")}>
                          {r.label}
                        </span>
                        {r.id === "owner" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                            <Lock className="h-2.5 w-2.5" /> Restricted
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500 leading-snug">{r.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-2.5 rounded-full border border-neutral-200 bg-white pl-2 pr-3.5 py-1.5 shadow-lg hover:shadow-xl transition-shadow"
      >
        <div
          className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
          style={{ background: user.avatarColor ?? "#64748B" }}
        >
          {user.name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)}
        </div>
        <div className="flex flex-col items-start leading-tight">
          <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-neutral-400">Viewing as</span>
          <span className="text-xs font-semibold text-neutral-900">{current.label}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-neutral-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
    </div>
  );
}
