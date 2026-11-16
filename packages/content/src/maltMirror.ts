import { hiringPlatforms } from "@homepage/content/data/hiringPlatforms";

export const MALT_PROFILE_URL = hiringPlatforms.find(
  (value) => value.name === "Malt",
)!.href;
export const MALT_MIRROR_PROPERTY = "Homepage Malt Mirror";
export const MALT_REFRESH_PROPERTY = "Homepage Malt Refresh";
export type MaltObservation = {
  observedAt: string;
  method: "public-fetch" | "browser-verified";
  rate: { amount: number; currency: "EUR"; unit: "day" } | null;
  availability: {
    status: "unknown" | "available" | "unavailable";
    confirmedAt: string | null;
  };
};
export type MaltMirror = {
  version: 1;
  profileUrl: string;
  observation: MaltObservation | null;
  lastAttempt: {
    at: string;
    status: "ok" | "blocked" | "error" | "parse-error";
  } | null;
};
export type MaltMirrorView = {
  profileUrl: string;
  rate: MaltObservation["rate"];
  available: boolean | null;
  observedAt: string | null;
  availabilityConfirmedAt: string | null;
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const isDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d\d-\d\dT/.test(value) &&
  Number.isFinite(Date.parse(value));
const rateValid = (value: unknown) => {
  const rate = record(value);
  return (
    typeof rate.amount === "number" &&
    Number.isFinite(rate.amount) &&
    rate.amount > 0 &&
    rate.amount <= 100_000 &&
    rate.currency === "EUR" &&
    rate.unit === "day"
  );
};

/** Validate persisted data and project known fields only. Never trust old JSON shapes. */
export function readMaltMirror(raw: string): MaltMirror | null {
  try {
    const value = record(JSON.parse(raw));
    if (value.version !== 1 || value.profileUrl !== MALT_PROFILE_URL)
      return null;
    let observation: MaltObservation | null = null;
    if (value.observation !== null) {
      const source = record(value.observation);
      const availability = record(source.availability);
      if (
        !isDate(source.observedAt) ||
        !["public-fetch", "browser-verified"].includes(String(source.method)) ||
        (source.rate !== null && !rateValid(source.rate)) ||
        !["unknown", "available", "unavailable"].includes(
          String(availability.status),
        ) ||
        (availability.confirmedAt !== null && !isDate(availability.confirmedAt))
      )
        return null;
      const rate = record(source.rate);
      observation = {
        observedAt: source.observedAt,
        method: source.method as MaltObservation["method"],
        rate:
          source.rate === null
            ? null
            : { amount: rate.amount as number, currency: "EUR", unit: "day" },
        availability: {
          status:
            availability.status as MaltObservation["availability"]["status"],
          confirmedAt: availability.confirmedAt as string | null,
        },
      };
    }
    let lastAttempt: MaltMirror["lastAttempt"] = null;
    if (value.lastAttempt !== null) {
      const attempt = record(value.lastAttempt);
      if (
        !isDate(attempt.at) ||
        !["ok", "blocked", "error", "parse-error"].includes(
          String(attempt.status),
        )
      )
        return null;
      lastAttempt = {
        at: attempt.at,
        status: attempt.status as NonNullable<
          MaltMirror["lastAttempt"]
        >["status"],
      };
    }
    return {
      version: 1,
      profileUrl: MALT_PROFILE_URL,
      observation,
      lastAttempt,
    };
  } catch {
    return null;
  }
}

/** Only the intended public ProfilePage and its visible per-day price establish a rate. */
export function parseMaltProfile(
  html: string,
  observedAt: string,
  method: MaltObservation["method"],
): MaltObservation {
  if (!isDate(observedAt)) throw new Error("malt_observation_date");
  const profiles: Record<string, unknown>[] = [];
  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      const data = record(JSON.parse(match[1]));
      if (data["@type"] === "ProfilePage")
        profiles.push(record(data.mainEntity));
    } catch {
      /* An unrelated invalid JSON-LD block cannot establish identity. */
    }
  }
  const profile = profiles.find(
    (value) =>
      value["@type"] === "Person" &&
      value.url === MALT_PROFILE_URL &&
      /^Alexander F(?:ue|ü)rst$/i.test(String(value.name)),
  );
  if (!profile) throw new Error("malt_profile_identity");
  const labels = [
    ...html.matchAll(
      /<([a-z][a-z0-9]*)\b[^>]*data-testid\s*=\s*["']profile-price["'][^>]*>([\s\S]*?)<\/\1>/gi,
    ),
  ].map((match) =>
    match[2]
      .replace(/<[^>]*>/g, "")
      .replace(/&(?:nbsp|#160);/g, " ")
      .trim(),
  );
  const offer = record(profile.makesOffer);
  const price =
    typeof offer.price === "number"
      ? offer.price
      : typeof offer.price === "string" && /^\d+(\.\d{1,2})?$/.test(offer.price)
        ? Number(offer.price)
        : null;
  let rate: MaltObservation["rate"] = null;
  if (price !== null || labels.length) {
    if (
      price === null ||
      !rateValid({
        amount: price,
        currency: offer.priceCurrency,
        unit: "day",
      }) ||
      labels.length !== 1
    )
      throw new Error("malt_rate_shape");
    const label = labels[0].match(
      /^(?:€|EUR)\s*(\d+(?:[,.]\d+)*)\s*\/\s*day$/i,
    );
    if (!label || Number(label[1].replaceAll(",", "")) !== price)
      throw new Error("malt_rate_unit_or_conflict");
    rate = { amount: price, currency: "EUR", unit: "day" };
  }
  // Offer InStock describes an offer, not a freelancer's dated availability confirmation.
  return {
    observedAt,
    method,
    rate,
    availability: { status: "unknown", confirmedAt: null },
  };
}

export function maltMirrorView(
  state: MaltMirror | null,
  now = Date.now(),
): MaltMirrorView {
  const source = state?.observation;
  const age = source ? now - Date.parse(source.observedAt) : Infinity;
  const freshRate = age >= 0 && age <= 7 * 86_400_000;
  const confirmedAge = source?.availability.confirmedAt
    ? now - Date.parse(source.availability.confirmedAt)
    : Infinity;
  const freshAvailability =
    age >= 0 &&
    age <= 86_400_000 &&
    confirmedAge >= 0 &&
    confirmedAge <= 7 * 86_400_000;
  return {
    profileUrl: MALT_PROFILE_URL,
    rate: freshRate ? (source?.rate ?? null) : null,
    available:
      freshAvailability && source?.availability.status !== "unknown"
        ? source?.availability.status === "available"
        : null,
    observedAt: source?.observedAt ?? null,
    availabilityConfirmedAt: source?.availability.confirmedAt ?? null,
  };
}
