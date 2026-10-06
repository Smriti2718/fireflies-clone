import os
import tempfile

# Isolated DB per test run; must be set before the app is imported.
_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"
os.environ.pop("ANTHROPIC_API_KEY", None)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.services.transcript_parser import parse_timestamp, parse_transcript  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------- parser
def test_parse_timestamp():
    assert parse_timestamp("01:02") == 62_000
    assert parse_timestamp("1:02:03.5") == 3_723_500
    assert parse_timestamp("00:00:01,250") == 1_250


def test_parse_txt_with_timestamps():
    segs = parse_transcript("[00:00:05] Ana: Hello there\n[00:00:09] Ben: Hi Ana\ncontinued line")
    assert [s.speaker for s in segs] == ["Ana", "Ben"]
    assert segs[0].start_ms == 5000 and segs[0].end_ms == 9000
    assert segs[1].text == "Hi Ana continued line"


def test_parse_header_style():
    segs = parse_transcript("Ana Lopez  00:12\nFirst point.\nSecond line.\n\nBen  00:30\nReply.")
    assert segs[0].speaker == "Ana Lopez" and segs[0].text == "First point. Second line."
    assert segs[1].start_ms == 30_000


def test_parse_vtt():
    vtt = "WEBVTT\n\n1\n00:00:01.000 --> 00:00:04.000\n<v Ana>Hello</v>\n\n00:00:05.000 --> 00:00:07.000\nBen: Hey"
    segs = parse_transcript(vtt)
    assert [(s.speaker, s.start_ms, s.text) for s in segs] == [("Ana", 1000, "Hello"), ("Ben", 5000, "Hey")]


def test_parse_json_and_estimated_times():
    segs = parse_transcript('[{"speaker":"A","start":1.5,"end":3,"text":"x"},{"speaker":"B","text":"y z"}]')
    assert segs[0].start_ms == 1500 and segs[1].start_ms > segs[0].end_ms
    plain = parse_transcript("A: one two three\nB: four five")
    assert plain[0].start_ms == 0 and plain[1].start_ms > 0


# ---------------------------------------------------------------- api
def test_seeded_library(client):
    body = client.get("/api/meetings").json()
    assert body["total"] >= 6
    dates = [m["meeting_date"] for m in body["items"]]
    assert dates == sorted(dates, reverse=True)


def test_filters(client):
    assert client.get("/api/meetings", params={"q": "certificate"}).json()["total"] == 1
    r = client.get("/api/meetings", params={"participant": ["Maya Rodriguez", "Ethan Walker"]}).json()
    assert [m["title"] for m in r["items"]] == ["Design Review: Onboarding Flow v2"]


def test_meeting_crud_and_action_items(client):
    transcript = (
        "[00:00:02] Ana Lopez: Let's review the budget for the offsite.\n"
        "[00:00:08] Ben Ortiz: I'll send the venue quotes by Friday.\n"
        "[00:00:15] Ana Lopez: Ben, can you also book the catering for forty people?\n"
    )
    r = client.post("/api/meetings", json={"title": "Offsite planning", "transcript_text": transcript})
    assert r.status_code == 201
    m = r.json()
    assert len(m["segments"]) == 3 and m["summary"]["generated_by"] == "heuristic"
    assert {p["name"] for p in m["participants"]} == {"Ana Lopez", "Ben Ortiz"}
    assert any(a["assignee"] and a["assignee"]["name"] == "Ben Ortiz" for a in m["action_items"])

    mid = m["id"]
    r = client.patch(f"/api/meetings/{mid}", json={"title": "Offsite v2", "participants": ["Ana Lopez", "Cara"]})
    assert r.json()["title"] == "Offsite v2"
    assert [p["name"] for p in r.json()["participants"]] == ["Ana Lopez", "Cara"]

    item = client.post(f"/api/meetings/{mid}/action-items", json={"text": "Book flights", "assignee_name": "Cara"}).json()
    done = client.patch(f"/api/action-items/{item['id']}", json={"completed": True}).json()
    assert done["completed"] and done["completed_at"]
    assert client.delete(f"/api/action-items/{item['id']}").status_code == 204

    assert client.delete(f"/api/meetings/{mid}").status_code == 204
    assert client.get(f"/api/meetings/{mid}").status_code == 404


def test_upload_vtt(client):
    vtt = b"WEBVTT\n\n00:00:01.000 --> 00:00:03.000\n<v Kim>We should ship on Monday.</v>\n"
    r = client.post("/api/meetings/upload", files={"file": ("release_sync.vtt", vtt, "text/vtt")})
    assert r.status_code == 201 and r.json()["title"] == "release sync"


def test_bad_transcript(client):
    r = client.post("/api/meetings", json={"title": "x", "transcript_text": "   ", "transcript_format": "json"})
    assert r.status_code in (201, 422)  # whitespace-only is treated as "no transcript"
    r = client.post("/api/meetings", json={"title": "x", "transcript_text": "{bad", "transcript_format": "json"})
    assert r.status_code == 422


def test_ask_and_export(client):
    r = client.post("/api/meetings/1/ask", json={"question": "Who attended?"})
    assert "participants" in r.json()["answer"]["content"]
    assert len(client.get("/api/meetings/1/ask").json()) >= 2
    pdf = client.get("/api/meetings/1/export", params={"fmt": "pdf"})
    assert pdf.content[:4] == b"%PDF"


def test_regenerate_keeps_manual_items(client):
    m = client.post("/api/meetings", json={"title": "Regen", "transcript_text": "A: I'll write the release notes by Friday.\nB: Sounds good."}).json()
    manual = client.post(f"/api/meetings/{m['id']}/action-items", json={"text": "Book the room"}).json()
    regen = client.post(f"/api/meetings/{m['id']}/summary/regenerate").json()
    texts = [a["text"] for a in regen["action_items"]]
    assert manual["text"] in texts and any("release notes" in t for t in texts)
    assert len(texts) == len(m["action_items"]) + 1  # auto items replaced, not duplicated
