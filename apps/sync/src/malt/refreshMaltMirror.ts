import {
  MALT_PROFILE_URL,
  parseMaltProfile,
  type MaltMirror,
} from "@homepage/content/maltMirror";
import type { MaltMirrorStore } from "@homepage/database/postgresMaltMirrorStore";
export type MaltProfileFetch = () => Promise<{ status: number; html: string }>;

/** Refresh away from visitor requests. A failed attempt never makes old source data fresh. */
export async function refreshMaltMirror(
  store: MaltMirrorStore,
  fetcher: MaltProfileFetch,
  now = Date.now(),
) {
  let observation: MaltMirror["observation"] = null;
  const empty: MaltMirror = {
    version: 1,
    profileUrl: MALT_PROFILE_URL,
    observation: null,
    lastAttempt: null,
  };
  const at = new Date(now).toISOString();
  let status: NonNullable<MaltMirror["lastAttempt"]>["status"] = "error";
  try {
    const response = await fetcher();
    if (response.status === 403 || response.status === 429) status = "blocked";
    else if (response.status === 200) {
      try {
        observation = parseMaltProfile(response.html, at, "public-fetch");
        status = "ok";
      } catch {
        status = "parse-error";
      }
    }
  } catch {
    /* A network failure is distinct from unpublished or unavailable. */
  }
  // Read after fetching so an operator's newer observation is not replaced by our earlier read.
  const latest = (await store.read()) ?? empty;
  const next: MaltMirror = { ...latest, lastAttempt: { at, status } };
  if (observation) next.observation = observation;
  const result = await store.write(next, status !== "ok");
  return { status, updated: result !== "older" };
}

/** Next occurrence of the former Vercel daily cron, always in UTC. */
export function nextMaltRefreshAt(now = Date.now()): string {
  const next = new Date(now);
  next.setUTCHours(5, 23, 0, 0);
  if (next.getTime() <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

/** Import public browser observations without routing through the website. */
export async function importMaltObservation(
  input: unknown,
  store: MaltMirrorStore,
  now = Date.now(),
) {
  if (!input || typeof input !== "object")
    throw new Error("invalid_observation");
  const value = input as Record<string, unknown>;
  if (
    value.sourceUrl !== MALT_PROFILE_URL ||
    typeof value.html !== "string" ||
    Buffer.byteLength(value.html, "utf8") > 200_000 ||
    typeof value.observedAt !== "string"
  )
    throw new Error("invalid_observation");
  const observedAt = Date.parse(value.observedAt);
  if (
    !Number.isFinite(observedAt) ||
    observedAt > now ||
    now - observedAt > 3_600_000
  )
    throw new Error("invalid_observation_time");
  const observation = parseMaltProfile(
    value.html,
    new Date(observedAt).toISOString(),
    "browser-verified",
  );
  const result = await store.write({
    version: 1,
    profileUrl: MALT_PROFILE_URL,
    observation,
    lastAttempt: { at: new Date(now).toISOString(), status: "ok" },
  });
  if (result === "older") throw new Error("older_observation");
  return { status: "ok", observedAt: observation.observedAt };
}
