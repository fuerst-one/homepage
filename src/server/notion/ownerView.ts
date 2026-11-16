import type { Locale } from "../../lib/i18n";
import type { CvOwner, CvOwnerPublic } from "./getCvOwner";

export const toPublicOwner = (owner: CvOwner): CvOwnerPublic => ({
  name: owner.name,
  position: owner.position,
  status: owner.status,
  languages: owner.languages,
  education: owner.education,
  city: owner.city,
  available: owner.available,
  avatarUrl: owner.avatarUrl,
});

export const localizeOwner = (owner: CvOwner, locale: Locale): CvOwner => {
  if (locale === "en") return owner;
  const translated = Object.fromEntries(
    Object.entries(owner.german ?? {}).filter(([, value]) => value?.trim()),
  );
  return { ...owner, ...translated };
};
