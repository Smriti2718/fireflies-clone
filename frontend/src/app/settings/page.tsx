"use client";

import { Bell, CreditCard, Moon, Shield, Sun, User, Video } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/components/ui/Theme";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { User as UserT } from "@/lib/types";

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notetaker", label: "Notetaker", icon: Video },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Plans & billing", icon: CreditCard },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Toggle({ label, desc, defaultOn = false }: { label: string; desc: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  const toast = useToast();
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line py-4 last:border-b-0">
      <div>
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-sm text-muted">{desc}</p>
      </div>
      <button role="switch" aria-checked={on} aria-label={label}
        onClick={() => { setOn(!on); toast(`${label} ${on ? "turned off" : "turned on"} (demo only)`, "info"); }}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-brand" : "bg-line"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function Settings() {
  const params = useSearchParams();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [user, setUser] = useState<UserT | null>(null);
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "profile") as TabId;

  useEffect(() => { api.me().then(setUser).catch(() => {}); }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-ink">Settings</h1>
      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="flex gap-1 overflow-x-auto md:w-52 md:flex-col" aria-label="Settings sections">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => router.replace(`/settings?tab=${id}`)} aria-current={tab === id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium ${tab === id ? "bg-brand-soft text-brand-ink" : "text-muted hover:bg-raised hover:text-ink"}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        <div className="panel min-w-0 flex-1 p-6">
          {tab === "profile" && (
            <div>
              <div className="flex items-center gap-4">
                {user && <Avatar name={user.name} color={user.avatar_color} size="lg" />}
                <div>
                  <p className="font-semibold text-ink">{user?.name ?? "…"}</p>
                  <p className="text-sm text-muted">{user?.email}</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div><label className="label" htmlFor="s-name">Full name</label><input id="s-name" className="input" defaultValue={user?.name} key={user?.name} /></div>
                <div><label className="label" htmlFor="s-email">Email</label><input id="s-email" className="input" defaultValue={user?.email} key={user?.email} disabled /></div>
              </div>
              <div className="mt-6">
                <p className="label">Appearance</p>
                <div className="flex gap-2">
                  {(["light", "dark"] as const).map((t) => (
                    <button key={t} onClick={() => setTheme(t)} aria-pressed={theme === t}
                      className={`btn border capitalize ${theme === t ? "border-brand bg-brand-soft text-brand-ink" : "border-line text-ink hover:bg-raised"}`}>
                      {t === "light" ? <Sun size={15} /> : <Moon size={15} />} {t}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn-primary mt-6" onClick={() => toast("Profile editing is coming soon", "info")}>Save changes</button>
            </div>
          )}
          {tab === "notetaker" && (
            <div>
              <h2 className="font-semibold text-ink">Notetaker</h2>
              <p className="mb-2 mt-1 text-sm text-muted">Control how the assistant joins and records meetings. The live bot is coming soon.</p>
              <Toggle label="Auto-join calendar meetings" desc="Join every meeting with a video link on your calendar." defaultOn />
              <Toggle label="Announce recording" desc="Post a consent message in chat when the notetaker joins." defaultOn />
              <Toggle label="Email recap after each meeting" desc="Send participants the summary and action items." />
            </div>
          )}
          {tab === "notifications" && (
            <div>
              <h2 className="font-semibold text-ink">Notifications</h2>
              <Toggle label="Action item reminders" desc="Get a reminder the day before an action item is due." defaultOn />
              <Toggle label="Weekly digest" desc="A Monday summary of last week's meetings." />
              <Toggle label="Mentions" desc="Notify me when someone mentions me in a comment." defaultOn />
            </div>
          )}
          {tab === "security" && (
            <div>
              <h2 className="font-semibold text-ink">Security</h2>
              <p className="mt-1 text-sm text-muted">Sign-in, SSO and data retention controls are coming soon. This demo runs as a single default user.</p>
            </div>
          )}
          {tab === "billing" && (
            <div>
              <h2 className="font-semibold text-ink">Plans & billing</h2>
              <p className="mt-1 text-sm text-muted">You're on the Free plan. Paid plans are coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <Suspense><Settings /></Suspense>;
}
