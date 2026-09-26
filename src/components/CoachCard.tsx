import Link from "next/link";
import type { Coach } from "@/data/coaches";
import { COACH_FORMAT_LABELS } from "@/data/coaches";
import { Avatar } from "./Avatar";

export function CoachCard({ coach }: { coach: Coach }) {
  return (
    <Link
      href={`/coaching/${coach.slug}`}
      className="group flex h-full min-w-0 flex-col rounded-2xl bg-muted p-6 transition-all duration-300 ease-stride hover:-translate-y-1 hover:ring-1 hover:ring-border"
    >
      <div className="flex items-start gap-4">
        <Avatar name={coach.name} />
        <div className="min-w-0">
          <h3 className="text-xl font-semibold tracking-tight transition-colors duration-300 ease-stride group-hover:text-brand">
            {coach.name}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {coach.location}
          </p>
        </div>
      </div>
      <p className="mt-6 flex-1 text-sm leading-relaxed text-muted-foreground">{coach.blurb}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {coach.specialties.slice(0, 3).map((s) => (
          <span
            key={s}
            className="rounded-md bg-background px-2 py-1 text-xs font-medium text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs">
        <span className="text-muted-foreground">{COACH_FORMAT_LABELS[coach.format]}</span>
        <span className="font-semibold">View profile <span aria-hidden="true" className="ml-2 inline-block transition-transform duration-300 ease-stride group-hover:translate-x-1">↗</span></span>
      </div>
    </Link>
  );
}
