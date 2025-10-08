
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import LinkContainer from '@/components/layout/LinkContainer';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import { SimpleTime, AnalogClock, Weather, IPInfo, HotNews } from '@/components/widgets';
import WidgetsContainer from '@/components/layout/WidgetsContainer';
import React from 'react';
import { Category, Link as LinkType, WebsiteConfig } from '@/types/notion';

interface MainContentProps {
  categoriesWithSubs: Category[];
  processedLinks: LinkType[];
  enabledCategories: Set<string>;
  activeCategories: Category[];
  config: WebsiteConfig;
}

export default function MainContent({
  categoriesWithSubs,
  processedLinks,
  enabledCategories,
  activeCategories,
  config,
}: MainContentProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeSubCategoryId, setActiveSubCategoryId] = useState<string | null>(null);
  const isClickScrolling = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 初始化时，默认选中第一个一级和二级分类
    if (categoriesWithSubs.length > 0 && !selectedCategoryId) {
      const firstCategory = categoriesWithSubs[0];
      setSelectedCategoryId(firstCategory.id);
      if (firstCategory.subCategories && firstCategory.subCategories.length > 0) {
        const firstSubCategory = firstCategory.subCategories[0];
        setActiveSubCategoryId(`${firstCategory.id}-${firstSubCategory.id}`);
      }
    }
  }, [categoriesWithSubs, selectedCategoryId]);

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
      // 点击一级菜单，立即将高亮设置为新分类的第一个二级菜单
      const newCategory = categoriesWithSubs.find(c => c.id === categoryId);
      if (newCategory && newCategory.subCategories && newCategory.subCategories.length > 0) {
        const firstSubId = `${newCategory.id}-${newCategory.subCategories[0].id}`;
        setActiveSubCategoryId(firstSubId);
      }
    }
  };

  // 滚动监听逻辑
  useEffect(() => {
    const handleScroll = () => {
      if (isClickScrolling.current) {
        return;
      }

      const sections = Array.from(
        document.querySelectorAll('section[id] div[id]')
      ) as HTMLElement[];
      
      if (sections.length === 0) return;

      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // 优先处理滚动到底部的情况
      if (windowHeight + scrollPosition >= documentHeight - 5) { // 5px 容差
        const lastSectionId = sections[sections.length - 1].id;
        setActiveSubCategoryId(prevId => prevId !== lastSectionId ? lastSectionId : prevId);
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

      // 如果滚动位置在所有区域之上（例如在顶部的widgets区域），则默认高亮第一个
      if (newActiveSubId === null && sections.length > 0) {
        newActiveSubId = sections[0].id;
      }

      setActiveSubCategoryId(prevId => {
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


  // 找到当前选中的分类对象，然后获取其名称
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return null;
    const category = activeCategories.find(cat => cat.id === selectedCategoryId);
    return category ? category.name : null;
  }, [selectedCategoryId, activeCategories]);

  // 根据选中的一级分类名称过滤链接
  const filteredLinks = useMemo(() => {
    if (!selectedCategoryName) return [];
    return processedLinks.filter(link => link.category1 === selectedCategoryName);
  }, [processedLinks, selectedCategoryName]);

  // 根据选中的一级分类ID过滤分类
  const filteredCategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return activeCategories.filter(cat => cat.id === selectedCategoryId);
  }, [activeCategories, selectedCategoryId]);

  const widgetMap: Record<string, React.ReactNode> = {
    '简易时钟': <SimpleTime />,
    '圆形时钟': <AnalogClock />,
    '天气': <Weather />,
    'IP信息': <IPInfo />,
    '热搜': <HotNews />,
  };
  const widgetConfig = config.WIDGET_CONFIG?.split(',').map(s => s.trim()).filter(Boolean) ?? [];
  const widgets = widgetConfig
    .map((name, idx) => {
      const Comp = widgetMap[name];
      if (!Comp) return null;
      return <React.Fragment key={name + '-' + idx}>{Comp}</React.Fragment>;
    })
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <nav className="fixed top-0 left-0 right-0 z-30 bg-white border-b lg:hidden">
        <Navigation
          categories={categoriesWithSubs}
          config={config}
          selectedCategoryId={selectedCategoryId}
          activeSubCategoryId={activeSubCategoryId}
          onNavChange={handleNavChange}
        />
      </nav>
      <aside className="fixed left-0 top-0 w-[300px] h-screen z-20 hidden lg:block pb-24">
        <Navigation
          categories={categoriesWithSubs}
          config={config}
          selectedCategoryId={selectedCategoryId}
          activeSubCategoryId={activeSubCategoryId}
          onNavChange={handleNavChange}
        />
      </aside>
      <main className="ml-0 lg:ml-[300px] pt-[56px] lg:pt-4 min-h-screen flex flex-col">
        {widgets.length > 0 && (
          <div className="w-full">
            <WidgetsContainer>{widgets}</WidgetsContainer>
          </div>
        )}
        <div className="flex-1 w-full min-w-0 overflow-x-hidden px-4 py-4 lg:pt-0 pb-24 pt-16">
          <LinkContainer
            initialLinks={filteredLinks}
            enabledCategories={enabledCategories}
            categories={filteredCategories}
          />
        </div>
      </main>
      <Footer config={config} className="fixed left-0 right-0 bottom-0 z-30" />
    </div>
  );
}
