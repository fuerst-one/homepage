/** Escape applies to a hover target until the pointer leaves it. */
export function createTooltipDismissal() {
  let active: string | null = null;
  let dismissed: string | null = null;
  return {
    show(key: string) {
      if (active !== key) dismissed = null;
      active = key;
      return dismissed !== key;
    },
    dismiss() {
      dismissed = active;
    },
    leave() {
      active = null;
      dismissed = null;
    },
  };
}
