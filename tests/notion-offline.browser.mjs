import assert from "node:assert/strict";
import { test, after } from "node:test";
import { randomUUID } from "node:crypto";
import puppeteer from "puppeteer";
import { knowledgeDatabase } from "../packages/database/src/database.ts";
import { emptyEnquiry } from "../packages/content/src/enquiry.ts";
import { caseStudyPageId } from "../packages/content/src/projectCaseStudy.ts";
import { readWebsiteSections } from "../packages/database/src/websiteContent.ts";

const base = process.env.NOTION_OFFLINE_BASE_URL;
const database = new URL(
  process.env.KNOWLEDGE_DATABASE_URL || "http://unconfigured",
);
if (
  !base ||
  !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  !database.pathname.endsWith("_test")
)
  throw new Error(
    "Offline acceptance requires a local server and a dedicated _test database",
  );
const sql = knowledgeDatabase();
after(() => sql.end());

test("built pages, case studies and image bytes remain available with Notion disabled", async () => {
  const response = await fetch(`${base}/api/projects?locale=en`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.ok(data.results.length > 0);
  const profile = await fetch(`${base}/api/profile`).then((r) => r.json());
  assert.ok(profile.avatarUrl);
  assert.equal(profile.email, undefined);
  // API URLs use the canonical production origin; resolve their paths against this test server.
  const localAvatar = await fetch(
    new URL(new URL(profile.avatarUrl).pathname, base),
  );
  assert.equal(localAvatar.status, 200);
  assert.match(localAvatar.headers.get("content-type"), /^image\//);
  assert.ok((await localAvatar.arrayBuffer()).byteLength > 0);
  const content = await readWebsiteSections(["projects", "studies"], sql);
  const project = content.projects.find(
    (item) => content.studies[caseStudyPageId(item, "en")]?.length,
  );
  assert.ok(project, "seed at least one published case study");
  const webUrl = data.results.find((item) => item.id === project.id).webUrl;
  const casePath = new URL(webUrl).pathname + "/case-study";
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const forbidden = [];
    page.on("request", (request) => {
      const host = new URL(request.url()).hostname;
      if (
        host === "api.notion.com" ||
        host.endsWith(".notion.so") ||
        host.includes("notion-static") ||
        host === "prod-files-secure.s3.us-west-2.amazonaws.com"
      )
        forbidden.push(host);
    });
    await page.setViewport({ width: 1280, height: 900 });
    const home = await page.goto(`${base}/en`, { waitUntil: "networkidle2" });
    assert.equal(home.status(), 200);
    await page.$eval(".home-about-portrait img", (image) =>
      image.scrollIntoView(),
    );
    await page.waitForFunction(() => {
      const image = document.querySelector(".home-about-portrait img");
      return image?.complete && image.naturalWidth > 0;
    });
    const study = await page.goto(new URL(casePath, base).href, {
      waitUntil: "networkidle2",
    });
    assert.equal(study.status(), 200);
    assert.ok(
      (await page.$eval("h1", (element) => element.textContent)).includes(
        project.name,
      ),
    );
    assert.deepEqual(forbidden, []);
  } finally {
    await browser.close();
  }
});

test("an offline enquiry gets a durable receipt and duplicate submissions remain idempotent", async () => {
  const value = {
    ...emptyEnquiry("en"),
    id: randomUUID(),
    intent: "explore",
    name: "Offline acceptance",
    email: "offline-test@example.invalid",
  };
  const post = (body) =>
    fetch(`${base}/api/enquiries`, {
      method: "POST",
      headers: { origin: base, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    const first = await post(value);
    assert.equal(first.status, 201);
    assert.equal((await first.json()).receipt, value.id);
    const repeated = await post(value);
    assert.equal(repeated.status, 201);
    assert.equal((await repeated.json()).receipt, value.id);
    assert.equal(
      (await post({ ...value, outcome: "Different brief" })).status,
      409,
    );
    const rows =
      await sql`SELECT payload,delivered_at FROM notion_enquiry_outbox WHERE id=${value.id}`;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].payload.email, value.email);
    assert.equal(rows[0].delivered_at, null);
  } finally {
    await sql`DELETE FROM notion_enquiry_outbox WHERE id=${value.id}`;
  }
});
