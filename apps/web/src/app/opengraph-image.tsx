import { renderSocialImage } from "../lib/renderSocialImage";
export const alt = "Alexander Fuerst — UX+AI Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";
export default function Image() {
  return renderSocialImage("en");
}
