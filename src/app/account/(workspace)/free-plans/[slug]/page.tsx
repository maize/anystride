import { PlanDetail } from "@/components/PlanDetail";

export default function FreePlanPage({ params }: { params: Promise<{ slug: string }> }) {
  return <PlanDetail params={params} basePath="/account/free-plans" />;
}
