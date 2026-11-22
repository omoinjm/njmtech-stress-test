import { urlForImage } from "@/lib/sanity/image";

type Img = { alt?: string; asset?: { _ref: string } } | null | undefined;

const RATIO = 630 / 1200; // our share cards are 1200×630; crop everything to the same shape

/**
 * Responsive Sanity image (WebP/AVIF via auto=format) with fixed dimensions to avoid layout shift.
 * `priority` for the hero (LCP): eager + fetchpriority=high; otherwise lazy.
 */
export function PostImage({ image, alt, sizes, priority = false, className = "" }: {
  image: Img;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!image?.asset) return null;
  const src = (w: number) => urlForImage(image).width(w).height(Math.round(w * RATIO)).fit("crop").auto("format").url();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src(1200)}
      srcSet={[400, 800, 1200, 1600].map((w) => `${src(w)} ${w}w`).join(", ")}
      sizes={sizes}
      width={1200}
      height={630}
      alt={image.alt || alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      className={`aspect-[1200/630] w-full bg-black/5 object-cover dark:bg-white/5 ${className}`}
    />
  );
}
