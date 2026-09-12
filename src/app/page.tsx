// src/app/page.tsx
import { getLinks, getCategories, getWebsiteConfig, hasDataFetchFailed } from '@/lib/notion';
import {
  buildCategoryTree,
  createUncategorizedCategory,
  resolveLinks,
  UNCATEGORIZED_ID,
} from '@/lib/category';
import MainContent from '@/components/layout/MainContent';
import DataUnavailableBanner from '@/components/layout/DataUnavailableBanner';

// 数据兜底：10 分钟。降到 12 小时以下是为了改完能更快看到，同时远离 Notion 180 req/min 的限流线。
export const revalidate = 600;

export default async function HomePage() {
  // 获取数据 - Parallel Fetching
  const [categoryRecords, links, config] = await Promise.all([
    getCategories(),
    getLinks(),
    getWebsiteConfig(),
  ]);

  // 数据拉取失败时挂降级提示，而不是白屏装没事。
  const dataUnavailable = hasDataFetchFailed();

  // 分类记录取全量（含已关闭项），resolveLinks 才分得清「分类被关闭」与「分类不存在」：
  // 前者整条收起，后者落到「未分类」—— 归类缺失在界面上可见，而不是被丢弃
  const resolvedLinks = resolveLinks(links, categoryRecords);

  // 树只含启用的分类；被关闭的入口不出现在导航里
  const tree = buildCategoryTree(categoryRecords);

  // 只保留确有链接的一级分类，避免出现点进去是空白的入口
  const activeCategoryIds = new Set(resolvedLinks.map((link) => link.category1Id));
  const activeCategories = tree.filter((category) => activeCategoryIds.has(category.id));

  if (activeCategoryIds.has(UNCATEGORIZED_ID)) {
    activeCategories.push(createUncategorizedCategory());
  }

  // 二级分类只保留确有链接的那些，顺序沿用配置库中的 Order
  const activeSubCategoryIds = new Set(
    resolvedLinks.map((link) => link.category2Id).filter((id): id is string => id !== null),
  );
  const categoriesWithSubs = activeCategories.map((category) => ({
    ...category,
    subCategories: category.subCategories.filter((sub) => activeSubCategoryIds.has(sub.id)),
  }));

  return (
    <>
      {dataUnavailable && <DataUnavailableBanner />}
      <MainContent categories={categoriesWithSubs} links={resolvedLinks} config={config} />
    </>
  );
}
