"use client";

import { ChevronDown, ChevronUp, Copy, LocateFixed, Search, X } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { useDebounce } from "@/hooks/useDebounce";
import { clock, escapeRegExp } from "@/lib/format";
import type { MeetingParticipant, Segment } from "@/lib/types";

interface LineProps {
  seg: Segment; color: string; active: boolean; showHeader: boolean;
  regex: RegExp | null; matchOffset: number; currentMatch: number; onSeek: (ms: number) => void;
}

/** One transcript utterance. Memoised: only the active line and lines with matches re-render while playing. */
const Line = memo(function Line({ seg, color, active, showHeader, regex, matchOffset, currentMatch, onSeek }: LineProps) {
  const parts = regex ? seg.text.split(regex) : [seg.text];
  let n = matchOffset;
  return (
    <div data-pos={seg.position}
      className={`group relative rounded-lg px-3 py-1.5 transition-colors ${active ? "bg-brand-soft" : "hover:bg-raised"} ${showHeader ? "mt-3" : ""}`}>
      {showHeader && (
        <div className="mb-1 flex items-center gap-2">
          <Avatar name={seg.speaker_name} color={color} size="xs" />
          <span className="text-[13px] font-semibold" style={{ color }}>{seg.speaker_name}</span>
        </div>
      )}
      <button onClick={() => onSeek(seg.start_ms)} className="flex w-full items-start gap-3 text-left" aria-label={`Play from ${clock(seg.start_ms)}`}>
        <span className={`mt-0.5 w-10 shrink-0 text-[11px] tabular-nums ${active ? "font-semibold text-brand-ink" : "text-faint group-hover:text-brand-ink"}`}>
          {clock(seg.start_ms)}
        </span>
        <span className={`text-[14px] leading-relaxed ${active ? "text-ink" : "text-ink/85"}`}>
          {parts.map((p, i) => {
            if (i % 2 === 0) return p;
            const idx = n++;
            return <mark key={i} data-match={idx} className={idx === currentMatch ? "current" : ""}>{p}</mark>;
          })}
        </span>
      </button>
    </div>
  );
});

export function TranscriptPanel({ segments, participants, activeIndex, onSeek, focusMs }: {
  segments: Segment[]; participants: MeetingParticipant[]; activeIndex: number;
  onSeek: (ms: number) => void; focusMs: number | null;
}) {
  const toast = useToast();
  const scroller = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const q = useDebounce(query.trim(), 120);
  const [current, setCurrent] = useState(0);
  const [speaker, setSpeaker] = useState<number | null>(null);
  const [follow, setFollow] = useState(true);

  const colorOf = useMemo(() => new Map(participants.map((p) => [p.id, p.color])), [participants]);
  const regex = useMemo(() => (q ? new RegExp(`(${escapeRegExp(q)})`, "gi") : null), [q]);

  const visible = useMemo(() => (speaker ? segments.filter((s) => s.speaker_id === speaker) : segments), [segments, speaker]);

  // Running match offsets so each <mark> gets a global index for prev/next navigation.
  const { offsets, totalMatches } = useMemo(() => {
    const offs: number[] = [];
    let total = 0;
    for (const s of visible) {
      offs.push(total);
      if (regex) total += (s.text.match(regex) || []).length;
    }
    return { offsets: offs, totalMatches: total };
  }, [visible, regex]);

  useEffect(() => setCurrent(0), [q, speaker]);

  // Scroll current search match into view
  useEffect(() => {
    if (!totalMatches) return;
    scroller.current?.querySelector(`[data-match="${current}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [current, totalMatches]);

  // Follow playback (player → transcript). Paused while the user is searching.
  const activePos = segments[activeIndex]?.position;
  useEffect(() => {
    if (!follow || q || activePos === undefined) return;
    const el = scroller.current?.querySelector<HTMLElement>(`[data-pos="${activePos}"]`);
    const box = scroller.current;
    if (!el || !box) return;
    const top = el.offsetTop; // scroller is position:relative, so this is relative to it
    if (top < box.scrollTop + 40 || top > box.scrollTop + box.clientHeight - 120) {
      box.scrollTo({ top: top - box.clientHeight / 3, behavior: "smooth" });
    }
  }, [activePos, follow, q]);

  // External "jump to this moment" requests (chapters, action items, Ask answers)
  useEffect(() => { if (focusMs !== null) setFollow(true); }, [focusMs]);

  const step = (d: number) => totalMatches && setCurrent((c) => (c + d + totalMatches) % totalMatches);

  const copyAll = async () => {
    const text = segments.map((s) => `[${clock(s.start_ms)}] ${s.speaker_name}: ${s.text}`).join("\n");
    try { await navigator.clipboard.writeText(text); toast("Transcript copied"); } catch { toast("Clipboard is blocked in this browser", "error"); }
  };

  const speakers = useMemo(
    () => participants.filter((p) => segments.some((s) => s.speaker_id === p.id)),
    [participants, segments],
  );

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label="Transcript">
      <div className="space-y-2.5 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search transcript"
              onKeyDown={(e) => { if (e.key === "Enter") step(e.shiftKey ? -1 : 1); if (e.key === "Escape") setQuery(""); }}
              className="input h-9 pl-9 pr-24" aria-label="Search transcript" />
            {q && (
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                <span className="mr-1 text-xs tabular-nums text-muted" aria-live="polite">{totalMatches ? `${current + 1}/${totalMatches}` : "0/0"}</span>
                <button className="btn-ghost h-6 w-6 px-0" onClick={() => step(-1)} aria-label="Previous match"><ChevronUp size={15} /></button>
                <button className="btn-ghost h-6 w-6 px-0" onClick={() => step(1)} aria-label="Next match"><ChevronDown size={15} /></button>
              </div>
            )}
          </div>
          <button onClick={() => setFollow((f) => !f)} aria-pressed={follow} title="Follow playback"
            className={`btn h-9 w-9 px-0 border ${follow ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-line text-muted hover:bg-raised"}`}>
            <LocateFixed size={16} />
          </button>
          <button onClick={copyAll} className="btn-outline h-9 w-9 px-0" title="Copy transcript" aria-label="Copy transcript"><Copy size={15} /></button>
        </div>
        {speakers.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5" role="group" aria-label="Filter by speaker">
            <button onClick={() => setSpeaker(null)} className={`chip shrink-0 ${speaker === null ? "bg-ink text-surface" : "hover:text-ink"}`}>All speakers</button>
            {speakers.map((p) => (
              <button key={p.id} onClick={() => setSpeaker(speaker === p.id ? null : p.id)} aria-pressed={speaker === p.id}
                className={`chip shrink-0 ${speaker === p.id ? "bg-ink text-surface" : "hover:text-ink"}`}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />{p.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto px-2 pb-6 pt-1" onWheel={() => follow && setFollow(false)}>
        {segments.length === 0 ? (
          <p className="px-3 py-12 text-center text-sm text-muted">This meeting has no transcript. Upload or paste one when creating a meeting.</p>
        ) : visible.length === 0 ? (
          <p className="px-3 py-12 text-center text-sm text-muted">No lines from this speaker.</p>
        ) : (
          visible.map((s, i) => (
            <Line key={s.id} seg={s} color={colorOf.get(s.speaker_id) ?? "#888"}
              active={s.position === activePos}
              showHeader={i === 0 || visible[i - 1]!.speaker_id !== s.speaker_id || !!speaker}
              regex={regex} matchOffset={offsets[i]!} currentMatch={regex ? current : -1} onSeek={onSeek} />
          ))
        )}
        {q && totalMatches === 0 && segments.length > 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted">No matches for “{q}”.</p>
        )}
      </div>
    </section>
  );
}
