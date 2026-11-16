const BASE = "https://openrouter.ai/api/v1";
export const embeddingModel = () =>
  process.env.OPENROUTER_EMBEDDING_MODEL || "openai/text-embedding-3-small";
export const chatModel = () =>
  process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini";

export async function routerRequest(
  path: string,
  body: unknown,
  signal?: AbortSignal,
) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OpenRouter unconfigured");
  const response = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(45_000)])
      : AbortSignal.timeout(45_000),
    cache: "no-store",
  });
  // Upstream bodies may contain private request text; never log them.
  if (!response.ok)
    throw new Error(`OpenRouter request failed (${response.status})`);
  return response.json();
}

export async function embedKnowledge(
  input: string[],
  signal?: AbortSignal,
): Promise<number[][]> {
  if (!input.length) return [];
  const data = await routerRequest(
    "embeddings",
    {
      model: embeddingModel(),
      input,
      dimensions: 1536,
    },
    signal,
  );
  if (!Array.isArray(data.data) || data.data.length !== input.length)
    throw new Error("Invalid embeddings");
  const sorted = [...data.data].sort((a, b) => a.index - b.index);
  return sorted.map((item, index) => {
    if (
      item.index !== index ||
      !Array.isArray(item.embedding) ||
      item.embedding.length !== 1536 ||
      !item.embedding.every(
        (n: unknown) => typeof n === "number" && Number.isFinite(n),
      )
    )
      throw new Error("Invalid embedding vector");
    return item.embedding;
  });
}

let checked: { model: string; expires: number } | undefined;
/** Prevent a configuration typo from silently switching the public route to a costly model. */
export async function verifyChatPrice(signal?: AbortSignal) {
  signal?.throwIfAborted();
  const model = chatModel();
  if (checked?.model === model && checked.expires > Date.now()) return;
  const response = await fetch(`${BASE}/models`, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Model pricing unavailable");
  const data = await response.json();
  const entry = data.data?.find((item: { id: string }) => item.id === model);
  const input = Number(entry?.pricing?.prompt),
    output = Number(entry?.pricing?.completion);
  if (
    !Number.isFinite(input) ||
    !Number.isFinite(output) ||
    input < 0 ||
    output < 0 ||
    input > 0.000002 ||
    output > 0.00001
  )
    throw new Error("Model exceeds public price ceiling");
  checked = { model, expires: Date.now() + 300_000 };
}
