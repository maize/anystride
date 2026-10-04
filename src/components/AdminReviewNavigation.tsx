import Link from "next/link";

export function AdminReviewNavigation({ active, coaches, services }: { active: "coaches" | "services" | "imported"; coaches?: number; services?: number }) {
  const links = [
    { key: "coaches", href: "/account/review?type=coaches", label: `Coach applications${coaches === undefined ? "" : ` (${coaches} pending)`}` },
    { key: "services", href: "/account/review?type=services", label: `Service proposals${services === undefined ? "" : ` (${services} pending)`}` },
    { key: "imported", href: "/account/review/imported", label: "Imported coaches" },
  ];
  return <nav aria-label="Review type" className="mb-8 flex flex-wrap gap-6 text-sm font-semibold">{links.map((link) => <Link key={link.key} href={link.href} aria-current={active === link.key ? "page" : undefined} className={active === link.key ? "text-brand underline underline-offset-8" : "text-muted-foreground hover:text-brand"}>{link.label}</Link>)}</nav>;
}
