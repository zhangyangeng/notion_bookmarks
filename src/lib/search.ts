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
 * 从地址栏读取初始查询词。`?q=` 由搜索面板写入，读取它才能让结果链接真正可分享。
 * 只在客户端 effect 中调用 —— 首帧读 location 会与服务端渲染的输出不一致。
 * 传入完整 href 而非直接读 window，是为了让这条解析逻辑可被单测覆盖。
 */
export function readInitialQuery(href: string): string {
  try {
    return (new URL(href).searchParams.get('q') ?? '').trim();
  } catch {
    // href 为空或畸形时当作没有查询词，不要让地址栏解析失败拖垮整个页面
    return '';
  }
}

/** 地址栏 `q` 参数本轮该做什么：写入 / 删除 / 不动 */
export type QuerySync = 'set' | 'delete' | 'none';

/**
 * 判断本轮该怎样同步地址栏的 `q`。
 *
 * 关闭面板要清掉它，否则搜索词长期留在地址栏 —— 收藏本站会把 `?q=` 一起收藏，
 * 之后从收藏打开或在搜索过之后刷新，都会莫名其妙弹出搜索面板。
 *
 * 但「当前是关闭态」不等于「刚刚关闭」：首帧本来就是关闭态，此时若也清理，
 * 会把别人分享链接里的 `q` 抹掉，被分享者就看不到结果了。故只在面板关闭的**那一下**清理。
 *
 * 打开但尚未输入时不动地址栏，同样是为了不破坏地址栏里已有的 `q`。
 */
export function planQuerySync(options: {
  open: boolean;
  query: string;
  justClosed: boolean;
}): QuerySync {
  if (options.open) return options.query ? 'set' : 'none';
  return options.justClosed ? 'delete' : 'none';
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
