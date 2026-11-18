import type { Locale } from "@homepage/content/i18n";
import Link from "./i18n/LocalizedLink";
import { ArrowUpRight, Network } from "lucide-react";

export function PortfolioExplorerLinks({ locale }: { locale: Locale }) {
  const de = locale === "de";
  return (
    <section className="space-y-4" aria-labelledby="portfolio-explore-title">
      <h2
        id="portfolio-explore-title"
        className="text-lg font-semibold text-white"
      >
        {de
          ? "Erfahrung aus einer anderen Perspektive"
          : "A different perspective on experience"}
      </h2>
      <div className="grid gap-3">
        {[
          {
            href: "/explore",
            Icon: Network,
            title: de ? "Entdecken" : "Explore",
            text: de
              ? "Projekte im Zusammenhang sehen. Gemeinsamkeiten entdecken – auch mit deiner Branche."
              : "See where projects connect. Find familiar challenges across different fields.",
          },
        ].map(({ href, Icon, title, text }) => (
          <Link
            key={href}
            href={href}
            className="glass-panel group border border-white/20 p-5 transition hover:border-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <div className="mb-5 flex justify-between text-neutral-400">
              <Icon size={22} />
              <ArrowUpRight size={16} />
            </div>
            <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs leading-relaxed text-neutral-400">{text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
