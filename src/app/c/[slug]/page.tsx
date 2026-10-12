import { getCollections, getLinks, getWebsiteConfig, hasDataFetchFailed } from '@/lib/notion';
import { mergeConfig } from '@/config';
import { assertUniqueSlugs, resolveCollectionBySlug } from '@/lib/collection';
import ShareCollectionList from '@/components/share/ShareCollectionList';
import DataUnavailableBanner from '@/components/layout/DataUnavailableBanner';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import { copyrightYears } from '@/lib/copyright';

export const revalidate = 600;

// 预生成所有公开合集的分享页（ISR 快照），请求时不再打 Notion API。
export async function generateStaticParams() {
  const collections = await getCollections();
  assertUniqueSlugs(collections);
  return collections.filter((c) => c.visible && c.slug).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [collections, websiteConfig] = await Promise.all([getCollections(), getWebsiteConfig()]);
  assertUniqueSlugs(collections);
  const collection = collections.find((c) => c.slug === slug && c.visible);
  if (!collection) return { title: '未找到' };

  const siteName = mergeConfig(websiteConfig).SITE_TITLE;
  const description = collection.description || `${collection.name}合集`;
  // 分享页的卡片要能独立成立：读者在聊天窗口里只看得到这张卡片，看不到站点。
  // 因此 url 必须指向本页自身（否则会继承 layout 的 '/'），标题与描述也不能沿用站点级文案。
  //
  // NOTE: 合集封面优先，未填封面则退回站点级分享图。Notion 上传的封面是带签名的临时链接，
  // 靠本页 revalidate 周期性重取保持有效（与 LinkIcon 的图标约束同源）。
  const images = collection.cover
    ? [{ url: collection.cover, alt: `${collection.name}｜${siteName}` }]
    : [{ url: '/og.png', width: 1200, height: 630, alt: `${collection.name}｜${siteName}` }];

  return {
    title: collection.name,
    description,
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      url: `/c/${collection.slug}`,
      title: collection.name,
      description,
      siteName,
      images,
    },
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // config 取 getWebsiteConfig 原值（WebsiteConfig 是索引签名类型），与首页一致
  const [collections, links, config] = await Promise.all([
    getCollections(),
    getLinks(),
    getWebsiteConfig(),
  ]);
  // 年份在服务端算出后直接渲染进 HTML，客户端不参与计算，不存在 hydration 不一致
  const year = new Date().getFullYear();

  // Notion 不可达时，合集拉不到会导致误判为「不存在」而 404。
  // 此时先判断是否拉取失败，失败则降级提示，而不是把临时故障伪装成「没有这个合集」。
  const dataUnavailable = hasDataFetchFailed();

  assertUniqueSlugs(collections);
  const result = resolveCollectionBySlug(collections, links, slug);

  if (!result) {
    // 拉取失败时降级渲染，而非 404：合集可能真实存在，只是临时读不到。
    if (dataUnavailable) {
      return (
        <div className="min-h-screen">
          <DataUnavailableBanner />
          <main className="max-w-2xl mx-auto px-4 py-12">
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              ← 返回导航
            </Link>
            <p className="text-muted-foreground">这个合集暂时无法加载，请稍后刷新。</p>
          </main>
        </div>
      );
    }
    notFound();
  }

  const { collection, links: memberLinks } = result;

  // 不铺背景色：body 上的墨绿光斑要透上来，玻璃卡片的 backdrop-filter 才有东西可糊
  return (
    <div className="min-h-screen">
      {/* pb-20：给贴底的回到顶部按钮（44px + 12px 边距）留出净空，避免滚到底时压住页脚 */}
      <main className="max-w-2xl mx-auto px-4 pt-12 pb-20">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            ← 返回导航
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{collection.name}</h1>
          {collection.description && (
            <p className="mt-2 text-muted-foreground">{collection.description}</p>
          )}
        </div>

        {memberLinks.length === 0 ? (
          <p className="text-muted-foreground">这个合集还没有内容。</p>
        ) : (
          <ShareCollectionList links={memberLinks} />
        )}

        {/*
         * 分享页的读者是从外部链接进来的，不认识站点 —— 署名在这里比在首页更有用。
         * 排版刻意保持轻量：一行居中静态文本，不复制首页那条浮起玻璃条（那是导航辅助，不是内容）。
         */}
        <footer className="mt-12 border-t border-border/10 pt-6 text-center text-xs text-muted-foreground">
          © {copyrightYears(year)} {config.SITE_AUTHOR} · 保留所有权利
        </footer>
      </main>
    </div>
  );
}
