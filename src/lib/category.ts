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
    siblings.push({ id: record.id, name: record.name, order: record.order });
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
    iconName: '',
    // 虚拟分类没有对应的 Notion 记录，图标交由渲染器兜底
    icon: null,
    order: Number.MAX_SAFE_INTEGER,
    enabled: true,
    parentId: null,
    subCategories: [],
  };
}
