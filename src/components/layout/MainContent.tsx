'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import LinkContainer from '@/components/layout/LinkContainer';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import SearchPalette from '@/components/search/SearchPalette';
import { subCategoryAnchorId } from '@/lib/category';
import { cn } from '@/lib/utils';
import React from 'react';
import { Category, Link, WebsiteConfig } from '@/types';

interface MainContentProps {
  /** 有一级分类的树，每个一级下只保留确有链接的二级分类 */
  categories: Category[];
  /** 全部已解析分类引用的链接 */
  links: Link[];
  config: WebsiteConfig;
}

/** 侧栏折叠三态：展开 / 窄图标栏 / 隐藏 */
export type SidebarState = 'expanded' | 'icons' | 'hidden';

const SIDEBAR_STORAGE_KEY = 'nav.sidebar-state';

/** 各态对应的内容区左侧外边距（与 Navigation 侧栏宽度保持一致） */
const SIDEBAR_MARGIN: Record<SidebarState, string> = {
  expanded: 'lg:ml-[280px]',
  icons: 'lg:ml-[64px]',
  hidden: 'lg:ml-0',
};

function readSidebarState(): SidebarState {
  if (typeof window === 'undefined') return 'expanded';
  const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
  return saved === 'icons' || saved === 'hidden' ? saved : 'expanded';
}

export default function MainContent({ categories, links, config }: MainContentProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeSubCategoryId, setActiveSubCategoryId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState<SidebarState>(readSidebarState);
  const isClickScrolling = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSidebarStateChange = (state: SidebarState) => {
    setSidebarState(state);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, state);
    }
  };

  useEffect(() => {
    // 初始化时，默认选中第一个一级和二级分类
    if (categories.length > 0 && !selectedCategoryId) {
      const firstCategory = categories[0];
      setSelectedCategoryId(firstCategory.id);
      if (firstCategory.subCategories.length > 0) {
        setActiveSubCategoryId(
          subCategoryAnchorId(firstCategory.id, firstCategory.subCategories[0].id),
        );
      }
    }
  }, [categories, selectedCategoryId]);

  const handleNavChange = (categoryId: string, subCategoryId?: string | null) => {
    setSelectedCategoryId(categoryId);

    if (subCategoryId) {
      // 点击二级菜单
      setActiveSubCategoryId(subCategoryId);
      isClickScrolling.current = true;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = setTimeout(() => {
        isClickScrolling.current = false;
      }, 1000); // 1秒后恢复滚动监听
    } else {
      // 点击一级菜单，立即将高亮设置为新分类的第一个二级菜单；没有二级则不高亮
      const newCategory = categories.find((c) => c.id === categoryId);
      const firstSubCategory = newCategory?.subCategories[0];
      setActiveSubCategoryId(
        firstSubCategory ? subCategoryAnchorId(categoryId, firstSubCategory.id) : null,
      );
    }
  };

  // 滚动监听逻辑
  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrolling.current) {
        return;
      }

      const sections = Array.from(
        document.querySelectorAll('section[id] div[id]'),
      ) as HTMLElement[];

      if (sections.length === 0) return;

      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // 优先处理滚动到底部的情况
      if (windowHeight + scrollPosition >= documentHeight - 5) {
        // 5px 容差
        const lastSectionId = sections[sections.length - 1].id;
        setActiveSubCategoryId((prevId) => (prevId !== lastSectionId ? lastSectionId : prevId));
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

      // 如果滚动位置在所有区域之上，则默认高亮第一个
      if (newActiveSubId === null && sections.length > 0) {
        newActiveSubId = sections[0].id;
      }

      setActiveSubCategoryId((prevId) => {
        if (prevId !== newActiveSubId) {
          return newActiveSubId;
        }
        return prevId;
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [selectedCategoryId]);

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
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
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
          'ml-0 pt-[56px] lg:pt-4 min-h-screen flex flex-col transition-[margin] duration-200',
          SIDEBAR_MARGIN[sidebarState],
        )}
      >
        <div className="flex-1 w-full min-w-0 overflow-x-hidden px-4 py-4 lg:pt-0 pb-24 pt-16">
          {selectedCategory && <LinkContainer category={selectedCategory} links={filteredLinks} />}
        </div>
      </main>
      <Footer config={config} className="fixed left-0 right-0 bottom-0 z-30" />
    </div>
  );
}
