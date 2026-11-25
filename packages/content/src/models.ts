import type { ProjectScale } from "@homepage/content/projectScale";
import type { EnquiryEvidence } from "./enquiryEvidence";
import type { Locale } from "@homepage/content/i18n";
import type { ProjectCase } from "@homepage/content/projectCase";
import type { ProjectTaxonomy } from "./projectTaxonomy";

/** Public rendering format. It has no provider SDK or source-record fields. */
export type RichTextContent = {
  type: "text";
  text: { content: string; link: { url: string } | null };
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plain_text: string;
  href: string | null;
};
export type TitleField = { type: "title"; title: RichTextContent[] };
export type RichTextField = { type: "rich_text"; rich_text: RichTextContent[] };
export type CvClient = { id: string; name: string; url: string | null };
export type CvProject = ProjectTaxonomy & {
  id: string;
  name: string;
  logo: string[] | null;
  accentColor: string | null;
  icon: string | null;
  screenshots: string[] | null;
  description: RichTextField;
  kpis: RichTextField;
  contentLocale: Locale;
  availableLocales: Locale[];
  caseStudyIds: Record<Locale, string | null>;
  updatedAt?: string;
  caseStudyUpdatedAt?: Partial<Record<Locale, string>>;
  wowFactor: number;
  status: string;
  featured: boolean;
  projectType: string;
  startDate: string;
  endDate: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  /** Absent while the worker has no GitHub inventory to check against. */
  hasConnectedRepo?: boolean;
  industries: string[];
  capabilities: string[];
  methods: string[];
  scale?: ProjectScale;
  tools: string[];
  languages: string[];
  workplace: string;
  clients: CvClient[];
  position3d: [number, number, number];
  matching?: ProjectCase;
};
export type CvAddress = {
  street: string;
  zip: string;
  city: string;
  country: string;
};
export type CvOwnerPublic = {
  name: string;
  position: string;
  status: string;
  languages: string;
  education: string;
  city: string;
  available: boolean | null;
  avatarUrl: string | null;
};
/** These contact fields already belong to the public CV; source-only phone/rate fields do not. */
export type CvOwner = CvOwnerPublic & { email: string; address: CvAddress };
export type CaseStudyBlock = {
  id: string;
  type: string;
  richText: RichTextContent[];
  children: CaseStudyBlock[];
  imageUrl?: string;
  caption: RichTextContent[];
  language?: string;
};
export type WebsiteContent = {
  evidence: EnquiryEvidence[];
  projects: CvProject[];
  owner: CvOwner;
  icons: Record<string, string | null>;
  cases: { id: string; caseStudy: ProjectCase }[];
  copy: Record<string, string>;
  studies: Record<string, CaseStudyBlock[]>;
};
export type PublicPublication = {
  version: 3;
  locales: Record<Locale, WebsiteContent>;
  assets: Record<string, string>;
};
export const PUBLICATION_KEY = "website-v3";
export const propertyAssetKey = (id: string, property: string, index: number) =>
  `property:${id}:${property}:${index}`;
export const caseAssetKey = (id: string, block: string) =>
  `case:${id}:${block}`;
