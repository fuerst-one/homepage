import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("project titles combine Notion names and short descriptions across public content", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      `
import assert from 'node:assert/strict';
import { fetchNotionProjectsDatabase } from './apps/sync/src/notion/fetchNotionProjectsDatabase.tsx';
import { preparePublication } from './apps/sync/src/notion/preparePublication.ts';
import { publicKnowledgeSeeds } from './apps/sync/src/knowledge/publicContent.ts';
process.env.NEXT_NOTION_PROJECT_DB_ID = 'fixture';
const field = (type, parts) => ({type, [type]: parts.map(plain_text => ({plain_text}))});
for (const [name, description, expected] of [
  [['Glyphstone'], ['Haptic ESP32 Glyph Plasma Display Device'], 'Glyphstone – Haptic ESP32 Glyph Plasma Display Device'],
  [[' Page ', 'Control '], [' AI-based ', 'Page Assistant Snippet '], 'Page Control – AI-based Page Assistant Snippet'],
  [['Konfig'], undefined, 'Konfig'],
  [['Konfig'], [], 'Konfig'],
  [['Konfig'], ['  '], 'Konfig'],
  [[], ['Camera-Guided Bird Deterrent'], 'Camera-Guided Bird Deterrent'],
]) {
  const page = {id:'project', properties:{
    Name: field('title', name),
    ...(description ? {'Short Description': field('rich_text', description)} : {}),
    Hidden: {type:'checkbox', checkbox:false},
    'Project Description': field('rich_text', ['Public description']),
    'Project Description DE': field('rich_text', ['Öffentliche Beschreibung']),
    'German ready': {type:'checkbox', checkbox:true},
    KPIs: field('rich_text', []),
  }};
  const original = JSON.stringify(page);
  const [project] = await fetchNotionProjectsDatabase([page]);
  assert.equal(project.name, expected);
  const publication = preparePublication({projects:[project]});
  for (const locale of ['en', 'de']) {
    assert.equal(publication.locales[locale].projects[0].name, expected);
    assert.equal(publication.locales[locale].evidence[0].name, expected);
  }
  const seeds = publicKnowledgeSeeds(page, 'stable-slug');
  assert.equal(seeds.length, 2);
  for (const seed of seeds) {
    assert.equal(seed.title, expected);
    assert.ok(seed.text.startsWith(expected));
    assert.equal(seed.href, '/' + seed.locale + '/projects/stable-slug');
  }
  assert.equal(JSON.stringify(page), original);
}
`,
    ],
    { encoding: "utf8", cwd: new URL("..", import.meta.url) },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
