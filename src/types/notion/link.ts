import {
  PageObjectResponse,
  TitlePropertyItemObjectResponse,
  RichTextPropertyItemObjectResponse,
  UrlPropertyItemObjectResponse,
  SelectPropertyItemObjectResponse,
  FilesPropertyItemObjectResponse,
  MultiSelectPropertyItemObjectResponse,
  CreatedTimePropertyItemObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import {
  isPageObjectResponse,
  extractTitle,
  extractRichText,
  extractUrl,
  extractSelect,
  extractFileUrl,
  extractMultiSelect,
  extractRelationIds,
  RelationPropertyValue,
} from './common';

// 链接库中「分类」relation 的属性名。含 emoji 前缀，来自 Notion 模板，不可更改。
// 这是 schema 事实而非业务逻辑，故与类型定义同处一文件，作为唯一出处被类型与转换共用。
export const LINK_CATEGORY_RELATION = '#️⃣ 分类配置' as const;

// Precise Definition of Notion Properties for Links Database
export interface NotionLinkProperties {
  Name: TitlePropertyItemObjectResponse;
  URL: UrlPropertyItemObjectResponse;
  desc: RichTextPropertyItemObjectResponse;
  Tags: MultiSelectPropertyItemObjectResponse;
  iconfile: FilesPropertyItemObjectResponse;
  iconlink: UrlPropertyItemObjectResponse;
  Created: CreatedTimePropertyItemObjectResponse;
}

/**
 * 迁移期字段：分类的新载体（relation）与旧载体（Select）并存。
 *
 * 全部声明为可选，理由有两条：
 * 1. relation 的**值**可以为空（尚未分诊的条目），空值不应让条目被判为非法；
 * 2. 旧 Select 字段计划在迁移完成后移除，届时不应因字段消失而丢弃整个链接库。
 *
 * `category1` / `category2` 的移除条件，三条同时满足即可动手：
 * 1. relation 已覆盖全部条目，线上运行一段时间后回退分支不再命中；
 * 2. 「分类配置」库的层级与 Order 稳定，分类树可完全由配置库驱动；
 * 3. 先在 Notion 侧删除这两个字段，再删此处成员、`resolveLinks` 的回退分支，
 *    以及 `Link.category1` / `Link.category2`。
 *
 * 见 `docs/architecture/02-改造路线.md` 3.6 做法 4。
 */
export type NotionLinkTransitionalProperties = {
  [K in typeof LINK_CATEGORY_RELATION]?: RelationPropertyValue;
} & {
  /** @deprecated 旧 Select 载体，仅作迁移期回退；移除条件见本类型上方 */
  category1?: SelectPropertyItemObjectResponse;
  /** @deprecated 旧 Select 载体，仅作迁移期回退；移除条件见本类型上方 */
  category2?: SelectPropertyItemObjectResponse;
};

export type NotionLinkPage = PageObjectResponse & {
  properties: NotionLinkProperties & NotionLinkTransitionalProperties;
};

// Domain Model
export interface Link {
  id: string;
  name: string;
  created: string;
  desc: string;
  url: string;
  /** 分类 relation 指向的记录 id；尚未分诊时为空数组 */
  categoryIds: string[];
  /** 一级分类记录 id；未经上层解析或归类缺失时为 null */
  category1Id: string | null;
  /** 二级分类记录 id；该条目没有二级分类时为 null */
  category2Id: string | null;
  /** @deprecated 旧 Select 字段的原始一级分类名，仅供回退匹配；随旧字段一并移除 */
  category1: string;
  /** @deprecated 旧 Select 字段的原始二级分类名，仅供回退匹配；随旧字段一并移除 */
  category2: string;
  iconfile: string;
  iconlink: string;
  tags: string[];
}

// Type Guard
export function isNotionLinkPage(page: unknown): page is NotionLinkPage {
  if (!isPageObjectResponse(page)) return false;

  const props = page.properties;
  return (
    'Name' in props &&
    'URL' in props &&
    'desc' in props &&
    'Tags' in props &&
    'iconfile' in props &&
    'iconlink' in props &&
    'Created' in props
  );
}

// Transformer
export function toLink(page: NotionLinkPage): Link {
  const props = page.properties;
  return {
    id: page.id,
    name: extractTitle(props.Name),
    created: props.Created.created_time,
    desc: extractRichText(props.desc),
    url: extractUrl(props.URL) || '#',
    categoryIds: extractRelationIds(props[LINK_CATEGORY_RELATION]),
    category1Id: null,
    category2Id: null,
    // 旧字段只取原始值，作为回退匹配的输入；解析成记录引用由 resolveLinks 完成
    category1: extractSelect(props.category1),
    category2: extractSelect(props.category2),
    iconfile: extractFileUrl(props.iconfile),
    iconlink: extractUrl(props.iconlink),
    tags: extractMultiSelect(props.Tags),
  };
}
