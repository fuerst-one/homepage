import { pageMetadata } from "@/lib/seo";
import { PlasmaPlayground } from "@/components/PlasmaPlayground/PlasmaPlayground";

export const metadata = pageMetadata(
  "/plasma",
  "Interactive Plasma Playground — Alexander Fuerst | Fuerst.one",
  "Explore Alexander Fuerst's interactive plasma playground. Experiment with real-time ASCII animation, shapes, image uploads, and webcam modes.",
);

export default function PlasmaPage() {
  return <PlasmaPlayground />;
}
