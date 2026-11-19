import { createHmac } from "node:crypto";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import {
  knowledgeLottery,
  readKnowledgeSettings,
  screenKnowledgeRequest,
  recordKnowledgeAdmission,
  verifyKnowledgeAutomation,
  type AdmissionReason,
} from "@homepage/knowledge/policy";
import { knowledgeChatAllowance } from "@homepage/knowledge/usage";

export function knowledgeClientAddress(request: Request) {
  // Only the platform-owned ingress header is trusted in production.
  return process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
        null
    : "local";
}

function knowledgeVisitor(request: Request) {
  const secret =
    process.env.KNOWLEDGE_RATE_LIMIT_SECRET || process.env.CRON_SECRET;
  const address = knowledgeClientAddress(request);
  return secret && address
    ? {
        secret,
        id: createHmac("sha256", secret).update(address).digest("hex"),
      }
    : null;
}

/** Whether budgets and request caps would let this visitor's next question through. */
export async function hasKnowledgeAllowance(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(1500)]);
  try {
    const visitor = knowledgeVisitor(request);
    return !!visitor && (await knowledgeChatAllowance(visitor.id, signal));
  } catch {
    return false;
  }
}

export async function getKnowledgeAdmission(
  request: Request,
  message?: string,
) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(1500)]);
  const retryAt = Date.now() + 300_000;
  try {
    signal.throwIfAborted();
    const visitor = knowledgeVisitor(request);
    if (!visitor) return { allowed: false, retryAt };
    const settings = await readKnowledgeSettings(undefined, signal);
    signal.throwIfAborted();
    let screened = screenKnowledgeRequest(request.headers, message, settings);
    if (
      !screened &&
      settings.enabled &&
      !(await verifyKnowledgeAutomation(
        settings,
        process.env.VERCEL === "1",
        checkBotId,
        signal,
      ))
    )
      screened = "bot";
    const lottery = knowledgeLottery(visitor.id, visitor.secret, settings);
    const reason: AdmissionReason =
      screened ||
      (!settings.enabled
        ? "paused"
        : lottery.allowed
          ? "selected"
          : "excluded");
    // Aggregate counters contain no visitor identifier or submitted text. A metrics
    // outage must not invalidate the independently enforced admission decision.
    // Metrics are bounded independently and never hold up admission.
    after(() => recordKnowledgeAdmission(reason).catch(() => {}));
    signal.throwIfAborted();
    return { allowed: !screened && lottery.allowed, retryAt: lottery.retryAt };
  } catch {
    return { allowed: false, retryAt };
  }
}
