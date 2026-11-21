import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig({});

// `pnpm build` runs the OpenNext build (that's what Cloudflare Workers Builds calls), so OpenNext
// must call `next build` directly; otherwise it would invoke `pnpm build` again and loop.
config.buildCommand = "pnpm exec next build";

export default config;
