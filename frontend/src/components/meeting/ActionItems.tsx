"use client";

import { Calendar, Check, Pencil, PlayCircle, Plus, Trash2, User } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import { clock } from "@/lib/format";
import type { ActionItem, MeetingParticipant } from "@/lib/types";

function dueLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ItemEditor({ initial, people, onSave, onCancel, saveLabel }: {
  initial: { text: string; assignee: string; due: string }; people: MeetingParticipant[];
  onSave: (v: { text: string; assignee: string; due: string }) => Promise<void>; onCancel: () => void; saveLabel: string;
}) {
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!v.text.trim()) return;
    setBusy(true);
    try { await onSave(v); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-brand/40 bg-surface p-3">
      <textarea autoFocus className="textarea min-h-[60px] text-sm" value={v.text} placeholder="What needs to happen?"
        onChange={(e) => setV({ ...v, text: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } if (e.key === "Escape") onCancel(); }} />
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[150px] flex-1">
          <User size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input h-8 pl-8 text-[13px]" list="ai-people" placeholder="Assignee" value={v.assignee}
            onChange={(e) => setV({ ...v, assignee: e.target.value })} aria-label="Assignee" />
          <datalist id="ai-people">{people.map((p) => <option key={p.id} value={p.name} />)}</datalist>
        </div>
        <input type="date" className="input h-8 w-auto text-[13px]" value={v.due} onChange={(e) => setV({ ...v, due: e.target.value })} aria-label="Due date" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost h-8" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn-primary h-8" disabled={busy || !v.text.trim()}>{busy ? "Saving…" : saveLabel}</button>
      </div>
    </form>
  );
}

export function ActionItems({ meetingId, items, people, onChange, onSeek }: {
  meetingId: number; items: ActionItem[]; people: MeetingParticipant[];
  onChange: (items: ActionItem[]) => void; onSeek: (ms: number) => void;
}) {
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");

  const shown = items.filter((a) => filter === "all" || (filter === "open" ? !a.completed : a.completed));
  const open = items.filter((a) => !a.completed).length;

  const toggle = async (a: ActionItem) => {
    const optimistic = items.map((x) => (x.id === a.id ? { ...x, completed: !a.completed } : x));
    onChange(optimistic);
    try {
      const saved = await api.updateActionItem(a.id, { completed: !a.completed });
      onChange(optimistic.map((x) => (x.id === a.id ? saved : x)));
      toast(saved.completed ? "Action item completed" : "Action item reopened");
    } catch (e) {
      onChange(items);
      toast((e as Error).message, "error");
    }
  };

  const create = async (v: { text: string; assignee: string; due: string }) => {
    try {
      const item = await api.createActionItem(meetingId, { text: v.text.trim(), assignee_name: v.assignee.trim() || undefined, due_date: v.due || undefined });
      onChange([...items, item]);
      setAdding(false);
      toast("Action item added");
    } catch (e) { toast((e as Error).message, "error"); }
  };

  const update = async (a: ActionItem, v: { text: string; assignee: string; due: string }) => {
    try {
      const saved = await api.updateActionItem(a.id, {
        text: v.text.trim(), assignee_name: v.assignee.trim(), ...(v.due ? { due_date: v.due } : { clear_due_date: true }),
      });
      onChange(items.map((x) => (x.id === a.id ? saved : x)));
      setEditingId(null);
      toast("Action item updated");
    } catch (e) { toast((e as Error).message, "error"); }
  };

  const remove = async (a: ActionItem) => {
    onChange(items.filter((x) => x.id !== a.id));
    try { await api.deleteActionItem(a.id); toast("Action item deleted"); }
    catch (e) { onChange(items); toast((e as Error).message, "error"); }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex gap-1 text-xs" role="group" aria-label="Filter action items">
          {(["all", "open", "done"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`rounded-md px-2 py-1 font-medium ${filter === f ? "bg-raised text-ink" : "text-muted hover:text-ink"}`}>
              {f === "all" ? `All ${items.length}` : f === "open" ? `Open ${open}` : `Done ${items.length - open}`}
            </button>
          ))}
        </div>
        {!adding && <button className="btn-ghost h-8 text-brand-ink" onClick={() => setAdding(true)}><Plus size={15} /> Add</button>}
      </div>

      <ul className="space-y-1">
        {shown.map((a) => editingId === a.id ? (
          <li key={a.id}>
            <ItemEditor people={people} saveLabel="Save" onCancel={() => setEditingId(null)} onSave={(v) => update(a, v)}
              initial={{ text: a.text, assignee: a.assignee?.name ?? "", due: a.due_date ?? "" }} />
          </li>
        ) : (
          <li key={a.id} className="group flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-raised">
            <button onClick={() => toggle(a)} aria-label={a.completed ? "Mark as not done" : "Mark as done"} aria-pressed={a.completed}
              className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors ${a.completed ? "border-brand bg-brand text-white" : "border-faint hover:border-brand"}`}>
              {a.completed && <Check size={12} strokeWidth={3} />}
            </button>
            <div className="min-w-0 flex-1">
              <p className={`text-[14px] leading-snug ${a.completed ? "text-faint line-through" : "text-ink"}`}>{a.text}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {a.assignee && <span className="inline-flex items-center gap-1.5"><Avatar name={a.assignee.name} color={a.assignee.color} size="xs" />{a.assignee.name}</span>}
                {a.due_date && <span className="inline-flex items-center gap-1"><Calendar size={12} /> {dueLabel(a.due_date)}</span>}
                {a.source_start_ms !== null && (
                  <button onClick={() => onSeek(a.source_start_ms!)} className="inline-flex items-center gap-1 text-brand-ink hover:underline">
                    <PlayCircle size={12} /> {clock(a.source_start_ms)}
                  </button>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <button className="btn-ghost h-7 w-7 px-0" onClick={() => setEditingId(a.id)} aria-label="Edit action item"><Pencil size={14} /></button>
              <button className="btn-ghost h-7 w-7 px-0 hover:text-danger" onClick={() => remove(a)} aria-label="Delete action item"><Trash2 size={14} /></button>
            </div>
          </li>
        ))}
      </ul>

      {!shown.length && !adding && (
        <p className="px-2 py-3 text-sm text-muted">
          {items.length ? `No ${filter === "open" ? "open" : "completed"} action items.` : "No action items yet. Add one to track follow-ups from this meeting."}
        </p>
      )}
      {adding && <div className="mt-2"><ItemEditor people={people} saveLabel="Add action item" onCancel={() => setAdding(false)} onSave={create} initial={{ text: "", assignee: "", due: "" }} /></div>}
    </div>
  );
}
