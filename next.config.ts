import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CloudBase/Node SSR friendly build output
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
