/** Initials avatar with a deterministic muted color — no photos needed. */
const COLORS = [
  "bg-orange-700",
  "bg-emerald-800",
  "bg-sky-800",
  "bg-stone-600",
];

function initials(name: string): string {
  const words = name.replace(/[^A-Za-z\s—-]/g, "").split(/[\s—-]+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function Avatar({
  name,
  size = 48,
}: {
  name: string;
  size?: number;
}) {
  const color = COLORS[name.length % COLORS.length];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl font-semibold text-white ${color}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
