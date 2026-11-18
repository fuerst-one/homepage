import { personName, type Locale } from "@homepage/content/i18n";
import type { CvOwner, CvOwnerPublic } from "@homepage/content/models";

export const toPublicOwner = (
  owner: CvOwner,
  locale: Locale = "en",
): CvOwnerPublic => ({
  name: personName(locale),
  position: owner.position,
  status: owner.status,
  languages: owner.languages,
  education: owner.education,
  city: owner.city,
  available: owner.available,
  avatarUrl: owner.avatarUrl,
});
