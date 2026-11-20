import Link from "next/link";
import type { ForYouDroppedSection } from "@homepage/content/forYouPlan";
import { localizedPath, type Locale } from "@homepage/content/i18n";
import type { ForYouExample } from "./forYouExamples";

/** A switcher for reviewing example plans; it is not part of the For you page. */
export function ForYouReviewAid({
  locale,
  examples,
  current,
  shown,
  dropped,
  error,
}: {
  locale: Locale;
  examples: readonly ForYouExample[];
  current: ForYouExample;
  shown: number | null;
  dropped: readonly ForYouDroppedSection[];
  error: string | null;
}) {
  const de = locale === "de";
  const href = (name: string, upTo?: number) =>
    localizedPath(
      `/for-you?${new URLSearchParams({
        example: name,
        ...(upTo ? { shown: String(upTo) } : {}),
      })}`,
      locale,
    );
  return (
    <nav
      className="mb-6 space-y-3 border border-dashed border-amber-300/60 bg-black/70 p-4 text-xs leading-relaxed text-neutral-200"
      aria-label={de ? "Prüfhilfe: Beispielpläne" : "Review aid: example plans"}
      data-for-you-review
    >
      <p className="uppercase tracking-[0.2em] text-amber-200">
        {de
          ? "Prüfhilfe · nicht Teil der Seite · handgeschriebene Beispielpläne"
          : "Review aid · not part of the page · hand-written example plans"}
      </p>
      <ul className="flex flex-wrap gap-2">
        {examples.map((example) => {
          const language = (example.plan as { locale?: string }).locale;
          return (
            <li key={example.name}>
              <Link
                href={href(example.name)}
                aria-current={example === current ? "page" : undefined}
                prefetch={false}
                className="inline-flex min-h-[44px] items-center gap-2 border border-white/30 px-3 py-2 hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white aria-[current=page]:border-amber-200 aria-[current=page]:text-amber-100"
              >
                {example.title}
                {language && (
                  <span className="text-[0.6rem] text-neutral-400">
                    {language.toUpperCase()}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <p>
        {shown ? (
          <Link
            href={href(current.name)}
            prefetch={false}
            className="underline underline-offset-4"
          >
            {de ? "Ganzen Plan zeigen" : "Show the whole plan"}
          </Link>
        ) : (
          <Link
            href={href(current.name, 2)}
            prefetch={false}
            className="underline underline-offset-4"
          >
            {de
              ? "Als laufenden Aufbau zeigen (zwei Abschnitte)"
              : "Show mid-stream (two sections)"}
          </Link>
        )}
      </p>
      {error && (
        <p role="alert" className="text-red-300">
          {de ? "Plan ungültig: " : "Invalid plan: "}
          {error}
        </p>
      )}
      {dropped.length > 0 && (
        <details>
          <summary className="cursor-pointer">
            {de
              ? `${dropped.length} Abschnitt(e) verworfen`
              : `${dropped.length} section(s) dropped`}
          </summary>
          <ul className="mt-2 list-disc pl-5">
            {dropped.map(({ index, type, reason }) => (
              <li key={index} data-for-you-dropped={type ?? ""}>
                #{index + 1} {type ?? "?"}: {reason}
              </li>
            ))}
          </ul>
        </details>
      )}
    </nav>
  );
}
