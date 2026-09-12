// src/lib/search.ts

export interface SearchItem {
  id: string;
  name: string;
  desc: string;
  url: string;
  tags: string[];
  review: string;
  /** 展示用的一级分类名，命中时能帮用户定位 */
  categoryName: string;
}

/**
 * 纯前端模糊匹配。搜索范围覆盖 name / desc / tags / 点评 / 分类名。
 * 全库公开条目当前仅几十条，`includes` 已足够；到上千条再引入 fuse.js（见路线文档 3.3）。
 */
export function searchItems(items: SearchItem[], query: string): SearchItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;

  const tokens = q.split(/\s+/).filter(Boolean);

  return items.filter((item) => {
    const haystack = [item.name, item.desc, item.review, item.categoryName, ...item.tags]
      .join('\n')
      .toLowerCase();

    // 所有 token 都必须命中（空格分词做 AND 匹配）
    return tokens.every((token) => haystack.includes(token));
  });
}
