import Link from "next/link";
import type { MarketplaceActor } from "@/lib/marketplace-auth";
import { coachProfileMergeMatches } from "@/lib/coach-profile-merge-store";

export async function CoachProfileMergeNotice({ actor }: { actor: MarketplaceActor }) {
  const matches = await coachProfileMergeMatches(actor);
  if (!matches.length) return null;
  return <section className="mb-8 rounded-xl bg-muted p-6" aria-labelledby="coach-match-notice">
    <h2 id="coach-match-notice" className="text-xl font-semibold">Your coaching profile is already here</h2>
    <p className="mt-3 text-sm text-muted-foreground">An imported coach profile matches your verified email. Review it and merge it with your Anystride account.</p>
    <Link href="/account/services#merge-profile" prefetch={false} className="action-link mt-4">Review and merge profile →</Link>
  </section>;
}
