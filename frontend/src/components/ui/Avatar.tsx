import { initials } from "@/lib/format";

const SIZES = { xs: "h-5 w-5 text-[9px]", sm: "h-7 w-7 text-[11px]", md: "h-8 w-8 text-xs", lg: "h-10 w-10 text-sm" };

export function Avatar({ name, color, size = "sm", ring = false }: {
  name: string; color: string; size?: keyof typeof SIZES; ring?: boolean;
}) {
  return (
    <span title={name}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${SIZES[size]} ${ring ? "ring-2 ring-surface" : ""}`}
      style={{ backgroundColor: color }}>
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ people, max = 4, size = "sm" }: {
  people: { name: string; color: string }[]; max?: number; size?: keyof typeof SIZES;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex -space-x-1">
      {shown.map((p) => <Avatar key={p.name} name={p.name} color={p.color} size={size} ring />)}
      {extra > 0 && (
        <span className={`inline-flex items-center justify-center rounded-full bg-raised font-semibold text-muted ring-2 ring-surface ${SIZES[size]}`}>
          +{extra}
        </span>
      )}
    </div>
  );
}
