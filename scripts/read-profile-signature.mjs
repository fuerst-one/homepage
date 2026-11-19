// Reads a visitor profile signature from an image file, such as a screenshot
// of the launcher or of the profile page.
//
//   pnpm profile:read <image> [--site <url> | --catalog <file>] [--json]
//
// A picture only verifies against the list of interests it was made with. That
// catalog comes from the site the signature was made on, or from a saved copy
// of its /api/profile/catalog response.
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { readProfileSignatureImage } from "@homepage/content/profileSignatureImage";
import {
  encodeProfilePayload,
  encodeProfileText,
} from "@homepage/content/profilePixels";

const args = process.argv.slice(2);
const option = (name) => {
  const at = args.indexOf(name);
  return at < 0 ? undefined : args.splice(at, 2)[1];
};
const site = option("--site") ?? "http://localhost:6894";
const catalogFile = option("--catalog");
const json = args.includes("--json");
const [file] = args.filter((arg) => !arg.startsWith("--"));
const fail = (message) => {
  console.error(message);
  process.exit(1);
};
if (!file)
  fail(
    "Usage: pnpm profile:read <image> [--site <url> | --catalog <file>] [--json]",
  );

async function loadCatalog() {
  if (catalogFile) return JSON.parse(await readFile(catalogFile, "utf8"));
  const response = await fetch(new URL("/api/profile/catalog", site)).catch(
    () => null,
  );
  if (!response?.ok)
    fail(`The profile catalog could not be loaded from ${site}.`);
  return response.json();
}
const { terms } = await loadCatalog();
const { data, info } = await sharp(file)
  .rotate()
  .removeAlpha()
  .toColourspace("srgb")
  .raw()
  .toBuffer({ resolveWithObject: true });

let read;
try {
  read = readProfileSignatureImage(
    { width: info.width, height: info.height, channels: 3, data },
    terms,
  );
} catch (error) {
  fail(
    /not found/i.test(error.message)
      ? "No profile signature was found in the image. It has to be upright, undistorted and fully visible."
      : `A signature was found, but it could not be read (${error.message}). Screenshots work, including compressed ones; photos of a screen do not hold colours precisely enough.`,
  );
}

const { scores, interactions, corners } = read;
const code = encodeProfileText(
  encodeProfilePayload(
    terms,
    terms.map((term) => ({ id: term.id, score: (scores[term.id] * 12) / 127 })),
    interactions,
  ),
);
if (json) console.log(JSON.stringify({ interactions, scores, code, corners }));
else {
  const active = terms
    .filter((term) => scores[term.id] > 0)
    .sort((a, b) => scores[b.id] - scores[a.id]);
  const width = Math.round(corners[1][0] - corners[0][0]);
  console.log(
    `Signature found at ${Math.round(corners[0][0])}, ${Math.round(corners[0][1])}, ${width} px wide.`,
  );
  console.log(`Interactions: ${interactions}`);
  console.log(`Active interests: ${active.length} of ${terms.length}`);
  for (const term of active.slice(0, 10))
    console.log(
      `  ${((scores[term.id] * 12) / 127).toFixed(1).padStart(4)} / 12  ${term.value} (${term.facet})`,
    );
  if (active.length > 10) console.log(`  … and ${active.length - 10} more`);
  console.log(`Profile code: ${code}`);
}
