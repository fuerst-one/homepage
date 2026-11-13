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
      ...[
        ["/", "/en"],
        ["/cv", "/en/cv"],
        ["/projects", "/en/projects"],
        ["/contact", "/en/contact"],
        ["/hire", "/en/hire"],
        ["/plasma", "/en/plasma"],
        ["/legal-notice", "/en/legal-notice"],
        ["/privacy", "/en/privacy"],
        ["/impressum", "/de/impressum"],
        ["/datenschutz", "/de/datenschutz"],
      ].map(([source, destination]) => ({
        source,
        destination: `https://fuerst.one${destination}`,
        has: [{ type: "host", value: "portfolio.fuerst.one" }],
        permanent: true,
      })),
      { source: "/", destination: "/en", permanent: true },
      ...[
        "cv",
        "projects",
        "contact",
        "hire",
        "plasma",
        "pdf-content",
        "cv.pdf",
      ].map((page) => ({
        source: `/${page}`,
        destination: `/en/${page}`,
        permanent: true,
      })),
      {
        source: "/services/:service",
        destination: "/en/services/:service",
        permanent: true,
      },
      ...[
        ["/impressum", "/de/impressum"],
        ["/datenschutz", "/de/datenschutz"],
        ["/legal-notice", "/en/legal-notice"],
        ["/privacy", "/en/privacy"],
        ["/en/impressum", "/de/impressum"],
        ["/en/datenschutz", "/de/datenschutz"],
        ["/de/legal-notice", "/de/impressum"],
        ["/de/privacy", "/de/datenschutz"],
      ].map(([source, destination]) => ({
        source,
        destination,
        permanent: true,
      })),
      ...Object.entries(projectSlugs).flatMap(([id, slug]) =>
        ["", "/en"].map((prefix) => ({
          source: `${prefix}/projects/${id}`,
          destination: `/en/projects/${slug}`,
          permanent: true,
        })),
      ),
      {
        source: "/projects/:reference",
        destination: "/en/projects/:reference",
        permanent: true,
      },
      ...[
        ["/learn-more", "/cv"],
        ["/team-up", "/contact"],
        ["/hire-me", "/contact"],
        ["/privacy-policy", "/privacy"],
      ].map(([source, destination]) => ({
        source,
        destination: `https://fuerst.one/en${destination}`,
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
