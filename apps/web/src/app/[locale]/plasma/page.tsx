import { getLocale } from "../../../server/i18n/getLocale";
import type { LocaleParams } from "@homepage/content/i18n";
import { pageMetadata } from "../../../lib/seo";
import { PlasmaPlayground } from "../../../components/PlasmaPlayground/PlasmaPlayground";

export async function generateMetadata({ params }: LocaleParams) {
  const locale = await getLocale(params);
  return pageMetadata(
    "/plasma",
    locale === "de"
      ? "Interaktiver Plasma-Spielplatz — Alexander Fuerst | Fuerst.one"
      : "Interactive Plasma Playground — Alexander Fuerst | Fuerst.one",
    locale === "de"
      ? "Experimentiere mit ASCII-Animationen in Echtzeit, Formen, Bild-Uploads und Webcam-Modi auf Alexander Fuersts interaktivem Plasma-Spielplatz."
      : "Explore Alexander Fuerst's interactive plasma playground. Experiment with real-time ASCII animation, shapes, image uploads, and webcam modes.",
    { locale },
  );
}

export default function PlasmaPage() {
  return <PlasmaPlayground />;
}
