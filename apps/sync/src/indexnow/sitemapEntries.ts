export type SitemapEntry = { url: string; lastmod: string | null };

const decodeXml = (value: string) =>
  value
    .trim()
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");

export function sitemapEntries(xml: string): SitemapEntry[] {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].flatMap(([, block]) => {
    const loc = block.match(/<loc>([\s\S]*?)<\/loc>/)?.[1];
    if (!loc) return [];
    const lastmod = block.match(/<lastmod>([\s\S]*?)<\/lastmod>/)?.[1];
    return [
      { url: decodeXml(loc), lastmod: lastmod ? decodeXml(lastmod) : null },
    ];
  });
}
