export type AssistantSubmitAction = "search" | "fallback" | "consent" | "ask";

/**
 * What a submitted free-text question does; "search" leaves the assistant out.
 * A question is only invited while AI can answer it, an open conversation carries
 * on through an outage, and a refusal is questioned at most once per session.
 */
export function getAssistantSubmitAction({
  enabled,
  available,
  chatOpen,
  consented,
  declined,
  reaskable,
}: {
  enabled: boolean;
  available: boolean;
  chatOpen: boolean;
  consented: boolean;
  declined: boolean;
  reaskable: boolean;
}): AssistantSubmitAction {
  if (!enabled) return "search";
  if (declined) return available && reaskable ? "consent" : "search";
  if (!available) return chatOpen ? "fallback" : "search";
  return consented ? "ask" : "consent";
}
