import Link from "../i18n/LocalizedLink";

const LEGAL_LINKS = [
  { label: "IMPRESSUM", href: "/de/impressum" },
  { label: "DATENSCHUTZ", href: "/de/datenschutz" },
  { label: "LEGAL NOTICE", href: "/en/legal-notice" },
  { label: "PRIVACY", href: "/en/privacy" },
];

export const LegalFooter = () => {
  return (
    <footer className="text-muted-foreground mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs tracking-wider">
      {LEGAL_LINKS.map((link, idx) => (
        <span key={link.href} className="flex items-center gap-3">
          <Link
            prefetch={false}
            href={link.href}
            className="hover:text-foreground"
          >
            {link.label}
          </Link>
          {idx < LEGAL_LINKS.length - 1 && <span aria-hidden>·</span>}
        </span>
      ))}
    </footer>
  );
};
