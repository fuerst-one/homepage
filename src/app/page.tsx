import Link from "next/link";
import Image from "next/image";
import { getCachedCvOwnerPublic } from "@/server/notion/getCachedCvOwner";
import { PlasmaLanding } from "@/components/PlasmaLanding/PlasmaLanding";
import { Button } from "@/components/Button";
import { StructuredData } from "@/components/StructuredData";
import { pageMetadata, personSchema, SITE_URL, PERSON_ID } from "@/lib/seo";
import "./home.css";
export const metadata = pageMetadata(
  "/",
  "Alexander Fuerst — UX+AI Engineer | Fuerst.one",
  "Alexander Fuerst is a UX+AI engineer in W\u00fcrzburg, Germany, building frontend interfaces, AI automation, data visualizations, and e-commerce experiences.",
);
export default async function Home() {
  const owner = await getCachedCvOwnerPublic();
  return (
    <main>
      <PlasmaLanding />
      <section className="home-about" aria-labelledby="home-about-title">
        <div className="home-about-heading">
          <p className="home-about-eyebrow">
            {"A little curiosity goes a long way."}
          </p>
          {owner.avatarUrl && (
            <div className="home-about-portrait">
              <Image
                src={owner.avatarUrl}
                alt={"Portrait of Alexander Fuerst"}
                width={240}
                height={240}
                sizes="(max-width: 767px) 180px, 220px"
                loading="lazy"
              />
            </div>
          )}
          <h1 id="home-about-title">Alexander Fuerst</h1>
          <p className="home-about-role">{"UX + AI Engineer"}</p>
          <p className="home-about-location">{"Based in Würzburg, Germany."}</p>
        </div>
        <div className="home-about-copy">
          <p className="home-about-lead">
            {
              "I like making complex things feel clear. Thoughtful interfaces, useful automation, and the details that make a product feel good to use."
            }
          </p>
          <p>
            {
              "My work connects UX design, frontend development, and AI engineering. I work across interactive product configurators, data visualization, e-commerce, and conversion rate optimization, bringing the design of an experience close to the code that makes it work."
            }
          </p>
          <p>
            {
              "I'm drawn to projects where there is something to untangle: a complicated workflow, a lot of information, or an idea that needs a first working version. Sometimes that means building an interface. Sometimes it means connecting systems or finding a better way to automate the repetitive parts."
            }
          </p>
          <p>
            {
              "Explore the projects for the thinking, technologies, and collaborations behind my work. If you're planning a product or looking for someone to join your team, let's talk."
            }
          </p>
        </div>
        <div className="home-about-links">
          <nav aria-label="Explore my work" className="flex flex-wrap gap-4">
            <Button prefetch={false} href="/cv" className="max-w-full" arrow>
              {"Explore projects"}
            </Button>
            <Button
              prefetch={false}
              href="/contact"
              className="max-w-full"
              arrow
            >
              {"Contact & download CV"}
            </Button>
          </nav>
          <p className="home-about-elsewhere">
            {"Explore the "}
            <Link prefetch={false} href="/cv" className="underline">
              {"interactive CV"}
            </Link>{" "}
            {"or the "}
            <Link prefetch={false} href="/plasma" className="underline">
              {"interactive plasma playground"}
            </Link>
            {", find me on "}
            <a href="https://github.com/fuerst-one" className="underline">
              GitHub
            </a>{" "}
            {"or "}
            <a
              href="https://www.linkedin.com/in/fuerst-one/"
              className="underline"
            >
              LinkedIn
            </a>
            .
          </p>
        </div>
      </section>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@graph": [
            personSchema(owner),
            {
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              url: `${SITE_URL}/`,
              name: "Fuerst.one",
              description:
                "Alexander Fuerst is a UX+AI engineer in Würzburg, Germany, building frontend interfaces, AI automation, data visualizations, and e-commerce experiences.",
              publisher: { "@id": PERSON_ID },
              inLanguage: "en",
            },
          ],
        }}
      />
    </main>
  );
}
