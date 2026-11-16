import { NextResponse } from "next/server";

/** Old cron/import callers receive an explicit retirement response without upstream work. */
export function GET() {
  return NextResponse.json(
    { error: "malt_refresh_moved_to_worker" },
    {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export const POST = GET;
