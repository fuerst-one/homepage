import { getLocale } from "../../../server/i18n/getLocale";
import type { LocaleParams } from "@homepage/content/i18n";
import { pageMetadata } from "../../../lib/seo";
import { PlasmaPlayground } from "../../../components/PlasmaPlayground/PlasmaPlayground";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await getLocale(params);
  return pageMetadata(
    "/plasma",
    locale === "de"
      ? "Interaktiver Plasma-Spielplatz — Alexander Fürst | FUERST.ONE"
      : "Interactive Plasma Playground — Alexander Fuerst | FUERST.ONE",
    locale === "de"
      ? "Spiele Ripples, ein Instrument auf einer schwingenden Sandplatte, oder experimentiere mit ASCII-Animationen, 3D-Formen und Webcam-Modus auf Alexander Fürsts Plasma-Spielplatz."
      : "Play Ripples, an instrument on a vibrating sand plate, or experiment with real-time ASCII animation, 3D shapes and webcam mode in Alexander Fuerst's plasma playground.",
    { locale },
  );
}

export default function PlasmaPage() {
  return <PlasmaPlayground />;
}
