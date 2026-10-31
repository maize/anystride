"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { accountLinkActive, accountNavigation } from "@/lib/account-navigation";

export function AccountNavigation({ training = false, coach = false }: { training?: boolean; coach?: boolean }) {
  const pathname = usePathname();
  const primary = accountNavigation({ training, coach });
  return <nav aria-label="Account" className="mt-8 border-b border-border">
    <ul aria-label="Training and overview" className="flex flex-wrap gap-2 pb-4">
      {primary.map(({ href, label }) => {
        const active = accountLinkActive(pathname, href);
        return <li key={href}><Link href={href} prefetch={false} aria-current={active ? "page" : undefined}
          className={`inline-flex min-h-12 items-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-stride focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${active ? "bg-foreground text-background" : "bg-muted hover:text-brand"}`}>
          {label}
        </Link></li>;
      })}
    </ul>
  </nav>;
}
