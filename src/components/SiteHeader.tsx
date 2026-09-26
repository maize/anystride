"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/plans", label: "Plans" },
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
  const [openPath, setOpenPath] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const open = openPath === pathname;

  useEffect(() => {
    if (!open) return;

    const menu = menuRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusable = menu?.querySelectorAll<HTMLElement>("a[href], button");
    focusable?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenPath(null);
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const desktop = window.matchMedia("(min-width: 768px)");
    function handleBreakpoint(event: MediaQueryListEvent) {
      if (event.matches) setOpenPath(null);
    }
    desktop.addEventListener("change", handleBreakpoint);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktop.removeEventListener("change", handleBreakpoint);
      trigger?.focus();
    };
  }, [open]);

  function closeMenu() {
    setOpenPath(null);
  }

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex items-baseline gap-1 font-semibold"
        >
          <span className="text-lg tracking-tight">anystride</span>
          <span aria-hidden="true" className="h-2 w-2 -translate-y-px rounded-full bg-brand" />
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-5 text-sm md:flex">
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
            href="/#plan-finder"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-all duration-300 ease-stride hover:bg-brand/90 active:scale-[0.98]"
          >
            Find my plan
          </Link>
        </nav>

        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpenPath(open ? null : pathname)}
          aria-expanded={open}
          aria-controls={open ? "mobile-navigation" : undefined}
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

      {open && (
        <div
          ref={menuRef}
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
          className="fixed inset-0 z-40 flex flex-col bg-background/80 backdrop-blur-3xl md:hidden"
        >
          <nav className="mt-24 flex flex-col gap-2 px-8">
            {NAV_LINKS.map(({ href, label }, i) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  aria-current={active ? "page" : undefined}
                  style={{ transitionDelay: `${100 + i * 50}ms` }}
                  className={`text-3xl font-semibold tracking-tight transition-all duration-700 ease-stride ${
                    active ? "text-brand" : ""
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href="/#plan-finder"
              onClick={closeMenu}
              style={{
                transitionDelay: `${100 + NAV_LINKS.length * 50}ms`,
              }}
              className="mt-6 w-max rounded-full bg-brand px-6 py-2 text-base font-semibold text-brand-foreground transition-all duration-700 ease-stride active:scale-[0.98]"
            >
              Find my plan
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
