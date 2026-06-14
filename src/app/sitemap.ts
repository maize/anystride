import type { MetadataRoute } from "next";
import { getAllPlans } from "@/lib/plans";
import { getAllGuides } from "@/lib/guides";

const BASE = "https://anystride.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/plans`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/guides`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/compare`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/calculator`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/coaching`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const planRoutes: MetadataRoute.Sitemap = getAllPlans().map((plan) => ({
    url: `${BASE}/plans/${plan.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const guideRoutes: MetadataRoute.Sitemap = getAllGuides().map((guide) => ({
    url: `${BASE}/guides/${guide.slug}`,
    lastModified: new Date(guide.updated),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...planRoutes, ...guideRoutes];
}
