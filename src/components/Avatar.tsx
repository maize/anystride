/** Initials identify public listings without implying a supplied portrait. */

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
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-background text-lg font-semibold tracking-tight text-muted-foreground"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
