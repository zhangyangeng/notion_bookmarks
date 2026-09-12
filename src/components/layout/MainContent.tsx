'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import LinkContainer from '@/components/layout/LinkContainer';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import { subCategoryAnchorId } from '@/lib/category';
import React from 'react';
import { Category, Link, WebsiteConfig } from '@/types';

interface MainContentProps {
  /** 有一级分类的树，每个一级下只保留确有链接的二级分类 */
  categories: Category[];
  /** 全部已解析分类引用的链接 */
  links: Link[];
  config: WebsiteConfig;
}

export default function MainContent({ categories, links, config }: MainContentProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeSubCategoryId, setActiveSubCategoryId] = useState<string | null>(null);
  const isClickScrolling = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Navigation 内部自带移动端与桌面端两套布局，此处只渲染一次 */}
      <Navigation
        categories={categories}
        config={config}
        selectedCategoryId={selectedCategoryId}
        activeSubCategoryId={activeSubCategoryId}
        onNavChange={handleNavChange}
      />
      <main className="ml-0 lg:ml-[280px] pt-[56px] lg:pt-4 min-h-screen flex flex-col">
        <div className="flex-1 w-full min-w-0 overflow-x-hidden px-4 py-4 lg:pt-0 pb-24 pt-16">
          {selectedCategory && <LinkContainer category={selectedCategory} links={filteredLinks} />}
        </div>
      </main>
      <Footer config={config} className="fixed left-0 right-0 bottom-0 z-30" />
    </div>
  );
}
