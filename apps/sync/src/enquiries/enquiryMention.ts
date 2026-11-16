import type { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";

/** This is a real person mention; an owner contact-page ID is not a user ID. */
export function enquiryMention(userId?: string): BlockObjectRequest[] {
  if (
    !userId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      userId,
    )
  )
    return [];
  return [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          { type: "text", text: { content: "New project enquiry for " } },
          { type: "mention", mention: { user: { id: userId } } },
        ],
      },
    },
  ];
}

/** Mention delivery is optional and must never turn a saved lead into a reported save failure. */
export async function appendEnquiryMention(
  pageId: string,
  userId: string | undefined,
  append: (value: {
    block_id: string;
    children: BlockObjectRequest[];
  }) => Promise<unknown>,
) {
  const children = enquiryMention(userId);
  if (!children.length) return "skipped" as const;
  try {
    await append({ block_id: pageId, children });
    return "added" as const;
  } catch {
    return "failed" as const;
  }
}

/** The runtime keeps this task alive after returning the durable receipt. */
export function scheduleEnquiryMention(
  pageId: string,
  userId: string | undefined,
  schedule: (task: () => Promise<void>) => void,
  append: Parameters<typeof appendEnquiryMention>[2],
) {
  if (!enquiryMention(userId).length) return;
  schedule(async () => {
    if ((await appendEnquiryMention(pageId, userId, append)) === "failed")
      console.error("Enquiry saved; Notion mention failed");
  });
}
