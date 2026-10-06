"use client";

import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";
import { CreateMeetingContext, type CreateMode } from "./CreateMeetingContext";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [create, setCreate] = useState<{ open: boolean; mode: CreateMode }>({ open: false, mode: "upload" });
  const path = usePathname();

  useEffect(() => { api.me().then(setUser).catch(() => setUser(null)); }, []);
  useEffect(() => setNavOpen(false), [path]);

  const openCreate = useCallback((mode: CreateMode = "upload") => setCreate({ open: true, mode }), []);
  const closeCreate = useCallback(() => setCreate((c) => ({ ...c, open: false })), []);

  return (
    <CreateMeetingContext.Provider value={openCreate}>
      <div className="flex h-dvh overflow-hidden">
        <div className="hidden lg:block"><Sidebar /></div>
        {navOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setNavOpen(false)}>
            <div className="absolute inset-0 bg-[rgb(20_16_40/0.4)]" />
            <div className="relative h-full w-60" onClick={(e) => e.stopPropagation()}><Sidebar onNavigate={() => setNavOpen(false)} /></div>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <Suspense fallback={<div className="h-16 border-b border-line bg-surface" />}>
            <Topbar user={user} onOpenNav={() => setNavOpen(true)} />
          </Suspense>
          <main className="relative min-h-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
      <CreateMeetingModal open={create.open} mode={create.mode} onClose={closeCreate} />
    </CreateMeetingContext.Provider>
  );
}
