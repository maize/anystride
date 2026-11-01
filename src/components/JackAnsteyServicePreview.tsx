import { COACHES } from "@/data/coaches";
import { CoachStorefront } from "./CoachStorefront";
import type { Storefront } from "@/lib/storefront-store";

/** Presentation only: never persisted or passed to checkout. All purchase controls are disabled. */
export function JackAnsteyServicePreview() {
  const coach = COACHES.find((entry) => entry.slug === "jack-anstey")!;
  const storefront: Storefront = {
    profile: {
      slug: coach.slug, name: coach.name, bio: coach.blurb, credentials: coach.bio[0],
      headline: "Personal running coaching, from 800m to the marathon.", location: coach.location,
      photo_url: "", specialties: coach.specialties, approach: coach.bio.slice(1).join("\n\n"), published: false, version: 0,
    },
    offers: [{
      id: "example-coaching-layout", title: "Individual online coaching", kind: "package",
      description: "An example of how Jack’s coaching package could be presented: a personal training plan, regular communication, training adjustments and race planning. Jack would confirm exactly what is included before this offer is published.",
      amount: 0, currency: "usd", duration_weeks: 4, status: "pending", version: 0,
      inclusions: ["Personalized training plan", "Ongoing feedback", "Training adjustments", "Race planning"],
      delivery: "Example: online coaching over four weeks. Jack will set the final duration and delivery details.",
      cancellation: "Jack will provide the cancellation and refund terms before publishing.", available: false,
    }],
  };
  return <CoachStorefront storefront={storefront} example />;
}
