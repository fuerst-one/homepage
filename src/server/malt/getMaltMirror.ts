import { maltMirrorView } from "@/lib/maltMirror";
import { postgresMaltMirrorStore } from "./postgresMaltMirrorStore";

export const MALT_MIRROR_CACHE_TAG = "malt-mirror";
export async function getMaltMirror() {
  try {
    return maltMirrorView(await postgresMaltMirrorStore().read());
  } catch {
    return maltMirrorView(null);
  }
}
