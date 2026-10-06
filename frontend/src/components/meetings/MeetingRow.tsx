"use client";

import { CheckSquare, Clock, Download, MoreHorizontal, Pencil, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { AvatarStack } from "@/components/ui/Avatar";
import { Menu } from "@/components/ui/Menu";
import { api } from "@/lib/api";
import { durationLabel, escapeRegExp, meetingDate, meetingTime } from "@/lib/format";
import type { MeetingListItem } from "@/lib/types";

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "ig"));
  return <>{parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : p))}</>;
}

export function MeetingRow({ m, query, onEdit, onDelete }: {
  m: MeetingListItem; query: string; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <li className="group relative flex items-start gap-4 border-b border-line px-5 py-4 last:border-b-0 hover:bg-raised/60">
      <div className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand sm:flex">
        <Video size={19} />
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/meetings/${m.id}`} className="block text-[15px] font-semibold text-ink after:absolute after:inset-0 hover:text-brand-ink">
          <Highlight text={m.title} q={query} />
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <span>{meetingDate(m.meeting_date)}, {meetingTime(m.meeting_date)}</span>
          <span className="inline-flex items-center gap-1"><Clock size={13} /> {durationLabel(m.duration_sec)}</span>
          {m.platform && <span className="hidden md:inline">{m.platform}</span>}
          {m.action_items_total > 0 && (
            <span className="inline-flex items-center gap-1"><CheckSquare size={13} /> {m.action_items_open} open of {m.action_items_total}</span>
          )}
        </div>
        {m.match_snippet ? (
          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted"><Highlight text={m.match_snippet} q={query} /></p>
        ) : m.overview_snippet ? (
          <p className="mt-2 line-clamp-1 text-[13px] text-muted">{m.overview_snippet}</p>
        ) : null}
        {m.keywords.length > 0 && (
          <div className="mt-2 hidden flex-wrap gap-1.5 md:flex">
            {m.keywords.map((k) => <span key={k} className="chip">{k}</span>)}
          </div>
        )}
      </div>
      <div className="relative z-10 flex shrink-0 items-center gap-3">
        <div className="hidden sm:block"><AvatarStack people={m.participants} /></div>
        <Menu label={`Actions for ${m.title}`}
          trigger={<span className="btn-ghost h-8 w-8 px-0"><MoreHorizontal size={18} /></span>}
          items={[
            { label: "Edit details", icon: <Pencil size={15} />, onSelect: onEdit },
            { label: "Download notes", icon: <Download size={15} />, onSelect: () => window.open(api.exportUrl(m.id, "pdf"), "_blank") },
            { label: "Delete meeting", icon: <Trash2 size={15} />, onSelect: onDelete, danger: true },
          ]} />
      </div>
    </li>
  );
}
