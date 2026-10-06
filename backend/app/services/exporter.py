"""Export a meeting's notes + transcript as Markdown, plain text or PDF."""
from __future__ import annotations

from fpdf import FPDF

from .. import models
from .text_utils import ms_to_clock


def _header(m: models.Meeting) -> tuple[str, str, str]:
    date = m.meeting_date.strftime("%a, %b %d, %Y %I:%M %p")
    duration = f"{round(m.duration_sec / 60)} min"
    people = ", ".join(link.participant.name for link in m.participant_links)
    return date, duration, people


def to_markdown(m: models.Meeting, include_transcript: bool = True) -> str:
    date, duration, people = _header(m)
    out = [f"# {m.title}", "", f"**Date:** {date}  ", f"**Duration:** {duration}  ", f"**Participants:** {people}", ""]
    if m.summary:
        if m.summary.keywords:
            out += ["## Keywords", ", ".join(m.summary.keywords), ""]
        out += ["## Overview", m.summary.overview, ""]
    if m.chapters:
        out += ["## Outline"] + [f"- **{c.title}** ({ms_to_clock(c.start_ms)}) — {c.summary}" for c in m.chapters] + [""]
    if m.action_items:
        out += ["## Action Items"]
        for a in m.action_items:
            who = f" — *{a.assignee.name}*" if a.assignee else ""
            due = f" (due {a.due_date.isoformat()})" if a.due_date else ""
            out.append(f"- [{'x' if a.completed else ' '}] {a.text}{who}{due}")
        out.append("")
    if include_transcript:
        out += ["## Transcript", ""]
        out += [f"**{s.speaker.name}** `{ms_to_clock(s.start_ms)}`  \n{s.text}\n" for s in m.segments]
    return "\n".join(out).rstrip() + "\n"


def to_text(m: models.Meeting, include_transcript: bool = True) -> str:
    date, duration, people = _header(m)
    out = [m.title.upper(), "=" * len(m.title), f"Date: {date}", f"Duration: {duration}", f"Participants: {people}", ""]
    if m.summary:
        if m.summary.keywords:
            out += ["KEYWORDS", ", ".join(m.summary.keywords), ""]
        out += ["OVERVIEW", m.summary.overview, ""]
    if m.chapters:
        out += ["OUTLINE"] + [f"  [{ms_to_clock(c.start_ms)}] {c.title} - {c.summary}" for c in m.chapters] + [""]
    if m.action_items:
        out += ["ACTION ITEMS"]
        for a in m.action_items:
            who = f" ({a.assignee.name})" if a.assignee else ""
            out.append(f"  [{'x' if a.completed else ' '}] {a.text}{who}")
        out.append("")
    if include_transcript:
        out += ["TRANSCRIPT", ""] + [f"[{ms_to_clock(s.start_ms)}] {s.speaker.name}: {s.text}" for s in m.segments]
    return "\n".join(out).rstrip() + "\n"


def _latin1(text: str) -> str:
    """Core PDF fonts are Latin-1 only; map common Unicode punctuation and drop the rest."""
    table = {"—": "-", "–": "-", "‘": "'", "’": "'", "“": '"', "”": '"',
             "…": "...", "•": "-", " ": " "}
    for k, v in table.items():
        text = text.replace(k, v)
    return text.encode("latin-1", "replace").decode("latin-1")


class _PDF(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 8, f"Fireflies Clone  |  Page {self.page_no()}", align="C")


def to_pdf(m: models.Meeting, include_transcript: bool = True) -> bytes:
    date, duration, people = _header(m)
    pdf = _PDF()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()
    w = pdf.epw

    def heading(text: str):
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(108, 59, 245)
        pdf.cell(w, 8, _latin1(text), new_x="LMARGIN", new_y="NEXT")
        pdf.set_text_color(30, 30, 30)

    def body(text: str, style: str = "", size: int = 10):
        pdf.set_font("Helvetica", style, size)
        pdf.multi_cell(w, 5.5, _latin1(text), new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "B", 18)
    pdf.multi_cell(w, 9, _latin1(m.title), new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(110, 110, 110)
    body(f"{date}  |  {duration}  |  {people}", size=9)
    pdf.set_text_color(30, 30, 30)

    if m.summary:
        if m.summary.keywords:
            heading("Keywords")
            body(", ".join(m.summary.keywords))
        heading("Overview")
        body(m.summary.overview)
    if m.chapters:
        heading("Outline")
        for c in m.chapters:
            body(f"{ms_to_clock(c.start_ms)}  {c.title}", "B")
            body(c.summary)
    if m.action_items:
        heading("Action Items")
        for a in m.action_items:
            who = f"  ({a.assignee.name})" if a.assignee else ""
            body(f"[{'x' if a.completed else ' '}] {a.text}{who}")
    if include_transcript:
        heading("Transcript")
        for s in m.segments:
            pdf.set_font("Helvetica", "B", 9)
            pdf.cell(w, 5, _latin1(f"{s.speaker.name}   {ms_to_clock(s.start_ms)}"), new_x="LMARGIN", new_y="NEXT")
            body(s.text, size=9)
            pdf.ln(1)
    return bytes(pdf.output())
