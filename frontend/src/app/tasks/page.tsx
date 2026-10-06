"use client";

import { Check, CheckSquare } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { ActionItem, MeetingListItem } from "@/lib/types";

/** Every action item across all meetings, grouped by meeting. */
export default function TasksPage() {
  const toast = useToast();
  const [items, setItems] = useState<ActionItem[] | null>(null);
  const [meetings, setMeetings] = useState<Map<number, MeetingListItem>>(new Map());
  const [show, setShow] = useState<"open" | "all">("open");

  useEffect(() => {
    Promise.all([api.allActionItems(), api.listMeetings({ sort: "recent" })])
      .then(([a, m]) => { setItems(a); setMeetings(new Map(m.items.map((x) => [x.id, x]))); })
      .catch((e) => { setItems([]); toast((e as Error).message, "error"); });
  }, [toast]);

  const groups = useMemo(() => {
    const out = new Map<number, ActionItem[]>();
    (items ?? []).filter((a) => show === "all" || !a.completed).forEach((a) => out.set(a.meeting_id, [...(out.get(a.meeting_id) ?? []), a]));
    return Array.from(out.entries());
  }, [items, show]);

  const toggle = async (a: ActionItem) => {
    setItems((xs) => xs!.map((x) => (x.id === a.id ? { ...x, completed: !a.completed } : x)));
    try {
      await api.updateActionItem(a.id, { completed: !a.completed });
      toast(a.completed ? "Action item reopened" : "Action item completed");
    } catch (e) {
      setItems((xs) => xs!.map((x) => (x.id === a.id ? a : x)));
      toast((e as Error).message, "error");
    }
  };

  const openCount = items?.filter((a) => !a.completed).length ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Action items</h1>
          <p className="mt-1 text-sm text-muted">{items ? `${openCount} open across ${new Set(items.map((a) => a.meeting_id)).size} meetings` : "Loading…"}</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-raised p-1 text-sm" role="group">
          {(["open", "all"] as const).map((s) => (
            <button key={s} onClick={() => setShow(s)} aria-pressed={show === s}
              className={`rounded-md px-3 py-1 font-medium ${show === s ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>{s === "open" ? "Open" : "All"}</button>
          ))}
        </div>
      </div>

      {items && groups.length === 0 && (
        <div className="panel flex flex-col items-center px-6 py-14 text-center">
          <CheckSquare size={26} className="text-brand" />
          <p className="mt-3 font-medium text-ink">{show === "open" ? "Nothing open. Nice work." : "No action items yet"}</p>
          <p className="mt-1 text-sm text-muted">Action items from your meetings show up here.</p>
        </div>
      )}

      <div className="space-y-4">
        {groups.map(([mid, list]) => {
          const m = meetings.get(mid);
          return (
            <section key={mid} className="panel">
              <Link href={`/meetings/${mid}`} className="block border-b border-line px-4 py-3 text-sm font-semibold text-ink hover:text-brand-ink">{m?.title ?? "Meeting"}</Link>
              <ul className="p-2">
                {list.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-raised">
                    <button onClick={() => toggle(a)} aria-label={a.completed ? "Mark as not done" : "Mark as done"} aria-pressed={a.completed}
                      className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 ${a.completed ? "border-brand bg-brand text-white" : "border-faint hover:border-brand"}`}>
                      {a.completed && <Check size={12} strokeWidth={3} />}
                    </button>
                    <p className={`flex-1 text-sm ${a.completed ? "text-faint line-through" : "text-ink"}`}>{a.text}</p>
                    {a.assignee && <Avatar name={a.assignee.name} color={a.assignee.color} size="xs" />}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
