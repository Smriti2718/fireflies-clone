"use client";

import { Calendar, Check, ChevronDown, Search, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import type { Participant, SortKey } from "@/lib/types";

export interface FilterState {
  q: string; participants: string[]; dateFrom: string; dateTo: string; sort: SortKey;
}

const SORTS: { id: SortKey; label: string }[] = [
  { id: "recent", label: "Most recent" },
  { id: "oldest", label: "Oldest first" },
  { id: "longest", label: "Longest" },
  { id: "shortest", label: "Shortest" },
  { id: "title", label: "Title A–Z" },
];

function Popover({ button, children, active }: { button: ReactNode; children: ReactNode; active: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={`btn h-9 border ${active ? "border-brand/40 bg-brand-soft text-brand-ink" : "border-line bg-surface text-ink hover:bg-raised"}`}>
        {button}<ChevronDown size={14} className="opacity-60" />
      </button>
      {open && <div className="animate-modal-in absolute left-0 z-30 mt-1.5 w-64 rounded-xl border border-line bg-surface p-2 shadow-pop">{children}</div>}
    </div>
  );
}

export function MeetingFilters({ value, onChange, people }: {
  value: FilterState; onChange: (patch: Partial<FilterState>) => void; people: Participant[];
}) {
  const [personQuery, setPersonQuery] = useState("");
  const filteredPeople = people.filter((p) => p.name.toLowerCase().includes(personQuery.toLowerCase()));
  const toggle = (name: string) =>
    onChange({ participants: value.participants.includes(name) ? value.participants.filter((n) => n !== name) : [...value.participants, name] });
  const hasFilters = value.q || value.participants.length || value.dateFrom || value.dateTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full sm:w-64">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input className="input pl-9" placeholder="Filter meetings" value={value.q} onChange={(e) => onChange({ q: e.target.value })} aria-label="Filter meetings by title, person or transcript text" />
      </div>

      <Popover active={value.participants.length > 0} button={<><Users size={15} /> {value.participants.length ? `${value.participants.length} people` : "Participants"}</>}>
        <input className="input mb-2 h-8" placeholder="Find a person" value={personQuery} onChange={(e) => setPersonQuery(e.target.value)} />
        <div className="max-h-64 overflow-y-auto">
          {filteredPeople.map((p) => {
            const on = value.participants.includes(p.name);
            return (
              <button key={p.id} type="button" onClick={() => toggle(p.name)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-raised">
                <Avatar name={p.name} color={p.color} size="xs" />
                <span className="flex-1 truncate text-ink">{p.name}</span>
                {on && <Check size={15} className="text-brand" />}
              </button>
            );
          })}
          {!filteredPeople.length && <p className="px-2 py-3 text-sm text-muted">No one matches “{personQuery}”.</p>}
        </div>
      </Popover>

      <Popover active={!!(value.dateFrom || value.dateTo)} button={<><Calendar size={15} /> {value.dateFrom || value.dateTo ? "Date set" : "Date"}</>}>
        <div className="space-y-2 p-1">
          <label className="label" htmlFor="f-from">From</label>
          <input id="f-from" type="date" className="input" value={value.dateFrom} max={value.dateTo || undefined} onChange={(e) => onChange({ dateFrom: e.target.value })} />
          <label className="label" htmlFor="f-to">To</label>
          <input id="f-to" type="date" className="input" value={value.dateTo} min={value.dateFrom || undefined} onChange={(e) => onChange({ dateTo: e.target.value })} />
          {(value.dateFrom || value.dateTo) && (
            <button type="button" className="btn-ghost h-8 w-full" onClick={() => onChange({ dateFrom: "", dateTo: "" })}>Clear dates</button>
          )}
        </div>
      </Popover>

      <label className="sr-only" htmlFor="f-sort">Sort</label>
      <select id="f-sort" className="input h-9 w-auto cursor-pointer pr-8" value={value.sort} onChange={(e) => onChange({ sort: e.target.value as SortKey })}>
        {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>

      {hasFilters ? (
        <button type="button" className="btn-ghost h-9" onClick={() => onChange({ q: "", participants: [], dateFrom: "", dateTo: "" })}>
          <X size={15} /> Clear
        </button>
      ) : null}
    </div>
  );
}
