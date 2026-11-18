import { createHash } from "node:crypto";
import { knowledgeDatabase } from "./database";
import type { SharedProfileEvent } from "@homepage/content/visitorProfile";

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function profileCollectionAvailable(sql = knowledgeDatabase()) {
  try {
    const [row] =
      await sql`SELECT to_regclass('visitor_profile_events') IS NOT NULL AS available`;
    return row?.available === true;
  } catch {
    return false;
  }
}
export async function pruneProfileEvents(sql = knowledgeDatabase()) {
  await sql`DELETE FROM visitor_profile_events WHERE received_at < now()-interval '30 days'`;
  await sql`DELETE FROM visitor_profile_revocations WHERE revoked_at < now()-interval '31 days'`;
}
export async function storeProfileEvents(
  token: string,
  events: SharedProfileEvent[],
  sql = knowledgeDatabase(),
  consentAt = Date.now(),
) {
  const hash = hashToken(token);
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${hash},0))`;
    if (
      (
        await tx`SELECT 1 FROM visitor_profile_revocations WHERE session_hash=${hash}`
      ).length
    )
      return false;
    const [count] =
      await tx`SELECT count(*) AS n FROM visitor_profile_events WHERE session_hash=${hash}`;
    if (Number(count.n) + events.length > 1000) return false;
    for (const event of events)
      await tx`INSERT INTO visitor_profile_events(event_id,session_hash,rule_version,consent_at,kind,subject,preference,previous,inferred_score,basis)
        VALUES (${event.id},${hash},1,${new Date(consentAt)},${event.kind},${event.subject},${event.preference ?? null},${event.previous ?? null},${event.inferredScore ?? null},${tx.json(event.basis ?? {})})
        ON CONFLICT (event_id) DO NOTHING`;
    return true;
  });
}
export async function deleteProfileEvents(
  token: string,
  sql = knowledgeDatabase(),
) {
  const hash = hashToken(token);
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${hash},0))`;
    await tx`INSERT INTO visitor_profile_revocations(session_hash) VALUES (${hash}) ON CONFLICT DO NOTHING`;
    await tx`DELETE FROM visitor_profile_events WHERE session_hash=${hash}`;
  });
}
/** Local owner tooling only: no public analytics read endpoint. */
export async function profileInsights(sql = knowledgeDatabase()) {
  const events =
    await sql`SELECT kind,count(*)::int AS events,count(DISTINCT session_hash)::int AS profiles FROM visitor_profile_events WHERE received_at >= now()-interval '30 days' GROUP BY kind ORDER BY events DESC`;
  const interests =
    await sql`SELECT subject,count(*)::int AS selections,count(DISTINCT session_hash)::int AS profiles FROM visitor_profile_events WHERE received_at >= now()-interval '30 days' AND kind='filter_selected' GROUP BY subject ORDER BY selections DESC LIMIT 30`;
  const corrections =
    await sql`SELECT subject,preference,previous,count(*)::int AS corrections,round(avg(inferred_score)::numeric,2) AS average_inference FROM visitor_profile_events WHERE received_at >= now()-interval '30 days' AND kind='preference_changed' GROUP BY subject,preference,previous ORDER BY corrections DESC LIMIT 50`;
  const journeys =
    await sql`WITH visits AS (SELECT session_hash,bool_or(kind='enquiry_submitted') AS enquired FROM visitor_profile_events WHERE received_at >= now()-interval '30 days' GROUP BY session_hash)
    SELECT e.kind,count(DISTINCT e.session_hash)::int AS profiles,count(DISTINCT e.session_hash) FILTER (WHERE v.enquired)::int AS profiles_with_enquiry FROM visitor_profile_events e JOIN visits v USING(session_hash) WHERE e.received_at >= now()-interval '30 days' GROUP BY e.kind ORDER BY profiles DESC`;
  const feedbackBySignal =
    await sql`SELECT source.key AS signal,e.preference,count(*)::int AS corrections,round(avg(source.value::numeric),2) AS average_contribution FROM visitor_profile_events e,LATERAL jsonb_each_text(e.basis) source WHERE e.received_at >= now()-interval '30 days' AND e.kind='preference_changed' GROUP BY source.key,e.preference ORDER BY corrections DESC`;
  return {
    window: "30 days",
    ruleVersion: 1,
    limitations:
      "Opt-in, browser-reported events; associations are not causal lift. Counts represent random browser profiles, not visits or unique people. Enquiries are reported after a successful response; no contact details are joined.",
    events,
    interests,
    corrections,
    feedbackBySignal,
    journeys,
  };
}
