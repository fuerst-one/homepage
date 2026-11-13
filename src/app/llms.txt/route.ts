import { NextRequest, NextResponse } from "next/server";
import { SITE_URL as API_BASE_URL } from "@/lib/seo";
import { serviceCopy, servicePath, serviceSlugs } from "@/data/services";
import { locales } from "@/lib/i18n";
import { serviceProducts, serviceProductPath } from "@/data/serviceProducts";
import {
  buildRateLimitedResponse,
  checkRateLimit,
  RATE_LIMIT_PER_MINUTE,
} from "@/server/api/rateLimit";

export const runtime = "nodejs";

export const GET = async (request: NextRequest) => {
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) return buildRateLimitedResponse(rateLimit);

  const body = `# Fuerst.one — Alexander Fuerst

> Alexander Fuerst (Alexander Fürst) is a UX+AI Engineer based in Würzburg, Germany. His work covers frontend development, UX design, AI engineering and automation, data visualization, e-commerce, and conversion rate optimization.

## Website

- [Home](${API_BASE_URL}/en) — introduction and links to work and contact information.
- [Project portfolio](${API_BASE_URL}/en/projects) — full directory with stable, descriptive HTML URLs for each project, including descriptions, technologies, collaborators, and results. Use the API's webUrl for the canonical page to read and cite.
- [CV and experience](${API_BASE_URL}/en/cv) — public profile and interactive project filtering by specialty.
- [Contact and CV download](${API_BASE_URL}/en/contact) — project inquiries, team opportunities, and tailored PDF CV downloads.
- [Hiring platforms](${API_BASE_URL}/en/hire) — owner-confirmed professional profiles and ways to hire Alexander.
- [Plasma playground](${API_BASE_URL}/en/plasma) — interactive creative coding experiment.
- [GitHub](https://github.com/fuerst-one) — public code profile.
- [LinkedIn](https://www.linkedin.com/in/fuerst-one/) — professional profile.

- [Deutsch](${API_BASE_URL}/de) — German homepage, profile, projects and contact.

## Services / Leistungen

${serviceSlugs
  .flatMap((slug) =>
    locales.map(
      (locale) =>
        `- [${serviceCopy[slug][locale].label} (${locale})](${API_BASE_URL}${servicePath(slug, locale)}) — ${serviceCopy[slug][locale].description}`,
    ),
  )
  .join("\n")}

The service pages link to selected project evidence and explain scope, deliverables and enquiry options. Project results describe individual past projects, not guarantees for future work.

## Focused starting engagements / Klar begrenzte Einstiege

${serviceSlugs.flatMap((slug) => locales.map((locale) => `- [${serviceProducts[slug].copy[locale].label} (${locale})](${API_BASE_URL}${serviceProductPath(slug, locale)}) — ${serviceProducts[slug].copy[locale].description}`)).join("\n")}

These are scoped, paid service engagements. Scope, fee and schedule are agreed before work starts; the pages do not publish fixed prices or promise future project outcomes.

## Public data API

Read-only, Notion-backed API for the same public profile and projects shown on the website. Rate-limited to ${RATE_LIMIT_PER_MINUTE} requests/minute per IP. No auth required. Add \`?locale=de\` to profile/project requests for published German prose; shared tags are unchanged. Content is cached; availability, project counts, and results may change. Use the linked pages and current API responses for factual claims.

The dataset is small (a few dozen projects). Start with /api/facets to discover valid filter values, then narrow with /api/projects, then zoom on a single record via /api/projects/{id}.

## Endpoints

- [GET /api/profile](${API_BASE_URL}/api/profile) — public name, position, location, education, languages, availability, and avatar. Private contact details and rates are excluded.
- [OpenAPI 3.1 spec](${API_BASE_URL}/api/openapi.json) — complete machine-readable schema for all endpoints.
- [GET /api/projects](${API_BASE_URL}/api/projects) — slim list of projects with filters (tools, industries, experiences, languages, projectType, workplace, featured, clientId, from, to, q, sort).
- [GET /api/projects/{id}](${API_BASE_URL}/api/projects) — full project record including rich-text description, KPIs, screenshots, logos, and clients.
- [GET /api/facets](${API_BASE_URL}/api/facets) — counts of unique values per category, useful for discovering valid filter values.

## Examples

\`\`\`
# All projects, sorted by wow factor (default)
curl ${API_BASE_URL}/api/projects

# Projects using React or Next.js, scoped to e-commerce
curl '${API_BASE_URL}/api/projects?tools=react,nextjs&industries=ecommerce'

# Free-text search across name, description, KPIs, clients, tools, industries, experiences, languages
curl '${API_BASE_URL}/api/projects?q=visualization+dashboard'

# Recent work
curl '${API_BASE_URL}/api/projects?from=2024-01-01&sort=date'

# Discover what filter values exist
curl ${API_BASE_URL}/api/facets

# Full detail for one project (id from the list response)
curl ${API_BASE_URL}/api/projects/{id}
\`\`\`

## Filter semantics

- AND across categories. OR within a category. Case-insensitive exact match.
- Comma-separated values, or repeat the parameter: \`?tools=react,nextjs\` is equivalent to \`?tools=react&tools=nextjs\`.
- Unknown query params are ignored. Invalid date or sort values return 400 with the expected format.
`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      "Access-Control-Allow-Origin": "*",
      "X-RateLimit-Limit": String(rateLimit.limit),
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
    },
  });
};
