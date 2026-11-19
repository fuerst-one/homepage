# Silent assistant failover

> Amended 19 November 2026: the fallback response no longer opens a chat. When
> generation is unavailable, consent was declined, or budgets/request caps are
> used up, the landing behaves as plain search. The fallback below applies only
> inside a conversation that is already open. See
> [knowledge assistant](../knowledge-assistant.md#silent-fallback).

Keep normal navigation/search independent from the vector database and AI gateway.
Use the existing chat/result surface for a deterministic project/link response
when generation is unavailable, with no outage labels or warning banners.
Prefer locally available public search matches; use static project/contact links
when there are none. Never fabricate a factual answer or label fallback as AI.

Use a server process circuit outside the unavailable database. Bound normal
requests to 8 seconds and background recovery checks to 10 seconds. Pass abort signals
through PostgreSQL queries, budget admission and provider fetches. Keep unknown
provider costs reserved if cancellation/accounting cannot complete.

After an infrastructure failure, answer immediately with fallback. Start at a
30-second cooldown and increase failed probe cooldowns to a maximum five minutes.
Only one probe may run per process. Keep fallback active during probes and clear
it only after fresh corpus/DB access plus authenticated embeddings and a minimal
chat request succeed. Probe calls use existing global atomic spending admission;
a visitor quota does not disable the service globally. HTTP request validation
and budgets remain enforced.

Use Next after for recovery work after returning a response. A small no-store
status endpoint lets active pages schedule cooldown checks, without a standalone
worker or endless server timer. No traffic means no probes. Keep a tab-scoped
availability latch so page navigation and transient client-network failure do
not repeatedly send slow requests. A fresh server process reporting unknown
health must not erase a browser's existing failure latch.

The process circuit is not a distributed global flag across serverless instances;
atomic spending admission remains shared in PostgreSQL. A cross-instance circuit
would need a separate available shared store. Do not add infrastructure for it.

Verify failure deadlines, immediate bypass, concurrent probe coalescing, failed
and successful recovery, cancellation, quota isolation, stale in-flight results,
no retry/spending storms, browser fallback without warnings and normal navigation.
