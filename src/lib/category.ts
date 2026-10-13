// src/lib/category.ts
import { Category, Link, SubCategory } from '@/types';

/**
 * 归类缺失时的兜底分类 id。
 * 用固定哨兵值而非 null，是为了让「未分类」在导航与锚点体系里与其他一级分类同等对待。
 */
export const UNCATEGORIZED_ID = 'uncategorized';
export const UNCATEGORIZED_NAME = '未分类';

/**
 * 二级分类区块的锚点 id。
 * 导航的滚动定位、区块渲染、高亮比对三处必须使用同一拼法，故抽到这里共用。
 */
export function subCategoryAnchorId(categoryId: string, subCategoryId: string): string {
  return `${categoryId}-${subCategoryId}`;
}

/** 地址栏锚点指向的位置。`subCategoryId` 为 null 表示只指到一级分类。 */
export interface CategoryAnchor {
  categoryId: string;
  subCategoryId: string | null;
}

/**
 * 短名归一化：去首尾空白、转小写。
 *
 * NOTE: 短名是人手填的，大小写与空格属于常见笔误。归一化后链接照样命中，
 *       免得在 Notion 里改了个大小写，就把已经分享出去的链接全部打断。
 */
function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * 短名 → 分类位置 的索引。
 *
 * 一级短名自身是一个键（`dev`）；二级用「一级短名/二级短名」（`dev/tools`）——
 * 一级短名因此充当命名空间，二级短名只需在自己一级内唯一。
 * 任一层没填短名，该条目不进索引，锚点自动退回记录 id。
 *
 * 键重复时先到先得（按分类树顺序），不让后一条静默顶掉前一条。
 */
function buildSlugIndex(categories: Category[]): Map<string, CategoryAnchor> {
  const index = new Map<string, CategoryAnchor>();

  for (const category of categories) {
    const rootSlug = category.slug ? normalizeSlug(category.slug) : null;

    if (rootSlug && !index.has(rootSlug)) {
      index.set(rootSlug, { categoryId: category.id, subCategoryId: null });
    }
    if (!rootSlug) continue;

    for (const subCategory of category.subCategories) {
      if (!subCategory.slug) continue;
      const key = `${rootSlug}/${normalizeSlug(subCategory.slug)}`;
      if (!index.has(key)) {
        index.set(key, { categoryId: category.id, subCategoryId: subCategory.id });
      }
    }
  }

  return index;
}

/**
 * 区块锚点 id → 地址栏短名，供写地址栏时使用。
 *
 * 没填短名的分类原样返回锚点 id —— 链接会变长，但不会失效。
 * 一级与二级有一处没填，二级也退回 id：短名是两段拼的，缺一段就拼不出完整键。
 */
export function anchorIdToSlug(anchorId: string, categories: Category[]): string {
  for (const category of categories) {
    if (anchorId === category.id) {
      return category.slug ? normalizeSlug(category.slug) : anchorId;
    }

    for (const subCategory of category.subCategories) {
      if (anchorId !== subCategoryAnchorId(category.id, subCategory.id)) continue;
      if (!category.slug || !subCategory.slug) return anchorId;
      return `${normalizeSlug(category.slug)}/${normalizeSlug(subCategory.slug)}`;
    }
  }

  return anchorId;
}

/**
 * 把地址栏 hash 解析成它指向的分类位置；解析不出返回 null，由调用方回落到默认视图。
 *
 * 匹配顺序：短名索引 → 记录 id 精确比对 → 一级前缀兜底。
 *
 * NOTE: **不能按 `-` 拆分。** 一级与二级都是 Notion 记录的 id，本身可能是带连字符的 UUID，
 *       拆出来的段数并不固定。短名同样不能拆 —— 一级短名里允许出现 `-`（如 `online-tools`），
 *       故只以完整键去查表。这里全程只做精确比对。
 *
 * 最后那轮前缀匹配是为了「分类还在、二级却没了」的旧链接（二级被关闭或已无链接）：
 * 此时退到它所属的一级分类，保留「跳到这一类」的意图，而不是整个锚点作废。
 */
export function parseCategoryAnchor(hash: string, categories: Category[]): CategoryAnchor | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;
  const id = safeDecode(raw);

  const bySlug = buildSlugIndex(categories).get(normalizeSlug(id));
  if (bySlug) return bySlug;

  for (const category of categories) {
    if (id === category.id) return { categoryId: category.id, subCategoryId: null };
  }

  for (const category of categories) {
    for (const subCategory of category.subCategories) {
      if (id === subCategoryAnchorId(category.id, subCategory.id)) {
        return { categoryId: category.id, subCategoryId: subCategory.id };
      }
    }
  }

  const owner = categories.find((category) => id.startsWith(`${category.id}-`));
  return owner ? { categoryId: owner.id, subCategoryId: null } : null;
}

/** 地址栏里的值可能带百分号编码，解码失败就按原样比对，不让一个坏字符把整个锚点废掉。 */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * 把扁平的分类记录（一级与二级混排）组织成以一级为骨架的树，各层均按 order 升序。
 * 被 Enabled 关闭的分类不进入树 —— 关闭的入口不该还留在导航里。
 */
export function buildCategoryTree(records: Category[]): Category[] {
  const active = records.filter((record) => record.enabled);
  const childrenOf = new Map<string, SubCategory[]>();

  for (const record of active) {
    if (!record.parentId) continue;
    const siblings = childrenOf.get(record.parentId) ?? [];
    siblings.push({
      id: record.id,
      name: record.name,
      order: record.order,
      slug: record.slug,
    });
    childrenOf.set(record.parentId, siblings);
  }

  return active
    .filter((record) => !record.parentId)
    .sort((a, b) => a.order - b.order)
    .map((record) => ({
      ...record,
      subCategories: (childrenOf.get(record.id) ?? []).sort((a, b) => a.order - b.order),
    }));
}

/**
 * 用分类记录解析每条链接的分类引用，并剔除所属分类已被关闭的条目。
 *
 * 解析顺序：
 * 1. relation（新载体）—— 指向二级记录时顺带得到其父级；直接指向一级记录时二级留空；
 * 2. 旧 Select 名（回退）—— 仅供 relation 尚未写入的条目使用，按名称在**启用**的记录中找回；
 * 3. 兜底 —— 两者都解析不出时显式落到「未分类」。
 *
 * 第 3 条是这一步的核心目的：归类缺失必须在界面上可见，而不是被静默丢弃。
 *
 * 与之相对，**所属分类被关闭的条目直接不进入结果**：关闭的语义是这一类整体收起，
 * 而不是把条目挤进「未分类」重新暴露出来。两者的区别在于「没归类」与「归了但它不展出」。
 *
 * NOTE: `records` 必须传入**全量**分类记录（含已关闭项），否则无法区分「分类被关闭」
 * 与「分类不存在」—— 只有后者才该落到「未分类」。
 */
export function resolveLinks(links: Link[], records: Category[]): Link[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  // 回退匹配只在启用的分类中进行：旧 Select 名不该把一个已关闭的分类找回来
  const activeRootByName = new Map<string, Category>();
  const activeChildByName = new Map<string, Category>();

  for (const record of records) {
    if (!record.enabled) continue;
    if (record.parentId) {
      activeChildByName.set(`${record.parentId}/${record.name}`, record);
    } else {
      activeRootByName.set(record.name, record);
    }
  }

  const resolved: Link[] = [];

  for (const link of links) {
    const related = link.categoryIds
      .map((id) => byId.get(id))
      .filter((record): record is Category => Boolean(record));
    const sub = related.find((record) => record.parentId);
    const root = sub?.parentId
      ? byId.get(sub.parentId)
      : related.find((record) => !record.parentId);

    if (root) {
      if (!root.enabled || (sub && !sub.enabled)) continue;
      resolved.push({ ...link, category1Id: root.id, category2Id: sub?.id ?? null });
      continue;
    }

    // 回退：relation 尚未写入的条目沿用旧 Select 名。随旧字段移除，见 docs 3.6 做法 4。
    const fallbackRoot = activeRootByName.get(link.category1);
    if (fallbackRoot) {
      const fallbackSub = activeChildByName.get(`${fallbackRoot.id}/${link.category2}`);
      resolved.push({
        ...link,
        category1Id: fallbackRoot.id,
        category2Id: fallbackSub?.id ?? null,
      });
      continue;
    }

    resolved.push({ ...link, category1Id: UNCATEGORIZED_ID, category2Id: null });
  }

  return resolved;
}

/** 「未分类」虚拟一级分类，仅在确有未归类条目时由页面追加到树尾 */
export function createUncategorizedCategory(): Category {
  return {
    id: UNCATEGORIZED_ID,
    name: UNCATEGORIZED_NAME,
    // 虚拟分类不是 Notion 记录，没有短名可填，锚点只能用它的哨兵 id
    slug: null,
    iconName: '',
    // 虚拟分类没有对应的 Notion 记录，图标交由渲染器兜底
    icon: null,
    order: Number.MAX_SAFE_INTEGER,
    enabled: true,
    parentId: null,
    subCategories: [],
  };
}
