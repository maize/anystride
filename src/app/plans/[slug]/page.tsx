import { PlanDetail } from "@/components/PlanDetail";
import type { Metadata } from "next";
import { getAllPlans, getPlanBySlug } from "@/lib/plans";

export function generateStaticParams() {
  return getAllPlans().map((plan) => ({ slug: plan.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/plans/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const plan = getPlanBySlug(slug);
  if (!plan) return { title: "Plan not found" };
  return {
    title: plan.slug === "pfitzinger-18-55"
      ? "Pfitzinger 18/55 Marathon Plan: Mileage and Overview"
      : plan.name,
    description: plan.slug === "pfitzinger-18-55"
      ? "Explore the Pfitz 18/55 marathon plan: 18 weeks, up to 55 miles a week, starting requirements and training structure. Read our overview and find the source."
      : plan.summary,
    alternates: { canonical: `/plans/${plan.slug}` },
  };
}

export default function PlanPage({ params }: PageProps<"/plans/[slug]">) {
  return <PlanDetail params={params} />;
}
