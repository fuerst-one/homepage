import { getMaltMirror } from "@/server/malt/getMaltMirror";
import type { Locale } from "@/lib/i18n";
import { unstable_cache } from "next/cache";
import { getCvOwner, toPublicOwner, localizeOwner } from "./getCvOwner";

export const CV_OWNER_CACHE_TAG = "cv-owner";

const getCachedOwnerSource = unstable_cache(
  () => getCvOwner(),
  ["cv-owner-i18n-v1"],
  { tags: [CV_OWNER_CACHE_TAG], revalidate: 3600 },
);

export const getCachedCvOwner = async (locale: Locale = "en") =>
  localizeOwner(await getCachedOwnerSource(), locale);

export const getCachedCvOwnerPublic = async (locale: Locale = "en") => {
  const [owner, malt] = await Promise.all([
    getCachedCvOwner(locale),
    getMaltMirror(),
  ]);
  return { ...toPublicOwner(owner), available: malt.available, malt };
};
