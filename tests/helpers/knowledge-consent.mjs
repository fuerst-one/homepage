import { loadTs } from "./load-ts.mjs";
const { KNOWLEDGE_CONSENT_VERSION, KNOWLEDGE_CONSENT_KEY } = loadTs(
  new URL("../../src/lib/knowledgeConsent.ts", import.meta.url),
);
/** Existing conversation tests start from a visitor's previously granted choice. */
export async function grantKnowledgeConsent(page) {
  await page.evaluateOnNewDocument(
    ({ key, receipt }) => {
      localStorage.setItem(key, JSON.stringify(receipt));
    },
    {
      key: KNOWLEDGE_CONSENT_KEY,
      receipt: {
        version: KNOWLEDGE_CONSENT_VERSION,
        decidedAt: Date.now(),
        remember: true,
        allowed: true,
      },
    },
  );
}
