import type { Metadata } from "next";
import { PaceCalculator } from "@/components/PaceCalculator";

export const metadata: Metadata = {
  title: "Pace calculator & plan finder",
  description:
    "Enter a recent finish time or goal, plus your weekly mileage. Get your training paces, equivalent race times, and the plans that fit you.",
};

export default function CalculatorPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        Paces &amp; plan finder
      </h1>
      <p className="mt-2 text-muted-foreground">
        Plug in a recent race result (or a goal time) and your current weekly
        mileage. You&apos;ll get your personal training paces, equivalent times at
        every distance, and the plans that match where you are right now.
      </p>

      <div className="mt-8">
        <PaceCalculator />
      </div>
    </div>
  );
}
