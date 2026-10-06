"""Minimal, optional Claude client. Every caller has a non-LLM fallback,
so the app works fully offline when ANTHROPIC_API_KEY is unset."""
from __future__ import annotations

import json
import logging
import re

import httpx

from ..config import settings

log = logging.getLogger(__name__)
API_URL = "https://api.anthropic.com/v1/messages"


def llm_enabled() -> bool:
    return bool(settings.anthropic_api_key)


def complete(system: str, prompt: str, max_tokens: int = 1500) -> str | None:
    """Return the model's text, or None on any failure (caller falls back)."""
    if not llm_enabled():
        return None
    try:
        resp = httpx.post(
            API_URL,
            headers={
                "x-api-key": settings.anthropic_api_key or "",
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": settings.llm_model,
                "max_tokens": max_tokens,
                "system": system,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=45,
        )
        resp.raise_for_status()
        blocks = resp.json().get("content", [])
        return "".join(b.get("text", "") for b in blocks if b.get("type") == "text").strip() or None
    except Exception as exc:  # network, auth, rate limit...
        log.warning("LLM call failed, using fallback: %s", exc)
        return None


def extract_json(text: str | None) -> dict | None:
    """Pull the first JSON object out of a model reply (tolerates ```json fences)."""
    if not text:
        return None
    match = re.search(r"\{.*\}", text, re.S)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
        return data if isinstance(data, dict) else None
    except json.JSONDecodeError:
        return None
