import { Avatar } from "@/components/ui/Avatar";
import { durationLabel } from "@/lib/format";
import type { MeetingDetail } from "@/lib/types";

/** Talk-time breakdown per participant (Fireflies "Speaker analytics"). */
export function SpeakersPanel({ meeting }: { meeting: MeetingDetail }) {
  const total = meeting.participants.reduce((s, p) => s + p.talk_time_sec, 0) || 1;
  const sorted = [...meeting.participants].sort((a, b) => b.talk_time_sec - a.talk_time_sec);
  const words = new Map<number, number>();
  meeting.segments.forEach((s) => words.set(s.speaker_id, (words.get(s.speaker_id) ?? 0) + s.text.split(/\s+/).length));

  return (
    <div className="px-5 py-5">
      <h3 className="mb-1 text-[15px] font-semibold text-ink">Talk time</h3>
      <p className="mb-4 text-sm text-muted">Share of speaking time across {durationLabel(meeting.duration_sec)}.</p>
      {/* stacked bar */}
      <div className="mb-5 flex h-2.5 overflow-hidden rounded-full bg-raised" aria-hidden>
        {sorted.map((p) => <span key={p.id} style={{ width: `${(p.talk_time_sec / total) * 100}%`, backgroundColor: p.color }} />)}
      </div>
      <ul className="space-y-3.5">
        {sorted.map((p) => {
          const pct = Math.round((p.talk_time_sec / total) * 100);
          const w = words.get(p.id) ?? 0;
          const wpm = p.talk_time_sec ? Math.round(w / (p.talk_time_sec / 60)) : 0;
          return (
            <li key={p.id} className="flex items-center gap-3">
              <Avatar name={p.name} color={p.color} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{p.name}{p.role === "host" && <span className="ml-1.5 text-xs font-normal text-muted">Host</span>}</span>
                  <span className="text-sm tabular-nums text-ink">{pct}%</span>
                </div>
                <div className="mt-1 flex justify-between text-xs text-muted">
                  <span>{p.talk_time_sec ? durationLabel(p.talk_time_sec) : "Didn't speak"}</span>
                  {wpm > 0 && <span>{wpm} words/min</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
