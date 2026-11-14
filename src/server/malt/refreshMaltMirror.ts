import {
  MALT_PROFILE_URL,
  parseMaltProfile,
  type MaltMirror,
} from "../../lib/maltMirror";
export type MaltMirrorStore = {
  read(): Promise<MaltMirror | null>;
  write(value: MaltMirror, attemptOnly?: boolean): Promise<void | "older">;
};
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
