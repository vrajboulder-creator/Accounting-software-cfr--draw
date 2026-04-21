"use client";
import * as React from "react";
import type { ProjectRole } from "@/lib/types";
import { userForRole } from "@/lib/roles";

type UserRecord = {
  id: string;
  email: string;
  name: string;
  orgId: string;
  avatarColor: string | null;
};

interface RoleContextValue {
  role: ProjectRole;
  setRole: (r: ProjectRole) => void;
  user: UserRecord;
}

const RoleContext = React.createContext<RoleContextValue | null>(null);

const STORAGE_KEY = "boulder.role";

export function RoleProvider({ children, users }: { children: React.ReactNode; users: UserRecord[] }) {
  const [role, setRoleState] = React.useState<ProjectRole>("contractor_pm");

  React.useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (saved) setRoleState(saved as ProjectRole);
    } catch {
      /* ignore */
    }
  }, []);

  const setRole = React.useCallback((r: ProjectRole) => {
    setRoleState(r);
    try {
      window.localStorage.setItem(STORAGE_KEY, r);
    } catch {
      /* ignore */
    }
  }, []);

  const user = React.useMemo(() => {
    const id = userForRole(role);
    return users.find((u) => u.id === id) ?? users[0];
  }, [role, users]);

  return <RoleContext.Provider value={{ role, setRole, user }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = React.useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
