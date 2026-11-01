"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { accountLinkActive, accountNavigation } from "@/lib/account-navigation";

function NavigationLabel({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return <><span className={pending ? "opacity-60" : undefined}>{children}</span><span role="status" className="sr-only">{pending ? `Opening ${children}…` : ""}</span><span aria-hidden="true" className={`pointer-events-none absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-current transition-opacity duration-150 ${pending ? "opacity-60" : "opacity-0"}`} /></>;
}

export function AccountNavigation({ training = false, coach = false, view = coach ? "coach" : "runner", applicant = coach }: { training?: boolean; coach?: boolean; view?: "runner" | "coach"; applicant?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const primary = accountNavigation({ training, coach, view, applicant });
  return <nav aria-label={view === "coach" ? "Coach navigation" : "Runner navigation"} className="mt-8 border-b border-border">
    <ul aria-label={view === "coach" ? "Coach tools" : "Your running"} className="flex flex-wrap gap-2 pb-4">
      {primary.map(({ href, label }) => {
        const active = accountLinkActive(pathname, href, view === "coach" && Boolean(searchParams.get("athlete")));
        return <li key={href}><Link href={href} prefetch={false} aria-current={active ? "page" : undefined}
          className={`relative inline-flex min-h-12 items-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-stride focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${active ? "bg-foreground text-background" : "bg-muted hover:text-brand"}`}>
          <NavigationLabel>{label}</NavigationLabel>
        </Link></li>;
      })}
    </ul>
  </nav>;
}
