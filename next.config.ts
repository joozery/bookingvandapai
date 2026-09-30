import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Send share tags in the initial HTML, including for LINE preview crawlers.
  htmlLimitedBots: /.*/,
};

export default nextConfig;
