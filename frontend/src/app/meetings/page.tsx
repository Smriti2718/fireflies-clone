"use client";

import { Plus, SearchX, Video } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCreateMeeting } from "@/components/layout/CreateMeetingContext";
import { EditMeetingModal } from "@/components/meetings/EditMeetingModal";
import { MeetingFilters, type FilterState } from "@/components/meetings/MeetingFilters";
import { MeetingRow } from "@/components/meetings/MeetingRow";
import { ConfirmDialog } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { dayGroup } from "@/lib/format";
import type { MeetingListItem, Participant, SortKey } from "@/lib/types";

function readFilters(p: URLSearchParams): FilterState {
  return {
    q: p.get("q") ?? "",
    participants: p.getAll("participant"),
    dateFrom: p.get("from") ?? "",
    dateTo: p.get("to") ?? "",
    sort: (p.get("sort") as SortKey) || "recent",
  };
}

function Library() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const openCreate = useCreateMeeting();

  const [filters, setFilters] = useState<FilterState>(() => readFilters(params));
  const [items, setItems] = useState<MeetingListItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [people, setPeople] = useState<Participant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<MeetingListItem | null>(null);
  const [deleting, setDeleting] = useState<MeetingListItem | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);
  const q = useDebounce(filters.q, 250);

  // URL → state, for searches started from the navbar. Skip echoes of our own URL writes
  // so typing in the filter box isn't overwritten by a stale debounced value.
  const urlQ = params.get("q") ?? "";
  const lastWrittenQ = useRef(urlQ);
  useEffect(() => {
    if (urlQ !== lastWrittenQ.current) {
      lastWrittenQ.current = urlQ;
      setFilters((f) => ({ ...f, q: urlQ }));
    }
  }, [urlQ]);

  const load = useCallback(async () => {
    try {
      const res = await api.listMeetings({
        q, participant: filters.participants, date_from: filters.dateFrom || undefined,
        date_to: filters.dateTo || undefined, sort: filters.sort,
      });
      setItems(res.items); setTotal(res.total); setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [q, filters.participants, filters.dateFrom, filters.dateTo, filters.sort]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.participants().then(setPeople).catch(() => {}); }, []);

  // state → URL, so filtered views are shareable and survive refresh
  useEffect(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    filters.participants.forEach((n) => p.append("participant", n));
    if (filters.dateFrom) p.set("from", filters.dateFrom);
    if (filters.dateTo) p.set("to", filters.dateTo);
    if (filters.sort !== "recent") p.set("sort", filters.sort);
    const next = p.toString();
    lastWrittenQ.current = q;
    if (next !== params.toString()) router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, filters.participants, filters.dateFrom, filters.dateTo, filters.sort]);

  const groups = useMemo(() => {
    if (!items) return [];
    if (filters.sort !== "recent" && filters.sort !== "oldest") return [{ label: "", items }];
    const out: { label: string; items: MeetingListItem[] }[] = [];
    for (const m of items) {
      const label = dayGroup(m.meeting_date);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(m); else out.push({ label, items: [m] });
    }
    return out;
  }, [items, filters.sort]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusyDelete(true);
    try {
      await api.deleteMeeting(deleting.id);
      toast(`Deleted “${deleting.title}”`);
      setDeleting(null);
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusyDelete(false);
    }
  };

  const filtered = !!(q || filters.participants.length || filters.dateFrom || filters.dateTo);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Meetings</h1>
          <p className="mt-1 text-sm text-muted">
            {items === null ? "Loading…" : filtered ? `${total} matching meeting${total === 1 ? "" : "s"}` : `${total} meeting${total === 1 ? "" : "s"} in your notebook`}
          </p>
        </div>
        <button className="btn-primary" onClick={() => openCreate("upload")}><Plus size={16} /> New meeting</button>
      </div>

      <MeetingFilters value={filters} onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))} people={people} />

      <div className="mt-5">
        {error ? (
          <div className="panel p-8 text-center">
            <p className="text-sm font-medium text-ink">Meetings couldn't load.</p>
            <p className="mt-1 text-sm text-muted">{error}</p>
            <button className="btn-outline mt-4" onClick={load}>Try again</button>
          </div>
        ) : items === null ? (
          <div className="panel divide-y divide-line">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-5 py-5">
                <div className="h-10 w-10 animate-pulse rounded-xl bg-raised" />
                <div className="flex-1 space-y-2"><div className="h-4 w-1/3 animate-pulse rounded bg-raised" /><div className="h-3 w-1/2 animate-pulse rounded bg-raised" /></div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="panel flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              {filtered ? <SearchX size={22} /> : <Video size={22} />}
            </div>
            {filtered ? (
              <>
                <p className="font-medium text-ink">No meetings match these filters</p>
                <p className="mt-1 text-sm text-muted">Try a different word, or clear filters to see everything.</p>
                <button className="btn-outline mt-4" onClick={() => setFilters((f) => ({ ...f, q: "", participants: [], dateFrom: "", dateTo: "" }))}>Clear filters</button>
              </>
            ) : (
              <>
                <p className="font-medium text-ink">Your notebook is empty</p>
                <p className="mt-1 text-sm text-muted">Upload a transcript to get notes, action items and a searchable transcript.</p>
                <button className="btn-primary mt-4" onClick={() => openCreate("upload")}><Plus size={16} /> Upload transcript</button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.label || "all"} aria-label={g.label || "Meetings"}>
                {g.label && <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted">{g.label}</h2>}
                <ul className="panel overflow-visible">
                  {g.items.map((m) => (
                    <MeetingRow key={m.id} m={m} query={q} onEdit={() => setEditing(m)} onDelete={() => setDeleting(m)} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <EditMeetingModal open={!!editing} meeting={editing} onClose={() => setEditing(null)} onSaved={() => load()} />
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={confirmDelete} busy={busyDelete}
        title="Delete this meeting?" confirmLabel="Delete meeting"
        message={`“${deleting?.title}” and its transcript, notes and action items will be permanently removed.`} />
    </div>
  );
}

export default function MeetingsPage() {
  return <Suspense><Library /></Suspense>;
}
