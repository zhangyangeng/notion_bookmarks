// src/app/api/links/[id]/content/route.ts
import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getCategories, getLinks } from '@/lib/notion';
import { resolveLinks } from '@/lib/category';
import { fetchLinkContent } from '@/lib/notion-blocks';

/**
 * 正文里的图片是 Notion 的签名地址，1 小时后失效。
 * 缓存必须短于它，否则访客会拿到一批已经过期的图。
 *
 * NOTE: 必须是字面量 —— Next 在构建期静态解析路由配置，引用变量会被判为无法识别。
 */
export const revalidate = 300;

/** CDN 侧按同一时长缓存 */
const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=60';

/** 白名单名单本身的缓存时长，与响应缓存同步：名单变了，正文的可见性也一起变 */
const WHITELIST_REVALIDATE = 300;

/**
 * 公开面在列的条目 id。
 *
 * 判断「这个 id 该不该服务」要把全部链接与分类拉一遍 —— 实测约 2.4 秒，
 * 是取正文本身（约 0.4 秒）的六倍。而这份名单几分钟才需要变一次，
 * 所以整批缓存：接口的耗时回到「取正文」这一件事上。
 *
 * NOTE: 缓存键是固定的 —— 名单只由数据决定，不带任何请求参数。
 */
const getPublicLinkIds = unstable_cache(
  async () => {
    const [links, categories] = await Promise.all([getLinks(), getCategories()]);
    return resolveLinks(links, categories).map((link) => link.id);
  },
  ['public-link-ids'],
  { revalidate: WHITELIST_REVALIDATE },
);

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // 白名单：只服务公开面在列的条目。
    // 不校验的话，任何人都能拿一个公开 id 反复调用，把这里当免费代理刷 Notion 配额。
    // 分类解析与首页走同一条路径，所属分类被关闭的条目同样不返回正文。
    const publicIds = await getPublicLinkIds();

    if (!publicIds.includes(id)) {
      return NextResponse.json({ error: '未找到该链接' }, { status: 404 });
    }

    const blocks = await fetchLinkContent(id);

    return NextResponse.json({ blocks }, { headers: { 'Cache-Control': CACHE_CONTROL } });
  } catch (error) {
    console.error('获取链接正文失败:', error);
    // 降级：返回空正文并带失败标记，让弹层显示「内容加载失败」，
    // 而不是让 500 把整个面板打掉 —— 描述与点评本就在客户端，不该被正文的故障连坐。
    return NextResponse.json(
      { blocks: [], failed: true },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
