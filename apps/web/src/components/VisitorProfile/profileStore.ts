"use client";

import { create } from "zustand";
import {
  emptyVisitorProfile,
  recordProfileSignal,
  setProfilePreference,
  restoreVisitorProfile,
  parseProfileEventBatch,
  PROFILE_STORAGE_KEY,
  PROFILE_LIFETIME_MS,
  PROFILE_CLOCK_TOLERANCE_MS,
  validProfileToken,
  type ProfileCatalog,
  type VisitorProfile,
  type ProfileSignalKind,
  type ProfilePreference,
  type SharedProfileEvent,
  type ProjectChoice,
} from "@homepage/content/visitorProfile";
import {
  applyProjectChoice,
  isProjectChoiceKind,
  EMPTY_PROJECT_CHOICE,
} from "@homepage/content/visitorProfileSignals";

import { isForYouReady } from "@homepage/content/forYouReadiness";
import {
  clampProfileInteractions,
  isProfileOrientation,
  type ProfileOrientation,
} from "@homepage/content/profilePixels";

export const PROFILE_ERASURE_KEY = "fuerst-one:profile-erasure:v1";
type Catalog = ProfileCatalog & { sharingAvailable?: boolean };
type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;
type ProfileState = {
  catalog: Catalog | null;
  profile: VisitorProfile;
  orientation: ProfileOrientation | null;
  setOrientation: (orientation: ProfileOrientation) => void;
  /** Accepted signals and manual choices since the profile started. */
  interactions: number;
  /** The "For you" hint was dismissed or followed, so it stays away. */
  forYouHintSeen: boolean;
  markForYouHintSeen: () => void;
  /** The profile passed the "For you" gate once; decay must not take it back. */
  forYouUnlocked: boolean;
  enabled: boolean;
  remember: boolean;
  sharing: boolean;
  consentAt: number;
  token: string;
  pending: SharedProfileEvent[];
  deletionToken: string;
  /** A saved profile is waiting for the catalog it needs to be restored. */
  loading: boolean;
  catalogLoading: boolean;
  catalogFailed: boolean;
  network:
    "idle" | "sending" | "shared" | "error" | "deleting" | "delete-error";
  storageFailed: boolean;
  initialise: (catalog: Catalog) => void;
  restoreErasure: () => void;
  syncFromStorage: () => void;
  start: () => void;
  loadCatalog: () => Promise<void>;
  setRemember: (value: boolean) => void;
  setSharing: (value: boolean) => Promise<void>;
  record: (kind: ProfileSignalKind, subject: string) => void;
  choose: (id: string, choice: ProfilePreference | "auto") => void;
  flush: () => Promise<void>;
  deleteShared: () => Promise<void>;
  reset: () => Promise<void>;
  stop: () => Promise<void>;
};
const INITIAL_LOCAL_METADATA = {
  orientation: null,
  interactions: 0,
  forYouHintSeen: false,
  forYouUnlocked: false,
} as const;
const secret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
const uniqueEvents = <T extends { id: string }>(events: T[]) => [
  ...new Map(events.map((e) => [e.id, e])).values(),
];

/** Merge independent tab actions; replay corrections so a stale snapshot cannot erase them. */
function mergeProfiles(a: VisitorProfile, b: VisitorProfile): VisitorProfile {
  if (a.startedAt !== b.startedAt) return b;
  const signals = uniqueEvents([...a.signals, ...b.signals])
    .sort((x, y) => x.at - y.at || x.id.localeCompare(y.id))
    .slice(-240);
  // The saved snapshot is authoritative, including missing (automatic) choices.
  // Only local corrections newer than that snapshot may amend it.
  const preferences = { ...b.preferences };
  for (const event of a.signals)
    if (event.at > b.updatedAt && event.kind === "preference_changed") {
      if (event.preference === "auto") delete preferences[event.subject];
      else if (event.preference) preferences[event.subject] = event.preference;
    }
  const projectChoices: Record<string, ProjectChoice> = { ...b.projectChoices };
  for (const event of a.signals)
    if (event.at > b.updatedAt && isProjectChoiceKind(event.kind))
      projectChoices[event.subject] = applyProjectChoice(
        projectChoices[event.subject] ?? EMPTY_PROJECT_CHOICE,
        event.kind,
      );
  return {
    ...b,
    ...(a.projectChoices || b.projectChoices ? { projectChoices } : {}),
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
    signals,
    preferences,
  };
}

export function createVisitorProfileStore(
  storage: () => Storage = () => window.localStorage,
  send: typeof fetch = (...args) => fetch(...args),
) {
  let controller: AbortController | null = null;
  let initialised = false;
  let catalogRequest: Promise<void> | null = null;
  let erasureRestored = false;
  return create<ProfileState>((set, get) => {
    const erasureReceipts = (): { token: string; until: number }[] => {
      const saved = JSON.parse(storage().getItem(PROFILE_ERASURE_KEY) || "[]");
      const rows = Array.isArray(saved) ? saved : saved?.token ? [saved] : [];
      return rows.filter(
        (row) =>
          validProfileToken(row?.token) &&
          Number.isFinite(row.until) &&
          row.until > Date.now(),
      );
    };
    const writeErasures = (receipts: { token: string; until: number }[]) => {
      if (receipts.length)
        storage().setItem(PROFILE_ERASURE_KEY, JSON.stringify(receipts));
      else storage().removeItem(PROFILE_ERASURE_KEY);
    };
    const persist = () => {
      const s = get();
      try {
        if (!s.enabled || !s.remember)
          storage().removeItem(PROFILE_STORAGE_KEY);
        else
          storage().setItem(
            PROFILE_STORAGE_KEY,
            JSON.stringify({
              version: 1,
              profile: s.profile,
              orientation: s.orientation,
              interactions: s.interactions,
              forYouHintSeen: s.forYouHintSeen,
              forYouUnlocked: s.forYouUnlocked,
              token: s.token,
              sharing: s.sharing,
              consentAt: s.consentAt,
              pending: s.sharing ? s.pending : [],
            }),
          );
        if (s.deletionToken) {
          const receipts = erasureReceipts();
          if (!receipts.some((row) => row.token === s.deletionToken))
            receipts.push({
              token: s.deletionToken,
              until: Date.now() + 31 * 86400_000,
            });
          writeErasures(receipts);
        }
        if (s.storageFailed && s.enabled && s.remember)
          set({ storageFailed: false });
      } catch {
        try {
          storage().removeItem(PROFILE_STORAGE_KEY);
        } catch {
          // The UI reports that an older saved profile may still remain.
        }
        set({ storageFailed: true, remember: false });
      }
    };
    const expired = (saved: { profile?: { startedAt?: unknown } } | null) => {
      const startedAt = saved?.profile?.startedAt;
      return (
        typeof startedAt === "number" &&
        Date.now() - startedAt >= PROFILE_LIFETIME_MS
      );
    };
    const latchForYou = (unlocked: boolean, profile: VisitorProfile) => {
      const catalog = get().catalog;
      return (
        unlocked ||
        (!!catalog &&
          isForYouReady(
            profile,
            catalog,
            Math.max(Date.now(), profile.updatedAt),
          ))
      );
    };
    const readSaved = () => {
      const catalog = get().catalog;
      if (!catalog) return null;
      const raw = storage().getItem(PROFILE_STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      const profile =
        saved?.version === 1
          ? restoreVisitorProfile(saved.profile, catalog, Date.now())
          : null;
      if (
        !profile ||
        typeof saved.sharing !== "boolean" ||
        !Number.isFinite(saved.consentAt) ||
        saved.consentAt > Date.now() + PROFILE_CLOCK_TOLERANCE_MS ||
        (saved.sharing &&
          (!validProfileToken(saved.token) ||
            saved.consentAt < profile.startedAt ||
            Date.now() - saved.consentAt >= PROFILE_LIFETIME_MS))
      ) {
        // Only expiry erases: a profile saved by a newer release in another
        // tab, or under a skewed clock, must survive this tab not reading it.
        if (expired(saved)) storage().removeItem(PROFILE_STORAGE_KEY);
        return null;
      }
      const pending: SharedProfileEvent[] = [];
      if (saved.sharing && Array.isArray(saved.pending))
        for (const event of saved.pending.slice(-100)) {
          const batch = parseProfileEventBatch(
            {
              version: 1,
              token: saved.token,
              consentAt: saved.consentAt,
              events: [event],
            },
            catalog,
          );
          if (batch) pending.push(...batch.events);
        }
      return {
        profile,
        orientation: isProfileOrientation(saved.orientation)
          ? saved.orientation
          : null,
        interactions: clampProfileInteractions(saved.interactions),
        forYouHintSeen: saved.forYouHintSeen === true,
        forYouUnlocked: latchForYou(saved.forYouUnlocked === true, profile),
        sharing: saved.sharing && !!catalog.sharingAvailable,
        token: validProfileToken(saved.token) ? saved.token : "",
        consentAt: saved.consentAt as number,
        pending,
      };
    };
    const active = () => {
      get().syncFromStorage();
      const s = get();
      if (
        s.enabled &&
        Date.now() >= s.profile.startedAt + PROFILE_LIFETIME_MS
      ) {
        void s.stop();
        return false;
      }
      return s.enabled && !!s.catalog;
    };
    const accept = (next: VisitorProfile) => {
      const s = get();
      if (next === s.profile) return;
      const last = next.signals.at(-1);
      const shared = last && {
        id: last.id,
        kind: last.kind,
        subject: last.subject,
        ...(last.kind === "preference_changed"
          ? {
              preference: last.preference,
              previous: last.previous,
              inferredScore: last.inferredScore,
              basis: last.basis,
            }
          : {}),
      };
      set({
        profile: next,
        interactions: clampProfileInteractions(s.interactions + 1),
        forYouUnlocked: latchForYou(s.forYouUnlocked, next),
        ...(s.sharing && shared
          ? { pending: [...s.pending, shared].slice(-100) }
          : {}),
      });
      persist();
    };
    return {
      catalog: null,
      profile: emptyVisitorProfile(0),
      ...INITIAL_LOCAL_METADATA,
      setOrientation: (orientation) => {
        if (
          !isProfileOrientation(orientation) ||
          !active() ||
          get().orientation !== null
        )
          return;
        set({ orientation });
        persist();
      },
      markForYouHintSeen: () => {
        if (!active() || get().forYouHintSeen) return;
        set({ forYouHintSeen: true });
        persist();
      },
      enabled: false,
      remember: false,
      sharing: false,
      consentAt: 0,
      token: "",
      pending: [],
      deletionToken: "",
      loading: false,
      catalogLoading: false,
      catalogFailed: false,
      network: "idle",
      storageFailed: false,
      restoreErasure: () => {
        if (erasureRestored) return;
        erasureRestored = true;
        try {
          const receipts = erasureReceipts();
          writeErasures(receipts);
          if (receipts.length)
            set({
              enabled: false,
              ...INITIAL_LOCAL_METADATA,
              remember: false,
              sharing: false,
              pending: [],
              deletionToken: receipts[0].token,
              network: "delete-error",
            });
        } catch {
          set({ storageFailed: true });
        }
      },
      initialise: (catalog) => {
        set({ catalog });
        if (initialised) return;
        initialised = true;
        get().restoreErasure();
        if (get().deletionToken) return;
        try {
          const saved = readSaved();
          if (saved) set({ ...saved, enabled: true, remember: true });
        } catch {
          set({ storageFailed: true });
        }
      },
      syncFromStorage: () => {
        const s = get();
        try {
          const receipts = erasureReceipts();
          if (
            s.deletionToken &&
            !receipts.some((row) => row.token === s.deletionToken)
          )
            set({
              deletionToken: receipts[0]?.token ?? "",
              network: receipts.length ? "delete-error" : "idle",
            });
          if (!s.remember || !s.catalog) return;
          const erasure = receipts.find((row) => row.token === s.token);
          if (erasure) {
            controller?.abort();
            set({
              enabled: false,
              ...INITIAL_LOCAL_METADATA,
              remember: false,
              sharing: false,
              token: "",
              pending: [],
              deletionToken: erasure.token,
              network: "delete-error",
            });
            return;
          }
          const saved = readSaved();
          if (!saved) {
            // Only a removed profile (stopped or expired) stops this tab.
            if (storage().getItem(PROFILE_STORAGE_KEY) !== null) return;
            controller?.abort();
            set({
              enabled: false,
              ...INITIAL_LOCAL_METADATA,
              remember: false,
              sharing: false,
              token: "",
              pending: [],
              profile: emptyVisitorProfile(Date.now()),
              network: "idle",
            });
            return;
          }
          const sameToken = saved.token === s.token;
          if (!saved.sharing || !sameToken) controller?.abort();
          set({
            ...saved,
            profile: mergeProfiles(s.profile, saved.profile),
            orientation: saved.orientation,
            // Every action syncs before it counts, so tabs normally agree.
            // Keeping the larger value stops a tab that saved an out-of-date
            // snapshot from lowering the count.
            interactions:
              saved.profile.startedAt === s.profile.startedAt
                ? Math.max(s.interactions, saved.interactions)
                : saved.interactions,
            // Likewise an out-of-date snapshot must not bring the hint back.
            forYouHintSeen:
              saved.profile.startedAt === s.profile.startedAt
                ? s.forYouHintSeen || saved.forYouHintSeen
                : saved.forYouHintSeen,
            forYouUnlocked:
              saved.profile.startedAt === s.profile.startedAt
                ? s.forYouUnlocked || saved.forYouUnlocked
                : saved.forYouUnlocked,
            pending:
              saved.sharing && sameToken
                ? uniqueEvents([...s.pending, ...saved.pending]).slice(-100)
                : saved.pending,
            network: !saved.sharing || !sameToken ? "idle" : s.network,
          });
        } catch {
          set({ storageFailed: true });
        }
      },
      loadCatalog: () => {
        if (get().catalog) return Promise.resolve();
        if (catalogRequest) return catalogRequest;
        let saved = false;
        try {
          saved = !!storage().getItem(PROFILE_STORAGE_KEY);
        } catch {
          // Without readable storage there is no profile to wait for.
        }
        set({ catalogLoading: true, catalogFailed: false, loading: saved });
        catalogRequest = Promise.resolve().then(async () => {
          try {
            const response = await send("/api/profile/catalog");
            if (!response.ok) throw new Error("catalog");
            const value = await response.json();
            if (
              !Array.isArray(value.projects) ||
              !Array.isArray(value.terms) ||
              value.terms.some(
                (term: { id?: unknown }) => typeof term?.id !== "string",
              ) ||
              new Set(value.terms.map((term: { id: string }) => term.id))
                .size !== value.terms.length
            )
              throw new Error("catalog");
            get().initialise(value);
          } catch {
            set({ catalogFailed: true });
          } finally {
            catalogRequest = null;
            set({ catalogLoading: false, loading: false });
          }
        });
        return catalogRequest;
      },
      start: () => {
        if (get().enabled || !get().catalog || get().deletionToken) return;
        try {
          // A tab opened before opt-in may now have a profile or erasure to adopt.
          const receipts = erasureReceipts();
          if (receipts.length) {
            set({ deletionToken: receipts[0].token, network: "delete-error" });
            return;
          }
          const saved = readSaved();
          if (saved) {
            set({ ...saved, enabled: true, remember: true });
            return;
          }
        } catch {
          set({ storageFailed: true });
        }
        set({
          enabled: true,
          remember: true,
          profile: emptyVisitorProfile(Date.now()),
          ...INITIAL_LOCAL_METADATA,
        });
        persist();
      },
      setRemember: (remember) => {
        if (remember && !active()) return;
        set({ remember: remember && get().enabled });
        persist();
      },
      setSharing: async (sharing) => {
        if (sharing) {
          if (
            !active() ||
            !get().catalog?.sharingAvailable ||
            get().deletionToken
          )
            return;
          if (!get().sharing)
            set({
              sharing: true,
              token: secret(),
              consentAt: Date.now(),
              pending: [],
              network: "idle",
            });
          persist();
        } else await get().deleteShared();
      },
      record: (kind, subject) => {
        if (!active()) return;
        const s = get();
        accept(
          recordProfileSignal(
            s.profile,
            { kind, subject },
            s.catalog!,
            Date.now(),
          ),
        );
      },
      choose: (id, choice) => {
        if (!active()) return;
        const s = get();
        accept(
          setProfilePreference(s.profile, id, choice, s.catalog!, Date.now()),
        );
      },
      flush: async () => {
        if (!active()) return;
        const s = get();
        if (!s.sharing || !s.pending.length || s.network === "sending") return;
        const batch = s.pending.slice(0, 20);
        const request = new AbortController();
        controller = request;
        set({ network: "sending" });
        try {
          const response = await send("/api/profile/events", {
            method: "POST",
            keepalive: true,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              version: 1,
              consentAt: s.consentAt,
              token: s.token,
              events: batch,
            }),
            signal: request.signal,
          });
          if (!response.ok) throw new Error("sharing");
          get().syncFromStorage();
          if (get().token !== s.token || !get().sharing) return;
          const ids = new Set(batch.map((e) => e.id));
          set({
            pending: get().pending.filter((e) => !ids.has(e.id)),
            network: "shared",
          });
          persist();
        } catch {
          if (!request.signal.aborted && get().sharing)
            set({ network: "error" });
        } finally {
          if (controller === request) controller = null;
        }
      },
      deleteShared: async () => {
        controller?.abort();
        const token = get().deletionToken || get().token;
        set({
          sharing: false,
          pending: [],
          token: "",
          deletionToken: token,
          network: token ? "deleting" : "idle",
        });
        persist();
        if (!token) return;
        try {
          const response = await send("/api/profile/events", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
            signal: AbortSignal.timeout(10_000),
          });
          if (!response.ok) throw new Error("deletion");
          get().syncFromStorage();
          const remaining = erasureReceipts().filter(
            (row) => row.token !== token,
          );
          writeErasures(remaining);
          set({
            deletionToken: remaining[0]?.token ?? "",
            network: remaining.length ? "delete-error" : "idle",
          });
          persist();
        } catch {
          set({ network: "delete-error" });
        }
      },
      reset: async () => {
        set({
          profile: emptyVisitorProfile(Date.now()),
          ...INITIAL_LOCAL_METADATA,
        });
        await get().deleteShared();
        persist();
      },
      stop: async () => {
        set({
          enabled: false,
          remember: false,
          profile: emptyVisitorProfile(Date.now()),
          ...INITIAL_LOCAL_METADATA,
        });
        await get().deleteShared();
        persist();
      },
    };
  });
}
export const useVisitorProfileStore = createVisitorProfileStore();
export const recordVisitorInteraction = (
  kind: ProfileSignalKind,
  subject: string,
) => useVisitorProfileStore.getState().record(kind, subject);
