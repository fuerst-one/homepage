import { getProfileCatalog } from "../../../../server/content/getProfileCatalog";
import { profileCollectionAvailable } from "@homepage/database/visitorProfile";

export const runtime = "nodejs";
export async function GET() {
  try {
    const [catalog, sharingAvailable] = await Promise.all([
      getProfileCatalog(),
      profileCollectionAvailable(),
    ]);
    return Response.json(
      { ...catalog, sharingAvailable },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
    );
  } catch {
    return Response.json(
      { error: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
