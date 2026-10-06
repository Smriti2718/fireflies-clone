import type { LucideIcon } from "lucide-react";

export function ComingSoon({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Icon size={26} />
      </div>
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
      <span className="mt-5 chip bg-brand-soft text-brand-ink">Coming soon</span>
    </div>
  );
}
