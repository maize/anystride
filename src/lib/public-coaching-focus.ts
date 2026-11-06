import "server-only";
import { cache } from "react";
import { getAllCoachesWithDiscovered } from "./coaches";
import { coachDirectoryCards } from "./coach-directory";
import { publicApprovedCoaches } from "./marketplace-store";
import { publicStorefronts } from "./storefront-store";
import { publicCoachProfileMerges } from "./coach-profile-merge-store";
import { coachingFocusPages, minimumFocusListings } from "./coaching-focus";
export const publicCoachingFocusCards = cache(async () => {
  const [directory, approved, storefronts, merges] = await Promise.all([getAllCoachesWithDiscovered(), publicApprovedCoaches().catch(() => []), publicStorefronts().catch(() => []), publicCoachProfileMerges()]);
  return Object.fromEntries(Object.entries(coachingFocusPages).map(([slug, page]) => [slug, coachDirectoryCards(directory, approved, storefronts, merges, { focus: page.focus })]));
});
export async function indexableCoachingFocusPaths() {
  const categories = await publicCoachingFocusCards();
  return Object.entries(categories).filter(([, cards]) => cards.length >= minimumFocusListings).map(([slug]) => `/coaching/focus/${slug}`);
}
