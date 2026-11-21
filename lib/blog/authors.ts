import type { Author } from "./types";

// Edit the byline/bio here. Shown on every post and emitted as schema.org Person.
export const AUTHORS: Record<string, Author> = {
  founder: {
    id: "founder",
    name: "Nhlanhla Malaza",
    role: "Founder, NJM Tech",
    bio: "Builds and secures websites and web apps for South African businesses, and built NJM Tech Security to make website security checks free and understandable.",
  },
};
