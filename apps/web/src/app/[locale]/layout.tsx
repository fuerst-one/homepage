import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { cn } from "../../lib/utils";
import "../globals.css";
import { notFound } from "next/navigation";
import { LocaleProvider } from "../../components/i18n/LocaleProvider";
import { isLocale, locales } from "@homepage/content/i18n";
import { SITE_DESCRIPTION, SITE_URL } from "../../lib/seo";

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

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale}>
      <body
        className={cn(
          "bg-background text-foreground relative flex min-h-full flex-col antialiased",
          plexMono.variable,
        )}
        style={{ fontFamily: "Menlo, var(--font-plex), monospace" }}
      >
        <LocaleProvider key={locale} locale={locale}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
