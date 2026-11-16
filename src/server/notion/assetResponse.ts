/** Images are published by the worker; this path never resolves a Notion URL. */
export function assetResponse(
  asset: { content: Buffer; contentType: string } | null,
) {
  if (!asset) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(asset.content), {
    headers: {
      "Content-Type": asset.contentType,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
