import { localeFromPath } from "@homepage/content/i18n";

export function retiredCvResponse(request: Request) {
  const locale = localeFromPath(new URL(request.url).pathname);
  const de = locale === "de";
  const title = de
    ? "Öffentliche Lebenslauf-Downloads wurden eingestellt"
    : "Public CV downloads have been retired";
  return new Response(
    `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, follow"><title>${title}</title></head><body><main><h1>${title}</h1><p>${de ? "Beschreibe dein Vorhaben, um passende Erfahrung und den nächsten Schritt zu besprechen." : "Share your project context to discuss relevant experience and a useful next step."}</p><a href="/${locale}/contact">${de ? "Kontakt aufnehmen" : "Get in touch"}</a></main></body></html>`,
    {
      status: 410,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, follow",
      },
    },
  );
}
