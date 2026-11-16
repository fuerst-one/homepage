import { MALT_PROFILE_URL } from "@homepage/content/maltMirror";

/** Public HTML only: no login cookies, third-party scraper, challenge bypass or user-controlled URL. */
export async function fetchMaltProfile() {
  const response = await fetch(MALT_PROFILE_URL, {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(12_000),
    headers: {
      Accept: "text/html",
      "User-Agent": "Fuerst.one profile mirror (+https://fuerst.one)",
    },
  });
  if (response.status !== 200) {
    await response.body?.cancel();
    return { status: response.status, html: "" };
  }
  if (!response.headers.get("content-type")?.includes("text/html"))
    throw new Error("malt_content_type");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("malt_empty_body");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 2_000_000) {
      await reader.cancel();
      throw new Error("malt_body_limit");
    }
    chunks.push(value);
  }
  return {
    status: response.status,
    html: Buffer.concat(chunks).toString("utf8"),
  };
}
