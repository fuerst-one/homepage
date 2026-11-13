# English and German site

Alex approved explicit `/en` and `/de` routes on 13 November 2026. Keep one shared set of pages under `app/[locale]`, prerender both locales, set the HTML language on the server, and keep API/static assets/robots/sitemap unprefixed. Permanently redirect old English pages to their English counterparts, preserving queries and pinned project slugs.

Use existing Notion records: optional German rich-text description/KPI fields and an explicit ready checkbox. Keep names, tags, multiselects, IDs, images and relations shared. Localized project content is selected from the shared cached dataset. Untranslated details remain English and are not advertised as German alternates. Main editorial copy lives in a small Notion database with key/English/German columns; UI labels live in typed code dictionaries. Seed migrations preserve existing values and record their changes.

Self canonicals, reciprocal published alternates, localized Open Graph/JSON-LD and sitemap entries use shared path helpers. Both data and page caches refresh on a bounded interval. Client translations use a small locale context; existing interactive behavior and components are retained. Behavior tests cover URL mapping, fallback publication, HTML language, metadata, redirects, sitemap, API links and PDF language. Validate types, formatting, scoped lint, production rendering and mobile/desktop UI. No deployment is included without an explicit release request.

The service-page sibling owns service-specific routes/content/components/tests. This thread owns global route/layout migration, shared navigation/SEO/sitemap, existing pages and Notion localization. Existing unrelated edits remain intact.
