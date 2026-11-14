import { Button } from "../Button";
import { Contact } from "./Contact";

export function Intro({
  locale = "en",
  text,
}: {
  locale?: "en" | "de";
  text?: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-neutral-40 mb-4 text-xs uppercase tracking-[0.2em]">
        {text ??
          "Building immersive interfaces that fuse rigorous systems with intuitive design."}
      </p>
      <Button href="/contact" arrow className="mt-8 w-full justify-center">
        {locale === "de" ? "Kontakt aufnehmen" : "Get in touch"}
      </Button>
      <Contact />
    </div>
  );
}
