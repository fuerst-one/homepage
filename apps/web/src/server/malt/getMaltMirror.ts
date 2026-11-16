import { maltMirrorView } from "@homepage/content/maltMirror";
import { postgresMaltMirrorStore } from "@homepage/database/postgresMaltMirrorStore";

export const MALT_MIRROR_CACHE_TAG = "malt-mirror";
export async function getMaltMirror() {
  try {
    return maltMirrorView(await postgresMaltMirrorStore().read());
  } catch {
    return maltMirrorView(null);
  }
}
