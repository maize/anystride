import Link from "next/link";
import type { Metadata } from "next";
import { CoachApplicationForm } from "@/components/CoachApplicationForm";

export const metadata: Metadata = {
  title: "List your coaching",
  description:
    "Are you a running coach? Apply to be listed on AnyStride and reach runners who've outgrown a training plan.",
  alternates: { canonical: "/coaching/apply" },
};

export default async function CoachApplyPage({
  searchParams,
}: PageProps<"/coaching/apply">) {
  const sp = await searchParams;
  const claimSlug = (Array.isArray(sp.claim) ? sp.claim[0] : sp.claim) ?? "";

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <Link
        href="/coaching"
        className="text-sm font-medium text-muted-foreground hover:text-brand"
      >
        ← Back to coaches
      </Link>

      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        {claimSlug ? "Claim your profile" : "List your coaching on AnyStride"}
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        {claimSlug
          ? "Tell us a few details so we can verify and hand over your listing."
          : "Reach runners who've finished a plan and want a real coach. We review every coach personally — it's free while we build out the directory."}
      </p>

      <div className="mt-8">
        <CoachApplicationForm claimSlug={claimSlug} />
      </div>
    </div>
  );
}
