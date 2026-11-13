import { localizedPath, type Locale } from "../../lib/i18n";
export type LandingCommand = {
  id: string;
  label: string;
  caption: string;
  shape: number;
  href?: string;
  action?: "pause" | "play";
};

const COMMANDS: LandingCommand[] = [
  {
    id: "experience",
    label: "Explore projects",
    caption: "The people, products, and pixels along the way.",
    shape: 0,
    href: "/cv",
  },
  {
    id: "contact",
    label: "Get in touch",
    caption: "Good things start with a conversation.",
    shape: 1,
    href: "/contact",
  },
  {
    id: "download",
    label: "Download my CV",
    caption: "A little more about me. To take away.",
    shape: 3,
    href: "/cv.pdf",
  },
  {
    id: "tinker",
    label: "Let's tinker",
    caption: "Less serious. More possibilities.",
    shape: 4,
    href: "/plasma",
  },
  {
    id: "hire",
    label: "Work with me",
    caption: "Your next project. My next rabbit hole.",
    shape: 2,
    href: "/hire",
  },
];

export const SUGGESTIONS = COMMANDS.filter(({ id }) => id !== "tinker");

const [experience, contact, download, tinker, hire] = COMMANDS;

const normalizeMessage = (message: string) =>
  message
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Only complete commands take priority over free project-search queries. */
export const resolveExplicitCommand = (
  message: string,
  locale: Locale = "en",
): LandingCommand | null => {
  const text = normalizeMessage(message);
  if (locale === "de") {
    const aliases: Record<string, string> = {
      projekte: "experience",
      portfolio: "experience",
      erfahrung: "experience",
      lebenslauf: "experience",
      kontakt: "contact",
      hallo: "contact",
      moin: "contact",
      servus: "contact",
      zusammenarbeiten: "hire",
      beauftragen: "hire",
      "lebenslauf herunterladen": "download",
      "lebenslauf downloaden": "download",
      "uber mich": "experience",
      "mit dir arbeiten": "hire",
      "wie kann ich dich kontaktieren": "contact",
      "lass uns basteln": "tinker",
      pdf: "download",
      basteln: "tinker",
    };
    const translated =
      getLocalizedSuggestions(locale).find(
        (item) => normalizeMessage(item.label) === text,
      ) ?? COMMANDS.find((item) => item.id === aliases[text]);
    if (translated) return localizeCommand(translated, locale);
    if (
      /^(?:(zeig|zeige)( mir)?( deine)? )?(projekte|portfolio|erfahrung|lebenslauf)$/.test(
        text,
      )
    )
      return localizeCommand(experience, locale);
    if (
      /^(pause|pausieren|stop|stopp|anhalten|einfrieren)( (die )?(animation|plasma))?$/.test(
        text,
      ) ||
      /^(animation|plasma) (pausieren|anhalten|stoppen)$/.test(text)
    )
      return localizeCommand(
        {
          id: "pause",
          label: "Pause animation",
          caption: "A moment of stillness.",
          shape: 5,
          action: "pause",
        },
        locale,
      );
    if (
      /^(weiter|fortsetzen|starten)( (die )?(animation|plasma))?$/.test(text) ||
      /^(animation|plasma) (fortsetzen|starten)$/.test(text)
    )
      return localizeCommand(
        {
          id: "play",
          label: "Resume animation",
          caption: "Back in motion.",
          shape: 5,
          action: "play",
        },
        locale,
      );
  }
  const exact = COMMANDS.find((item) => normalizeMessage(item.label) === text);
  if (exact) return exact;
  const command = resolveCommand(message);
  if (command?.action) return command;
  if (
    /^(download( my| your| the)? (cv|resume|pdf)|(cv|resume) pdf|pdf)$/.test(
      text,
    )
  )
    return download;
  if (
    /^(?:(show|explore)( me)?( your)? )?(projects?|portfolio|experience|cv|resume|about|skills)$/.test(
      text,
    ) ||
    /^(explore my experience|tell me about your experience)$/.test(text)
  )
    return experience;
  if (
    /^(hire( me)?|hiring|malt|freelancermap|(hiring )?platforms?)$/.test(text)
  )
    return hire;
  if (
    /^(contact( me)?|email( me)?|hello|say hello|(how can i )?get in touch)$/.test(
      text,
    )
  )
    return contact;
  if (/^(tinker|playground)$/.test(text)) return tinker;
  return null;
};

export const resolveCommand = (message: string): LandingCommand | null => {
  const text = normalizeMessage(message);
  if (!text || /\b(not|dont|never)\b/.test(text)) return null;
  const exact = COMMANDS.find(
    (item) => item.label.toLowerCase().replace(/[’']/g, "") === text,
  );
  if (exact) return exact;
  if (/^(pause|stop|freeze)( (the )?(animation|plasma))?$/.test(text))
    return {
      id: "pause",
      label: "Pause animation",
      caption: "A moment of stillness.",
      shape: 5,
      action: "pause",
    };
  if (/^(play|resume|start)( (the )?(animation|plasma))?$/.test(text))
    return {
      id: "play",
      label: "Resume animation",
      caption: "Back in motion.",
      shape: 5,
      action: "play",
    };
  if (/\b(download|pdf)\b/.test(text) && /\b(cv|resume|pdf)\b/.test(text))
    return download;
  if (/\b(hire|hiring|malt|freelancermap|platforms?)\b/.test(text)) return hire;
  if (/\b(projects?|portfolio|work)\b/.test(text)) return experience;
  if (/\b(contact|touch|email|hello)\b/.test(text)) return contact;
  if (/\b(experience|cv|resume|about|skills)\b/.test(text)) return experience;
  if (/\b(tinker|playground)\b/.test(text)) return tinker;
  return null;
};

const GERMAN_COMMANDS: Record<string, [string, string]> = {
  experience: [
    "Projekte entdecken",
    "Die Menschen, Produkte und Ideen hinter meiner Arbeit.",
  ],
  contact: ["Kontakt aufnehmen", "Gute Dinge beginnen mit einem Gespräch."],
  download: [
    "Lebenslauf herunterladen",
    "Ein bisschen mehr über mich. Zum Mitnehmen.",
  ],
  tinker: ["Lass uns basteln", "Weniger ernst. Mehr Möglichkeiten."],
  hire: [
    "Zusammenarbeiten",
    "Dein nächstes Projekt. Meine nächste Entdeckungsreise.",
  ],
  pause: ["Animation pausieren", "Ein Moment der Ruhe."],
  play: ["Animation fortsetzen", "Wieder in Bewegung."],
};
export function localizeCommand(
  command: LandingCommand,
  locale: Locale,
): LandingCommand {
  const translation = locale === "de" ? GERMAN_COMMANDS[command.id] : undefined;
  return {
    ...command,
    ...(translation && { label: translation[0], caption: translation[1] }),
    ...(command.href && { href: localizedPath(command.href, locale) }),
  };
}
export const getLocalizedSuggestions = (locale: Locale) =>
  SUGGESTIONS.map((command) => localizeCommand(command, locale));
