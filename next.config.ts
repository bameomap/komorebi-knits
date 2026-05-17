import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.ravelrycache.com" },
      { protocol: "https", hostname: "**.ravelry.com" },
    ],
  },
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@prisma/client",
    "@prisma/driver-adapter-utils",
  ],
  turbopack: {},
};

export default nextConfig;
