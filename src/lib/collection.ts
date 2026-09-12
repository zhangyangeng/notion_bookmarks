// src/lib/collection.ts
import { Collection, Link } from '@/types';

/**
 * slug 唯一性校验。
 * Notion 的 rich_text 无法强制唯一约束，而两个合集抢同一个 slug 会让分享短链静默指向错误页面，
 * 因此唯一性必须在构建期校验：发现重复直接抛错，报出冲突的两个合集名（见路线文档 3.7）。
 */
export function assertUniqueSlugs(collections: Collection[]): void {
  const bySlug = new Map<string, string>();
  for (const collection of collections) {
    if (!collection.slug) continue;
    const existing = bySlug.get(collection.slug);
    if (existing) {
      throw new Error(
        `合集 slug 冲突：「${existing}」与「${collection.name}」都用了 "${collection.slug}"`,
      );
    }
    bySlug.set(collection.slug, collection.name);
  }
}

/**
 * 供公开面使用的合集列表：只保留可见的，按 order 升序。
 * 与分类的「关闭即收起」同义 —— 可见性为草稿/私人的合集不进入分享入口。
 */
export function resolveCollections(collections: Collection[]): Collection[] {
  return collections.filter((collection) => collection.visible).sort((a, b) => a.order - b.order);
}

/**
 * 按 slug 定位合集，并挂上该合集下的链接（按「推荐优先、创建时间逆序」稳定排序）。
 * 供分享页 `/c/[slug]` 使用；slug 不存在时返回 null。
 */
export function resolveCollectionBySlug(
  collections: Collection[],
  links: Link[],
  slug: string,
): { collection: Collection; links: Link[] } | null {
  const collection = collections.find((c) => c.slug === slug && c.visible);
  if (!collection) return null;

  const memberLinks = links
    .filter((link) => link.collectionIds.includes(collection.id))
    .sort((a, b) => {
      const aTop = a.tags.includes('推荐');
      const bTop = b.tags.includes('推荐');
      if (aTop !== bTop) return aTop ? -1 : 1;
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });

  return { collection, links: memberLinks };
}
