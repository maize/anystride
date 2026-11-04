import { PlanLibrary } from "@/components/PlanLibrary";

export default function FreePlansPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PlanLibrary searchParams={searchParams} basePath="/account/free-plans" />;
}
