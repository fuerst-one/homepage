import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";
const { enquiryMention } = loadTs(
  new URL("../apps/sync/src/enquiries/enquiryMention.ts", import.meta.url),
);
const id = "b15bd005-e801-428b-8681-ae36e8dc90bd";
test("new enquiry attention uses a structured Notion user mention, not plain @text", () => {
  const blocks = enquiryMention(id);
  assert.equal(blocks.length, 1);
  assert.deepEqual(blocks[0].paragraph.rich_text[1], {
    type: "mention",
    mention: { user: { id } },
  });
});
test("an absent or malformed optional mention never prevents saving an enquiry", () => {
  assert.deepEqual(enquiryMention(undefined), []);
  assert.deepEqual(enquiryMention("not-a-user-id"), []);
});

test("a failed optional mention does not propagate into lead persistence", async () => {
  const { appendEnquiryMention } = loadTs(
    new URL("../apps/sync/src/enquiries/enquiryMention.ts", import.meta.url),
  );
  assert.equal(typeof appendEnquiryMention, "function");
  assert.equal(
    await appendEnquiryMention("page", id, async () => {
      throw new Error("user inaccessible");
    }),
    "failed",
  );
});

test("a stalled mention runs after the receipt path has returned", async () => {
  const { scheduleEnquiryMention } = loadTs(
    new URL("../apps/sync/src/enquiries/enquiryMention.ts", import.meta.url),
  );
  const tasks = [];
  let started = false;
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const returned = scheduleEnquiryMention(
    "page",
    id,
    (task) => tasks.push(task),
    async () => {
      started = true;
      await pending;
    },
  );
  assert.equal(returned, undefined);
  assert.equal(started, false);
  assert.equal(tasks.length, 1);
  const running = tasks[0]();
  assert.equal(started, true);
  finish();
  await running;
});
