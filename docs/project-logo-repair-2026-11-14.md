# Project logo repair — 14 November 2026

Production `/en/cv` reproduced failed logo proxy responses (502). The affected
Notion `Logo` properties still point to `https://portfolio.fuerst.one/img/logos/…`;
that retired host returns 410. Uploaded Notion logos and project screenshots
continue to load. Separately, the screen blend mode hides black artwork, and
unbounded badge widths allow broken-image alt text to expand beyond the card.

Restored the 12 referenced legacy logo files, byte-for-byte, from
`/Users/Alex/dev/01-fuerst-one/01-archive/hosting-inventory-2026-11-13/onecom-portfolio-mail.tar.gz`
(`portfolio/img/logos/`) into `public/img/logos/`. The existing image proxy sends
relative redirects for these allowlisted legacy URLs. Other image sources retain
their current behavior; Notion data and legacy hosting were not edited.

Cards, details and the marquee share a bounded logo renderer with a light backing
and no screen blend mode. Failed images remove their badge. The card grid also
allows its content column to shrink within the available space.

Validation: the regression test reproduced production's 502 before the fix.
The local production build, 104 tests, type checks, scoped lint and formatting
passed. Browser checks loaded all 27 logos displayed by the featured CV view,
confirmed card containment at desktop and 320px widths, checked a restored detail
logo, and verified that a forced image failure removes both image and badge.

This records local verification. Production deployment and live verification are
handled as a separate release step.
