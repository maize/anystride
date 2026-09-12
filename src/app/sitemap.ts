import type { MetadataRoute } from "next";
import { BASE, getAllSitePaths, getSiteRevisions } from "@/lib/site-urls";

export default function sitemap(): MetadataRoute.Sitemap {
  const revisions = getSiteRevisions();
  return getAllSitePaths().map((path) => ({
    url: `${BASE}${path}`,
    lastModified: revisions.get(path),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    // Top-level sections slightly higher priority than leaf pages.
    priority: path === "/" ? 1 : path.split("/").length <= 2 ? 0.8 : 0.6,
  }));
}
