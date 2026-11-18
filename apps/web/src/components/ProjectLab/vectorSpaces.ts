import type { LabProject } from "./analysis";
import type { LensSpace } from "./clustering";

export const BLOCKS = [
  {
    id: "architecture",
    label: "Architecture",
    fields: "Tools: framework, runtime, platform",
  },
  {
    id: "implementation",
    label: "Libraries & infrastructure",
    fields: "Tools: rendering, state, data, operations, styling",
  },
  {
    id: "languages",
    label: "Languages",
    fields: "Languages; markup and styles receive less weight",
  },
  {
    id: "practices",
    label: "Capabilities & methods",
    fields: "Capabilities + methods + design, research and office tools",
  },
  {
    id: "kind",
    label: "Application kind",
    fields:
      "Notion Short Description + inferred families; summary draft only if blank",
  },
  {
    id: "functions",
    label: "Functions & integrations",
    fields:
      "Rule-derived concepts from Short Description + factual Case Context",
  },
  {
    id: "purpose",
    label: "Needs, use cases & formats",
    fields: "Buyer needs + project use cases + product formats",
  },
  { id: "domain", label: "Industry", fields: "Project-owned sector" },
  { id: "ai", label: "AI capabilities", fields: "AI usage + AI capabilities" },
  {
    id: "context",
    label: "Delivery context",
    fields:
      "Stages, ownership, maintenance, customer market, usage context, delivery model, working pattern, workplace",
  },
] as const;
export type Block = (typeof BLOCKS)[number]["id"];
export type Weights = Record<Block, number>;
export const PRESETS: Record<string, Weights> = {
  balanced: {
    architecture: 5,
    implementation: 2,
    languages: 1,
    practices: 1,
    kind: 3,
    functions: 5,
    purpose: 2,
    domain: 2,
    ai: 0,
    context: 0,
  },
  technical: {
    architecture: 8,
    implementation: 3,
    languages: 2,
    practices: 1,
    kind: 0,
    functions: 1,
    purpose: 0,
    domain: 0,
    ai: 0,
    context: 0,
  },
  product: {
    architecture: 0,
    implementation: 0,
    languages: 0,
    practices: 0,
    kind: 5,
    functions: 7,
    purpose: 3,
    domain: 3,
    ai: 0,
    context: 0,
  },
  practice: {
    architecture: 1,
    implementation: 1,
    languages: 0,
    practices: 7,
    kind: 0,
    functions: 2,
    purpose: 4,
    domain: 0,
    ai: 3,
    context: 2,
  },
  kind: {
    architecture: 0,
    implementation: 0,
    languages: 0,
    practices: 0,
    kind: 1,
    functions: 0,
    purpose: 0,
    domain: 0,
    ai: 0,
    context: 0,
  },
};
export const PRESET_LABELS: Record<string, string> = {
  balanced: "Balanced: structure + function",
  technical: "Technical foundations",
  product: "Product relatives",
  practice: "Transferable experience",
  kind: "Application kinds + families",
};
export type Feature = {
  key: string;
  label: string;
  amplitude: number;
  source: string;
};
export type Fingerprint = {
  id: string;
  blocks: Record<Block, Feature[]>;
  kind: { label: string; basis: string; inferred: boolean };
};

// Defaults describe typical scope, not measured centrality in a particular project.
// In particular, graphics/editor libraries can be essential; they are not all helpers.
const architecture = new Map([
  ["next", "Next.js"],
  ["nextjs", "Next.js"],
  ["nuxt", "Nuxt.js"],
  ["nuxtjs", "Nuxt.js"],
  ["react", "React"],
  ["reactjs", "React"],
  ["reactnative", "React Native"],
  ["expo", "Expo"],
  ["vue", "Vue"],
  ["vuejs", "Vue"],
  ["angular", "Angular"],
  ["gatsby", "Gatsby"],
  ["laravel", "Laravel"],
  ["symfony", "Symfony"],
  ["nestjs", "NestJS"],
  ["hono", "Hono"],
  ["express", "Express"],
  ["fastapi", "FastAPI"],
  ["node", "Node.js"],
  ["nodejs", "Node.js"],
  ["wordpress", "WordPress"],
  ["shopware5", "Shopware 5"],
  ["prestashop", "PrestaShop"],
  ["arduino", "Arduino"],
  ["esp32s3", "ESP32"],
  ["n8n", "n8n"],
  ["homeassistant", "Home Assistant"],
]);
const methodTools = new Set([
  "7levelmodel",
  "adobexd",
  "axure",
  "excelgooglesheets",
  "figma",
  "jobstobedone",
  "limbictypes",
  "optimizely",
  "personas",
  "powerpointgoogleslides",
  "sketch",
  "typeform",
]);
const canonical = (value: string) =>
  value.toLowerCase().replace(/[^\p{L}\p{N}+#]/gu, "");
const libraryAliases: Record<string, string> = {
  tailwindcss: "Tailwind",
  tailwind: "Tailwind",
  fabricjs: "Fabric.js",
  threejs: "Three.js",
  deckgl: "DeckGL",
  echarts: "ECharts",
  gsap: "GSAP",
  styledcomponents: "Styled Components",
};
const helperWeights: Record<string, number> = {
  tailwind: 0.15,
  tailwindcss: 0.15,
  styledcomponents: 0.15,
  shadcnui: 0.2,
  antdesign: 0.2,
  gsap: 0.2,
  zustand: 0.45,
  redux: 0.45,
  docker: 0.4,
  kubernetes: 0.5,
  vite: 0.35,
};

// Small, versioned vocabulary. A match is an inference with a source receipt,
// never a claim that an absent match proves the functionality does not exist.
const concepts: [string, RegExp][] = [
  ["Spotify integration", /\bspotify\b/i],
  ["Music & playlists", /playlist|album.art|\bartists\b|\bmusic\b/i],
  [
    "Visual editing",
    /\beditor\b|user editing|collage|decal design|packaging configurator/i,
  ],
  ["Export", /\bexport\b/i],
  ["Data visualization", /visualiz|charts|dashboard|analytics evaluation/i],
  ["Data aggregation", /aggregat|metadata|database|one overview/i],
  ["Maps & routing", /\bmap\b|route|voyage|GPS|itinerar/i],
  ["Trip planning", /trip|tourism|tours|itinerar/i],
  ["Collaboration", /collaborat|messages.*tasks|workspace/i],
  ["Word games", /word puzzle|mandatory letter/i],
  ["Learning", /tutorial|programming basics|learning|puzzle/i],
  ["Generative visuals", /generative|animation|plasma|glyph/i],
  ["Memory & retrieval", /memor|retrieval|grounded answers/i],
  ["Agent workflows", /\bagent|browser actions|harness/i],
  ["Browser automation", /browser.agent|browser actions|end.to.end checks/i],
  ["Surveys", /survey/i],
  ["Conversion optimization", /conversion|A\/B.test|consumer.psychology/i],
  ["Commerce & checkout", /checkout|e.commerce|shopping|sales channels/i],
  ["Configuration", /configurat/i],
  ["Hardware integration", /firmware|hardware|physical display|embedded/i],
  [
    "Object detection",
    /object detection|object recognition|bird.deterrent|camera.guided/i,
  ],
  ["Notifications", /notifications|communicate with visitors/i],
  [
    "Content publishing",
    /brand.website|brand website|blog|landing page|portfolio/i,
  ],
  [
    "Maritime operations",
    /maritime|port.planning|port.efficiency|chartering|voyage|container GPS/i,
  ],
  ["Sustainability", /emissions|CO2|solar.energy|transport choices/i],
  ["API integration", /\bAPI\b|integration/i],
];
const kindRules: [string, RegExp][] = [
  ["Playlist analytics", /spotify.*visualiz|playlist.*metadata/i],
  ["Album-art collage editor", /album.art collage|spotify artwork editor/i],
  ["Word puzzle", /word puzzle/i],
  ["Collaborative trip planner", /collaborative.*trip planner/i],
  ["Agent memory", /agent.memory/i],
  ["Product design configurator", /decal.design|decal design/i],
  [
    "Conversion consulting",
    /conversion.optimization consulting|financing.signup optimization/i,
  ],
  ["Programming tutorial", /programming basics/i],
  ["Logistics workshop", /logistics innovation workshop/i],
  ["Browser test automation", /browser.agent testing/i],
  ["Development orchestrator", /multi.agent development harness/i],
  ["Camera-guided device", /camera.guided bird/i],
  ["Website action assistant", /embeddable assistant/i],
  ["Survey platform", /survey product/i],
  ["Maritime operations", /maritime chartering/i],
  ["Packaging configurator", /packaging configurator/i],
  ["Subscription configurator", /car.subscription frontend/i],
  ["Website optimization toolbox", /toolbox for website analysis/i],
  ["Map-based object detection", /satellite.imagery/i],
  ["Portfolio browser", /notion.backed portfolio/i],
  ["Physical generative display", /standalone physical display/i],
  ["Work aggregation hub", /project.oriented workspace/i],
  ["E-commerce playground", /e.commerce learning playground/i],
  ["Shopping prototype", /pet.food shopping/i],
  ["Mobility information", /mobility database/i],
  ["Maritime route planner", /maritime route.planning/i],
  ["Generative landing page", /generative ASCII/i],
  ["Recipe & grocery lists", /recipe and grocery/i],
  ["Configuration chatbot", /configuration conversation/i],
  ["News notification bot", /telegram notifications/i],
  ["Port planning dashboard", /port.planning interface/i],
  ["Regional tourism app", /local.tourism/i],
  ["Port tracking dashboard", /container GPS/i],
  ["Clothing commerce", /clothing venture/i],
  ["Brand website", /brand.website|brand website/i],
  ["Interface experiment", /bubble interface/i],
  ["Energy planning prototype", /EV.charging output/i],
  ["Checkout extension", /certificates.*checkout/i],
  ["Route calculation plugin", /excel plugin.*route/i],
];

// Category rules make specific labels useful beyond exact-label matching.
const kindFamilies: [string, RegExp][] = [
  ["Music applications", /playlist|album.art/i],
  ["Visual editors & configurators", /collage|configurat|visual editor/i],
  [
    "Planning & operations",
    /planner|planning|maritime|navigation|port.*(tracking|administration|efficiency)|logistics/i,
  ],
  [
    "Data exploration",
    /analytics|metadata|charts|database|information|dashboard|toolbox|aggregation/i,
  ],
  ["Learning & games", /puzzle|tutorial|learning|playground|knowledge base/i],
  [
    "Agent systems",
    /agent memory|orchestrat|test automation|testing framework|assistant|harness/i,
  ],
  ["Conversational interfaces", /chatbot|assistant/i],
  ["Brand & publishing", /website|landing page|portfolio|blog/i],
  ["Hardware & embedded", /device|physical.*display|ESP32|deterrent/i],
  ["Commerce", /commerce|shopping|checkout/i],
  [
    "Research & optimization",
    /consulting|workshop|survey|optimization|experimentation|hackathon/i,
  ],
  ["Creative experiments", /generative|experiment/i],
  [
    "Workflow extensions",
    /plugin|extension|notification|lists|hub|business.*management/i,
  ],
];

export function applicationKind(p: LabProject): Fingerprint["kind"] {
  // Owner-authored Short Description takes precedence over inferred summary drafts.
  if (p.shortDescription?.trim())
    return {
      label: p.shortDescription.trim(),
      basis: "Notion Short Description",
      inferred: false,
    };
  const summary = p.matching.summary ?? "";
  const rule = kindRules.find(([, pattern]) => pattern.test(summary));
  return {
    label: rule?.[0] ?? "Unclassified",
    basis: rule
      ? `Summary: ${summary}`
      : "No matching summary rule; needs review",
    inferred: true,
  };
}

export function fingerprint(p: LabProject): Fingerprint {
  const blocks = Object.fromEntries(
    BLOCKS.map((b) => [b.id, [] as Feature[]]),
  ) as Record<Block, Feature[]>;
  const add = (
    block: Block,
    label: string,
    amplitude: number,
    source: string,
    prefix = "",
  ) => {
    const key = prefix + canonical(label);
    if (!label.trim()) return;
    const old = blocks[block].find((t) => t.key === key);
    if (!old) blocks[block].push({ key, label, amplitude, source });
    else old.amplitude = Math.max(old.amplitude, amplitude);
  };
  const tools = p.tools ?? [];
  const foundations = new Set(
    tools.map((t) => architecture.get(canonical(t))).filter(Boolean),
  );
  for (const tool of tools) {
    const key = canonical(tool),
      framework = architecture.get(key);
    if (framework) {
      // Reduce redundant runtime/framework ancestry rather than counting it twice.
      const redundant =
        (framework === "React" &&
          (foundations.has("Next.js") || foundations.has("Gatsby"))) ||
        (framework === "Vue" && foundations.has("Nuxt.js")) ||
        (framework === "Node.js" &&
          ["Next.js", "NestJS", "Express", "Hono"].some((t) =>
            foundations.has(t),
          )) ||
        (framework === "Expo" && foundations.has("React Native"));
      add(
        "architecture",
        framework,
        redundant ? 0.35 : 1,
        `Tools: ${tool}${redundant ? " (framework ancestry discounted)" : ""}`,
      );
    } else if (methodTools.has(key))
      add("practices", tool, 0.6, `Tools: ${tool}`);
    else
      add(
        "implementation",
        libraryAliases[key] ?? tool,
        helperWeights[key] ?? 1,
        `Tools: ${tool}; default role weight, not measured centrality`,
      );
  }
  for (const t of p.languages ?? [])
    add(
      "languages",
      t,
      ["html", "css"].includes(canonical(t)) ? 0.2 : 1,
      `Languages: ${t}`,
    );
  for (const t of p.capabilities ?? [])
    add("practices", t, 1, `Capabilities: ${t}`);
  for (const t of p.methods ?? []) add("practices", t, 1, `Methods: ${t}`);
  for (const t of p.matching.buyerNeeds ?? [])
    add("purpose", t, 1, `Buyer needs: ${t}`, "need:");
  for (const t of p.productTypes ?? [])
    add("purpose", t, 0.7, `Product types: ${t}`, "product:");
  for (const t of p.matching.domains ?? [])
    add("purpose", t, 0.7, `Use cases: ${t}`, "use-case:");
  for (const t of p.industries ?? []) add("domain", t, 1, `Sector: ${t}`);
  for (const t of p.matching.aiCapabilities ?? [])
    add("ai", t, 1, `AI capabilities: ${t}`, "capability:");
  for (const t of p.matching.aiUsage ?? [])
    add("ai", t, 0.5, `AI usage: ${t}`, "usage:");
  for (const [field, text] of [
    ["Short Description", p.shortDescription ?? ""],
    ["Summary", p.matching.summary ?? ""],
  ])
    for (const [label, pattern] of concepts)
      if (pattern.test(text))
        add("functions", label, 1, `${field} rule: ${pattern.source}`);
  const kind = applicationKind(p);
  if (kind.label !== "Unclassified") add("kind", kind.label, 1, kind.basis);
  for (const [family, rule] of kindFamilies)
    if (kind.label !== "Unclassified" && rule.test(kind.label))
      add(
        "kind",
        family,
        0.65,
        `Inferred kind family: ${rule.source}; specific kind: ${kind.label}`,
        "family:",
      );
  const context: [string, string[]][] = [
    ["Stages", p.matching.stages ?? []],
    ["Ownership", [p.matching.ownership ?? ""]],
    ["Maintenance", [p.matching.maintenance ?? ""]],
    ["Target market", p.targetMarket ?? []],
    ["Usage context", p.usageContext ?? []],
    ["Delivery model", p.deliveryModel ? [p.deliveryModel] : []],
    ["Working pattern", [p.scale?.workingPattern ?? ""]],
    ["Workplace", [p.assessment?.workplace ?? ""]],
  ];
  for (const [field, values] of context)
    for (const t of values) add("context", t, 1, `${field}: ${t}`, `${field}:`);
  for (const b of BLOCKS)
    blocks[b.id].sort((a, b) => a.key.localeCompare(b.key));
  return { id: p.id, blocks, kind };
}

function vector(features: Feature[]) {
  const length = Math.hypot(...features.map((f) => f.amplitude));
  return new Map(features.map((f) => [f.key, f.amplitude / (length || 1)]));
}
export function compareFingerprints(
  a: Fingerprint,
  b: Fingerprint,
  weights: Weights,
) {
  const safeWeight = (id: Block) =>
    Math.max(0, Number.isFinite(weights[id]) ? weights[id] : 0);
  const budget = BLOCKS.reduce((n, b) => n + safeWeight(b.id), 0);
  const parts = BLOCKS.map(({ id }) => {
    const va = vector(a.blocks[id]),
      vb = vector(b.blocks[id]);
    const available = va.size > 0 && vb.size > 0;
    const similarity = available
      ? Math.min(
          1,
          [...va].reduce((n, [k, v]) => n + v * (vb.get(k) ?? 0), 0),
        )
      : null;
    const share = budget ? safeWeight(id) / budget : 0;
    return {
      id,
      similarity,
      share,
      contribution: (similarity ?? 0) * share,
      available,
      shared: a.blocks[id].filter((f) => vb.has(f.key)),
    };
  });
  const coverage = parts
    .filter((p) => p.available)
    .reduce((n, p) => n + p.share, 0);
  return {
    score: coverage ? parts.reduce((n, p) => n + p.contribution, 0) : null,
    coverage,
    parts,
  };
}

export function combinedSpace(
  projects: LabProject[],
  weights: Weights,
  minimumCoverage = 0,
): LensSpace {
  const rows = projects
    .map(fingerprint)
    .sort((a, b) => a.id.localeCompare(b.id));
  const included = rows.filter((p) => {
    const coverage = compareFingerprints(p, p, weights).coverage;
    return (
      coverage > 0 &&
      coverage + 1e-12 >= Math.max(0, Math.min(1, minimumCoverage))
    );
  });
  return {
    ids: included.map((p) => p.id),
    excluded: rows.filter((p) => !included.includes(p)).map((p) => p.id),
    terms: new Map(
      included.map((p) => [
        p.id,
        BLOCKS.filter((b) => weights[b.id] > 0)
          .flatMap((b) =>
            p.blocks[b.id].map((f) => ({
              label: f.label,
              weight: weights[b.id] * f.amplitude,
            })),
          )
          .sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label))
          .slice(0, 12)
          .map((f) => f.label),
      ]),
    ),
    // A dissimilarity for medoid grouping, not a claim of Euclidean geometry.
    distances: included.map((a) =>
      included.map((b) =>
        a.id === b.id ? 0 : 1 - (compareFingerprints(a, b, weights).score ?? 0),
      ),
    ),
  };
}

export function overlapSignatures(
  rows: Fingerprint[],
  anchorId: string,
  fields: Block[],
) {
  const anchor = rows.find((r) => r.id === anchorId);
  if (!anchor) return [];
  const groups = new Map<string, { states: string[]; ids: string[] }>();
  for (const row of rows) {
    if (row.id === anchorId) continue;
    const states = fields.map((field) =>
      !anchor.blocks[field].length || !row.blocks[field].length
        ? "?"
        : row.blocks[field].some((t) =>
              anchor.blocks[field].some((a) => a.key === t.key),
            )
          ? "1"
          : "0",
    );
    const key = states.join("");
    if (!groups.has(key)) groups.set(key, { states, ids: [] });
    groups.get(key)!.ids.push(row.id);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, ids: g.ids.sort() }))
    .sort(
      (a, b) =>
        b.ids.length - a.ids.length ||
        a.states.join("").localeCompare(b.states.join("")),
    );
}
