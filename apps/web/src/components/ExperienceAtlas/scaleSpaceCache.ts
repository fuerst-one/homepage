import {
  publicProjectScale,
  type ProjectScale,
} from "@homepage/content/projectScale";
import type { buildScaleSpace, ScaleField } from "./scaleSpace";

export type ScaleSpaceOutcome = {
  result?: ReturnType<typeof buildScaleSpace>;
  error?: string;
};
type ScaleWorker = Pick<
  Worker,
  "onmessage" | "onerror" | "postMessage" | "terminate"
>;

/** The canonical payload is also the key: no stale fits after a data refresh. */
export function scaleSpaceKey(
  projects: { id: string; scale?: Partial<ProjectScale> }[],
  fields: ScaleField[],
) {
  return JSON.stringify({
    projects: projects
      .map(({ id, scale }) => {
        const {
          complexity,
          teamLow,
          teamHigh,
          effortLow,
          effortHigh,
          effortBasis,
          codeSloc,
        } = publicProjectScale(scale);
        return {
          id,
          scale: {
            complexity,
            teamLow,
            teamHigh,
            effortLow,
            effortHigh,
            effortBasis,
            codeSloc,
          },
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id)),
    fields: [...new Set(fields)].sort(),
  });
}

/** Shared, bounded session cache. Only idle results are evicted; abandoned fits stop. */
export function createScaleSpaceCache(
  createWorker: () => ScaleWorker,
  limit = 16,
) {
  type Entry = {
    listeners: Set<() => void>;
    outcome?: ScaleSpaceOutcome;
    worker?: ScaleWorker;
  };
  const entries = new Map<string, Entry>();
  const trim = () => {
    for (const [key, entry] of entries) {
      if (entries.size <= limit) break;
      if (!entry.listeners.size && entry.outcome) entries.delete(key);
    }
  };
  return {
    read: (key: string) => entries.get(key)?.outcome,
    subscribe(key: string, listener: () => void) {
      let entry = entries.get(key);
      const fresh = !entry;
      entry ??= { listeners: new Set() };
      // Subscription marks a result as recently used without mutating during render.
      entries.delete(key);
      entries.set(key, entry);
      entry.listeners.add(listener);
      const current = entry;
      if (fresh) {
        const finish = (outcome: ScaleSpaceOutcome) => {
          if (entries.get(key) !== current || current.outcome) return;
          current.outcome = outcome;
          current.worker?.terminate();
          current.worker = undefined;
          current.listeners.forEach((notify) => notify());
          trim();
        };
        const fail = () =>
          finish({
            error: "The numeric map could not start. Reload to try again.",
          });
        try {
          const worker = createWorker();
          current.worker = worker;
          worker.onmessage = (event: MessageEvent<ScaleSpaceOutcome>) =>
            finish(event.data);
          worker.onerror = fail;
          worker.postMessage(JSON.parse(key));
        } catch {
          fail();
        }
      }
      return () => {
        current.listeners.delete(listener);
        if (!current.listeners.size && !current.outcome) {
          current.worker?.terminate();
          entries.delete(key);
        }
        trim();
      };
    },
  };
}
