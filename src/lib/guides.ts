import { GUIDES, type Guide } from "@/data/guides";

export function getAllGuides(): Guide[] {
  return [...GUIDES].sort((a, b) => b.updated.localeCompare(a.updated));
}

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
