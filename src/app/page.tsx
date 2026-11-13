import Link from "next/link";
import { PlasmaLanding } from "@/components/PlasmaLanding/PlasmaLanding";
import { Button } from "@/components/Button";
import { StructuredData } from "@/components/StructuredData";
import {
  pageMetadata,
  personSchema,
  SITE_DESCRIPTION,
  SITE_URL,
  PERSON_ID,
} from "@/lib/seo";

export const metadata = pageMetadata(
  "/",
  "Alexander Fuerst — UX+AI Engineer | Fuerst.one",
  SITE_DESCRIPTION,
);

export default function Home() {
  return (
    <main>
      <PlasmaLanding />
      <section className="relative z-10 mx-auto max-w-3xl space-y-6 px-6 py-16 text-neutral-200">
        <h1 className="text-3xl font-semibold text-white">
          Alexander Fuerst — UX+AI Engineer
        </h1>
        <p className="text-sm leading-relaxed">
          Based in Würzburg, Germany, I build interfaces that connect thoughtful
          UX design with frontend development and AI engineering. My work spans
          interactive product configurators, data visualization, e-commerce,
          conversion rate optimization, and automation.
        </p>
        <p className="text-sm leading-relaxed">
          Explore my project portfolio for the technologies, collaborations, and
          results behind my work. If you&apos;re planning a project or hiring
          for your team, get in touch or download a tailored CV.
        </p>
        <nav aria-label="Explore my work" className="flex flex-wrap gap-4">
          <Button href="/projects" arrow>
            Explore projects &amp; experience
          </Button>
          <Button href="/contact" arrow>
            Contact &amp; download CV
          </Button>
        </nav>
        <p className="text-xs leading-relaxed text-neutral-400">
          Explore the{" "}
          <Link href="/cv" className="underline">
            interactive CV
          </Link>{" "}
          or the{" "}
          <Link href="/plasma" className="underline">
            interactive plasma playground
          </Link>
          , find me on{" "}
          <a href="https://github.com/fuerst-one" className="underline">
            GitHub
          </a>{" "}
          or{" "}
          <a
            href="https://www.linkedin.com/in/fuerst-one/"
            className="underline"
          >
            LinkedIn
          </a>
          .
        </p>
      </section>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            personSchema(),
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              url: `${SITE_URL}/`,
              name: "Fuerst.one",
              description: SITE_DESCRIPTION,
              publisher: { "@id": PERSON_ID },
              inLanguage: "en",
            },
          ],
        }}
      />
    </main>
  );
}
