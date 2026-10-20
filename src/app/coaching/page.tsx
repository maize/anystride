import { permanentRedirect } from "next/navigation";
export default async function CoachingPage({ searchParams }: PageProps<"/coaching">) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, item);
  }
  permanentRedirect(`/coaches${query.size ? `?${query}` : ""}`);
}
