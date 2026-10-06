"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hint?: string;
}

/** Small click-to-open dropdown with outside-click / Escape to close. */
export function Menu({ trigger, items, align = "right", label }: {
  trigger: ReactNode; items: MenuItem[]; align?: "left" | "right"; label: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={label}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}>
        {trigger}
      </button>
      {open && (
        <div role="menu"
          className={`animate-modal-in absolute z-40 mt-1.5 min-w-[200px] rounded-xl border border-line bg-surface p-1.5 shadow-pop ${align === "right" ? "right-0" : "left-0"}`}>
          {items.map((it) => (
            <button key={it.label} role="menuitem" type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); it.onSelect(); }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-raised ${it.danger ? "text-danger" : "text-ink"}`}>
              {it.icon && <span className="text-muted">{it.icon}</span>}
              <span className="flex-1">{it.label}</span>
              {it.hint && <span className="text-xs text-faint">{it.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
