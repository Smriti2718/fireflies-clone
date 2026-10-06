"use client";

import { ArrowUp, Check, Sparkles, Trash2 } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useToast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { AskMessage } from "@/lib/types";

const SUGGESTIONS = ["Summarize this meeting", "What are the action items?", "Who attended?", "What topics were covered?"];

/** Tiny renderer for the answer format: **bold**, "- " bullets, and clickable (mm:ss) / [mm:ss] timestamps. */
function RichText({ text, onSeek }: { text: string; onSeek: (ms: number) => void }) {
  const inline = (line: string, key: number): ReactNode => {
    const parts = line.split(/(\*\*[^*]+\*\*|[\[(]\d{1,2}:\d{2}(?::\d{2})?[\])])/g);
    return (
      <Fragment key={key}>
        {parts.map((p, i) => {
          if (p.startsWith("**")) return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
          const ts = p.match(/^[\[(](\d{1,2}:\d{2}(?::\d{2})?)[\])]$/);
          if (ts) {
            const ms = ts[1]!.split(":").reduce((acc, n) => acc * 60 + Number(n), 0) * 1000;
            return <button key={i} onClick={() => onSeek(ms)} className="font-medium text-brand-ink hover:underline">{ts[1]}</button>;
          }
          return p;
        })}
      </Fragment>
    );
  };
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((l, i) =>
        /^\s*[-*] /.test(l)
          ? <Bullet key={i} raw={l.replace(/^\s*[-*] /, "")} render={(t) => inline(t, i)} />
          : l.trim() ? <p key={i}>{inline(l, i)}</p> : null,
      )}
    </div>
  );
}

/** List item; a leading "[ ]" / "[x]" (task status from the API) renders as a checkbox glyph. */
function Bullet({ raw, render }: { raw: string; render: (t: string) => ReactNode }) {
  const task = raw.match(/^\[( |x)\] /);
  return (
    <div className="flex gap-2 pl-1">
      {task ? (
        <span className={`mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] ${task[1] === "x" ? "border-brand bg-brand text-white" : "border-faint"}`}>
          {task[1] === "x" && <Check size={9} strokeWidth={3.5} />}
        </span>
      ) : <span className="text-faint">•</span>}
      <span>{render(task ? raw.slice(4) : raw)}</span>
    </div>
  );
}

export function AskPanel({ meetingId, onSeek }: { meetingId: number; onSeek: (ms: number) => void }) {
  const toast = useToast();
  const [messages, setMessages] = useState<AskMessage[] | null>(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => { api.askHistory(meetingId).then(setMessages).catch(() => setMessages([])); }, [meetingId]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages, pending]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || pending) return;
    setInput("");
    setPending(true);
    const temp: AskMessage = { id: -Date.now(), role: "user", content: q, citations: [], created_at: new Date().toISOString() };
    setMessages((m) => [...(m ?? []), temp]);
    try {
      const res = await api.ask(meetingId, q);
      setMessages((m) => [...(m ?? []).filter((x) => x.id !== temp.id), res.question, res.answer]);
    } catch (e) {
      setMessages((m) => (m ?? []).filter((x) => x.id !== temp.id));
      setInput(q);
      toast((e as Error).message, "error");
    } finally {
      setPending(false);
    }
  };

  const clear = async () => {
    try { await api.clearAsk(meetingId); setMessages([]); toast("Conversation cleared"); }
    catch (e) { toast((e as Error).message, "error"); }
  };

  const submit = (e: FormEvent) => { e.preventDefault(); ask(input); };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages && messages.length === 0 && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8f5cff] to-[#e0458f] text-white"><Sparkles size={20} /></div>
            <p className="font-semibold text-ink">Ask Fred about this meeting</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Answers come from the transcript, with timestamps you can jump to.</p>
            <div className="mt-5 flex flex-col items-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-ink hover:border-brand/50 hover:bg-brand-soft">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages?.map((m) => m.role === "user" ? (
          <div key={m.id} className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-sm text-white">{m.content}</p>
          </div>
        ) : (
          <div key={m.id} className="flex gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8f5cff] to-[#e0458f] text-white"><Sparkles size={14} /></span>
            <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-raised px-3.5 py-2.5 text-sm leading-relaxed text-ink">
              <RichText text={m.content} onSeek={onSeek} />
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex gap-2.5">
            <span className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-br from-[#8f5cff] to-[#e0458f]" />
            <div className="flex gap-1 rounded-2xl bg-raised px-4 py-3" aria-label="Thinking">
              {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-faint" style={{ animationDelay: `${i * 150}ms` }} />)}
            </div>
          </div>
        )}
        <div ref={end} />
      </div>
      <form onSubmit={submit} className="border-t border-line p-3">
        <div className="flex items-end gap-2 rounded-xl border border-line bg-surface p-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} placeholder="Ask anything about this meeting"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
            className="max-h-28 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink outline-none placeholder:text-faint" aria-label="Question" />
          {!!messages?.length && (
            <button type="button" onClick={clear} className="btn-ghost h-8 w-8 px-0" aria-label="Clear conversation" title="Clear conversation"><Trash2 size={15} /></button>
          )}
          <button type="submit" disabled={!input.trim() || pending} className="btn-primary h-8 w-8 rounded-lg px-0" aria-label="Send"><ArrowUp size={16} /></button>
        </div>
      </form>
    </div>
  );
}
