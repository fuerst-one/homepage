const IDLE_MS = 3_000;
type Timers = {
  schedule: (callback: () => void, delay: number) => number;
  cancel: (id: number) => void;
};

/** Only user activity reveals a sculpture; a held drag cannot expire mid-gesture. */
export const createHeroPreviewController = (
  onChange: (active: boolean) => void,
  timers: Timers = {
    schedule: (callback, delay) => window.setTimeout(callback, delay),
    cancel: (id) => window.clearTimeout(id),
  },
) => {
  let timer: number | undefined;
  let active = false;
  let held = false;
  let disposed = false;
  const clear = () => {
    if (timer !== undefined) timers.cancel(timer);
    timer = undefined;
  };
  const touch = () => {
    if (disposed) return;
    clear();
    if (!active) {
      active = true;
      onChange(true);
    }
    if (!held)
      timer = timers.schedule(() => {
        timer = undefined;
        active = false;
        onChange(false);
      }, IDLE_MS);
  };
  return {
    touch,
    hold() {
      held = true;
      touch();
    },
    release() {
      held = false;
      touch();
    },
    dispose() {
      disposed = true;
      clear();
    },
  };
};
