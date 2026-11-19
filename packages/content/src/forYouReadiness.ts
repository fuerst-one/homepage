import {
  PROFILE_LIFETIME_MS,
  profileInterests,
  type ProfileCatalog,
  type VisitorProfile,
} from "./visitorProfile";

export const FOR_YOU_MIN_LEADING_SCORE = 4;
export const FOR_YOU_MIN_LEAD_OVER_THIRD = 1;

/**
 * The only decision about whether a profile is worth a "For you" hint: the
 * leading buyer need is strong enough and separated from the third, so the
 * top two are a reliable guess. Held to `tests/profile-benchmark.test.mjs`.
 * The result can turn false again as scores decay; the store latches it.
 */
export function isForYouReady(
  profile: VisitorProfile,
  catalog: ProfileCatalog,
  now: number,
): boolean {
  if (now < profile.startedAt || now >= profile.startedAt + PROFILE_LIFETIME_MS)
    return false;
  const needs = profileInterests(profile, catalog, now).filter(
    (interest) => interest.facet === "buyerNeeds",
  );
  const leading = needs[0]?.score ?? 0;
  const third = needs[2]?.score ?? 0;
  return (
    leading >= FOR_YOU_MIN_LEADING_SCORE &&
    leading - third >= FOR_YOU_MIN_LEAD_OVER_THIRD
  );
}
