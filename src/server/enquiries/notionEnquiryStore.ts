import { scheduleEnquiryMention } from "./enquiryMention";
import { Client } from "@notionhq/client";
import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import type { EnquiryStore } from "./submitEnquiry";

/** Existing inbox schema: id (title), email (email), createdAt (date). */
export function notionEnquiryStore(
  afterResponse: (task: () => Promise<void>) => void,
): EnquiryStore {
  const databaseId =
    process.env.NEXT_NOTION_ENQUIRIES_DB_ID ||
    process.env.NEXT_NOTION_CV_SIGNUP_DATABASE_ID;
  if (!databaseId || !process.env.NEXT_NOTION_TOKEN)
    throw new Error("enquiry_storage_unconfigured");
  const notion = new Client({
    auth: process.env.NEXT_NOTION_TOKEN,
    timeoutMs: 12_000,
  });
  return {
    async find(id) {
      const result = await notion.databases.query({
        database_id: databaseId,
        filter: { property: "id", title: { starts_with: `enquiry:${id}:` } },
        page_size: 1,
      });
      const page = result.results[0];
      if (!page || !("properties" in page)) return undefined;
      const title = page.properties.id;
      const text =
        title?.type === "title"
          ? title.title.map((t) => t.plain_text).join("")
          : "";
      return { receipt: id, fingerprint: text.split(":")[2] ?? "" };
    },
    async create(value, fingerprint) {
      const rows = {
        Status: "New enquiry",
        Intent: value.intent,
        Name: value.name,
        Email: value.email,
        Company: value.company,
        Situation: value.situation,
        "Desired outcome": value.outcome,
        "Product link": value.productUrl,
        Timing: value.timing,
        Budget: value.budget,
        Capacity: value.capacity,
        Duration: value.duration,
        "Working arrangement": value.workplace,
        Language: value.locale,
        "Entry context": JSON.stringify(value.context),
        "Enquiry reference": value.id,
      };
      const children: BlockObjectRequest[] = Object.entries(rows)
        .filter(([, text]) => text)
        .map(([label, text]) => ({
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: Array.from(
              { length: Math.ceil(`${label}: ${text}`.length / 1800) },
              (_, index) => ({
                type: "text",
                text: {
                  content: `${label}: ${text}`.slice(
                    index * 1800,
                    (index + 1) * 1800,
                  ),
                },
              }),
            ),
          },
        }));
      const page = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          id: {
            title: [
              { text: { content: `enquiry:${value.id}:${fingerprint}` } },
            ],
          },
          email: { email: value.email },
          createdAt: { date: { start: new Date().toISOString() } },
        },
        children,
      });
      scheduleEnquiryMention(
        page.id,
        process.env.NOTION_ENQUIRY_MENTION_USER_ID,
        afterResponse,
        (args) => notion.blocks.children.append(args),
      );
      return { receipt: value.id, fingerprint };
    },
  };
}
