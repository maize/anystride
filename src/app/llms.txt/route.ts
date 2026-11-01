import { storefrontFeeDescription, workspacePricingDescription } from "@/lib/public-product";
export function GET() {
  return new Response(`# Anystride

> Training plans and coaching for runners, with tools for independent running coaches.

Public plans and guides are free to read without an account. Coaches set their own service prices. ${storefrontFeeDescription} ${workspacePricingDescription}

Approved coaches can invite athletes, build plans of 1 to 24 weeks and assign workouts. Athletes accept invitations and can revoke calendar access. Runner and coach views use the same account.

Strava syncing is a limited beta with capacity for ten connected athletes across the app. Activity sharing needs separate permission for each coach. Only You activities are not shared with coaches. Direct Garmin or COROS syncing and workout delivery to watches are not available.

## Product and costs
- [Pricing](https://anystride.com/pricing): costs and selling requirements.
- [Plain text pricing](https://anystride.com/pricing.txt): the same pricing information.
- [Tools for coaches](https://anystride.com/for-coaches): capabilities, approval and limitations.
- [Running coaches](https://anystride.com/coaches): independent profiles and services.

## Training resources
- [Free training plans](https://anystride.com/plans): schedules for 5K through marathon.
- [Running guides](https://anystride.com/guides): general training information and sources.
- [Editorial standards](https://anystride.com/editorial): responsibility, sourcing and corrections.
- [Privacy](https://anystride.com/privacy): account and activity data handling.
- [Terms](https://anystride.com/terms): service conditions.
`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
