'use client';

import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import LinkContainer from '@/components/layout/LinkContainer';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import SearchPalette from '@/components/search/SearchPalette';
import LinkDetailPanel from '@/components/ui/LinkDetailPanel';
import {
  anchorIdToSlug,
  parseCategoryAnchor,
  subCategoryAnchorId,
  type CategoryAnchor,
} from '@/lib/category';
import { scrollToAnchor, writeAnchorHash } from '@/lib/anchor';
import { cn } from '@/lib/utils';
import React from 'react';
import { Category, Link, WebsiteConfig } from '@/types';

interface MainContentProps {
  /** 有一级分类的树，每个一级下只保留确有链接的二级分类 */
  categories: Category[];
  /** 全部已解析分类引用的链接 */
  links: Link[];
  config: WebsiteConfig;
  /** 当前年份。服务端计算后传入，供页脚版权使用 */
  year: number;
}

/** 侧栏二态：展开 / 窄图标栏 */
export type SidebarState = 'expanded' | 'icons';

const SIDEBAR_STORAGE_KEY = 'nav.sidebar-state';

/** 落位后暂停滚动同步的时长：覆盖平滑滚动走完全程所需的窗口 */
const SCROLL_SYNC_LOCK_MS = 1000;

/**
 * 各态对应的内容区左侧外边距。
 * NOTE: 侧栏为浮起面板（left-3 + 自身宽 + right 侧 12px 间隙），
 *       故外边距 = 侧栏宽 + 24px，两处必须同步改。
 */
const SIDEBAR_MARGIN: Record<SidebarState, string> = {
  expanded: 'md:ml-[304px]',
  icons: 'md:ml-[88px]',
};

function readSidebarState(): SidebarState {
  if (typeof window === 'undefined') return 'expanded';
  // 历史版本存过 'hidden'，该态已移除，读到的旧值回落到展开态
  const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
  return saved === 'icons' ? 'icons' : 'expanded';
}

/**
 * 服务端没有 localStorage，storage 只能在浏览器侧读。
 * NOTE: 用 layout effect 而非 useEffect —— 它在浏览器绘制前同步补上真实状态，
 *       避免用户先看到一帧展开态再折叠（useEffect 在绘制后才跑，会有可见闪烁）。
 *       服务端则回落到 useEffect，规避 React 对服务端调用 useLayoutEffect 的警告。
 */
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** 某个一级分类下的第一个二级锚点；没有二级则返回 null（该分类下没有可高亮的二级） */
function firstSubAnchorId(categories: Category[], categoryId: string): string | null {
  const firstSub = categories.find((category) => category.id === categoryId)?.subCategories[0];
  return firstSub ? subCategoryAnchorId(categoryId, firstSub.id) : null;
}

/**
 * 锚点解析结果 → 视图状态。
 * 指名了二级就高亮它；只指到一级才退到该分类的第一个二级。
 * 抽成模块级纯函数，是为了让两个 effect 共用同一套落位语义，同时不在依赖数组里塞组件内回调。
 */
function resolveAnchorView(anchor: CategoryAnchor, categories: Category[]) {
  const activeSubId = anchor.subCategoryId
    ? subCategoryAnchorId(anchor.categoryId, anchor.subCategoryId)
    : firstSubAnchorId(categories, anchor.categoryId);

  return {
    categoryId: anchor.categoryId,
    activeSubId,
    elementId: activeSubId ?? anchor.categoryId,
  };
}

export default function MainContent({ categories, links, config, year }: MainContentProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeSubCategoryId, setActiveSubCategoryId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  /** 当前打开详情的链接；null 表示弹层关闭。开合只有一个来源，不散落成多个布尔量 */
  const [detailLink, setDetailLink] = useState<Link | null>(null);
  /*
   * 首帧恒为 'expanded'：服务端渲染的就是这个值，客户端首帧必须与之一致，否则 hydration 报错。
   * 真实状态在下方 layout effect 中于绘制前补齐。
   */
  const [sidebarState, setSidebarState] = useState<SidebarState>('expanded');
  /*
   * 落位期间暂停滚动同步的时刻线。用时间戳而不是布尔锁 + 定时器：
   * 滚动监听的 effect 会在切换分类时重建，定时器存在 ref 里会被重建时的清理函数一并清掉，
   * 解锁从此再不会发生；时间戳不占任何可被清理的资源，effect 怎么重建都拿不走。
   */
  const scrollSyncLockUntil = useRef(0);

  useIsomorphicLayoutEffect(() => {
    const saved = readSidebarState();
    setSidebarState((prev) => (prev === saved ? prev : saved));
  }, []);

  const handleSidebarStateChange = (state: SidebarState) => {
    setSidebarState(state);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, state);
    }
  };

  /*
   * 两个详情回调都必须是稳定引用：LinkContainer 是 memo 的，
   * 每次渲染换一个新函数会让 memo 失效，整个列表跟着重渲染。
   */
  const handleOpenDetail = useCallback((link: Link) => setDetailLink(link), []);
  const handleCloseDetail = useCallback(() => setDetailLink(null), []);

  /**
   * 落位期间关掉滚动同步：滚动过程会途经多个区块，监听若跟着改写锚点，
   * 会把刚写进去的目标锚点覆盖成中途路过的那个。
   */
  const lockScrollSync = useCallback(() => {
    scrollSyncLockUntil.current = Date.now() + SCROLL_SYNC_LOCK_MS;
  }, []);

  /*
   * 初始视图在浏览器绘制前定下：地址栏带锚点就按锚点落位，没有才回到第一个分类。
   * NOTE: hash 不会发给服务端，服务端输出的必然是「未选中分类」的空内容；
   *       用 layout effect 在绘制前补齐，这一帧差异用户看不到。
   *       深链落位用 instant —— 直接打开链接的人不该看到页面从顶部自己滑下去。
   */
  useIsomorphicLayoutEffect(() => {
    const anchor = parseCategoryAnchor(window.location.hash, categories);

    if (!anchor) {
      if (categories.length > 0) {
        const firstCategory = categories[0];
        setSelectedCategoryId(firstCategory.id);
        setActiveSubCategoryId(firstSubAnchorId(categories, firstCategory.id));
      }
      return;
    }

    const view = resolveAnchorView(anchor, categories);
    setSelectedCategoryId(view.categoryId);
    setActiveSubCategoryId(view.activeSubId);
    lockScrollSync();
    scrollToAnchor(view.elementId, 'instant');
  }, [categories, lockScrollSync]);

  /*
   * 浏览器前进后退与手动改地址栏都会触发 hashchange；自写的 pushState 不触发，故不会回流。
   * 复用与点击导航同一套落位语义：解析锚点 → 选中分类 → 滚到目标。
   */
  useEffect(() => {
    const handleHashChange = () => {
      const anchor = parseCategoryAnchor(window.location.hash, categories);

      // 退回没有锚点的历史条目：分类不动，只把视口收回页顶
      if (!anchor) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }

      const view = resolveAnchorView(anchor, categories);
      setSelectedCategoryId(view.categoryId);
      setActiveSubCategoryId(view.activeSubId);
      lockScrollSync();
      scrollToAnchor(view.elementId, 'instant');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [categories, lockScrollSync]);

  const handleNavChange = (categoryId: string, subCategoryId?: string | null) => {
    setSelectedCategoryId(categoryId);

    /*
     * 点击只负责写锚点与落位，滚动实现不在这里各写一份 ——
     * 点击、深链、前进后退三条路径共用同一套落位逻辑。
     */
    // 内部一律用区块锚点 id 定位，只在写地址栏那一步换算成短名
    const anchorId = subCategoryId ?? categoryId;
    writeAnchorHash(anchorIdToSlug(anchorId, categories), 'push');
    lockScrollSync();
    scrollToAnchor(anchorId, 'smooth');

    if (subCategoryId) {
      setActiveSubCategoryId(subCategoryId);
    } else {
      // 点击一级菜单，立即将高亮设置为新分类的第一个二级菜单；没有二级则不高亮
      setActiveSubCategoryId(firstSubAnchorId(categories, categoryId));
    }
  };

  // 滚动监听逻辑
  useEffect(() => {
    const handleScroll = () => {
      if (Date.now() < scrollSyncLockUntil.current) {
        return;
      }

      const sections = Array.from(
        document.querySelectorAll('section[id] div[id]'),
      ) as HTMLElement[];

      // 该分类没有二级区块：地址栏保持在分类级锚点上
      if (sections.length === 0) {
        if (selectedCategoryId) {
          writeAnchorHash(anchorIdToSlug(selectedCategoryId, categories), 'replace');
        }
        return;
      }

      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // 优先处理滚动到底部的情况
      if (windowHeight + scrollPosition >= documentHeight - 5) {
        // 5px 容差
        const lastSectionId = sections[sections.length - 1].id;
        setActiveSubCategoryId((prevId) => (prevId !== lastSectionId ? lastSectionId : prevId));
        writeAnchorHash(anchorIdToSlug(lastSectionId, categories), 'replace');
        return;
      }

      let newActiveSubId: string | null = null;
      for (const section of sections) {
        // 150px 偏移量，大约是顶部导航栏的高度
        if (section.offsetTop <= scrollPosition + 150) {
          newActiveSubId = section.id;
        } else {
          break;
        }
      }

      /*
       * 视口在所有区块之上：此刻没有「当前区块」，锚点一并清掉 ——
       * 留着上一个区块的锚点，会让从地址栏复制出去的链接指向错误位置。高亮仍落到第一个区块。
       */
      const aboveAllSections = newActiveSubId === null;
      const activeSectionId = aboveAllSections ? null : newActiveSubId;
      if (aboveAllSections) {
        newActiveSubId = sections[0].id;
      }

      setActiveSubCategoryId((prevId) => (prevId !== newActiveSubId ? newActiveSubId : prevId));
      writeAnchorHash(
        activeSectionId ? anchorIdToSlug(activeSectionId, categories) : '',
        'replace',
      );
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedCategoryId, categories]);

  // 找到当前选中的一级分类
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  // 按分类记录 id 匹配，不再依赖分类名 —— 名称可能重复或被改名，记录 id 不会
  const filteredLinks = useMemo(
    () =>
      selectedCategoryId ? links.filter((link) => link.category1Id === selectedCategoryId) : [],
    [links, selectedCategoryId],
  );

  // 每个一级分类下的链接数，用于侧栏计数 badge
  const categoryLinkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const link of links) {
      if (link.category1Id) {
        counts[link.category1Id] = (counts[link.category1Id] ?? 0) + 1;
      }
    }
    return counts;
  }, [links]);

  // 搜索索引：公开面全量条目，附一级分类名帮助定位
  const searchItems = useMemo(() => {
    const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
    return links.map((link) => ({
      id: link.id,
      name: link.name,
      desc: link.desc,
      url: link.url,
      tags: link.tags,
      review: link.review,
      categoryName: link.category1Id ? (categoryNameById.get(link.category1Id) ?? '') : '',
    }));
  }, [links, categories]);

  return (
    <div className="min-h-screen">
      {/* Navigation 内部自带移动端与桌面端两套布局，此处只渲染一次 */}
      <Navigation
        categories={categories}
        config={config}
        selectedCategoryId={selectedCategoryId}
        activeSubCategoryId={activeSubCategoryId}
        onNavChange={handleNavChange}
        onOpenSearch={() => setSearchOpen(true)}
        categoryLinkCounts={categoryLinkCounts}
        sidebarState={sidebarState}
        onSidebarStateChange={handleSidebarStateChange}
      />
      <SearchPalette items={searchItems} open={searchOpen} onOpenChange={setSearchOpen} />
      <main
        className={cn(
          'ml-0 pt-[56px] md:pt-4 min-h-screen flex flex-col transition-[margin] duration-200',
          SIDEBAR_MARGIN[sidebarState],
        )}
      >
        {/* pb-20：给浮起底部条（12px 外边距 + 约 44px 高）留位，不遮挡最后一行卡片 */}
        <div className="flex-1 w-full min-w-0 overflow-x-hidden px-4 py-4 md:pt-0 pb-20 pt-16">
          {selectedCategory && (
            <LinkContainer
              category={selectedCategory}
              links={filteredLinks}
              onOpenDetail={handleOpenDetail}
            />
          )}
        </div>
      </main>
      {/* 底部浮起条与内容区共用同一套侧栏让位，避免压住侧栏圆角 */}
      <Footer config={config} className={SIDEBAR_MARGIN[sidebarState]} year={year} />
      <LinkDetailPanel link={detailLink} onClose={handleCloseDetail} />
    </div>
  );
}
