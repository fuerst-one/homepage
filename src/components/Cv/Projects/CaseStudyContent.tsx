import type { ReactNode } from "react";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";
import type { CaseStudyBlock } from "@/server/notion/caseStudyBlocks";
import type { Locale } from "@/lib/i18n";
import {
  safeCaseStudyImage,
  publicCaseStudyLink,
} from "@/lib/projectCaseStudy";

function RichText({
  text,
  projectLinks,
}: {
  text: RichTextItemResponse[];
  projectLinks: Record<string, string>;
}) {
  return text.map((part, index) => {
    let content: ReactNode = part.plain_text;
    const annotations = part.annotations;
    if (annotations.bold) content = <strong>{content}</strong>;
    if (annotations.italic) content = <em>{content}</em>;
    if (annotations.strikethrough) content = <s>{content}</s>;
    if (annotations.underline) content = <u>{content}</u>;
    if (annotations.code)
      content = (
        <code className="rounded border border-white/20 px-1 text-sm">
          {content}
        </code>
      );
    const href = publicCaseStudyLink(part.href, projectLinks);
    return href ? (
      <a key={index} href={href} className="underline underline-offset-4">
        {content}
      </a>
    ) : (
      <span key={index}>{content}</span>
    );
  });
}

export function CaseStudyContent({
  blocks,
  projectId,
  projectName,
  locale,
  projectLinks,
}: {
  blocks: CaseStudyBlock[];
  projectId: string;
  projectName: string;
  locale: Locale;
  projectLinks: Record<string, string>;
}) {
  const render = (items: CaseStudyBlock[]): ReactNode => {
    const output: ReactNode[] = [];
    for (let index = 0; index < items.length; index++) {
      const block = items[index];
      const text = (
        <RichText text={block.richText} projectLinks={projectLinks} />
      );
      const children = block.children.length ? (
        <div className="mt-3 space-y-3">{render(block.children)}</div>
      ) : null;
      if (
        block.type === "bulleted_list_item" ||
        block.type === "numbered_list_item"
      ) {
        const group = [block];
        while (items[index + 1]?.type === block.type)
          group.push(items[++index]);
        const Tag = block.type === "numbered_list_item" ? "ol" : "ul";
        output.push(
          <Tag
            key={block.id}
            className={`${Tag === "ol" ? "list-decimal" : "list-disc"} space-y-2 pl-6`}
          >
            {group.map((item) => (
              <li key={item.id}>
                <RichText text={item.richText} projectLinks={projectLinks} />
                {item.children.length > 0 && (
                  <div className="mt-2 space-y-2">{render(item.children)}</div>
                )}
              </li>
            ))}
          </Tag>,
        );
        continue;
      }
      switch (block.type) {
        case "heading_1":
        case "heading_2":
        case "heading_3": {
          const Heading = block.type === "heading_3" ? "h3" : "h2";
          output.push(
            <Heading
              key={block.id}
              className={`${Heading === "h2" ? "text-2xl" : "text-xl"} pt-6 font-semibold text-white`}
            >
              {text}
              {children}
            </Heading>,
          );
          break;
        }
        case "image": {
          if (!safeCaseStudyImage(block.imageUrl)) break;
          const caption = block.caption.map((part) => part.plain_text).join("");
          output.push(
            <figure key={block.id} className="space-y-3 py-3">
              {/* Notion file URLs expire; the scoped proxy refreshes them server-side. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/projects/${projectId}/case-study/images/${block.id}?locale=${locale}`}
                alt={caption || projectName}
                className="h-auto w-full border border-white/20"
                loading="lazy"
              />
              {caption && (
                <figcaption className="text-sm text-neutral-400">
                  <RichText text={block.caption} projectLinks={projectLinks} />
                </figcaption>
              )}
            </figure>,
          );
          break;
        }
        case "divider":
          output.push(<hr key={block.id} className="border-white/20" />);
          break;
        case "quote":
        case "callout":
          output.push(
            <blockquote
              key={block.id}
              className="border-l-2 border-white/30 pl-5"
            >
              {text}
              {children}
            </blockquote>,
          );
          break;
        case "code":
          output.push(
            <pre
              key={block.id}
              className="overflow-x-auto border border-white/20 bg-black p-4 text-sm"
            >
              <code>
                {block.richText.map((part) => part.plain_text).join("")}
              </code>
            </pre>,
          );
          break;
        case "toggle":
          output.push(
            <details key={block.id}>
              <summary className="cursor-pointer text-white">{text}</summary>
              {children}
            </details>,
          );
          break;
        default:
          output.push(
            <div key={block.id}>
              <p className="whitespace-pre-wrap">{text}</p>
              {children}
            </div>,
          );
      }
    }
    return output;
  };
  return (
    <div className="space-y-5 break-words text-base leading-relaxed text-neutral-200">
      {render(blocks)}
    </div>
  );
}
