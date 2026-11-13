import { readFileSync } from "node:fs";

const projectSlugs = JSON.parse(
  readFileSync(
    new URL("./src/data/project-slugs.json", import.meta.url),
    "utf8",
  ),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    // All static project pages share one Notion dataset; avoid parallel cold-cache fetches.
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
  },
  async redirects() {
    return [
      ...Object.entries(projectSlugs).map(([id, slug]) => ({
        source: `/projects/${id}`,
        destination: `/projects/${slug}`,
        permanent: true,
      })),
      ...[
        ["/learn-more", "/cv"],
        ["/team-up", "/contact"],
        ["/hire-me", "/contact"],
        ["/privacy-policy", "/privacy"],
      ].map(([source, destination]) => ({
        source,
        destination: `https://fuerst.one${destination}`,
        permanent: true,
      })),
      {
        source: "/impressum",
        has: [{ type: "host", value: "portfolio.fuerst.one" }],
        destination: "https://fuerst.one/impressum",
        permanent: true,
      },
      {
        source: "/datenschutz",
        has: [{ type: "host", value: "portfolio.fuerst.one" }],
        destination: "https://fuerst.one/datenschutz",
        permanent: true,
      },
      {
        source: "/contact",
        has: [{ type: "host", value: "portfolio.fuerst.one" }],
        destination: "https://fuerst.one/contact",
        permanent: true,
      },
      {
        source: "/legal-notice",
        has: [{ type: "host", value: "portfolio.fuerst.one" }],
        destination: "https://fuerst.one/legal-notice",
        permanent: true,
      },
      {
        source: "/:path*",
        has: [{ type: "host", value: "portfolio.fuerst.one" }],
        destination: "https://fuerst.one/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
