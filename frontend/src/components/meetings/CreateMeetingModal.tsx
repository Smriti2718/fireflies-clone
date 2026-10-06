"use client";

import { FileText, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import type { CreateMode } from "@/components/layout/CreateMeetingContext";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { toLocalInput } from "@/lib/format";

const SAMPLE = `[00:00:02] Ana Lopez: Thanks for joining. Let's review the offsite budget.
[00:00:09] Ben Ortiz: Venue quotes came in about ten percent over what we planned.
[00:00:16] Ana Lopez: Ben, can you ask the venue for a weekday discount?
[00:00:21] Ben Ortiz: Sure, I'll email them today and report back by Friday.`;

const TABS: { id: CreateMode; label: string }[] = [
  { id: "upload", label: "Upload file" },
  { id: "paste", label: "Paste transcript" },
  { id: "form", label: "Manual" },
];

export function CreateMeetingModal({ open, mode, onClose }: { open: boolean; mode: CreateMode; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<CreateMode>(mode);
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState("");
  const [when, setWhen] = useState(toLocalInput(new Date()));
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTab(mode); setTitle(""); setParticipants(""); setText(""); setFile(null); setError(null);
      setWhen(toLocalInput(new Date()));
    }
  }, [open, mode]);

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(txt|vtt|json|srt)$/i.test(f.name)) { setError("Use a .txt, .vtt or .json transcript file."); return; }
    if (f.size > 2 * 1024 * 1024) { setError("That file is over 2 MB. Upload a smaller transcript."); return; }
    setError(null); setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files[0]); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const people = participants.split(",").map((p) => p.trim()).filter(Boolean);
    const date = when ? new Date(when).toISOString() : undefined;
    if (tab === "upload" && !file) return setError("Choose a transcript file to upload.");
    if (tab === "paste" && !text.trim()) return setError("Paste a transcript, or switch to Manual to add a meeting without one.");
    if (tab !== "upload" && !title.trim()) return setError("Give the meeting a title.");

    setBusy(true);
    try {
      const meeting = tab === "upload"
        ? await api.uploadMeeting(file!, { title: title.trim() || undefined, participants: people.join(","), meeting_date: date })
        : await api.createMeeting({
            title: title.trim(), participants: people, meeting_date: date,
            transcript_text: tab === "paste" ? text : undefined,
          });
      toast(meeting.segments.length ? `Meeting created with ${meeting.segments.length} transcript lines` : "Meeting created");
      onClose();
      router.push(`/meetings/${meeting.id}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New meeting" width="max-w-xl"
      description="Add a meeting from a transcript. AI notes and action items are generated automatically.">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-1 rounded-lg bg-raised p-1" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setError(null); }}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium ${tab === t.id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "upload" && (
          file ? (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-raised px-4 py-3">
              <FileText size={20} className="text-brand" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button type="button" className="btn-ghost h-8 w-8 px-0" onClick={() => setFile(null)} aria-label="Remove file"><X size={16} /></button>
            </div>
          ) : (
            <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
              role="button" tabIndex={0}
              className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${dragging ? "border-brand bg-brand-soft" : "border-line hover:border-brand/60"}`}>
              <UploadCloud size={30} className="text-brand" />
              <p className="mt-2 text-sm font-medium text-ink">Drop a transcript here or click to browse</p>
              <p className="mt-1 text-xs text-muted">.txt, .vtt or .json, up to 2 MB</p>
              <input ref={fileInput} type="file" accept=".txt,.vtt,.json,.srt" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
            </div>
          )
        )}

        <div>
          <label className="label" htmlFor="m-title">Title{tab === "upload" && <span className="font-normal text-faint"> (optional)</span>}</label>
          <input id="m-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly sync" maxLength={255} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="m-when">Date & time</label>
            <input id="m-when" type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="m-people">Participants</label>
            <input id="m-people" className="input" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Comma separated" />
          </div>
        </div>

        {tab === "paste" && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label mb-0" htmlFor="m-text">Transcript</label>
              <button type="button" className="text-xs font-medium text-brand-ink hover:underline" onClick={() => setText(SAMPLE)}>Use sample</button>
            </div>
            <textarea id="m-text" className="textarea h-44 font-[inherit] text-[13px]" value={text} onChange={(e) => setText(e.target.value)}
              placeholder={"[00:00:05] Speaker Name: What they said\nor\nSpeaker Name: What they said"} />
            <p className="mt-1.5 text-xs text-muted">Speakers become participants. Lines without timestamps get estimated times.</p>
          </div>
        )}

        {tab !== "form" && (
          <p className="text-xs text-muted">Speakers found in the transcript are added as participants automatically.</p>
        )}

        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Creating…" : tab === "upload" ? "Upload & create" : "Create meeting"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
