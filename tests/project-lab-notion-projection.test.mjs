import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";

test("research export preserves zero, ranges and column-order independence while dropping private fields", () => {
  const url = new URL(
    "../scripts/project-lab/export-notion.ts",
    import.meta.url,
  );
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    const {projectNotionPage}=await import(${JSON.stringify(url.href)});
    const properties={
      Hidden:{type:'checkbox',checkbox:false},
      Name:{type:'title',title:[{plain_text:'A'}]},
      'Short Description':{type:'rich_text',rich_text:[{plain_text:'Playlist analytics'}]},
      'Wow-Factor 1-10':{type:'number',number:8},
      'Effort Days Low':{type:'number',number:0},
      'Team Size High':{type:'number',number:null},
      'Delivery Stages':{type:'multi_select',multi_select:[{name:'Retired'}]},
      'Start Date':{type:'date',date:{start:'2025-01-01',end:null}},
      'Private Contacts':{type:'rich_text',rich_text:[{plain_text:'CONTACT_SECRET'}]},
      Screenshots:{type:'files',files:[{file:{url:'SIGNED_SECRET'}}]},
    };
    const a=projectNotionPage({id:'a',properties});
    const b=projectNotionPage({id:'a',properties:Object.fromEntries(Object.entries(properties).reverse())});
    assert.deepEqual(a,b);
    assert.equal(a.properties['Effort Days Low'].number,0);
    assert.equal(a.properties['Short Description'].rich_text[0].plain_text,'Playlist analytics');
    assert.equal(a.properties['Team Size High'].number,null);
    assert.equal(a.properties['Start Date'].date.start,'2025-01-01');
    assert.equal(JSON.stringify(a).includes('SECRET'),false);
    const hidden=projectNotionPage({id:'a',properties:{...properties,Hidden:{type:'checkbox',checkbox:true}}});
    assert.deepEqual(Object.keys(hidden.properties),['Hidden']);
  `,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
