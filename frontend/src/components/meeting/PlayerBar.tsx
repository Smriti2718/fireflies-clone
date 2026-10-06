"use client";

import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { useMemo } from "react";
import type { Player } from "@/hooks/usePlayer";
import { clock } from "@/lib/format";
import type { Chapter, MeetingParticipant, Segment } from "@/lib/types";

const RATES = [0.75, 1, 1.25, 1.5, 2];

/** Bottom media bar: transport controls, seek bar with chapter ticks, and a per-speaker talk timeline. */
export function PlayerBar({ player, segments, participants, chapters }: {
  player: Player; segments: Segment[]; participants: MeetingParticipant[]; chapters: Chapter[];
}) {
  const { currentMs, durationMs, playing } = player;
  const pct = durationMs ? (currentMs / durationMs) * 100 : 0;
  const colorOf = useMemo(() => new Map(participants.map((p) => [p.id, p.color])), [participants]);
  const speakers = useMemo(() => {
    const ids = Array.from(new Set(segments.map((s) => s.speaker_id)));
    return ids.map((id) => participants.find((p) => p.id === id)).filter(Boolean) as MeetingParticipant[];
  }, [segments, participants]);

  const nextRate = () => player.setRate(RATES[(RATES.indexOf(player.rate) + 1) % RATES.length]!);

  return (
    <div className="border-t border-line bg-surface px-3 pb-3 pt-2 md:px-6">
      {/* Speaker timeline: where each person talked across the meeting */}
      <div className="mb-1.5 hidden gap-0.5 md:grid" aria-hidden>
        {speakers.slice(0, 4).map((sp) => (
          <div key={sp.id} className="flex items-center gap-2">
            <span className="w-24 truncate text-[11px] text-muted">{sp.name.split(" ")[0]}</span>
            <div className="relative h-1.5 flex-1 rounded-full bg-raised">
              {segments.filter((s) => s.speaker_id === sp.id).map((s) => (
                <span key={s.id} className="absolute top-0 h-full rounded-full"
                  style={{
                    left: `${(s.start_ms / durationMs) * 100}%`,
                    width: `${Math.max(0.4, ((s.end_ms - s.start_ms) / durationMs) * 100)}%`,
                    backgroundColor: colorOf.get(sp.id),
                    opacity: currentMs >= s.start_ms && currentMs < s.end_ms ? 1 : 0.55,
                  }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <button className="btn-ghost hidden h-9 w-9 px-0 sm:inline-flex" onClick={() => player.skip(-15000)} aria-label="Back 15 seconds"><RotateCcw size={17} /></button>
        <button onClick={player.toggle} aria-label={playing ? "Pause" : "Play"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-ink">
          {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
        </button>
        <button className="btn-ghost hidden h-9 w-9 px-0 sm:inline-flex" onClick={() => player.skip(15000)} aria-label="Forward 15 seconds"><RotateCw size={17} /></button>

        <span className="w-12 text-right text-xs tabular-nums text-muted">{clock(currentMs)}</span>
        <div className="relative flex-1">
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-raised">
            <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
          </div>
          {chapters.map((c) => (
            <span key={c.id} title={c.title} className="pointer-events-none absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded bg-ink/30"
              style={{ left: `${(c.start_ms / durationMs) * 100}%` }} />
          ))}
          <input type="range" className="seek relative w-full cursor-pointer" min={0} max={durationMs} step={250}
            value={currentMs} onChange={(e) => player.seek(Number(e.target.value))} aria-label="Seek"
            aria-valuetext={`${clock(currentMs)} of ${clock(durationMs)}`} />
        </div>
        <span className="w-12 text-xs tabular-nums text-muted">{clock(durationMs)}</span>
        <button onClick={nextRate} className="btn-outline h-8 w-14 px-0 text-xs tabular-nums" aria-label="Playback speed">{player.rate}x</button>
      </div>
      <p className="sr-only" aria-live="off">Audio is simulated in this demo; the clock drives the transcript.</p>
    </div>
  );
}
