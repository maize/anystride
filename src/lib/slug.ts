/** "New York" -> "new-york", "San Francisco" -> "san-francisco". */
export function citySlug(city: string): string {
  return city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
