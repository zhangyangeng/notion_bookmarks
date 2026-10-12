// src/lib/notion-blocks.ts
import {
  BlockObjectResponse,
  RichTextItemResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { notion } from '@/lib/notion';

/**
 * 正文里的一段富文本。
 * 行内样式随片段一起带出来 —— 只取 plain_text 会把加粗与链接一并抹平，
 * 而用户往正文里贴的多半正是链接。
 */
export interface RichTextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  href?: string;
}

/**
 * 归一化后的正文块：**扁平数组 + depth 表达层级**。
 * 这样客户端完全不必认识 Notion 的块类型，缩进也只是一个数字。
 */
export type ContentBlock =
  | { type: 'paragraph'; depth: number; spans: RichTextSpan[] }
  | { type: 'heading'; depth: number; level: 1 | 2 | 3; spans: RichTextSpan[] }
  | { type: 'list-item'; depth: number; ordered: boolean; spans: RichTextSpan[] }
  | { type: 'todo'; depth: number; checked: boolean; spans: RichTextSpan[] }
  | { type: 'quote'; depth: number; spans: RichTextSpan[] }
  | { type: 'callout'; depth: number; spans: RichTextSpan[] }
  | { type: 'code'; depth: number; language: string; text: string }
  | { type: 'divider'; depth: number }
  | { type: 'image'; depth: number; url: string; caption: string }
  | { type: 'toggle'; depth: number; spans: RichTextSpan[] }
  /** 兜底：不认识的块被拍扁成的纯文本 */
  | { type: 'text'; depth: number; spans: RichTextSpan[] };

/**
 * 递归深度上限。
 * 同步块（synced_block）可以引用自身，不设上限会把请求打成一个环。
 */
const MAX_DEPTH = 6;

/**
 * 不跟随进入子块的类型。
 * `child_page` / `child_database` 的 has_children 指的是「这是个带内容的子页面」，
 * 与正文的层级无关，拉进来等于把别的页面内容混进本条。
 */
const SKIP_CHILD_TYPES = new Set(['child_page', 'child_database', 'unsupported']);

/** 取一页/一块下的全部子块（自动翻页）。 */
async function listChildren(blockId: string): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor,
    });

    for (const item of response.results) {
      // 列表接口会混入只有 id 的 PartialBlock，拿不到 type 的那些直接跳过
      if ('type' in item) blocks.push(item as BlockObjectResponse);
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return blocks;
}

function toSpans(richText: RichTextItemResponse[] | undefined): RichTextSpan[] {
  if (!richText?.length) return [];

  return richText
    .map((item) => {
      const span: RichTextSpan = { text: item.plain_text };
      const annotations = item.annotations;

      if (annotations?.bold) span.bold = true;
      if (annotations?.italic) span.italic = true;
      if (annotations?.underline) span.underline = true;
      if (annotations?.strikethrough) span.strike = true;
      if (annotations?.code) span.code = true;

      const href = item.href ?? (item.type === 'text' ? item.text.link?.url : undefined);
      if (href) span.href = href;

      return span;
    })
    .filter((span) => span.text.length > 0 || span.href);
}

/** 部分块没有 rich_text（视频、书签、嵌入），但仍带着一个可读的地址。 */
function extractAnyUrl(block: BlockObjectResponse): string | null {
  const payload = (block as unknown as Record<string, unknown>)[block.type] as
    Record<string, unknown> | undefined;
  if (!payload) return null;

  if (typeof payload.url === 'string') return payload.url;

  for (const key of ['external', 'file'] as const) {
    const holder = payload[key] as { url?: string } | undefined;
    if (holder && typeof holder.url === 'string') return holder.url;
  }

  return null;
}

function mapBlock(block: BlockObjectResponse, depth: number): ContentBlock | null {
  switch (block.type) {
    case 'paragraph':
      return { type: 'paragraph', depth, spans: toSpans(block.paragraph.rich_text) };

    case 'heading_1':
      return { type: 'heading', depth, level: 1, spans: toSpans(block.heading_1.rich_text) };
    case 'heading_2':
      return { type: 'heading', depth, level: 2, spans: toSpans(block.heading_2.rich_text) };
    case 'heading_3':
      return { type: 'heading', depth, level: 3, spans: toSpans(block.heading_3.rich_text) };

    case 'bulleted_list_item':
      return {
        type: 'list-item',
        depth,
        ordered: false,
        spans: toSpans(block.bulleted_list_item.rich_text),
      };
    case 'numbered_list_item':
      return {
        type: 'list-item',
        depth,
        ordered: true,
        spans: toSpans(block.numbered_list_item.rich_text),
      };

    case 'to_do':
      return {
        type: 'todo',
        depth,
        checked: block.to_do.checked,
        spans: toSpans(block.to_do.rich_text),
      };

    case 'quote':
      return { type: 'quote', depth, spans: toSpans(block.quote.rich_text) };

    case 'callout':
      return { type: 'callout', depth, spans: toSpans(block.callout.rich_text) };

    case 'code':
      return {
        type: 'code',
        depth,
        language: block.code.language,
        text: block.code.rich_text.map((item) => item.plain_text).join(''),
      };

    case 'divider':
      return { type: 'divider', depth };

    case 'image': {
      const source =
        block.image.type === 'external' ? block.image.external.url : block.image.file.url;
      return {
        type: 'image',
        depth,
        url: source,
        caption: block.image.caption.map((item) => item.plain_text).join(''),
      };
    }

    case 'toggle':
      // 子块已在递归中拉平，这里不再假装可折叠，只保留类型信息
      return { type: 'toggle', depth, spans: toSpans(block.toggle.rich_text) };

    default: {
      // 兜底：不认识的块拍扁成纯文本，宁可显示得朴素，也不让它静默消失
      const spans = toSpans(
        (
          (block as unknown as Record<string, unknown>)[block.type] as
            { rich_text?: RichTextItemResponse[] } | undefined
        )?.rich_text,
      );
      if (spans.length > 0) return { type: 'text', depth, spans };

      const url = extractAnyUrl(block);
      if (url) return { type: 'text', depth, spans: [{ text: url, href: url }] };

      return null;
    }
  }
}

/**
 * 该块是否什么都显示不出来。
 *
 * 文本类的价值全在文本上，文本空了就只剩一个空壳 —— 渲染出来是一段空白高度，
 * 比不渲染更糟：读者会以为正文还在加载。Notion 里留空行是常态（段落之间多按一次回车），
 * 数据侧不必被指望干净。
 *
 * divider 与 image 不参与判空：一条分割线本身就是内容，图片另有地址可读。
 */
function isEmptyBlock(block: ContentBlock): boolean {
  if ('spans' in block) return block.spans.length === 0;
  if (block.type === 'code') return block.text.trim().length === 0;
  return false;
}

/**
 * 逐块展开为扁平列表。
 *
 * NOTE: 子块请求刻意串行。Notion 的限速是按 token 全局计（约 3 请求/秒），
 * 同层并行只会换来 429 与 SDK 重试，并不更快。
 */
async function collect(blocks: BlockObjectResponse[], depth: number): Promise<ContentBlock[]> {
  const result: ContentBlock[] = [];

  for (const block of blocks) {
    const mapped = mapBlock(block, depth);
    // 判空与递归是两回事：空的折叠块里可能装着有内容的子块，子块照拉不误
    if (mapped && !isEmptyBlock(mapped)) result.push(mapped);

    if (block.has_children && !SKIP_CHILD_TYPES.has(block.type) && depth < MAX_DEPTH) {
      const children = await listChildren(block.id);
      result.push(...(await collect(children, depth + 1)));
    }
  }

  return result;
}

/**
 * 按需拉取一条链接的页面正文，归一化成客户端可渲染的块列表。
 * 只在服务端调用 —— 调用方是 API 路由，浏览器拿不到 Notion 凭据。
 */
export async function fetchLinkContent(pageId: string): Promise<ContentBlock[]> {
  const blocks = await listChildren(pageId);
  return collect(blocks, 0);
}
