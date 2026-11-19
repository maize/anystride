import { PlanDetail } from "@/components/PlanDetail";
import type { Metadata } from "next";
import { planRouteMetadata } from "@/lib/plan-page-metadata";
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
  return planRouteMetadata(plan);
}

export default function PlanPage({ params }: PageProps<"/plans/[slug]">) {
  return <PlanDetail params={params} />;
}
