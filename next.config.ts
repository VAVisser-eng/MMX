import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mmxbv.nl",
      },
      {
        protocol: "https",
        hostname: "www.mmxbv.nl",
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
