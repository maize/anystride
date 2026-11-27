/** Public GA4 measurement id. An env var can override it per environment. */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-QHBHKRHCZJ";

export function isGaMeasurementId(value: string) {
  return /^G-[A-Z0-9]+$/.test(value);
}
