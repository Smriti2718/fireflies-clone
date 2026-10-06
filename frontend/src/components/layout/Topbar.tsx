"use client";

import { Bell, ChevronDown, HelpCircle, LogOut, Menu as MenuIcon, Plus, Search, Settings, Upload, User as UserIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Menu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import type { User } from "@/lib/types";
import { useCreateMeeting } from "./CreateMeetingContext";

export function Topbar({ user, onOpenNav }: { user: User | null; onOpenNav: () => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const openCreate = useCreateMeeting();
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => setQ(params.get("q") ?? ""), [params]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/meetings?q=${encodeURIComponent(q.trim())}` : "/meetings");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur md:px-6">
      <button className="btn-ghost h-9 w-9 px-0 lg:hidden" onClick={onOpenNav} aria-label="Open navigation"><MenuIcon size={20} /></button>

      <form onSubmit={submit} className="relative max-w-xl flex-1" role="search">
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, person or anything said in a meeting"
          className="input h-10 rounded-full border-transparent bg-raised pl-10" aria-label="Search all meetings" />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <Menu label="New meeting" trigger={
          <span className="btn-primary h-9 rounded-full"><Plus size={16} /> <span className="hidden sm:inline">Capture</span></span>
        } items={[
          { label: "Upload transcript", icon: <Upload size={16} />, onSelect: () => openCreate("upload"), hint: ".txt .vtt .json" },
          { label: "Paste transcript", icon: <Plus size={16} />, onSelect: () => openCreate("paste") },
          { label: "Add meeting manually", icon: <Plus size={16} />, onSelect: () => openCreate("form") },
          { label: "Invite bot to live meeting", icon: <Plus size={16} />, onSelect: () => toast("Live meeting bot is coming soon", "info") },
        ]} />
        <button className="btn-ghost hidden h-9 w-9 px-0 sm:inline-flex" aria-label="Help" onClick={() => toast("Help center is coming soon", "info")}><HelpCircle size={19} /></button>
        <button className="btn-ghost h-9 w-9 px-0" aria-label="Notifications" onClick={() => toast("You're all caught up", "info")}><Bell size={19} /></button>
        {user && (
          <Menu label="Account" trigger={
            <span className="flex items-center gap-1 rounded-full p-0.5 pr-1.5 hover:bg-raised">
              <Avatar name={user.name} color={user.avatar_color} size="md" />
              <ChevronDown size={14} className="text-faint" />
            </span>
          } items={[
            { label: user.name, icon: <UserIcon size={16} />, onSelect: () => router.push("/settings"), hint: "Profile" },
            { label: "Settings", icon: <Settings size={16} />, onSelect: () => router.push("/settings") },
            { label: "Sign out", icon: <LogOut size={16} />, onSelect: () => toast("Authentication is disabled in this demo", "info") },
          ]} />
        )}
      </div>
    </header>
  );
}
