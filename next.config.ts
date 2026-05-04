import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CloudBase/Node SSR friendly build output
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.sacred-texts.com",
        pathname: "/tarot/pkt/img/**",
      },
    ],
  },
};

export default nextConfig;
