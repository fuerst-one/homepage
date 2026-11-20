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
      ? "Experimentiere mit ASCII-Animationen in Echtzeit, 3D-Formen und Webcam-Modus auf Alexander Fürsts interaktivem Plasma-Spielplatz."
      : "Explore Alexander Fuerst's interactive plasma playground. Experiment with real-time ASCII animation, 3D shapes and webcam mode.",
    { locale },
  );
}

export default function PlasmaPage() {
  return <PlasmaPlayground />;
}
