export const ENQUIRY_CONSENT_VERSION = "2026-09-12-contact-v1";
export const COACH_GOALS = {
  general: "Consistent running", "5k": "5K", "10k": "10K",
  "half-marathon": "Half marathon", marathon: "Marathon", ultra: "Trail / ultra",
} as const;
export const COACH_FORMATS = { online: "Online", local: "In person", either: "Either" } as const;
export const PARTNER_TYPES = {
  coach: "Coaching enquiries", race: "Race promotion", brand: "Editorial sponsorship",
  race_hub: "Race preparation hub",
} as const;
export type PartnerInterest = keyof typeof PARTNER_TYPES;
export type EnquiryKind = "coach_match" | "partnership";
export interface Enquiry {
  id: string;
  kind: EnquiryKind;
  name: string;
  email: string;
  details: Record<string, string>;
  consentVersion: string;
}

function field(value: unknown, max: number): string {
  return typeof value === "string" && value.trim().length <= max ? value.trim() : "";
}
function choice(value: unknown, options: object): value is string {
  return typeof value === "string" && Object.hasOwn(options, value);
}

/** Keep only explicitly collected fields. Never store arbitrary request payloads. */
export function parseEnquiry(body: unknown): { enquiry: Enquiry } | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Please complete the enquiry form." };
  const b = body as Record<string, unknown>;
  if (b.kind !== "coach_match" && b.kind !== "partnership") return { error: "Choose a valid enquiry type." };
  if (typeof b.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.id)) return { error: "Please reload the form and try again." };
  const name = field(b.name, 120);
  const email = field(b.email, 254).toLowerCase();
  if (!name) return { error: "Enter your name (up to 120 characters)." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (b.consent !== true) return { error: "Confirm that Anystride may contact you about this request." };
  if (b.companyFax !== "") return { error: "Please leave the spam-protection field empty." };
  const details: Record<string, string> = {};
  if (b.kind === "coach_match") {
    if (!choice(b.goal, COACH_GOALS) || !choice(b.format, COACH_FORMATS)) return { error: "Choose your goal and coaching format." };
    const location = field(b.location, 120);
    if ((b.format === "local" && !location) || (typeof b.location === "string" && b.location.trim().length > 120)) return { error: "Enter your city (up to 120 characters) for in-person coaching." };
    Object.assign(details, { goal: b.goal, format: b.format, location });
  } else {
    const organisation = field(b.organisation, 160);
    const message = field(b.message, 1000);
    if (!choice(b.interest, PARTNER_TYPES)) return { error: "Choose a valid partnership interest." };
    if (!organisation || (b.organisation !== undefined && (typeof b.organisation !== "string" || b.organisation.trim().length > 160))) return { error: "Enter your organisation (up to 160 characters)." };
    if (!message || (b.message !== undefined && (typeof b.message !== "string" || b.message.trim().length > 1000))) return { error: "Enter a short message (up to 1,000 characters)." };
    Object.assign(details, { organisation, interest: b.interest, message });
  }
  return { enquiry: { id: b.id, kind: b.kind, name, email, details, consentVersion: ENQUIRY_CONSENT_VERSION } };
}
