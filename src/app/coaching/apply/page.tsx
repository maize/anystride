import type { Metadata } from "next";
import { CoachAccountEntry } from "@/components/CoachAccountEntry";
export const metadata: Metadata = { title: "Coach sign up and sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function CoachApplyPage({ searchParams }: PageProps<"/coaching/apply">) {
  const sp = await searchParams;
  return <CoachAccountEntry claim={typeof sp.claim === "string" ? sp.claim : ""} />;
}
