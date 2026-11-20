export type ForYouImage = { src: string; alt: string };

/** The published facts a For you section shows about one project. */
export type ForYouProject = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  /** Keyed by the image references a plan picks from. */
  images: Record<string, ForYouImage>;
};
