import type { Locale } from "@homepage/content/i18n";
import { caseLabel } from "@homepage/content/projectCase";
import Link from "../../i18n/LocalizedLink";
import { cn } from "../../../lib/utils";
import { projectFacetHref } from "./Filter/utils";

/** Quiet filter links; the profile records a click on one as a filter choice. */
export const ProjectNeedLinks = ({
  needs,
  locale,
  region,
  className,
}: {
  needs: string[];
  locale: Locale;
  region?: string;
  className?: string;
}) =>
  needs.length > 0 ? (
    <ul
      aria-label={locale === "de" ? "Bedarf" : "Buyer needs"}
      data-profile-region={region}
      className={cn(
        "flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-400 print:hidden",
        className,
      )}
    >
      {needs.map((need) => (
        <li key={need}>
          <Link
            href={projectFacetHref("buyerNeeds", need, locale)}
            className="underline decoration-white/40 decoration-dotted underline-offset-4 transition hover:text-white hover:decoration-white"
          >
            {caseLabel(need, locale)}
          </Link>
        </li>
      ))}
    </ul>
  ) : null;
