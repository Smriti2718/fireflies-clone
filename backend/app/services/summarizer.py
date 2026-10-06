"""Generate an overview, keywords, chapters and action items from a transcript.

Two strategies behind one function:
* ``llm``       — Claude, when ANTHROPIC_API_KEY is configured.
* ``heuristic`` — deterministic extractive summary (always available, used as fallback).
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field

from . import llm
from .text_utils import content_tokens, ms_to_clock, sentences, top_keywords


@dataclass
class Line:
    speaker: str
    start_ms: int
    text: str


@dataclass
class ChapterDraft:
    title: str
    start_ms: int
    summary: str


@dataclass
class ActionDraft:
    text: str
    assignee: str | None
    start_ms: int | None


@dataclass
class SummaryResult:
    overview: str
    keywords: list[str]
    chapters: list[ChapterDraft] = field(default_factory=list)
    action_items: list[ActionDraft] = field(default_factory=list)
    generated_by: str = "heuristic"


# --------------------------------------------------------------------------- heuristic

_ACTION_PATTERNS = re.compile(
    r"\b(i'll|i will|i'm going to|i can take|i'll take|we'll|we will|we need to|we should|"
    r"let's|need(?:s)? to|can you|could you|will you|please|action item|follow up|follow-up|"
    r"by (?:monday|tuesday|wednesday|thursday|friday|eod|end of (?:day|week)|tomorrow|next week))\b",
    re.I,
)
_FIRST_PERSON = re.compile(r"\b(i'll|i will|i'm going to|i can take|i'll take)\b", re.I)
_REQUEST = re.compile(r"\b(can|could|will) you\b", re.I)
_FILLER_PREFIX = re.compile(r"^((so|okay|ok|alright|and|yeah|yes|yep|great|cool|perfect|sure|agreed|good point|makes sense)[,.!]?\s+)+", re.I)


_META = re.compile(r"^(let's|we'll|i'll)\s+(start|begin|review|discuss|go (?:around|through|over)|walk through|talk about|"
                   r"move on|kick off|wrap up|get started|do (?:a|what))\b", re.I)
# "Ben, can you ask the venue..." -> "Ask the venue..."
_ADDRESSED_REQUEST = re.compile(r"^(?:[A-Z][a-z]+,\s*)?(?:can|could|will) you (?:please |also )?", re.I)


def _clean_action(sentence: str) -> str:
    s = _FILLER_PREFIX.sub("", sentence.strip())
    s = _ADDRESSED_REQUEST.sub("", s)
    s = re.sub(r"\s+", " ", s).rstrip(" .?!")
    return s[:1].upper() + s[1:] if s else s


def _addressed_name(sentence: str, names: list[str], speaker: str) -> str | None:
    lowered = sentence.lower()
    for name in names:
        first = name.split()[0].lower()
        if name != speaker and re.search(rf"\b{re.escape(first)}\b", lowered):
            return name
    return None


def _extract_actions(lines: list[Line], names: list[str], limit: int = 8) -> list[ActionDraft]:
    actions: list[ActionDraft] = []
    seen: set[str] = set()
    for i, line in enumerate(lines):
        # Whoever speaks next is the likeliest owner of an unaddressed request ("Can you also...?").
        responder = next((ln.speaker for ln in lines[i + 1 : i + 3] if ln.speaker != line.speaker), None)
        for sent in sentences(line.text):
            if len(sent.split()) < 5 or not _ACTION_PATTERNS.search(sent):
                continue
            if _META.search(_FILLER_PREFIX.sub("", sent)):
                continue  # running the meeting ("let's review the budget"), not a task
            if sent.endswith("?") and not _REQUEST.search(sent):
                continue  # genuine questions are rarely tasks
            if _REQUEST.search(sent):
                assignee = _addressed_name(sent, names, line.speaker) or responder
            elif _FIRST_PERSON.search(sent):
                assignee = line.speaker
            else:
                assignee = _addressed_name(sent, names, line.speaker) or line.speaker
            text = _clean_action(sent)
            key = " ".join(content_tokens(text))[:60]
            if key and key not in seen:
                seen.add(key)
                actions.append(ActionDraft(text, assignee, line.start_ms))
    # Prefer explicit commitments, keep chronological order.
    actions.sort(key=lambda a: (not bool(_FIRST_PERSON.search(a.text)), a.start_ms or 0))
    return sorted(actions[:limit], key=lambda a: a.start_ms or 0)


def _score_sentences(lines: list[Line]) -> list[tuple[float, int, str, Line]]:
    freq = Counter(t for line in lines for t in content_tokens(line.text))
    scored = []
    order = 0
    for i, line in enumerate(lines):
        # Whoever speaks next is the likeliest owner of an unaddressed request ("Can you also...?").
        responder = next((ln.speaker for ln in lines[i + 1 : i + 3] if ln.speaker != line.speaker), None)
        for sent in sentences(line.text):
            toks = content_tokens(sent)
            if len(toks) < 4:
                continue
            score = sum(freq[t] for t in toks) / (len(toks) ** 0.6)
            scored.append((score, order, sent, line))
            order += 1
    return scored


def _chapters(lines: list[Line], names: list[str]) -> list[ChapterDraft]:
    if not lines:
        return []
    n_chapters = max(1, min(5, len(lines) // 6))
    size = -(-len(lines) // n_chapters)  # ceil
    chapters: list[ChapterDraft] = []
    exclude = {p for n in names for p in n.lower().split()}
    for i in range(0, len(lines), size):
        chunk = lines[i : i + size]
        kws = top_keywords([ln.text for ln in chunk], k=2, exclude=exclude)
        title = " & ".join(kws) if kws else f"Discussion {len(chapters) + 1}"
        best = max(_score_sentences(chunk), default=None, key=lambda x: x[0])
        summary = f"{best[3].speaker}: {best[2]}" if best else chunk[0].text[:200]
        chapters.append(ChapterDraft(title, chunk[0].start_ms, summary))
    return chapters


def heuristic_summary(lines: list[Line], names: list[str]) -> SummaryResult:
    exclude = {p for n in names for p in n.lower().split()}
    keywords = top_keywords([ln.text for ln in lines], k=8, exclude=exclude)
    scored = _score_sentences(lines)
    best = sorted(sorted(scored, key=lambda x: -x[0])[:4], key=lambda x: x[1])

    speakers = list(dict.fromkeys(ln.speaker for ln in lines))
    who = ", ".join(speakers[:-1]) + f" and {speakers[-1]}" if len(speakers) > 1 else (speakers or ["The team"])[0]
    topics = ", ".join(k.lower() for k in keywords[:3])
    intro = f"{who} discussed {topics}." if topics else f"{who} met."
    body = " ".join(f"{s[3].speaker.split()[0]} noted: {s[2]}" for s in best)
    return SummaryResult(
        overview=f"{intro} {body}".strip(),
        keywords=keywords,
        chapters=_chapters(lines, names),
        action_items=_extract_actions(lines, names),
        generated_by="heuristic",
    )


# --------------------------------------------------------------------------- llm

_SYSTEM = (
    "You are a meeting assistant like Fireflies.ai. Read the transcript and return ONLY a JSON object: "
    '{"overview": str (3-5 sentences), "keywords": [str] (5-8 short topics), '
    '"chapters": [{"title": str, "start": "mm:ss", "summary": str}] (3-6, in order), '
    '"action_items": [{"text": str, "assignee": str|null, "start": "mm:ss"|null}]}. '
    "Assignees must be names of speakers in the transcript. Do not invent facts."
)


def _clock_to_ms(value) -> int | None:
    if value is None:
        return None
    parts = str(value).strip().split(":")
    try:
        nums = [int(float(p)) for p in parts]
    except ValueError:
        return None
    total = 0
    for n in nums:
        total = total * 60 + n
    return total * 1000


def llm_summary(lines: list[Line], names: list[str]) -> SummaryResult | None:
    transcript = "\n".join(f"[{ms_to_clock(ln.start_ms)}] {ln.speaker}: {ln.text}" for ln in lines)
    data = llm.extract_json(llm.complete(_SYSTEM, transcript[:150_000], max_tokens=2000))
    if not data or not data.get("overview"):
        return None
    valid = {n.lower(): n for n in names}
    actions = []
    for a in data.get("action_items") or []:
        if isinstance(a, dict) and a.get("text"):
            assignee = valid.get(str(a.get("assignee") or "").lower())
            actions.append(ActionDraft(str(a["text"]), assignee, _clock_to_ms(a.get("start"))))
    chapters = [
        ChapterDraft(str(c.get("title", "Topic")), _clock_to_ms(c.get("start")) or 0, str(c.get("summary", "")))
        for c in data.get("chapters") or []
        if isinstance(c, dict)
    ]
    return SummaryResult(
        overview=str(data["overview"]),
        keywords=[str(k) for k in (data.get("keywords") or [])][:8],
        chapters=chapters,
        action_items=actions,
        generated_by="llm",
    )


def summarize(lines: list[Line], names: list[str]) -> SummaryResult:
    if not lines:
        return SummaryResult(overview="No transcript available.", keywords=[])
    return llm_summary(lines, names) or heuristic_summary(lines, names)
