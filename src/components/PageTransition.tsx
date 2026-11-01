"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/** Animate only the content that changed; never remount the shared shell or forms. */
export function PageTransition({ children, scope = "public" }: { children: ReactNode; scope?: "public" | "account" }) {
  const pathname = usePathname();
  const content = useRef<HTMLDivElement>(null);
  const previousPath = useRef(pathname);
  useEffect(() => {
    const changed = previousPath.current !== pathname;
    previousPath.current = pathname;
    if (!changed || (scope === "public" && pathname.startsWith("/account")) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = content.current?.animate([
      { opacity: 0.7, transform: "translateY(4px)" },
      { opacity: 1, transform: "translateY(0)" },
    ], { duration: 160, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    return () => animation?.cancel();
  }, [pathname, scope]);
  return <div ref={content}>{children}</div>;
}
