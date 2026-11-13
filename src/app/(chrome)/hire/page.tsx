import { Layout } from "@/components/Layout";
import { IconLink } from "@/components/IconLink";
import { Button } from "@/components/Button";
import { FaEnvelope } from "@react-icons/all-files/fa/FaEnvelope";
import { hiringPlatforms } from "@/data/hiringPlatforms";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "/hire",
  "Work with me \u2014 Alexander Fuerst | Fuerst.one",
  "Hire Alexander Fuerst for UX, frontend development, and AI engineering. Find my profiles on Malt, freelancermap, and LinkedIn, or get in touch directly.",
);
export default async function HirePage() {
  return (
    <Layout>
      <div className="space-y-10">
        <header className="space-y-4">
          <p className="text-[0.65rem] uppercase tracking-[0.25em] text-neutral-400">
            {"Good work starts with a conversation"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {"Work with me"}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-neutral-300">
            {
              "Have a product to untangle, an interface to build, or an idea worth exploring? I bring UX, frontend development, and AI engineering together. Choose the way you prefer to connect."
            }
          </p>
        </header>
        <section
          aria-label="Hiring platform profiles"
          className="divide-y divide-white/20 border-y border-white/20"
        >
          {hiringPlatforms.map((platform, index) => (
            <a
              key={platform.href}
              href={platform.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group grid gap-4 py-7 transition hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-1 focus-visible:outline-white sm:grid-cols-[2rem_1fr_auto] sm:items-start"
            >
              <span
                aria-hidden="true"
                className="pt-1 text-[0.65rem] text-neutral-500"
              >
                0{index + 1}
              </span>
              <div className="space-y-2">
                <h2 className="text-xl font-medium text-white">
                  {platform.name}
                </h2>
                <p className="max-w-md text-xs leading-relaxed text-neutral-400">
                  {platform.description}
                </p>
                <span className="inline-block pt-2 text-[0.65rem] text-neutral-300">
                  {platform.label}{" "}
                  <span className="sr-only">{"(opens in a new tab)"}</span>
                </span>
              </div>
              <span
                aria-hidden="true"
                className="hidden text-xl text-neutral-500 group-hover:text-white motion-safe:transition motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:translate-x-1 sm:block"
              >
                ↗
              </span>
            </a>
          ))}
        </section>
        <section className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-white">
              {"Prefer a direct conversation?"}
            </h2>
            <p className="text-xs leading-relaxed text-neutral-400">
              {
                "Send me a few lines about your project, or explore my experience first."
              }
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <IconLink
              href="mailto:alexander@fuerst.one"
              icon={FaEnvelope}
              className="min-h-11 break-all"
            >
              alexander@fuerst.one
            </IconLink>
            <Button href="/contact" arrow>
              {"Contact & tailored CV"}
            </Button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
