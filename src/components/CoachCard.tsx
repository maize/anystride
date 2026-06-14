import Link from "next/link";
import type { Coach } from "@/data/coaches";
import { COACH_FORMAT_LABELS } from "@/data/coaches";
import { Avatar } from "./Avatar";

export function CoachCard({ coach }: { coach: Coach }) {
  return (
    <Link
      href={`/coaching/${coach.slug}`}
      className="group flex flex-col rounded-xl border border-border p-5 transition hover:border-brand hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <Avatar name={coach.name} />
        <div className="min-w-0">
          <h3 className="truncate font-semibold group-hover:text-brand">
            {coach.name}
          </h3>
          <p className="truncate text-xs text-muted-foreground">
            {coach.location} · {COACH_FORMAT_LABELS[coach.format]}
          </p>
        </div>
      </div>
      <p className="mt-3 flex-1 text-sm text-muted-foreground">{coach.blurb}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {coach.specialties.slice(0, 3).map((s) => (
          <span
            key={s}
            className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>
    </Link>
  );
}
