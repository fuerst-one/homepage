export const buildNotionImageProxyPath = (
  pageId: string,
  propertyName: string,
  index = 0,
): string => {
  const path = `/api/image/${encodeURIComponent(pageId)}/${encodeURIComponent(propertyName)}`;
  return index > 0 ? `${path}?i=${index}` : path;
};

const legacyLogos = new Set([
  "bagsnboxes-logo.svg",
  "bwi-logo.jpeg",
  "faaren-logo.png",
  "kleineralsraute.png",
  "mobilede-logo.svg",
  "numobility-logo.jpg",
  "piercheck-logo.svg",
  "playlist-canvas.png",
  "public-searoutes.svg",
  "seabo.svg",
  "sophisticates.png",
  "staehler.png",
]);

// Notion still references these originals on the retired portfolio host (410).
export const getLegacyLogoPath = (source: string): string | null => {
  try {
    const url = new URL(source);
    const name = url.pathname.slice("/img/logos/".length);
    return url.origin === "https://portfolio.fuerst.one" &&
      url.pathname.startsWith("/img/logos/") &&
      legacyLogos.has(name)
      ? url.pathname
      : null;
  } catch {
    return null;
  }
};
