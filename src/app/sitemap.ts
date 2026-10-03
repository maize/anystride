import type { MetadataRoute } from "next";
import { BASE, getAllSitePathsWithDiscovered, getSiteRevisions } from "@/lib/site-urls";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const revisions = getSiteRevisions();
  return (await getAllSitePathsWithDiscovered()).map((path) => ({
    url: `${BASE}${path}`,
    lastModified: revisions.get(path),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    // Top-level sections slightly higher priority than leaf pages.
    priority: path === "/" ? 1 : path.split("/").length <= 2 ? 0.8 : 0.6,
  }));
}
