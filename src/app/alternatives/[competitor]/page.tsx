import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoachingComparison } from "@/components/CoachingComparison";
import { coachingCompetitors, isCoachingCompetitor } from "@/lib/coaching-comparisons";
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(coachingCompetitors).map(competitor => ({ competitor })); }
export async function generateMetadata({ params }: { params: Promise<{ competitor: string }> }): Promise<Metadata> {
  const { competitor } = await params;
  if (!isCoachingCompetitor(competitor)) notFound();
  const entry = coachingCompetitors[competitor];
  return { title: `${entry.name} alternative for running coaches`, description: entry.description, alternates: { canonical: `/alternatives/${competitor}` } };
}
export default async function AlternativePage({ params }: { params: Promise<{ competitor: string }> }) {
  const { competitor } = await params;
  if (!isCoachingCompetitor(competitor)) notFound();
  return <CoachingComparison competitor={competitor} />;
}
