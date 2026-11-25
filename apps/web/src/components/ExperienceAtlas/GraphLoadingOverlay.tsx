import { LoaderCircle } from "lucide-react";

export function GraphLoadingOverlay({
  locale,
  comparingMeasurements = false,
}: {
  locale: "en" | "de";
  comparingMeasurements?: boolean;
}) {
  return (
    <div
      role="status"
      className="pointer-events-none absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] items-center gap-2 border border-white/20 bg-neutral-950/90 px-3 py-2 text-xs text-neutral-300 shadow-sm"
    >
      <LoaderCircle
        size={13}
        aria-hidden="true"
        className="shrink-0 motion-safe:animate-spin"
      />
      <span>
        {comparingMeasurements
          ? locale === "de"
            ? "Messwerte werden verglichen…"
            : "Comparing measurements…"
          : locale === "de"
            ? "Gruppen werden berechnet…"
            : "Calculating clusters…"}
      </span>
    </div>
  );
}
