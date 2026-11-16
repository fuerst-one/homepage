import type { CvOwner, CvOwnerPublic } from "@homepage/content/models";

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
