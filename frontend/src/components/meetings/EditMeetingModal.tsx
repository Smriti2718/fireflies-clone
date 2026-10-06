"use client";

import { X } from "lucide-react";
import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { toLocalInput } from "@/lib/format";
import type { MeetingDetail } from "@/lib/types";

interface Editable { id: number; title: string; meeting_date: string; participants: { name: string }[] }

export function EditMeetingModal({ meeting, open, onClose, onSaved }: {
  meeting: Editable | null; open: boolean; onClose: () => void; onSaved: (m: MeetingDetail) => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [people, setPeople] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && meeting) {
      setTitle(meeting.title);
      setWhen(toLocalInput(new Date(meeting.meeting_date)));
      setPeople(meeting.participants.map((p) => p.name));
      setDraft(""); setError(null);
    }
  }, [open, meeting]);

  const addDraft = () => {
    const names = draft.split(",").map((n) => n.trim()).filter(Boolean);
    if (names.length) setPeople((p) => [...p, ...names.filter((n) => !p.some((x) => x.toLowerCase() === n.toLowerCase()))]);
    setDraft("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addDraft(); }
    if (e.key === "Backspace" && !draft && people.length) setPeople((p) => p.slice(0, -1));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!meeting) return;
    if (!title.trim()) return setError("Title can't be empty.");
    const finalPeople = draft.trim() ? [...people, ...draft.split(",").map((n) => n.trim()).filter(Boolean)] : people;
    setBusy(true);
    try {
      const saved = await api.updateMeeting(meeting.id, {
        title: title.trim(), participants: finalPeople, meeting_date: when ? new Date(when).toISOString() : undefined,
      });
      toast("Meeting details saved");
      onSaved(saved);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit meeting details">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="e-title">Title</label>
          <input id="e-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} />
        </div>
        <div>
          <label className="label" htmlFor="e-when">Date & time</label>
          <input id="e-when" type="datetime-local" className="input" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="e-people">Participants</label>
          <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
            {people.map((p) => (
              <span key={p} className="chip bg-brand-soft text-brand-ink">
                {p}
                <button type="button" onClick={() => setPeople((x) => x.filter((n) => n !== p))} aria-label={`Remove ${p}`}><X size={12} /></button>
              </span>
            ))}
            <input id="e-people" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} onBlur={addDraft}
              placeholder={people.length ? "" : "Type a name and press Enter"} className="min-w-[120px] flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint" />
          </div>
          <p className="mt-1.5 text-xs text-muted">The first person is shown as the host.</p>
        </div>
        {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </Modal>
  );
}
