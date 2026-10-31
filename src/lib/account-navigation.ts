export interface AccountLink { href: string; label: string }

export function accountNavigation({ training, coach }: { training: boolean; coach: boolean }) {
  const primary: AccountLink[] = [{ href: "/account", label: "Overview" }];
  if (training) primary.push(
    { href: "/account/training", label: "Training calendar" },
    { href: "/account/athletes", label: coach ? "Athletes" : "My coaches" },
    { href: coach ? "/account/plans" : "/plans", label: coach ? "Training plans" : "Free plans" },
    { href: "/account/connections", label: "Strava connection" },
  );
  return primary;
}

export function accountLinkActive(pathname: string, href: string) {
  if (href === "/account") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`) ||
    (href === "/account/services" && pathname === "/account/enquiries") ||
    (href === "/account/coaching" && pathname.startsWith("/account/workspaces/"));
}
