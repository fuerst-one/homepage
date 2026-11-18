import { getMaltMirror } from "../malt/getMaltMirror";
import type { Locale } from "@homepage/content/i18n";
import { toPublicOwner } from "./ownerView";
import { readWebsiteSection } from "@homepage/database/websiteContent";

export const CV_OWNER_CACHE_TAG = "cv-owner";

export const getCachedCvOwner = async (locale: Locale = "en") =>
  readWebsiteSection("owner", undefined, locale);

export const getCachedCvOwnerPublic = async (locale: Locale = "en") => {
  const [owner, malt] = await Promise.all([
    getCachedCvOwner(locale),
    getMaltMirror(),
  ]);
  return { ...toPublicOwner(owner, locale), available: malt.available, malt };
};
