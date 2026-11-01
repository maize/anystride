"use client";

import { usePathname } from "next/navigation";
import { accountLinkActive, accountNavigation } from "@/lib/account-navigation";

export function AccountNavigation({ training = false, coach = false, view = coach ? "coach" : "runner", applicant = coach }: { training?: boolean; coach?: boolean; view?: "runner" | "coach"; applicant?: boolean }) {
  const pathname = usePathname();
  const primary = accountNavigation({ training, coach, view, applicant });
  return <nav aria-label={view === "coach" ? "Coach navigation" : "Runner navigation"} className="mt-8 border-b border-border">
    <ul aria-label={view === "coach" ? "Coach tools" : "Your running"} className="flex flex-wrap gap-2 pb-4">
      {primary.map(({ href, label }) => {
        const active = accountLinkActive(pathname, href);
        return <li key={href}><a href={href} aria-current={active ? "page" : undefined}
          className={`inline-flex min-h-12 items-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-stride focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${active ? "bg-foreground text-background" : "bg-muted hover:text-brand"}`}>
          {label}
        </a></li>;
      })}
    </ul>
  </nav>;
}
