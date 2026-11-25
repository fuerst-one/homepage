import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("Notion project accent colors reach both published locales and the project list API", () => {
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
import { toProjectListItem } from './apps/web/src/server/api/projectListItem.ts';
process.env.NEXT_NOTION_PROJECT_DB_ID = 'fixture';
const page = (color) => ({id:'project', properties:{
  Name: {type:'title',title:[{plain_text:'Project'}]},
  Hidden: {type:'checkbox',checkbox:false},
  'Accent Color': {type:'rich_text',rich_text:color ? [{plain_text:color}] : []},
  'Project Description': {type:'rich_text',rich_text:[]},
  KPIs: {type:'rich_text',rich_text:[]},
}});
for (const [input, expected] of [
  ['#2a9d8f', '#2A9D8F'],
  ['#fff; background:red', null],
  [null, null],
]) {
  const [source] = await fetchNotionProjectsDatabase([page(input)]);
  const publication = preparePublication({projects:[source]});
  for (const locale of ['en', 'de']) {
    const project = publication.locales[locale].projects[0];
    assert.equal(project.accentColor, expected);
    assert.equal(toProjectListItem(project, locale).accentColor, expected);
  }
}
`,
    ],
    { encoding: "utf8", cwd: new URL("..", import.meta.url) },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
