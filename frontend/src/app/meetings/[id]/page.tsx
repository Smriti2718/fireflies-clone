"use client";

import { BarChart3, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AskPanel } from "@/components/meeting/AskPanel";
import { MeetingHeader } from "@/components/meeting/MeetingHeader";
import { PlayerBar } from "@/components/meeting/PlayerBar";
import { SpeakersPanel } from "@/components/meeting/SpeakersPanel";
import { SummaryPanel } from "@/components/meeting/SummaryPanel";
import { TranscriptPanel } from "@/components/meeting/TranscriptPanel";
import { EditMeetingModal } from "@/components/meetings/EditMeetingModal";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { activeSegmentIndex, usePlayer } from "@/hooks/usePlayer";
import { api, ApiError } from "@/lib/api";
import type { MeetingDetail } from "@/lib/types";

type Tab = "summary" | "ask" | "speakers";
const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "ask", label: "Ask Fred", icon: Sparkles },
  { id: "speakers", label: "Speakers", icon: BarChart3 },
];

function Detail({ meeting, setMeeting }: { meeting: MeetingDetail; setMeeting: (m: MeetingDetail) => void }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("summary");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [focusMs, setFocusMs] = useState<number | null>(null);
  const [mobilePane, setMobilePane] = useState<"notes" | "transcript">("notes");

  const durationMs = Math.max(meeting.duration_sec * 1000, meeting.segments.at(-1)?.end_ms ?? 0, 1000);
  const player = usePlayer(durationMs);
  const starts = useMemo(() => meeting.segments.map((s) => s.start_ms), [meeting.segments]);
  const activeIndex = activeSegmentIndex(starts, player.currentMs);

  const activeChapterId = useMemo(() => {
    let id: number | null = null;
    for (const c of meeting.chapters) if (c.start_ms <= player.currentMs) id = c.id;
    return id;
  }, [meeting.chapters, player.currentMs]);

  /** Every "jump to moment" (transcript line, chapter, action item, Ask citation) goes through here. */
  const { seek, toggle, skip } = player;
  const seekTo = useCallback((ms: number) => {
    seek(ms);
    setFocusMs(ms);
    setMobilePane("transcript");
  }, [seek]);

  // Keyboard: space = play/pause, ←/→ = 5s, when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea,select,[contenteditable],button,[role=dialog]")) return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.key === "ArrowLeft") skip(-5000);
      if (e.key === "ArrowRight") skip(5000);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, skip]);

  const confirmDelete = async () => {
    setBusyDelete(true);
    try {
      await api.deleteMeeting(meeting.id);
      toast(`Deleted “${meeting.title}”`);
      router.push("/meetings");
    } catch (e) {
      toast((e as Error).message, "error");
      setBusyDelete(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <MeetingHeader meeting={meeting} onEdit={() => setEditing(true)} onDelete={() => setDeleting(true)} />

      {/* Mobile pane switcher */}
      <div className="flex border-b border-line bg-surface lg:hidden">
        {(["notes", "transcript"] as const).map((p) => (
          <button key={p} onClick={() => setMobilePane(p)}
            className={`flex-1 py-2.5 text-sm font-medium capitalize ${mobilePane === p ? "border-b-2 border-brand text-brand-ink" : "text-muted"}`}>{p}</button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(340px,1fr)_minmax(0,1.15fr)]">
        <aside className={`min-h-0 flex-col border-line bg-surface lg:flex lg:border-r ${mobilePane === "notes" ? "flex" : "hidden"}`}>
          <div className="flex gap-1 border-b border-line px-3 pt-2" role="tablist">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium ${tab === id ? "border-brand text-brand-ink" : "border-transparent text-muted hover:text-ink"}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          <div className={`min-h-0 flex-1 ${tab === "ask" ? "" : "overflow-y-auto"}`} role="tabpanel">
            {tab === "summary" && <SummaryPanel meeting={meeting} onMeeting={setMeeting} onSeek={seekTo} activeChapterId={activeChapterId} />}
            {tab === "ask" && <AskPanel meetingId={meeting.id} onSeek={seekTo} />}
            {tab === "speakers" && <SpeakersPanel meeting={meeting} />}
          </div>
        </aside>

        <div className={`min-h-0 flex-col bg-surface lg:flex ${mobilePane === "transcript" ? "flex" : "hidden"}`}>
          <TranscriptPanel segments={meeting.segments} participants={meeting.participants}
            activeIndex={activeIndex} onSeek={seekTo} focusMs={focusMs} />
        </div>
      </div>

      <PlayerBar player={player} segments={meeting.segments} participants={meeting.participants} chapters={meeting.chapters} />

      <EditMeetingModal open={editing} meeting={meeting} onClose={() => setEditing(false)} onSaved={setMeeting} />
      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} onConfirm={confirmDelete} busy={busyDelete}
        title="Delete this meeting?" confirmLabel="Delete meeting"
        message={`“${meeting.title}” and its transcript, notes and action items will be permanently removed.`} />
    </div>
  );
}

export default function MeetingPage() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  useEffect(() => {
    setMeeting(null); setError(null);
    api.getMeeting(Number(id))
      .then((m) => { setMeeting(m); document.title = `${m.title} · Fireflies`; })
      .catch((e: ApiError) => setError({ status: e.status, message: e.message }));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-lg font-semibold text-ink">{error.status === 404 ? "This meeting doesn't exist" : "Meeting couldn't load"}</h1>
        <p className="mt-1 text-sm text-muted">{error.status === 404 ? "It may have been deleted." : error.message}</p>
        <Link href="/meetings" className="btn-primary mt-5">Back to meetings</Link>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-line bg-surface px-6 py-5"><div className="h-6 w-72 animate-pulse rounded bg-raised" /><div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-raised" /></div>
        <div className="grid flex-1 gap-px lg:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="space-y-3 bg-surface p-6">{[80, 95, 70, 90].map((w, j) => <div key={j} className="h-4 animate-pulse rounded bg-raised" style={{ width: `${w}%` }} />)}</div>)}
        </div>
      </div>
    );
  }

  return <Detail meeting={meeting} setMeeting={setMeeting} />;
}
