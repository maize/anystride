import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/account/:path*", headers: [
      { key: "Cache-Control", value: "private, no-store" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Referrer-Policy", value: "no-referrer" },
    ] }];
  },
  async redirects() {
    return [{
      source: "/guides/fueling-long-runs",
      destination: "/guides/fueling-for-long-runs",
      permanent: true,
    }];
  },
};

export default nextConfig;
