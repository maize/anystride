import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // OAuth codes and webhook verification secrets must stay out of dev logs.
  logging: { incomingRequests: { ignore: [/\/api\/strava\/callback/, /\/api\/strava\/webhook\//] } },
  async headers() {
    return [{ source: "/account/:path*", headers: [
      { key: "Cache-Control", value: "private, no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ] }];
  },
  async redirects() {
    return [{ source: "/coaching", destination: "/coaches", permanent: true }, {
      source: "/guides/fueling-long-runs",
      destination: "/guides/fueling-for-long-runs",
      permanent: true,
    }];
  },
};

export default nextConfig;
