import type { SharedProfileEvent } from "@homepage/content/visitorProfile";
import type { UmamiSend } from "./umami";

const SIGNAL_URL = "/profile-signals";

/**
 * Leaves out the browser token, inferred score and basis, so Umami holds only
 * anonymous counts that sharing withdrawal does not need to erase.
 */
export function buildProfileSignalEvents(
  events: SharedProfileEvent[],
  context: { websiteId: string; hostname: string; userAgent: string },
  batchSalt: string,
): UmamiSend[] {
  return events.map(({ kind, subject, strength, preference, previous }) => ({
    payload: {
      website: context.websiteId,
      hostname: context.hostname,
      url: SIGNAL_URL,
      name: `profile_${kind}`,
      data: {
        subject,
        ...(strength !== undefined && { strength }),
        ...(preference !== undefined && { preference }),
        ...(previous !== undefined && { previous }),
      },
      salt: batchSalt,
    },
    headers: { "user-agent": context.userAgent },
  }));
}
