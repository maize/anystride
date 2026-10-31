import { COACH_FOCUS_LABELS, type Coach, type CoachFocus, type CoachFormat } from "@/data/coaches";
import type { StorefrontProfile } from "./storefront-store";

export interface ApprovedDirectoryCoach {
  name: string; bio: string; credentials: string; slug: string | null; directory_slug: string | null;
}
export interface DirectoryMerge { directory_slug: string; storefront_slug: string | null; status: string }
export interface DirectoryFilters { city?: string; focus?: CoachFocus; format?: CoachFormat }
export interface DirectoryCard {
  key: string; href?: string; approved: boolean;
  coach: Pick<Coach, "name" | "blurb" | "specialties"> & Partial<Pick<Coach, "slug" | "location" | "format" | "verified">>;
  application?: Pick<ApprovedDirectoryCoach, "bio" | "credentials">;
}

/** Combine only explicitly linked identities; matching names never proves ownership. */
export function coachDirectoryCards(directory: Coach[], approved: ApprovedDirectoryCoach[], storefronts: StorefrontProfile[], merges: DirectoryMerge[], filters: DirectoryFilters = {}): DirectoryCard[] {
  const bySlug = new Map(directory.map((coach) => [coach.slug, coach]));
  const storefrontSlugs = new Set(storefronts.map((profile) => profile.slug));
  const represented = new Set(merges.filter((merge) => merge.status === "suspended").map((merge) => merge.directory_slug));
  const matches = (coach: Coach) => (!filters.city || coach.city === filters.city) && (!filters.focus || coach.focus.includes(filters.focus)) && (!filters.format || coach.format === filters.format);
  const cards: DirectoryCard[] = [];
  for (const profile of storefronts) {
    const imported = bySlug.get(merges.find((merge) => merge.status === "approved" && merge.storefront_slug === profile.slug)?.directory_slug ?? "");
    if (imported) represented.add(imported.slug);
    const visible = imported ? matches(imported) :
      (!filters.city || profile.location.toLowerCase().split(/[,·]/).some((part) => part.trim() === filters.city!.toLowerCase())) &&
      (!filters.focus || profile.specialties.some((specialty) => specialty.toLowerCase() === COACH_FOCUS_LABELS[filters.focus!].toLowerCase())) &&
      (!filters.format || (filters.format === "online" && profile.location.toLowerCase() === "online"));
    if (visible) cards.push({ key: `storefront:${profile.slug}`, href: `/coaching/with/${profile.slug}`, approved: true, coach: { name: profile.name, location: profile.location, blurb: profile.headline, specialties: profile.specialties, format: imported?.format } });
  }
  for (const [index, coach] of approved.entries()) {
    const imported = bySlug.get(coach.directory_slug ?? "");
    if (imported) represented.add(imported.slug);
    if (coach.slug && storefrontSlugs.has(coach.slug)) continue;
    if (imported ? !matches(imported) : Boolean(filters.city || filters.focus || filters.format)) continue;
    cards.push({ key: `approved:${coach.directory_slug ?? index}`, approved: true, href: imported ? `/coaching/${imported.slug}` : undefined,
      coach: imported ? { ...imported, name: coach.name } : { name: coach.name, blurb: coach.bio.length > 280 ? `${coach.bio.slice(0, 277).trimEnd()}…` : coach.bio, specialties: [] },
      application: { bio: coach.bio, credentials: coach.credentials } });
  }
  for (const coach of directory) if (!represented.has(coach.slug) && matches(coach)) cards.push({ key: `directory:${coach.slug}`, approved: false, href: `/coaching/${coach.slug}`, coach });
  return cards;
}
