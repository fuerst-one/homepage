import { isLocale, type LocaleParams } from "@homepage/content/i18n";
import { renderSocialImage } from "../../lib/renderSocialImage";
import { notFound } from "next/navigation";
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image({ params }: LocaleParams) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return renderSocialImage(locale);
}
