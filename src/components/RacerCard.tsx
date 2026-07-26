import Link from "next/link";
import type { Racer } from "@/data/racers";
import { COUNTRY_FLAGS } from "@/data/racers";
import { Avatar } from "./Avatar";

export function RacerCard({ racer }: { racer: Racer }) {
  const topPr = racer.prs[0];
  return (
    <Link
      href={`/racers/${racer.slug}`}
      className="group flex items-center gap-3 rounded-xl border border-border p-4 transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
    >
      <Avatar name={racer.name} />
      <div className="min-w-0">
        <h3 className="truncate font-semibold transition-colors duration-300 ease-stride group-hover:text-brand">
          {racer.name}
        </h3>
        <p className="truncate text-xs text-muted-foreground">
          {COUNTRY_FLAGS[racer.country] ?? ""} {racer.country}
          {topPr ? ` · ${topPr.event} ${topPr.time}` : ""}
        </p>
      </div>
    </Link>
  );
}
