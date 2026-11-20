export const PLAYGROUND_REMEMBER_KEY = "plasma:remember:v1";
export const RIPPLES_SETUP_KEY = "plasma:ripples:v1";
type PreferenceStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readPlaygroundPreference(
  storage: PreferenceStorage,
  key: string,
) {
  try {
    return storage.getItem(PLAYGROUND_REMEMBER_KEY) === "true"
      ? storage.getItem(key)
      : null;
  } catch {
    return null;
  }
}
export function writePlaygroundPreference(
  storage: PreferenceStorage,
  key: string,
  value: string,
) {
  try {
    if (storage.getItem(PLAYGROUND_REMEMBER_KEY) === "true")
      storage.setItem(key, value);
  } catch {
    /* The playground continues in memory. */
  }
}
export function rememberPlaygroundPreferences(
  storage: PreferenceStorage,
  remember: boolean,
) {
  try {
    if (remember) storage.setItem(PLAYGROUND_REMEMBER_KEY, "true");
    else
      for (const key of [
        PLAYGROUND_REMEMBER_KEY,
        "plasma:splash",
        "plasma:knobs",
        RIPPLES_SETUP_KEY,
      ])
        storage.removeItem(key);
    return remember;
  } catch {
    return false;
  }
}
