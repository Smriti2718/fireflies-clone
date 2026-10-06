"use client";

import { ArrowLeft, Calendar, Clock, Download, FileText, MoreHorizontal, Pencil, Share2, Trash2, Video } from "lucide-react";
import Link from "next/link";
import { AvatarStack } from "@/components/ui/Avatar";
import { Menu } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { durationLabel, meetingDate, meetingTime } from "@/lib/format";
import type { MeetingDetail } from "@/lib/types";

export function MeetingHeader({ meeting, onEdit, onDelete }: { meeting: MeetingDetail; onEdit: () => void; onDelete: () => void }) {
  const toast = useToast();
  const download = (fmt: "md" | "txt" | "pdf", transcript = true) => {
    window.open(api.exportUrl(meeting.id, fmt, transcript), "_blank");
    toast(`Downloading ${fmt.toUpperCase()}${transcript ? "" : " (notes only)"}`, "info");
  };

  return (
    <div className="border-b border-line bg-surface px-4 py-4 md:px-6">
      <div className="flex flex-wrap items-start gap-3">
        <Link href="/meetings" className="btn-ghost -ml-2 h-8 w-8 shrink-0 px-0" aria-label="Back to meetings"><ArrowLeft size={18} /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-ink" title={meeting.title}>{meeting.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
            <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> {meetingDate(meeting.meeting_date)}, {meetingTime(meeting.meeting_date)}</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {durationLabel(meeting.duration_sec)}</span>
            {meeting.platform && <span className="inline-flex items-center gap-1.5"><Video size={14} /> {meeting.platform}</span>}
            <span className="inline-flex items-center gap-2">
              <AvatarStack people={meeting.participants} size="xs" max={5} />
              {meeting.participants.length} participant{meeting.participants.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="btn-outline hidden sm:inline-flex" onClick={() => toast("Sharing and team access are coming soon", "info")}><Share2 size={15} /> Share</button>
          <Menu label="Download" trigger={<span className="btn-outline"><Download size={15} /><span className="hidden sm:inline">Download</span></span>} items={[
            { label: "PDF", icon: <FileText size={15} />, onSelect: () => download("pdf"), hint: "notes + transcript" },
            { label: "Markdown", icon: <FileText size={15} />, onSelect: () => download("md"), hint: ".md" },
            { label: "Plain text", icon: <FileText size={15} />, onSelect: () => download("txt"), hint: ".txt" },
            { label: "Notes only (PDF)", icon: <FileText size={15} />, onSelect: () => download("pdf", false) },
          ]} />
          <Menu label="More actions" trigger={<span className="btn-outline w-9 px-0"><MoreHorizontal size={17} /></span>} items={[
            { label: "Edit details", icon: <Pencil size={15} />, onSelect: onEdit },
            { label: "Delete meeting", icon: <Trash2 size={15} />, onSelect: onDelete, danger: true },
          ]} />
        </div>
      </div>
    </div>
  );
}
