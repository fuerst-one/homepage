import type {
  BlockObjectResponse,
  PartialBlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints";

export type CaseStudyBlock = {
  id: string;
  type: string;
  richText: RichTextItemResponse[];
  children: CaseStudyBlock[];
  imageUrl?: string;
  caption: RichTextItemResponse[];
  language?: string;
};

type ListChildren = (
  id: string,
  cursor?: string,
) => Promise<{
  results: (BlockObjectResponse | PartialBlockObjectResponse)[];
  has_more: boolean;
  next_cursor: string | null;
}>;

/** Read body blocks only. Child pages, databases and synced content stay private. */
export async function loadCaseStudyBlocks(list: ListChildren, pageId: string) {
  let count = 0;
  const read = async (id: string, depth: number): Promise<CaseStudyBlock[]> => {
    if (depth > 10)
      throw new Error("Case study nesting exceeds the supported depth");
    const blocks: CaseStudyBlock[] = [];
    let cursor: string | undefined;
    do {
      const page = await list(id, cursor);
      for (const raw of page.results) {
        if (++count > 2000)
          throw new Error("Case study exceeds the supported size");
        if (!("type" in raw) || raw.archived || raw.in_trash) continue;
        const block: CaseStudyBlock = {
          id: raw.id,
          type: raw.type,
          richText: [],
          caption: [],
          children: [],
        };
        switch (raw.type) {
          case "paragraph":
          case "heading_1":
          case "heading_2":
          case "heading_3":
          case "bulleted_list_item":
          case "numbered_list_item":
          case "quote":
          case "callout":
          case "toggle":
          case "code": {
            // The SDK union stores each text payload under its discriminator.
            const value = (
              raw as unknown as Record<
                string,
                {
                  rich_text: RichTextItemResponse[];
                  language?: string;
                }
              >
            )[raw.type];
            block.richText = value.rich_text;
            block.language = value.language;
            if (raw.has_children)
              block.children = await read(raw.id, depth + 1);
            break;
          }
          case "image":
            block.imageUrl =
              raw.image.type === "file"
                ? raw.image.file.url
                : raw.image.external.url;
            block.caption = raw.image.caption;
            break;
          case "divider":
            break;
          default:
            continue;
        }
        blocks.push(block);
      }
      cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
    } while (cursor);
    return blocks;
  };
  return read(pageId, 0);
}
