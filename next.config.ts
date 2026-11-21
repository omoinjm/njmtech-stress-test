import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // cacheComponents/partial prefetching are off: on the Workers runtime (workerd) Next warns that
  // Cache Components can't run reliably with its setTimeout() and dynamic renders hang. Every page
  // here is per-user/request-time anyway, so nothing is lost.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// Makes D1 + vars from wrangler.jsonc available to `next dev` via getCloudflareContext().
initOpenNextCloudflareForDev();
