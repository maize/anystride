import type { MetadataRoute } from "next";
import { BASE, getAllSitePaths } from "@/lib/site-urls";

export default function sitemap(): MetadataRoute.Sitemap {
  return getAllSitePaths().map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    // Top-level sections slightly higher priority than leaf pages.
    priority: path === "/" ? 1 : path.split("/").length <= 2 ? 0.8 : 0.6,
  }));
}
