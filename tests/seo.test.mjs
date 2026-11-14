import assert from "node:assert/strict";
import { test } from "node:test";
import { request as httpRequest } from "node:http";

const base = process.env.SEO_TEST_BASE_URL || "http://localhost:6888";
const canonicalOrigin = "https://fuerst.one";

async function get(path) {
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  return { response, body: await response.text() };
}

function tagAttribute(html, tag, key, value, attribute) {
  const tags = html.match(new RegExp(`<${tag}\\b[^>]*>`, "g")) || [];
  const match = tags.find((item) => item.includes(`${key}="${value}"`));
  return match?.match(new RegExp(`${attribute}="([^"]*)"`))?.[1];
}

function structuredData(html) {
  return [
    ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs),
  ].map((match) => JSON.parse(match[1]));
}

test("the public profile and project API remain available", async () => {
  const profile = await fetch(`${base}/api/profile`).then((r) => r.json());
  assert.ok(profile.name);
  assert.equal(profile.email, undefined);
  assert.equal(profile.phone, undefined);
  assert.equal(profile.dailyRate, undefined);
  const projects = await fetch(`${base}/api/projects`).then((r) => r.json());
  assert.ok(projects.results.length > 0);
});

test("the homepage exposes its identity and navigation without JavaScript", async () => {
  const { response, body } = await get("/en");
  assert.equal(response.status, 200);
  assert.match(body, /<h1\b[^>]*>[^<]*Alexander F(?:ue|ü)rst/);
  for (const path of ["/en/cv", "/en/contact", "/en/plasma"]) {
    assert.ok(
      body.includes(`href="${path}"`),
      `Missing server-rendered ${path} link`,
    );
  }
  assert.match(body, /frontend/i);
  assert.match(body, /AI engineering/i);
});

test("public pages have unique titles and matching canonical and social URLs", async () => {
  const titles = new Set();
  for (const path of [
    "/en",
    "/en/cv",
    "/en/projects",
    "/en/contact",
    "/en/plasma",
  ]) {
    const { response, body } = await get(path);
    assert.equal(response.status, 200);
    const title = body.match(/<title>(.*?)<\/title>/s)?.[1];
    assert.ok(title);
    assert.ok(!titles.has(title), `Duplicate title on ${path}`);
    titles.add(title);
    assert.equal(
      new URL(tagAttribute(body, "link", "rel", "canonical", "href")).href,
      `${canonicalOrigin}${path}`,
    );
    assert.equal(
      new URL(tagAttribute(body, "meta", "property", "og:url", "content")).href,
      `${canonicalOrigin}${path}`,
    );
    assert.ok(
      tagAttribute(body, "meta", "name", "description", "content")?.length > 60,
    );
    assert.ok(
      tagAttribute(body, "meta", "property", "og:image", "content")?.startsWith(
        canonicalOrigin,
      ),
    );
    assert.equal(
      tagAttribute(body, "meta", "name", "twitter:card", "content"),
      "summary_large_image",
    );
  }
});

test("robots allows search crawlers and advertises the canonical sitemap", async () => {
  const { response, body } = await get("/robots.txt");
  assert.equal(response.status, 200);
  assert.match(body, /User-Agent: \*/i);
  assert.match(body, /Allow: \/\s/);
  assert.ok(body.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`));
  assert.doesNotMatch(body, /Disallow: \/\s/);
  assert.doesNotMatch(body, /Disallow: \/api/);
});

test("all public projects have discoverable HTML pages with real content and structured data", async () => {
  const projects = await fetch(`${base}/api/projects`).then((r) => r.json());
  const { response, body } = await get("/sitemap.xml");
  assert.equal(response.status, 200);
  const urls = [...body.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  for (const path of [
    "/en",
    "/en/cv",
    "/en/projects",
    "/en/contact",
    "/en/plasma",
  ]) {
    assert.ok(urls.includes(`${canonicalOrigin}${path}`));
  }
  assert.ok(
    urls.every((url) => url.startsWith(canonicalOrigin) && !url.includes("?")),
  );
  assert.ok(!urls.some((url) => /pdf-content|cv\.pdf|\/api\//.test(url)));
  const cv = await get("/en/cv");
  const directory = await get("/en/projects");
  assert.equal(directory.response.status, 200);
  assert.match(directory.body, /<h1\b/);
  const projectUrls = projects.results.map((project) => project.webUrl);
  assert.equal(
    new Set(projectUrls).size,
    projects.results.length,
    "Project URLs must be unique",
  );
  for (const project of projects.results) {
    assert.ok(
      project.webUrl?.startsWith(`${canonicalOrigin}/en/projects/`),
      `Missing web URL for ${project.name}`,
    );
    const path = new URL(project.webUrl).pathname;
    assert.ok(urls.includes(project.webUrl), `Missing project ${project.name}`);
    assert.ok(
      cv.body.includes(`href="${path}"`),
      `No HTML link to ${project.name}`,
    );
    assert.ok(
      directory.body.includes(`href="${path}"`),
      `Missing directory link for ${project.name}`,
    );
  }
  const path = new URL(projects.results[0].webUrl).pathname;
  assert.match(path, /^\/en\/projects\/[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(
    !path.includes(projects.results[0].id),
    "Existing projects use descriptive published slugs",
  );
  const legacy = await fetch(`${base}/projects/${projects.results[0].id}`, {
    redirect: "manual",
  });
  assert.equal(legacy.status, 308);
  assert.equal(new URL(legacy.headers.get("location"), base).pathname, path);
  const detail = await get(path);
  assert.equal(detail.response.status, 200);
  assert.match(detail.body, /<h1\b/);
  assert.equal(
    tagAttribute(detail.body, "link", "rel", "canonical", "href"),
    `${canonicalOrigin}${path}`,
  );
  const data = structuredData(detail.body);
  assert.ok(
    data.some((item) =>
      item["@graph"]?.some((node) => node["@type"] === "CreativeWork"),
    ),
  );
  assert.equal(
    (await get("/en/projects/not-a-real-project")).response.status,
    404,
  );
});

test("the CV describes the same public person in HTML and JSON-LD", async () => {
  const { body } = await get("/en/cv");
  assert.match(body, /<h1\b/);
  const data = structuredData(body);
  const graph = data.flatMap((item) => item["@graph"] || [item]);
  const profile = graph.find((item) => item["@type"] === "ProfilePage");
  const person = graph.find((item) => item["@type"] === "Person");
  assert.ok(profile);
  assert.ok(person);
  assert.equal(profile.mainEntity["@id"], person["@id"]);
  assert.ok(person.sameAs.includes("https://github.com/fuerst-one"));
  assert.ok(person.sameAs.includes("https://www.linkedin.com/in/fuerst-one/"));
  assert.equal(person.telephone, undefined);
  assert.equal(person.address, undefined);
});

test("AI discovery includes the public profile, HTML pages, and existing API", async () => {
  const { response, body } = await get("/llms.txt");
  assert.equal(response.status, 200);
  for (const path of [
    "/en/cv",
    "/en/contact",
    "/en/hire",
    "/en/services/product-interfaces",
    "/de/services/product-interfaces",
    "/en/services/ai-automation",
    "/de/services/ai-automation",
    "/api/profile",
    "/api/projects",
    "/api/facets",
    "/api/openapi.json",
  ]) {
    assert.ok(body.includes(`${canonicalOrigin}${path}`), `Missing ${path}`);
  }
  assert.match(body, /Alexander F(?:ue|ü)rst/);
  assert.match(body, /UX\+AI Engineer/);
});

test("retired print content is gone and excluded from indexing", async () => {
  const { response } = await get("/en/pdf-content");
  assert.equal(response.status, 410);
  assert.match(response.headers.get("x-robots-tag"), /noindex/);
});

test("legacy portfolio URLs redirect to matching current content", async () => {
  for (const [path, destination] of [
    ["/contact", "/en/contact"],
    ["/team-up", "/en/contact"],
    ["/learn-more", "/en/cv"],
    ["/privacy-policy", "/en/privacy"],
    ["/legal-notice", "/en/legal-notice"],
  ]) {
    const response = await new Promise((resolve, reject) => {
      const request = httpRequest(
        `${base}${path}`,
        { headers: { host: "portfolio.fuerst.one" } },
        (response) => {
          response.resume();
          resolve(response);
        },
      );
      request.on("error", reject);
      request.end();
    });
    assert.equal(response.statusCode, 308);
    assert.equal(response.headers.location, `${canonicalOrigin}${destination}`);
  }
});
