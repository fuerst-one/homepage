import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_URL } from "@/lib/seo";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  // Menlo is preferred; fetch Plex only when the browser actually needs it.
  preload: false,
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Alexander Fuerst — UX+AI Engineer | Fuerst.one",
  description: SITE_DESCRIPTION,
  applicationName: "Fuerst.one",
  authors: [{ name: "Alexander Fuerst", url: SITE_URL }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "relative flex min-h-full flex-col bg-background text-foreground antialiased",
          plexMono.variable,
        )}
        style={{ fontFamily: "Menlo, var(--font-plex), monospace" }}
      >
        {children}
      </body>
    </html>
  );
}
