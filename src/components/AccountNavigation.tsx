"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AccountNavigation({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const links = [
    ["/account", "Overview"],
    ["/account/coaching", "My coaching"],
    ["/account/explore", "Find a service"],
    ["/account/services", "Coach workspace"],
    ...(admin ? [["/account/review", "Admin reviews"]] : []),
  ];
  return <nav aria-label="Account" className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-b border-border">
    {links.map(([href, label]) => {
      const active = pathname === href || (href === "/account/services" && pathname === "/account/enquiries") || (href === "/account/coaching" && pathname.startsWith("/account/workspaces/"));
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`py-4 text-sm font-semibold transition-colors duration-300 ease-stride hover:text-brand ${active ? "text-brand underline decoration-2 underline-offset-8" : "text-muted-foreground"}`}>{label}</Link>;
    })}
  </nav>;
}
