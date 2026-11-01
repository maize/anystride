export interface AccountLink { href: string; label: string }

export function accountNavigation({ training, coach, view = coach ? "coach" : "runner", applicant = coach }: { training: boolean; coach: boolean; view?: "runner" | "coach"; applicant?: boolean }) {
  const primary: AccountLink[] = [{ href: "/account", label: "Overview" }];
  if (view === "coach") {
    if (training && coach) primary.push({ href: "/account/athletes", label: "Athletes" }, { href: "/account/plans", label: "Training plans" });
    if (applicant) primary.push({ href: "/account/storefront", label: "My profile" });
    primary.push({ href: "/account/services", label: coach ? "Services & enquiries" : "Coach application" });
    if (coach) primary.push({ href: "/account/orders", label: "Sales" });
  } else if (training) primary.push(
    { href: "/account/training", label: "Training calendar" },
    { href: "/account/athletes", label: "My coaches" },
    { href: "/plans", label: "Free plans" },
    { href: "/account/connections", label: "Strava connection" },
  );
  return primary;
}

export function accountLinkActive(pathname: string, href: string, athleteCalendar = false) {
  if (pathname === "/account/training" && athleteCalendar) return href === "/account/athletes";
  if (href === "/account") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`) ||
    (href === "/account/services" && pathname === "/account/enquiries") ||
    (href === "/account/coaching" && pathname.startsWith("/account/workspaces/"));
}
