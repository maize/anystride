import Link from "next/link";
import type { ReactNode } from "react";

export const accountInput = "mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-base focus:outline-2 focus:outline-offset-2 focus:outline-brand";
export const accountPrice = (amount: number, currency: string) => new Intl.NumberFormat("en", { style: "currency", currency }).format(amount / 100);
export const accountDate = (date: Date | string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(date));

export function AccountHeading({ title, children }: { title: string; children: ReactNode }) {
  return <header className="mb-8"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1><p className="mt-4 max-w-2xl text-muted-foreground">{children}</p></header>;
}

export function AccountEmpty({ title, children, href, action }: { title: string; children: ReactNode; href?: string; action?: string }) {
  return <div className="rounded-xl bg-muted p-8"><h3 className="text-xl font-semibold tracking-tight">{title}</h3><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{children}</p>{href && <Link href={href} className="action-link mt-4">{action} <span aria-hidden="true">→</span></Link>}</div>;
}

const labels: Record<string, string> = { pending: "Awaiting review", approved: "Approved", rejected: "Changes needed", suspended: "Suspended", requested: "Awaiting coach reply", accepted: "Enquiry accepted", declined: "Declined", cancelled: "Withdrawn" };
export function AccountStatus({ status }: { status: string }) {
  return <span className={`inline-block rounded-md bg-muted px-2 py-1 text-sm font-medium ${status === "approved" || status === "accepted" ? "text-brand" : "text-muted-foreground"}`}>{labels[status] ?? status}</span>;
}

export function CoachNavigation({ active }: { active: "services" | "enquiries" }) {
  return <nav aria-label="Coach workspace" className="mb-8 flex gap-6 text-sm font-semibold">
    <Link href="/account/services" aria-current={active === "services" ? "page" : undefined} className={active === "services" ? "text-brand underline underline-offset-8" : "text-muted-foreground hover:text-brand"}>My services</Link>
    <Link href="/account/enquiries" aria-current={active === "enquiries" ? "page" : undefined} className={active === "enquiries" ? "text-brand underline underline-offset-8" : "text-muted-foreground hover:text-brand"}>Athlete enquiries</Link>
  </nav>;
}
