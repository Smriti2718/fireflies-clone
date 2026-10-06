"use client";

import { CalendarClock, CheckSquare, Clock, Upload, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCreateMeeting } from "@/components/layout/CreateMeetingContext";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { api } from "@/lib/api";
import { durationLabel, meetingDate, meetingTime } from "@/lib/format";
import type { ActionItem, MeetingListItem, User } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function HomePage() {
  const openCreate = useCreateMeeting();
  const [user, setUser] = useState<User | null>(null);
  const [meetings, setMeetings] = useState<MeetingListItem[] | null>(null);
  const [tasks, setTasks] = useState<ActionItem[]>([]);

  useEffect(() => {
    api.me().then(setUser).catch(() => {});
    api.listMeetings({ sort: "recent" }).then((r) => setMeetings(r.items)).catch(() => setMeetings([]));
    api.allActionItems(false).then(setTasks).catch(() => {});
  }, []);

  const weekAgo = Date.now() - 7 * 86_400_000;
  const thisWeek = meetings?.filter((m) => new Date(m.meeting_date).getTime() >= weekAgo) ?? [];
  const minutes = Math.round(thisWeek.reduce((s, m) => s + m.duration_sec, 0) / 60);
  const mine = user ? tasks.filter((t) => t.assignee?.name === user.name) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{greeting()}{user ? `, ${user.name.split(" ")[0]}` : ""}</h1>
      <p className="mt-1 text-sm text-muted">Here's what happened in your meetings.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Video, label: "Meetings in the last 7 days", value: meetings ? thisWeek.length : "–" },
          { icon: Clock, label: "Minutes transcribed this week", value: meetings ? minutes : "–" },
          { icon: CheckSquare, label: "Open action items", value: tasks.length },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="panel flex items-center gap-3.5 p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon size={19} /></span>
            <div>
              <p className="text-xl font-semibold tabular-nums text-ink">{value}</p>
              <p className="text-xs text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-[15px] font-semibold text-ink">Recent meetings</h2>
            <Link href="/meetings" className="text-sm font-medium text-brand-ink hover:underline">View all</Link>
          </div>
          <ul>
            {(meetings ?? []).slice(0, 5).map((m) => (
              <li key={m.id} className="border-b border-line last:border-b-0">
                <Link href={`/meetings/${m.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-raised/60">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{m.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{meetingDate(m.meeting_date)}, {meetingTime(m.meeting_date)}, {durationLabel(m.duration_sec)}</p>
                  </div>
                  <AvatarStack people={m.participants} size="xs" max={3} />
                </Link>
              </li>
            ))}
            {meetings && meetings.length === 0 && (
              <li className="px-5 py-10 text-center">
                <p className="text-sm text-muted">No meetings yet.</p>
                <button className="btn-primary mt-3" onClick={() => openCreate("upload")}><Upload size={15} /> Upload transcript</button>
              </li>
            )}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="panel">
            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
              <h2 className="text-[15px] font-semibold text-ink">Assigned to you</h2>
              <Link href="/tasks" className="text-sm font-medium text-brand-ink hover:underline">All action items</Link>
            </div>
            <ul className="p-2">
              {mine.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <Link href={`/meetings/${t.meeting_id}`} className="flex items-start gap-2.5 rounded-lg px-3 py-2 hover:bg-raised">
                    <span className="mt-1 h-3.5 w-3.5 shrink-0 rounded-[4px] border-2 border-faint" />
                    <span className="text-sm text-ink">{t.text}</span>
                  </Link>
                </li>
              ))}
              {mine.length === 0 && <li className="px-3 py-4 text-sm text-muted">Nothing assigned to you right now.</li>}
            </ul>
          </section>

          <section className="panel p-5">
            <div className="flex items-center gap-2"><CalendarClock size={17} className="text-brand" /><h2 className="text-[15px] font-semibold text-ink">Upcoming</h2></div>
            <p className="mt-2 text-sm text-muted">Connect a calendar so the notetaker can join your next meetings automatically.</p>
            <Link href="/integrations" className="btn-outline mt-3">Connect calendar</Link>
          </section>

          {tasks.some((t) => t.assignee && t.assignee.name !== user?.name) && (
            <section className="panel p-5">
              <h2 className="text-[15px] font-semibold text-ink">Waiting on others</h2>
              <ul className="mt-3 space-y-2.5">
                {tasks.filter((t) => t.assignee && t.assignee.name !== user?.name).slice(0, 4).map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5 text-sm">
                    <Avatar name={t.assignee!.name} color={t.assignee!.color} size="xs" />
                    <span className="text-ink">{t.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
