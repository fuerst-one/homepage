import type { EXTRA_SIGNAL_WEIGHTS } from "@homepage/content/visitorProfileSignals";
export const richSignalNames: Record<
  keyof typeof EXTRA_SIGNAL_WEIGHTS,
  [string, string]
> = {
  project_details_viewed: [
    "Viewed project details",
    "Projektdetails angesehen",
  ],
  case_study_viewed: ["Opened a case study", "Fallstudie geöffnet"],
  project_section_read: ["Read a project section", "Projektabschnitt gelesen"],
  gallery_explored: ["Explored project images", "Projektbilder erkundet"],
  proof_opened: ["Opened project evidence", "Projektbeleg geöffnet"],
  service_offer_viewed: [
    "Viewed a focused offer",
    "Konkretes Angebot angesehen",
  ],
  service_collaboration_viewed: [
    "Viewed collaboration options",
    "Zusammenarbeit angesehen",
  ],
  service_section_read: ["Read service details", "Leistungsdetails gelesen"],
  explorer_lens_selected: [
    "Chose an explorer lens",
    "Explorer-Perspektive gewählt",
  ],
  explorer_cluster_selected: [
    "Selected an explorer cluster",
    "Explorer-Gruppe gewählt",
  ],
  explorer_term_selected: ["Chose a cluster topic", "Gruppenthema gewählt"],
  related_project_opened: [
    "Followed a project connection",
    "Projektverbindung gefolgt",
  ],
  topic_selected: ["Chose a search topic", "Suchthema gewählt"],
  project_returned: ["Returned to a project", "Projekt erneut besucht"],
  project_saved: ["Saved a project", "Projekt gemerkt"],
  project_unsaved: [
    "Removed a saved project",
    "Projekt aus Merkliste entfernt",
  ],
  project_more: ["Asked for more like this", "Mehr ähnliche Projekte gewählt"],
  project_neutral: [
    "Cleared project feedback",
    "Projektfeedback zurückgesetzt",
  ],
  project_card_clicked: ["Clicked a project card", "Projektkarte angeklickt"],
  project_region_viewed: [
    "Saw part of a project page",
    "Teil einer Projektseite gesehen",
  ],
  rate_revealed: ["Revealed the Malt rate", "Malt-Tagessatz aufgedeckt"],
};
