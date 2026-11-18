"use client";
import { useMemo, useState } from "react";
import {
  profilePatterns,
  type ProfilePattern,
} from "@homepage/content/visitorProfile";
import { caseLabel } from "@homepage/content/projectCase";
import { useLocale } from "../i18n/LocaleProvider";
import Link from "../i18n/LocalizedLink";
import { useVisitorProfileStore as useProfile } from "./profileStore";
import { useProfileSnapshot } from "./useProfileSnapshot";
import { ProjectProfileActions } from "./ProjectProfileActions";
import { signalNames, subjectName } from "./profilePresentation";

const titles: Record<ProfilePattern["kind"], [string, string]> = {
  shared_need: [
    "A need across different projects",
    "Ein Bedarf in mehreren Projekten",
  ],
  implementation_proof: [
    "You inspect implementation evidence",
    "Du schaust dir Implementierungsbelege an",
  ],
  live_proof: [
    "You explore working products",
    "Du erkundest laufende Produkte",
  ],
  engagement_consideration: [
    "You explored working together",
    "Du hast eine Zusammenarbeit erkundet",
  ],
  returning_project: [
    "A project you came back to",
    "Ein Projekt, zu dem du zurückgekehrt bist",
  ],
  explorer_perspective: [
    "Your latest explorer perspective",
    "Deine letzte Explorer-Perspektive",
  ],
};
export function ProfileInsights() {
  const locale = useLocale(),
    de = locale === "de",
    lang = de ? 1 : 0;
  const [announcement, setAnnouncement] = useState("");
  const enabled = useProfile((s) => s.enabled);
  const { profile, catalog, snapshotAt } = useProfileSnapshot();
  const patterns = useMemo(
    () =>
      enabled && catalog ? profilePatterns(profile, catalog, snapshotAt) : [],
    [enabled, catalog, profile, snapshotAt],
  );
  const choices = enabled
    ? (catalog?.projects ?? []).filter(
        (p) => profile.projectChoices?.[p.id]?.saved,
      )
    : [];
  return (
    <>
      <section
        id="project-choices"
        className="profile-page-section"
        aria-labelledby="profile-choices-title"
      >
        <div className="profile-section-heading">
          <div>
            <p className="profile-page-eyebrow">
              {de ? "Von dir ausgewählt" : "Chosen by you"}
            </p>
            <h2 id="profile-choices-title" tabIndex={-1}>
              {de ? "Deine gemerkten Projekte" : "Your saved projects"}
            </h2>
          </div>
          <span>
            {
              choices.filter((p) => profile.projectChoices?.[p.id]?.saved)
                .length
            }{" "}
            {de ? "gemerkt" : "saved"}
          </span>
        </div>
        <p className="profile-section-intro">
          {de
            ? "Alle Projekte, die du mit dem Herz vorgemerkt hast. Öffne ein Projekt, um weiterzulesen, oder klicke erneut auf das Herz, um es aus deiner Merkliste zu entfernen."
            : "All the projects you saved with the heart. Open one to keep exploring, or click its heart again to remove it from your saved projects."}
        </p>
        <p className="sr-only" role="status">
          {announcement}
        </p>
        {choices.length ? (
          <div className="profile-choice-list">
            {choices.map((project) => (
              <article key={project.id}>
                <Link
                  href={project.href}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center font-medium text-white underline underline-offset-4"
                >
                  {project.name} ↗
                </Link>
                <ProjectProfileActions
                  projectId={project.id}
                  projectName={project.name}
                  focusFallbackId="profile-choices-title"
                  onAction={() =>
                    setAnnouncement(
                      de
                        ? "Deine Projektauswahl wurde aktualisiert."
                        : "Your project choices were updated.",
                    )
                  }
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="profile-empty">
            {de
              ? "Klicke im Projektfenster auf das Herz. Deine gemerkten Projekte erscheinen dann hier."
              : "Click the heart in a project preview. Your saved projects will appear here."}
          </p>
        )}
      </section>
      <section
        id="patterns"
        className="profile-page-section"
        aria-labelledby="profile-patterns-title"
      >
        <div className="profile-section-heading">
          <div>
            <p className="profile-page-eyebrow">
              {de ? "Aus mehreren Schritten" : "Across several actions"}
            </p>
            <h2 id="profile-patterns-title">
              {de
                ? "Muster in deiner Erkundung"
                : "Patterns in your exploration"}
            </h2>
          </div>
        </div>
        <p className="profile-section-intro">
          {de
            ? "Nachvollziehbare Vermutungen aus den letzten sieben Tagen. Gemeinsamer Bedarf aus mehreren gelesenen Projekten erhält einmalig bis zu zwei zusätzliche Punkte. Belegvorlieben, wiederholte Besuche und Schritte zu einer Anfrage beschreiben deine Erkundung; daraus leiten wir weder Identität noch Beruf ab."
            : "Inspectable hypotheses from the last seven days. A shared need across distinct projects you read gets one boost of up to two points. Evidence preferences, return visits and steps towards an enquiry describe your exploration; they do not identify you or your role."}
        </p>
        {patterns.length ? (
          <div className="profile-pattern-grid">
            {patterns.map((pattern) => (
              <article key={pattern.id} className="profile-pattern">
                <h3>{titles[pattern.kind][lang]}</h3>
                {pattern.subject && (
                  <p className="text-sm text-neutral-200">
                    {pattern.kind === "shared_need"
                      ? caseLabel(
                          catalog!.terms.find((t) => t.id === pattern.subject)
                            ?.value ?? pattern.subject,
                          locale,
                        )
                      : subjectName(
                          {
                            kind: "explorer_lens_selected",
                            subject: pattern.subject,
                            id: pattern.id,
                            at: snapshotAt,
                          },
                          catalog!,
                          locale,
                        )}
                  </p>
                )}
                <p className="text-xs text-neutral-400">
                  {pattern.projectIds
                    .map(
                      (id) => catalog!.projects.find((p) => p.id === id)?.name,
                    )
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <details className="profile-reasons">
                  <summary>
                    {de ? "Die Grundlage ansehen" : "Inspect the evidence"}
                  </summary>
                  {pattern.evidence.map((signal) => (
                    <p key={signal.id}>
                      {signalNames[signal.kind][lang]} ·{" "}
                      {subjectName(signal, catalog!, locale)}
                    </p>
                  ))}
                </details>
              </article>
            ))}
          </div>
        ) : (
          <p className="profile-empty">
            {de
              ? "Wenn mehrere Schritte zusammenpassen, erscheinen hier die Belege und ihre Bedeutung."
              : "When several actions form a pattern, its evidence and interpretation will appear here."}
          </p>
        )}
      </section>
    </>
  );
}
