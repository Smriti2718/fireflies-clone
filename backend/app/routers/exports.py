"""Download a meeting as Markdown / TXT / PDF."""
import re
from typing import Literal

from fastapi import APIRouter, Depends, Response

from .. import models
from ..deps import meeting_or_404
from ..services import exporter

router = APIRouter(prefix="/api/meetings", tags=["export"])

MEDIA = {"md": "text/markdown; charset=utf-8", "txt": "text/plain; charset=utf-8", "pdf": "application/pdf"}


@router.get("/{meeting_id}/export")
def export_meeting(fmt: Literal["md", "txt", "pdf"] = "md", transcript: bool = True,
                   meeting: models.Meeting = Depends(meeting_or_404)):
    if fmt == "pdf":
        body: bytes | str = exporter.to_pdf(meeting, transcript)
    elif fmt == "txt":
        body = exporter.to_text(meeting, transcript)
    else:
        body = exporter.to_markdown(meeting, transcript)
    slug = re.sub(r"[^a-z0-9]+", "-", meeting.title.lower()).strip("-")[:60] or "meeting"
    return Response(
        content=body,
        media_type=MEDIA[fmt],
        headers={"Content-Disposition": f'attachment; filename="{slug}.{fmt}"'},
    )
