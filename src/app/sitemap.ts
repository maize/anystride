import type { MetadataRoute } from "next";
import { getAllPlans } from "@/lib/plans";

const BASE = "https://anystride.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/plans`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/compare`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/calculator`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/coaching`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const planRoutes: MetadataRoute.Sitemap = getAllPlans().map((plan) => ({
    url: `${BASE}/plans/${plan.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...planRoutes];
}
