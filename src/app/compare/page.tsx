import Link from "next/link";
import type { Metadata } from "next";
import { getAllPlans } from "@/lib/plans";
import { ComparisonTable } from "@/components/ComparisonTable";

export const metadata: Metadata = {
  title: "Compare training plans",
  description:
    "Compare free running training plans side by side — distance, length, weekly time, intensity, and what each one builds up to.",
};

export default function ComparePage() {
  const plans = getAllPlans();

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Compare plans</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        The hardest part of choosing a plan is seeing how they actually differ.
        Here&apos;s every plan side by side — time commitment, intensity, what you
        need before starting, and the biggest session you build up to.
      </p>

      <div className="mt-8">
        <ComparisonTable plans={plans} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link href="/plans" className="text-brand hover:underline">
          Browse as cards →
        </Link>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          Tap any plan name to see the full week-by-week schedule.
        </span>
      </div>
    </div>
  );
}
