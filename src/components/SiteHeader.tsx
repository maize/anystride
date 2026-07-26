"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/plans", label: "Browse" },
  { href: "/compare", label: "Compare" },
  { href: "/guides", label: "Guides" },
  { href: "/races", label: "Races" },
  { href: "/calculator", label: "Paces" },
  { href: "/coaching", label: "Coaching" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/plans") {
    return (
      pathname === "/plans" ||
      pathname.startsWith("/plans/") ||
      pathname.startsWith("/training-plans/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the overlay whenever navigation happens.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-baseline gap-1 font-semibold">
          <span className="text-lg tracking-tight">anystride</span>
          <span className="h-2 w-2 translate-y-[-1px] rounded-full bg-brand" />
        </Link>

        <nav className="hidden items-center gap-5 text-sm md:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "font-medium text-brand"
                    : "text-muted-foreground transition-colors duration-300 ease-stride hover:text-foreground"
                }
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/plans"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-all duration-300 ease-stride hover:bg-brand/90 active:scale-[0.98]"
          >
            Find your plan
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="relative z-50 flex h-10 w-10 items-center justify-center md:hidden"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 block h-0.5 w-5 bg-foreground transition-all duration-300 ease-stride ${
                open ? "top-1/2 -translate-y-1/2 rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-1/2 block h-0.5 w-5 -translate-y-1/2 bg-foreground transition-all duration-300 ease-stride ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute bottom-0 left-0 block h-0.5 w-5 bg-foreground transition-all duration-300 ease-stride ${
                open ? "bottom-1/2 translate-y-1/2 -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      {/* Mobile overlay menu */}
      <div
        className={`fixed inset-0 z-40 flex flex-col bg-background/80 backdrop-blur-3xl transition-opacity duration-300 ease-stride md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <nav className="mt-24 flex flex-col gap-2 px-8">
          {NAV_LINKS.map(({ href, label }, i) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                style={{ transitionDelay: open ? `${100 + i * 50}ms` : "0ms" }}
                className={`text-3xl font-semibold tracking-tight transition-all duration-700 ease-stride ${
                  open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
                } ${active ? "text-brand" : ""}`}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/plans"
            style={{
              transitionDelay: open ? `${100 + NAV_LINKS.length * 50}ms` : "0ms",
            }}
            className={`mt-6 w-max rounded-full bg-brand px-6 py-2 text-base font-semibold text-brand-foreground transition-all duration-700 ease-stride active:scale-[0.98] ${
              open ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
            }`}
          >
            Find your plan
          </Link>
        </nav>
      </div>
    </header>
  );
}
