import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Alexander Fuerst — UX+AI Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function Image() {
  const font = await readFile(
    join(process.cwd(), "public/fonts/IBMPlexMono-Regular.ttf"),
  );
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "64px",
        background: "#080808",
        color: "#fafafa",
        fontFamily: "Plex",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 28,
          letterSpacing: "0.15em",
          color: "#a3a3a3",
        }}
      >
        FUERST.ONE
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", fontSize: 64 }}>Alexander Fuerst</div>
        <div style={{ display: "flex", fontSize: 36 }}>UX+AI Engineer</div>
      </div>
      <div
        style={{
          display: "flex",
          paddingTop: 28,
          borderTop: "1px solid #525252",
          fontSize: 23,
          color: "#a3a3a3",
        }}
      >
        Creative technology · Interfaces · Automation
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Plex", data: font, weight: 400, style: "normal" }],
    },
  );
}
