import {
  PROFILE_LIFETIME_MS,
  type ProfileCatalog,
  type ProfileSignalKind,
  type VisitorProfile,
} from "./visitorProfile";

const DEPTH_KINDS: readonly ProfileSignalKind[] = [
  "project_opened",
  "project_details_viewed",
  "case_study_viewed",
];
const EXPLICIT_CHOICE_KINDS: readonly ProfileSignalKind[] = [
  "filter_selected",
  "topic_selected",
  "explorer_term_selected",
];
const READY_PROJECT_COUNT = 3;

/**
 * The only decision about whether a profile is worth a "For you" hint.
 * These conditions are provisional: replace this body once tracking can name
 * a visitor's leading interest. Callers rely on the signature alone.
 */
export function isForYouReady(
  profile: VisitorProfile,
  catalog: ProfileCatalog,
  now: number,
): boolean {
  if (now < profile.startedAt || now >= profile.startedAt + PROFILE_LIFETIME_MS)
    return false;
  const terms = new Set(catalog.terms.map((term) => term.id));
  const projects = new Set(catalog.projects.map((project) => project.id));
  if (
    Object.entries(profile.preferences).some(
      ([id, choice]) =>
        terms.has(id) && (choice === "interested" || choice === "priority"),
    )
  )
    return true;
  const explored = new Set<string>();
  for (const signal of profile.signals) {
    if (signal.at > now) continue;
    if (
      EXPLICIT_CHOICE_KINDS.includes(signal.kind) &&
      terms.has(signal.subject)
    )
      return true;
    if (DEPTH_KINDS.includes(signal.kind) && projects.has(signal.subject))
      explored.add(signal.subject);
  }
  return explored.size >= READY_PROJECT_COUNT;
}
