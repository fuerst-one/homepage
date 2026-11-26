# Analytics (Umami at stats.fuerst.one)

How visitor statistics for fuerst.one work and are operated. Design and reasoning:
[server-side analytics design](plans/2026-11-24-server-side-analytics-design.md).

## Principles

- **Server-side, no Umami script.** Page views are reported from `apps/web/src/proxy.ts`.
  A few interactions are reported by our own small script to our own API, which forwards
  them. The browser never contacts `stats.fuerst.one` and nothing is stored on the device,
  so no consent banner is needed (legitimate interest, Art. 6(1)(f) GDPR). The privacy
  pages (`privacy`, `datenschutz`) list every field and event; add new ones there first.
- **Daily sessions.** Umami's session id comes from a keyed hash of IP, user agent and the
  UTC date (`ANALYTICS_SALT_SECRET`). Umami receives a fixed placeholder IP. Visitors are
  only recognised within one UTC day, so funnels only join steps on the same day.
- **Global Privacy Control** is honoured: such visits send nothing.
- **Bots:** Umami drops user agents on its bot list (for example `LinkVizBot`, Googlebot).
  Scrapers posing as browsers get through; see "Temporary header fingerprint".

## Events

| Event            | Sent by                                        | Data                                                                   |
| ---------------- | ---------------------------------------------- | ---------------------------------------------------------------------- |
| page view        | `proxy.ts`                                     | path + UTM, referrer domain, language, country                         |
| `outbound`       | `InteractionTracker` → `/api/analytics/events` | `url`: destination origin + path                                       |
| `download`       | same                                           | `file`: file type (Plasma exports)                                     |
| `explorer-used`  | same, once per page                            | `demo`: `explorer`                                                     |
| `enquiry-sent`   | `api/enquiries` after a successful save        | none                                                                   |
| `profile_<kind>` | `api/profile/events` (shared profile signals)  | subject, strength, preference; own random salt, not joined to sessions |

Mark a further demo area with `data-analytics-demo="<name>"` only after adding the name
to `parseInteraction` and to the privacy pages.

## Saved reports and segments (set up 2026-11-26)

Created by SQL in the Umami database (tables `report`, `segment`; owner `admin`, website
"fuerst.one" `68ed8bd4-4f24-497a-a752-e6b9e8431d4a`). Edit them in the Umami UI.

- **Goals:** Enquiries (`enquiry-sent`), Outbound clicks, Downloads, Explorer use.
- **Funnels:** "Contact page to enquiry" (`/*/contact` → `enquiry-sent`, 1 hour),
  "Explorer to enquiry" (`explorer-used` → `/*/contact` → `enquiry-sent`, 1 day).
- **Segments:** "German pages" / "English pages" (path regex `^/de(/|$)`, `^/en(/|$)`).
- **Deliberately off:** performance, heatmaps, session replays, errors and revenue would
  record more than the privacy pages list.

## Retention

Raw data is deleted after 13 months by the Coolify scheduled task "Delete raw stats older
than 13 months" (03:40 daily) calling `prune_raw_data(interval '13 months')` in the Umami
database. It covers `event_data`, `session_data`, `revenue`, `error_event`,
`heatmap_event`, `session_replay`, `session_link` and `website_event`, then orphaned
sessions. Add new raw-data tables there when Umami gains them.

## Temporary header fingerprint (since 2026-11-26)

To find a signal that separates scrapers from browsers, page views carry request headers
as event data (`headerFingerprint` in `server/analytics/pageView.ts`: `accept*`,
`sec-ch-ua*`, `sec-fetch-*`, `priority`, `upgrade-insecure-requests`, and a list of
header names without `x-*`). It is not in the privacy pages by decision: it stays only
until a scraper burst has been analysed. Then remove the code and delete the rows,
page views only (profile events use `event_data` too):

```sql
delete from event_data d
using website_event e
where d.website_event_id = e.event_id
  and e.event_type = 1
  and e.website_id = '68ed8bd4-4f24-497a-a752-e6b9e8431d4a';
```

## Operations

- Umami: Coolify service 8 `umami-fuerst-one` (containers `umami-w1l3yv…`,
  `postgresql-w1l3yv…`), needs `ENABLE_CLIENT_SALT=1` and
  `CLIENT_IP_HEADER=x-analytics-client-ip`.
- Vercel production env: `UMAMI_URL`, `UMAMI_WEBSITE_ID`, `ANALYTICS_SALT_SECRET`.
  Unset anywhere else, so local and preview builds send nothing.
- Quick check that data arrives:
  `select date_trunc('day', created_at), event_type, count(*) from website_event group by 1, 2 order by 1;`
