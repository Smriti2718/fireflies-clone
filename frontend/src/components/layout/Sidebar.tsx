"use client";

import {
  BarChart3, CheckSquare, Home, LayoutGrid, Moon, Plug, Settings, Sparkles, Sun, Upload, Users, Video,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ui/Theme";
import { useCreateMeeting } from "./CreateMeetingContext";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/meetings", label: "Meetings", icon: Video },
  { href: "/tasks", label: "Action items", icon: CheckSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/apps", label: "AI Apps", icon: LayoutGrid },
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/team", label: "Team", icon: Users },
];

export function Logo() {
  return (
    <Link href="/meetings" className="flex items-center gap-2 px-2" aria-label="Fireflies home">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#8f5cff] via-[#6e45e2] to-[#e0458f]">
        <span className="h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.65)]" />
      </span>
      <span className="text-[17px] font-bold tracking-tight text-ink">fireflies</span>
    </Link>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const openCreate = useCreateMeeting();
  const { theme, toggle } = useTheme();

  const item = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors ${
      active ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-raised hover:text-ink"
    }`;

  return (
    <aside className="flex h-full w-60 flex-col border-r border-line bg-surface px-3 py-4">
      <Logo />
      <nav className="mt-6 flex flex-col gap-0.5" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/home" && path.startsWith(href));
          return (
            <Link key={href} href={href} className={item(active)} onClick={onNavigate} aria-current={active ? "page" : undefined}>
              <Icon size={18} strokeWidth={active ? 2.2 : 1.9} />
              {label}
            </Link>
          );
        })}
        <button className={item(false)} onClick={() => { openCreate("upload"); onNavigate?.(); }}>
          <Upload size={18} strokeWidth={1.9} /> Uploads
        </button>
      </nav>

      <div className="mt-auto flex flex-col gap-0.5">
        <div className="mb-3 rounded-xl bg-gradient-to-br from-brand-soft to-raised p-3.5">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Sparkles size={15} className="text-brand" /> Free plan</div>
          <p className="mt-1 text-xs leading-snug text-muted">Unlimited transcripts in this demo workspace.</p>
          <Link href="/settings?tab=billing" className="mt-2.5 inline-flex text-xs font-semibold text-brand-ink hover:underline">See plans</Link>
        </div>
        <Link href="/settings" className={item(path.startsWith("/settings"))} onClick={onNavigate}>
          <Settings size={18} strokeWidth={1.9} /> Settings
        </Link>
        <button className={item(false)} onClick={toggle} aria-label="Toggle dark mode">
          {theme === "dark" ? <Sun size={18} strokeWidth={1.9} /> : <Moon size={18} strokeWidth={1.9} />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  );
}
