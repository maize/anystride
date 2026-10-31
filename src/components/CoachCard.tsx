import Link from "next/link";
import type { ReactNode } from "react";
import type { Coach } from "@/data/coaches";
import { COACH_FORMAT_LABELS } from "@/data/coaches";
import { Avatar } from "./Avatar";
import { CoachApprovalBadge } from "./CoachApprovalBadge";

type CardCoach = Pick<Coach, "name" | "blurb" | "specialties"> & Partial<Pick<Coach, "slug" | "location" | "format" | "verified">>;
const cardClass = "group flex h-full min-w-0 flex-col rounded-2xl bg-muted p-6 transition-all duration-300 ease-stride hover:-translate-y-1 hover:ring-1 hover:ring-border";
const footerClass = "mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs";

export function CoachCard({ coach, href: profileHref, approved = false, details }: { coach: CardCoach; href?: string; approved?: boolean; details?: ReactNode }) {
  const href = profileHref ?? (coach.slug ? `/coaching/${coach.slug}` : undefined);
  const format = <span className="text-muted-foreground">{coach.format ? COACH_FORMAT_LABELS[coach.format] : "Running coach"}{!approved && !coach.verified ? " · Unclaimed" : ""}</span>;
  const action = <span className="font-semibold">View profile <span aria-hidden="true" className="ml-2 inline-block transition-transform duration-300 ease-stride group-hover:translate-x-1">↗</span></span>;
  const content = <>
    <div className="flex items-start gap-4">
      <Avatar name={coach.name} />
      <div className="min-w-0">
        <h3 className="break-words text-xl font-semibold tracking-tight transition-colors duration-300 ease-stride group-hover:text-brand">{coach.name}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {coach.location && <p className="text-sm text-muted-foreground">{coach.location}</p>}
          {approved && <CoachApprovalBadge />}
        </div>
      </div>
    </div>
    <p className="mt-6 flex-1 text-sm leading-relaxed text-muted-foreground">{coach.blurb}</p>
    <div className="mt-6 flex flex-wrap gap-2">
      {coach.specialties.slice(0, 3).map((specialty) => <span key={specialty} className="rounded-md bg-background px-2 py-1 text-xs font-medium text-muted-foreground">{specialty}</span>)}
    </div>
  </>;
  if (href) return <Link href={href} className={cardClass}>{content}<div className={footerClass}>{format}{action}</div></Link>;
  return <article className={cardClass}>{content}<details className="mt-6 border-t border-border pt-4">
    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 text-xs focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">{format}{action}</summary>
    <div className="mt-4 text-sm leading-relaxed">{details}</div>
  </details></article>;
}
