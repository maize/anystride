import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{
      source: "/guides/fueling-long-runs",
      destination: "/guides/fueling-for-long-runs",
      permanent: true,
    }];
  },
};

export default nextConfig;
