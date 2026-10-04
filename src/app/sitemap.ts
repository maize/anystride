import type { MetadataRoute } from "next";
import { BASE, getAllSitePathsWithDiscovered, getSiteRevisions } from "@/lib/site-urls";
import { publicStorefronts } from "@/lib/storefront-store";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const revisions = getSiteRevisions();
  const [paths, profiles] = await Promise.all([getAllSitePathsWithDiscovered(), publicStorefronts().catch(() => [])]);
  return [...paths, ...profiles.map((profile) => `/coaching/with/${profile.slug}`)].map((path) => ({
    url: `${BASE}${path}`,
    lastModified: revisions.get(path),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    // Top-level sections slightly higher priority than leaf pages.
    priority: path === "/" ? 1 : path.split("/").length <= 2 ? 0.8 : 0.6,
  }));
}
