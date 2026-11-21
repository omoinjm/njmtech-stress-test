import { createClient, type QueryParams } from "@sanity/client";

// Not secret: project/dataset are also in wrangler.jsonc vars. The read token is a secret.
export const sanityConfig = {
  projectId: process.env.SANITY_PROJECT_ID || "w1uoie7f",
  dataset: process.env.SANITY_DATASET || "production",
  apiVersion: "2026-11-21",
};

/** Published content via Sanity's CDN (public dataset: no token needed). */
const publicClient = createClient({ ...sanityConfig, useCdn: true, perspective: "published" });

/** Drafts + published, fresh from the API. Admin previews only; needs SANITY_API_READ_TOKEN. */
function previewClient() {
  const token = process.env.SANITY_API_READ_TOKEN;
  if (!token) return null;
  return createClient({ ...sanityConfig, useCdn: false, token, perspective: "drafts" });
}

export async function sanityFetch<T>(query: string, params: QueryParams = {}, opts: { preview?: boolean } = {}): Promise<T> {
  const client = (opts.preview && previewClient()) || publicClient;
  return client.fetch<T>(query, params);
}
