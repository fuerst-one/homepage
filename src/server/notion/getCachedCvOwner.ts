import { getMaltMirror } from "@/server/malt/getMaltMirror";
import type { Locale } from "@/lib/i18n";
import { toPublicOwner, localizeOwner } from "./ownerView";
import { readWebsiteSection } from "./websiteContent";

export const CV_OWNER_CACHE_TAG = "cv-owner";

export const getCachedCvOwner = async (locale: Locale = "en") =>
  localizeOwner(await readWebsiteSection("owner"), locale);

export const getCachedCvOwnerPublic = async (locale: Locale = "en") => {
  const [owner, malt] = await Promise.all([
    getCachedCvOwner(locale),
    getMaltMirror(),
  ]);
  return { ...toPublicOwner(owner), available: malt.available, malt };
};
