import {
  PageObjectResponse,
  TitlePropertyItemObjectResponse,
  RichTextPropertyItemObjectResponse,
  NumberPropertyItemObjectResponse,
  SelectPropertyItemObjectResponse,
  FilesPropertyItemObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import {
  isPageObjectResponse,
  extractTitle,
  extractRichText,
  extractSelect,
  extractFileUrl,
} from './common';

// Notion Properties for Collection Database
export interface NotionCollectionProperties {
  名称: TitlePropertyItemObjectResponse;
  slug: RichTextPropertyItemObjectResponse;
  说明: RichTextPropertyItemObjectResponse;
  封面: FilesPropertyItemObjectResponse;
  排序: NumberPropertyItemObjectResponse;
  可见性: SelectPropertyItemObjectResponse;
}

export type NotionCollectionPage = PageObjectResponse & {
  properties: NotionCollectionProperties;
};

// Domain Model
export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  cover: string;
  order: number;
  visible: boolean;
  /** 该合集下关联的链接记录 id，由 Notion 双向关联自动回填 */
  linkIds: string[];
}

// Type Guard
export function isNotionCollectionPage(page: unknown): page is NotionCollectionPage {
  if (!isPageObjectResponse(page)) return false;
  const props = page.properties;
  return '名称' in props && 'slug' in props && '可见性' in props;
}

// Transformer
export function toCollection(page: NotionCollectionPage): Collection {
  const props = page.properties;
  return {
    id: page.id,
    name: extractTitle(props.名称),
    slug: extractRichText(props.slug),
    description: extractRichText(props.说明),
    cover: extractFileUrl(props.封面),
    order: props.排序?.number || 0,
    visible: extractSelect(props.可见性) === '公开',
    linkIds: [],
  };
}
