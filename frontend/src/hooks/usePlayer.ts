"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Player {
  currentMs: number;
  durationMs: number;
  playing: boolean;
  rate: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (ms: number) => void;
  skip: (deltaMs: number) => void;
  setRate: (r: number) => void;
}

/**
 * Playback clock for the meeting.
 * Real audio is out of scope, so time advances on requestAnimationFrame at the chosen rate —
 * every consumer (seek bar, transcript highlight, chapters) reads this one clock, so swapping in
 * an <audio> element later only means driving `currentMs` from its `timeupdate` event.
 */
export function usePlayer(durationMs: number): Player {
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const pos = useRef(0);
  const last = useRef<number | null>(null);
  const raf = useRef<number | null>(null);

  const clamp = useCallback((ms: number) => Math.min(Math.max(0, ms), durationMs), [durationMs]);

  useEffect(() => {
    if (!playing) return;
    const tick = (t: number) => {
      if (last.current !== null) {
        pos.current = clamp(pos.current + (t - last.current) * rate);
        setCurrentMs(pos.current);
        if (pos.current >= durationMs) { setPlaying(false); return; }
      }
      last.current = t;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); last.current = null; };
  }, [playing, rate, durationMs, clamp]);

  const seek = useCallback((ms: number) => { pos.current = clamp(ms); setCurrentMs(pos.current); }, [clamp]);
  const skip = useCallback((d: number) => seek(pos.current + d), [seek]);
  const play = useCallback(() => {
    if (pos.current >= durationMs) seek(0);
    setPlaying(true);
  }, [durationMs, seek]);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, play, pause]);

  return { currentMs, durationMs, playing, rate, play, pause, toggle, seek, skip, setRate };
}

/** Index of the segment playing at `ms` (last segment that started at or before it). Binary search. */
export function activeSegmentIndex(starts: number[], ms: number): number {
  let lo = 0, hi = starts.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid]! <= ms) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}
