import Link from "next/link";
import type { Metadata } from "next";
import { getAllGuides } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Running guides",
  description:
    "Free, practical running guides: how long to train for a race, training paces explained, choosing a plan, and the complete Couch to 5K guide.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  const guides = getAllGuides();

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <h1 className="text-hero-gradient text-3xl font-bold tracking-tight">Running guides</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Practical, no-nonsense answers to the questions runners actually ask —
        then the free plans and tools to act on them.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {guides.map((guide) => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="group flex flex-col rounded-xl border border-border p-5 transition-all duration-300 ease-stride hover:-translate-y-0.5 hover:border-brand"
          >
            <h2 className="text-lg font-semibold tracking-tight transition-colors duration-300 ease-stride group-hover:text-brand">
              {guide.title}
            </h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">
              {guide.description}
            </p>
            <span className="mt-4 text-sm font-medium text-brand">
              Read guide →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
