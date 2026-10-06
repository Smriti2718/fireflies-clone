"""'Ask about this meeting' — answers questions grounded in one transcript.

LLM path when configured; otherwise intent rules + keyword retrieval that quote the
most relevant transcript lines with timestamps (returned as citations the UI can seek to).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from .. import models
from . import llm
from .text_utils import content_tokens, ms_to_clock


@dataclass
class Answer:
    text: str
    citations: list[int] = field(default_factory=list)  # start_ms of cited segments


def _retrieve(meeting: models.Meeting, question: str, k: int = 3) -> list[models.TranscriptSegment]:
    q = set(content_tokens(question))
    if not q:
        return []
    scored = []
    for seg in meeting.segments:
        toks = content_tokens(seg.text)
        overlap = sum(1 for t in toks if t in q) + sum(
            0.5 for t in toks for w in q if t != w and (t.startswith(w[:5]) and len(w) >= 5)
        )
        if overlap:
            scored.append((overlap / (len(toks) ** 0.3 or 1), seg))
    scored.sort(key=lambda x: -x[0])
    return sorted([s for _, s in scored[:k]], key=lambda s: s.start_ms)


def _rule_answer(meeting: models.Meeting, question: str) -> Answer:
    q = question.lower()
    names = [link.participant.name for link in meeting.participant_links]

    if re.search(r"action items?|tasks?|to-?dos?|next steps|follow[- ]?ups?|who (?:is|will) (?:do|own)", q):
        items = meeting.action_items
        if not items:
            return Answer("No action items were captured for this meeting.")
        lines = [
            f"- {'[x]' if a.completed else '[ ]'} {a.text}"
            + (f" — **{a.assignee.name}**" if a.assignee else "")
            for a in items
        ]
        return Answer("Here are the action items:\n" + "\n".join(lines))

    if re.search(r"\b(summary|summari[sz]e|tl;?dr|recap|overview|what (?:was|is) (?:this|the meeting) about)\b", q):
        overview = meeting.summary.overview if meeting.summary else "No summary yet."
        return Answer(overview)

    if re.search(r"\bwho\b.*\b(attend\w*|join\w*|there|present|in the meeting|on the call)\b|\bparticipants?\b|\battendees?\b", q):
        return Answer(f"{len(names)} participants: " + ", ".join(names) + ".")

    if re.search(r"\b(topics?|chapters?|outline|agenda)\b", q):
        if meeting.chapters:
            return Answer(
                "Topics covered:\n" + "\n".join(f"- {c.title} ({ms_to_clock(c.start_ms)})" for c in meeting.chapters),
                [c.start_ms for c in meeting.chapters],
            )

    hits = _retrieve(meeting, question)
    if not hits:
        return Answer("I couldn't find anything in the transcript about that. Try rephrasing with words "
                      "that might have been said in the meeting.")
    quoted = "\n".join(f"- **{s.speaker.name}** ({ms_to_clock(s.start_ms)}): \"{s.text}\"" for s in hits)
    return Answer(f"Here's what was said that relates to your question:\n{quoted}", [s.start_ms for s in hits])


_SYSTEM = (
    "You answer questions about a single meeting using ONLY its transcript. Be concise (under 120 words). "
    "Cite moments as [mm:ss]. If the transcript does not contain the answer, say so."
)
_CITE = re.compile(r"\[(\d{1,2}:\d{2}(?::\d{2})?)\]")


def answer_question(meeting: models.Meeting, question: str) -> Answer:
    transcript = "\n".join(f"[{ms_to_clock(s.start_ms)}] {s.speaker.name}: {s.text}" for s in meeting.segments)
    reply = llm.complete(_SYSTEM, f"Transcript:\n{transcript[:150_000]}\n\nQuestion: {question}", 600)
    if reply:
        cites = []
        for m in _CITE.finditer(reply):
            total = 0
            for part in m.group(1).split(":"):
                total = total * 60 + int(part)
            cites.append(total * 1000)
        return Answer(reply, cites)
    return _rule_answer(meeting, question)
