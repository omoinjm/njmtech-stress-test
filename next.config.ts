import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // Don't advertise the framework (our own scanner flags X-Powered-By as a version leak).
  poweredByHeader: false,
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
