import { isActiveProfileReading } from "@homepage/content/visitorProfile";

export type ProfileViewActivity = {
  visible: boolean;
  focused: boolean;
  lastInteraction: number;
};
type ViewRule = "section" | "project" | "region";
type ViewEntry = {
  /** Start of the current uninterrupted stretch in view, if it is in view. */
  since: number | null;
  seconds: number;
  activeSeconds: number;
  /** Attention given when this element's clock last restarted. */
  floor: number;
};
const TAGGED =
  "[data-profile-section], [data-profile-service-section], [data-profile-project], [data-profile-region]";

function tagsOf(el: HTMLElement): [string, ViewRule][] {
  const {
    profileSection,
    profileServiceSection,
    profileProject,
    profileRegion,
  } = el.dataset;
  return [
    ...(profileSection
      ? [[`section:${profileSection}`, "section"] as [string, ViewRule]]
      : []),
    ...(profileServiceSection
      ? [
          [`service-section:${profileServiceSection}`, "section"] as [
            string,
            ViewRule,
          ],
        ]
      : []),
    ...(profileProject
      ? [[`project:${profileProject}`, "project"] as [string, ViewRule]]
      : []),
    ...(profileRegion
      ? [[`region:${profileRegion}`, "region"] as [string, ViewRule]]
      : []),
  ];
}

function inView(el: HTMLElement, rule: ViewRule, modal: Element | null) {
  const box = el.getBoundingClientRect();
  const height = Math.min(box.bottom, innerHeight) - Math.max(box.top, 0);
  const width = Math.min(box.right, innerWidth) - Math.max(box.left, 0);
  const underModal = !!modal && !modal.contains(el);
  if (rule === "project") return !underModal && height >= 80;
  if (rule === "region")
    return (
      !underModal &&
      width > 0 &&
      box.height > 0 &&
      height >= Math.min(box.height, innerHeight) / 2
    );
  const x = Math.max(0, box.left) + Math.max(0, width) / 2;
  const y = Math.max(0, box.top) + Math.max(0, height) / 2;
  const top = height > 0 && width > 0 ? document.elementFromPoint(x, y) : null;
  const covered = underModal || !top || !(el.contains(top) || top.contains(el));
  return (
    !covered &&
    height >= Math.min(80, box.height * 0.5) &&
    width > 0 &&
    box.height > 0
  );
}

/** Which tagged parts of the page were in view and for how long; memory only. */
export function createProfileViewTracker(start: number) {
  const entries = new Map<string, ViewEntry>();
  /** Restart times by exact key or by family ("section:"), for entries not seen yet. */
  const restarts = new Map<string, number>();
  const entry = (key: string) => {
    let found = entries.get(key);
    if (!found) {
      const family = key.slice(0, key.indexOf(":") + 1);
      const floor = Math.max(
        start,
        restarts.get(key) ?? start,
        restarts.get(family) ?? start,
      );
      found = { since: null, seconds: 0, activeSeconds: 0, floor };
      entries.set(key, found);
    }
    return found;
  };
  return {
    /** Look at the page now; with `elapsedSecond`, also count one second. */
    measure(
      now: number,
      activity: ProfileViewActivity,
      elapsedSecond: boolean,
    ) {
      const modal = document.querySelector(
        '[role="dialog"][data-state="open"]',
      );
      const seen = new Map<string, boolean>();
      document.querySelectorAll<HTMLElement>(TAGGED).forEach((el) => {
        for (const [key, rule] of tagsOf(el)) {
          // One page or dialog shows a project once; the first match decides.
          if (seen.get(key) || (rule === "project" && seen.has(key))) continue;
          seen.set(key, inView(el, rule, modal));
        }
      });
      for (const key of entries.keys())
        if (!seen.has(key)) seen.set(key, false);
      for (const [key, shown] of seen) {
        const view = entry(key);
        const visible = shown && activity.visible;
        view.since = visible ? (view.since ?? now) : null;
        if (!elapsedSecond || !visible) continue;
        view.seconds++;
        if (
          isActiveProfileReading(
            {
              ...activity,
              lastInteraction: Math.max(activity.lastInteraction, view.floor),
            },
            now,
          )
        )
          view.activeSeconds++;
      }
    },
    /** Clear the counts of one key, or of a family such as "section:". */
    restart(scope: string, now: number) {
      restarts.set(scope, now);
      for (const [key, view] of entries)
        if (scope.endsWith(":") ? key.startsWith(scope) : key === scope)
          entries.set(key, {
            ...view,
            seconds: 0,
            activeSeconds: 0,
            floor: now,
          });
    },
    continuousMs: (key: string, now: number) => {
      const since = entries.get(key)?.since;
      return since == null ? 0 : now - since;
    },
    seconds: (key: string) => entries.get(key)?.seconds ?? 0,
    activeSeconds: (key: string) => entries.get(key)?.activeSeconds ?? 0,
    keys: () => [...entries.keys()],
  };
}
export type ProfileViewTracker = ReturnType<typeof createProfileViewTracker>;
