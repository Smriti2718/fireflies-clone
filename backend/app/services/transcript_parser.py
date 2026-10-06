"""Parse uploaded / pasted transcripts into timed, speaker-labelled segments.

Supported inputs
----------------
* WebVTT (.vtt) — cues with ``<v Speaker>text`` voice tags or ``Speaker: text``.
* JSON (.json)  — ``[{speaker, start, end, text}]`` (seconds) or ``start_ms``/``end_ms``,
                  optionally wrapped as ``{"segments": [...]}``.
* Plain text    — any of
    ``[00:01:23] Speaker: text`` / ``00:01:23 Speaker: text``
    ``Speaker (00:01:23): text``
    ``Speaker  00:01`` on its own line followed by text lines (Fireflies/Otter export style)
    ``Speaker: text`` (no timestamps — times are estimated from word count)
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass

WORDS_PER_SECOND = 2.5  # ~150 wpm conversational speech
MIN_SEGMENT_MS = 1500


class TranscriptParseError(ValueError):
    pass


@dataclass
class ParsedSegment:
    speaker: str
    start_ms: int | None
    end_ms: int | None
    text: str


_TS = r"(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?"
_SPEAKER = r"[A-Za-z][\w .'\-]{0,39}?"

# [00:01:23] Speaker: text     |  00:01:23 - Speaker: text
_RE_TS_SPEAKER = re.compile(rf"^\[?(?P<ts>{_TS})\]?\s*[-–—]?\s*(?P<spk>{_SPEAKER})\s*:\s*(?P<text>.+)$")
# Speaker (00:01:23): text    |  Speaker [00:01]: text
_RE_SPEAKER_TS = re.compile(rf"^(?P<spk>{_SPEAKER})\s*[\(\[](?P<ts>{_TS})[\)\]]\s*:?\s*(?P<text>.*)$")
# Speaker   00:01:23      (header line, text follows on next lines)
_RE_HEADER = re.compile(rf"^(?P<spk>{_SPEAKER})\s{{1,}}(?P<ts>{_TS})\s*$")
# Speaker: text
_RE_SPEAKER = re.compile(rf"^(?P<spk>{_SPEAKER})\s*:\s*(?P<text>.+)$")
_RE_VTT_CUE = re.compile(rf"(?P<start>{_TS})\s*-->\s*(?P<end>{_TS})")
_RE_VTT_VOICE = re.compile(r"<v(?:\.[^ >]+)?\s+(?P<spk>[^>]+)>(?P<text>.*?)(?:</v>|$)", re.S)
_RE_TAGS = re.compile(r"<[^>]+>")


def parse_timestamp(value: str) -> int:
    """'01:02:03.5' / '02:03' / '2:03,250' -> milliseconds."""
    value = value.strip().replace(",", ".")
    main, _, frac = value.partition(".")
    parts = [int(p) for p in main.split(":")]
    while len(parts) < 3:
        parts.insert(0, 0)
    h, m, s = parts
    ms = int((frac + "000")[:3]) if frac else 0
    return ((h * 60 + m) * 60 + s) * 1000 + ms


def _plausible_speaker(name: str) -> bool:
    name = name.strip()
    return 0 < len(name) <= 40 and len(name.split()) <= 4 and not name.lower().startswith("http")


def _estimate_ms(text: str) -> int:
    return max(MIN_SEGMENT_MS, int(len(text.split()) / WORDS_PER_SECOND * 1000))


def _fill_times(segments: list[ParsedSegment]) -> list[ParsedSegment]:
    """Give every segment a start and end, estimating where the source had none."""
    cursor = 0
    for i, seg in enumerate(segments):
        if seg.start_ms is None:
            seg.start_ms = cursor
        if seg.end_ms is None or seg.end_ms <= seg.start_ms:
            nxt = segments[i + 1].start_ms if i + 1 < len(segments) else None
            estimate = seg.start_ms + _estimate_ms(seg.text)
            seg.end_ms = nxt if (nxt is not None and nxt > seg.start_ms) else estimate
        cursor = seg.end_ms + 400  # small pause between speakers
    return segments


def _parse_vtt(content: str) -> list[ParsedSegment]:
    segments: list[ParsedSegment] = []
    blocks = re.split(r"\n\s*\n", content.replace("\r\n", "\n"))
    last_speaker = "Speaker 1"
    for block in blocks:
        lines = [ln for ln in block.strip().split("\n") if ln.strip()]
        cue_idx = next((i for i, ln in enumerate(lines) if _RE_VTT_CUE.search(ln)), None)
        if cue_idx is None:
            continue
        m = _RE_VTT_CUE.search(lines[cue_idx])
        raw = "\n".join(lines[cue_idx + 1 :]).strip()
        if not raw:
            continue
        speaker = last_speaker
        voice = _RE_VTT_VOICE.search(raw)
        if voice:
            speaker, raw = voice.group("spk").strip(), voice.group("text")
        else:
            sm = _RE_SPEAKER.match(raw)
            if sm and _plausible_speaker(sm.group("spk")):
                speaker, raw = sm.group("spk").strip(), sm.group("text")
        text = " ".join(_RE_TAGS.sub("", raw).split())
        if not text:
            continue
        last_speaker = speaker
        segments.append(
            ParsedSegment(speaker, parse_timestamp(m.group("start")), parse_timestamp(m.group("end")), text)
        )
    return segments


def _time_ms(item: dict, kind: str) -> int | None:
    """Read 'start'/'end' from a JSON item: *_ms keys are milliseconds, others seconds or 'hh:mm:ss'."""
    for key in (f"{kind}_ms", f"{kind}_time_ms"):
        if item.get(key) is not None:
            return int(item[key])
    for key in (kind, f"{kind}_time"):
        val = item.get(key)
        if val is None:
            continue
        if isinstance(val, str) and ":" in val:
            return parse_timestamp(val)
        return int(float(val) * 1000)
    return None


def _parse_json(content: str) -> list[ParsedSegment]:
    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise TranscriptParseError(f"Invalid JSON: {exc.msg}") from exc
    if isinstance(data, dict):
        data = data.get("segments") or data.get("transcript") or data.get("sentences") or []
    if not isinstance(data, list):
        raise TranscriptParseError("JSON transcript must be a list of segments")
    segments = []
    for item in data:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or item.get("sentence") or "").strip()
        if not text:
            continue
        speaker = str(item.get("speaker") or item.get("speaker_name") or "Speaker 1").strip()
        segments.append(ParsedSegment(speaker, _time_ms(item, "start"), _time_ms(item, "end"), text))
    return segments


def _parse_text(content: str) -> list[ParsedSegment]:
    segments: list[ParsedSegment] = []
    pending_header: ParsedSegment | None = None

    for raw_line in content.replace("\r\n", "\n").split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        for pattern in (_RE_TS_SPEAKER, _RE_SPEAKER_TS):
            m = pattern.match(line)
            if m and _plausible_speaker(m.group("spk")):
                pending_header = None
                seg = ParsedSegment(m.group("spk").strip(), parse_timestamp(m.group("ts")), None,
                                    m.group("text").strip())
                if not seg.text:  # "Speaker (00:12):" with text on following lines
                    pending_header = seg
                segments.append(seg)
                break
        else:
            m = _RE_HEADER.match(line)
            if m and _plausible_speaker(m.group("spk")):
                pending_header = ParsedSegment(m.group("spk").strip(), parse_timestamp(m.group("ts")), None, "")
                segments.append(pending_header)
                continue
            m = _RE_SPEAKER.match(line)
            if m and _plausible_speaker(m.group("spk")) and pending_header is None:
                segments.append(ParsedSegment(m.group("spk").strip(), None, None, m.group("text").strip()))
                continue
            # Continuation line: attach to the previous segment.
            if segments:
                prev = segments[-1]
                prev.text = f"{prev.text} {line}".strip()
            else:
                segments.append(ParsedSegment("Speaker 1", None, None, line))

    return [s for s in segments if s.text]


def detect_format(content: str, filename: str | None = None) -> str:
    if filename:
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext in {"vtt", "json", "txt"}:
            return ext
        if ext == "srt":
            return "vtt"
    head = content.lstrip()[:20]
    if head.upper().startswith("WEBVTT") or _RE_VTT_CUE.search(content[:500]):
        return "vtt"
    if head.startswith(("[{", "{")) or (head.startswith("[") and head[1:2] in {"\n", " ", "{"}):
        return "json"
    return "txt"


def parse_transcript(content: str, fmt: str = "auto", filename: str | None = None) -> list[ParsedSegment]:
    content = content.lstrip("﻿")
    if not content.strip():
        raise TranscriptParseError("Transcript is empty")
    if fmt == "auto":
        fmt = detect_format(content, filename)
    parser = {"vtt": _parse_vtt, "json": _parse_json, "txt": _parse_text}.get(fmt)
    if parser is None:
        raise TranscriptParseError(f"Unsupported format: {fmt}")
    segments = parser(content)
    if not segments:
        raise TranscriptParseError("No transcript lines could be parsed")
    # Only reorder when every segment carries a real timestamp; otherwise keep file order.
    if all(s.start_ms is not None for s in segments):
        segments.sort(key=lambda s: s.start_ms)
    return _fill_times(segments)
