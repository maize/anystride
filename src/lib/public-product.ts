// Published commercial policy, confirmed in docs/coach-storefront-setup.md.
// Keep this in sync with the separately configured checkout fee when policy changes.
export const productUpdated = "2026-10-31";
export const storefrontFeeDescription = "Anystride takes a 10% commission on storefront sales, including payment processing.";
export const workspacePricingDescription = "The training workspace is in early access. Subscription pricing has not been announced.";
export const pricingSections = [
  { title: "Free plans and browsing", body: "Public training plans, running guides, the plan finder and coach directory are free to use without an account." },
  { title: "Personal coaching", body: "Independent coaches set their own service prices. Each offer shows its currency, inclusions, delivery and cancellation conditions before purchase. Creating an account is free." },
  { title: "Selling coaching services", body: `${storefrontFeeDescription} On a $200 USD sale, the commission is $20 and the coach’s share is $180 before refunds or disputes. Coach and service approval, a published storefront and completed Stripe payout setup are required. Payout timing is shown in Stripe.` },
  { title: "Training tools for coaches", body: `${workspacePricingDescription} Approved coaches can invite athletes, build plans and assign workouts. A storefront purchase is not required to establish a coaching relationship; athletes accept an invitation.` },
];
export function pricingText() {
  return `# Anystride pricing\n\nUpdated: ${productUpdated}\nCanonical page: https://anystride.com/pricing\n\n${pricingSections.map(s => `## ${s.title}\n\n${s.body}`).join("\n\n")}\n\nTerms: https://anystride.com/terms\nContact: hello@anystride.com\n`;
}
