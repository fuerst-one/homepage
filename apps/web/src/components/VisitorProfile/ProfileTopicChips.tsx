"use client";
import { useLocale } from "../i18n/LocaleProvider";
import { caseLabel } from "@homepage/content/projectCase";
import { recordVisitorInteraction } from "./profileStore";
const TOPICS = [
  ["buyerNeeds", "Automate repetitive work"],
  ["buyerNeeds", "Improve a complex interface"],
  ["buyerNeeds", "Add AI capabilities"],
  ["tools", "React.js"],
] as const;
export function ProfileTopicChips({
  onSelect,
}: {
  onSelect: (query: string) => void;
}) {
  const locale = useLocale();
  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-2"
      role="group"
      aria-label={
        locale === "de" ? "Thema für die Suche wählen" : "Choose a search topic"
      }
    >
      {TOPICS.map(([facet, value]) => (
        <button
          key={value}
          type="button"
          className="min-h-11 border border-white/20 px-3 text-xs text-neutral-300 transition hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          onClick={() => {
            recordVisitorInteraction("topic_selected", `${facet}:${value}`);
            onSelect(value);
          }}
        >
          {caseLabel(value, locale)}
        </button>
      ))}
    </div>
  );
}
