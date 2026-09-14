import {
  PageObjectResponse,
  TitlePropertyItemObjectResponse,
  RichTextPropertyItemObjectResponse,
  NumberPropertyItemObjectResponse,
  CheckboxPropertyItemObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import {
  isPageObjectResponse,
  extractTitle,
  extractRichText,
  extractRelationIds,
  RelationPropertyValue,
} from './common';

// 分类配置库中「上级」自关联的属性名。含空格，来自 Notion 模板，不可更改。
// 与「子级 项目」是一对双向关联，写入任一端另一端会自动回填，因此此处只需读「上级」。
export const CATEGORY_PARENT_RELATION = '上级 项目' as const;

// Notion Properties for Category Database
export interface NotionCategoryProperties {
  Name: TitlePropertyItemObjectResponse;
  IconName: RichTextPropertyItemObjectResponse;
  Order: NumberPropertyItemObjectResponse;
  Enabled: CheckboxPropertyItemObjectResponse;
}

/**
 * 层级字段声明为可选：一级分类的「上级」为空值，但字段本身一直在。
 * 声明为可选是为了让缺少该字段的库也能被解析，而不是整库分类被判为非法。
 */
export type NotionCategoryStructuralProperties = {
  [K in typeof CATEGORY_PARENT_RELATION]?: RelationPropertyValue;
};

export type NotionCategoryPage = PageObjectResponse & {
  properties: NotionCategoryProperties & NotionCategoryStructuralProperties;
};

// 二级分类：挂在某个一级分类之下的条目
export interface SubCategory {
  id: string;
  name: string;
  order: number;
}

/**
 * 分类图标解析后的可渲染形态。
 *
 * - `svg` ：lucide 图标的 `<svg>` 内部标记，渲染时套外壳后注入
 * - `text`：emoji / 符号等非 ASCII 文本，作为 React 文本节点渲染
 */
export type CategoryIconData = { kind: 'svg'; inner: string } | { kind: 'text'; value: string };

// Domain Model
export interface Category {
  id: string;
  name: string;
  /** Notion `IconName` 原始值。保留用于溯源与对账，UI 不直接渲染它 */
  iconName: string;
  /** 由 iconName 解析所得；null 表示无图标或名字认不出，由 UI 兜底 */
  icon: CategoryIconData | null;
  order: number;
  enabled: boolean;
  /** 所属一级分类的记录 id；一级分类自身为 null */
  parentId: string | null;
  /** 仅一级分类填充：其下的二级分类，按 order 升序；二级分类自身为空数组 */
  subCategories: SubCategory[];
}

// Type Guard
export function isNotionCategoryPage(page: unknown): page is NotionCategoryPage {
  if (!isPageObjectResponse(page)) return false;
  const props = page.properties;
  return 'Name' in props && 'IconName' in props && 'Order' in props && 'Enabled' in props;
}

// Transformer
export function toCategory(page: NotionCategoryPage): Category {
  const props = page.properties;
  const parentIds = extractRelationIds(props[CATEGORY_PARENT_RELATION]);
  return {
    id: page.id,
    name: extractTitle(props.Name),
    iconName: extractRichText(props.IconName),
    // 解析结果由 lib 层（getCategories）在服务端补入 —— 类型层不依赖渲染库
    icon: null,
    order: props.Order.number || 0,
    enabled: props.Enabled.checkbox,
    parentId: parentIds[0] ?? null,
    subCategories: [],
  };
}
