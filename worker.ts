// Worker entry: the OpenNext-built Next.js app + our Cloudflare Workflows in one Worker.
// Generated at build time by `opennextjs-cloudflare build`.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: the file only exists after the first build
import { default as handler } from "./.open-next/worker.js";

export { ScanWorkflow, LoadShardWorkflow } from "./workers/scan-workflow";

export default {
  fetch: handler.fetch,
} satisfies ExportedHandler<CloudflareEnv>;
