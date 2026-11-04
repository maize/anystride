import type { Metadata } from "next";
import { PlanLibrary } from "@/components/PlanLibrary";

export const metadata: Metadata = {
  title: "Free running training plans by distance and level",
  description:
    "Compare free running schedules and training-method overviews for 5K, 10K, half marathon and marathon races. Filter by distance and experience.",
  alternates: { canonical: "/plans" },
};

export default function PlansPage({ searchParams }: PageProps<"/plans">) {
  return <PlanLibrary searchParams={searchParams} />;
}
