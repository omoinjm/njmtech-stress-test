import imageUrlBuilder from "@sanity/image-url";
import { sanityConfig } from "./client";

const builder = imageUrlBuilder({ projectId: sanityConfig.projectId, dataset: sanityConfig.dataset });

/** Image-asset URL builder (CDN). Use .width()/.height()/.fit() then .url(). */
export const urlForImage = (source: Parameters<typeof builder.image>[0]) => builder.image(source);
