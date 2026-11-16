export const KNOWLEDGE_CONSENT_VERSION = "2026-11-16.1";
export const KNOWLEDGE_CONSENT_KEY = "fuerst-one:knowledge-consent:v1";
export const KNOWLEDGE_AVAILABILITY_KEY =
  "fuerst-one:knowledge-availability:v1";
export const KNOWLEDGE_CONSENT_TTL = 180 * 24 * 60 * 60 * 1000;
export type KnowledgeDecision = {
  version: string;
  decidedAt: number;
  remember: boolean;
  allowed: boolean;
};
export type KnowledgeConsent = KnowledgeDecision & { allowed: true };

/** A declared visitor choice, not an authentication or abuse-prevention token. */
export function parseKnowledgeDecision(
  value: unknown,
  now = Date.now(),
): KnowledgeDecision | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const receipt = value as KnowledgeDecision;
  if (
    Object.keys(receipt).some(
      (key) => !["version", "decidedAt", "remember", "allowed"].includes(key),
    ) ||
    receipt.version !== KNOWLEDGE_CONSENT_VERSION ||
    !Number.isSafeInteger(receipt.decidedAt) ||
    receipt.decidedAt > now + 60_000 ||
    receipt.decidedAt + KNOWLEDGE_CONSENT_TTL <= now ||
    typeof receipt.remember !== "boolean" ||
    typeof receipt.allowed !== "boolean" ||
    (!receipt.allowed && receipt.remember)
  )
    return null;
  return receipt;
}

export function parseKnowledgeConsent(
  value: unknown,
  now = Date.now(),
): KnowledgeConsent | null {
  const receipt = parseKnowledgeDecision(value, now);
  return receipt?.allowed ? (receipt as KnowledgeConsent) : null;
}
