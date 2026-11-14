import { unstable_cache } from "next/cache";
import { maltMirrorView } from "@/lib/maltMirror";
import { notionMaltMirrorStore } from "./notionMaltMirrorStore";

export const MALT_MIRROR_CACHE_TAG = "malt-mirror";
const getSource = unstable_cache(
  () => notionMaltMirrorStore().read(),
  ["malt-mirror-v1"],
  { revalidate: 3600, tags: [MALT_MIRROR_CACHE_TAG] },
);
export async function getMaltMirror() {
  try {
    return maltMirrorView(await getSource());
  } catch {
    return maltMirrorView(null);
  }
}
