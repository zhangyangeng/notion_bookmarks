'use client';

import React, { useState, useEffect, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { subCategoryAnchorId } from '@/lib/category';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import {
  Rocket,
  ChevronDown,
  Globe,
  Search,
  PanelLeft,
  PanelLeftClose,
  Menu,
  X,
} from 'lucide-react';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Category, SubCategory, WebsiteConfig } from '@/types';
import type { SidebarState } from './MainContent';

interface NavigationProps {
  categories: Category[];
  config: WebsiteConfig;
  selectedCategoryId: string | null;
  activeSubCategoryId: string | null;
  onNavChange: (categoryId: string, subCategoryId?: string | null) => void;
  onOpenSearch?: () => void;
  /** 每个一级分类下的链接数，用于侧栏计数 badge */
  categoryLinkCounts?: Record<string, number>;
  /** 侧栏折叠态（由 MainContent 提升管理，跨组件共享） */
  sidebarState: SidebarState;
  onSidebarStateChange: (state: SidebarState) => void;
}

const defaultConfig: WebsiteConfig = {
  SOCIAL_GITHUB: '',
  SOCIAL_BLOG: '',
  SOCIAL_X: '',
  SOCIAL_JIKE: '',
  SOCIAL_WEIBO: '',
};

const Navigation = memo(function Navigation({
  categories,
  config = defaultConfig,
  selectedCategoryId,
  activeSubCategoryId,
  onNavChange,
  onOpenSearch,
  categoryLinkCounts = {},
  sidebarState,
  onSidebarStateChange,
}: NavigationProps) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isCollapsed = sidebarState === 'icons';
  const isHidden = sidebarState === 'hidden';

  const handleFoldToggle = useCallback(() => {
    if (sidebarState === 'expanded') {
      onSidebarStateChange('icons');
    } else if (sidebarState === 'icons') {
      onSidebarStateChange('hidden');
    } else {
      onSidebarStateChange('expanded');
    }
  }, [sidebarState, onSidebarStateChange]);

  useEffect(() => {
    // 当选中的分类ID变化时，自动展开该分类
    if (selectedCategoryId) {
      setExpandedCategoryId(selectedCategoryId);
    } else if (categories.length > 0) {
      setExpandedCategoryId(categories[0].id);
    }
  }, [selectedCategoryId, categories]);

  const handleCategoryToggle = useCallback((categoryId: string) => {
    setExpandedCategoryId((prevId) => (prevId === categoryId ? null : categoryId));
  }, []);

  const handleScrollTo = useCallback((categoryId: string, subCategoryId?: string) => {
    setTimeout(() => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;

      const elementId = subCategoryId ? subCategoryAnchorId(categoryId, subCategoryId) : categoryId;
      const element = document.getElementById(elementId);

      if (element) {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        window.scrollTo({
          top: rect.top + scrollTop - 100,
          behavior: 'smooth',
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 0);
  }, []);

  const handleCategoryClick = useCallback(
    (category: Category) => {
      onNavChange(category.id);
      handleCategoryToggle(category.id);
      handleScrollTo(category.id);
    },
    [onNavChange, handleCategoryToggle, handleScrollTo],
  );

  const handleSubCategoryClick = useCallback(
    (category: Category, subCategory: SubCategory) => {
      onNavChange(category.id, subCategoryAnchorId(category.id, subCategory.id));
      handleScrollTo(category.id, subCategory.id);
    },
    [onNavChange, handleScrollTo],
  );

  const handleMobileCategoryClick = useCallback(
    (categoryId: string) => {
      onNavChange(categoryId);
      setMobileDrawerOpen(false);
    },
    [onNavChange],
  );

  return (
    <>
      {/* 移动端顶部导航 */}
      <nav className="md:hidden fixed top-0 left-0 right-0 z-20 border-b glass-surface">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center space-x-2">
            <Rocket className="w-5 h-5 text-foreground" />
            <span className="font-semibold">{config.SITE_TITLE}</span>
          </div>
          <div className="flex items-center space-x-1">
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="搜索"
                aria-label="搜索"
              >
                <Search className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            {config.SHOW_THEME_SWITCHER !== 'false' && <ThemeSwitcher />}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              title="分类"
              aria-label="打开分类"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </nav>

      {/* 移动端底部抽屉：分类列表 */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl glass-surface border-t border-border/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">分类</span>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <ul className="space-y-1 pb-4">
              {categories.map((category) => {
                const activeCategory = activeSubCategoryId || '';
                const isCategoryActive =
                  selectedCategoryId === category.id ||
                  (selectedCategoryId && activeCategory.startsWith(`${category.id}-`));
                const count = categoryLinkCounts[category.id];

                return (
                  <li key={category.id}>
                    <button
                      onClick={() => handleMobileCategoryClick(category.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors relative',
                        isCategoryActive
                          ? 'bg-primary/10 text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {isCategoryActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"
                        />
                      )}
                      <span className="flex items-center space-x-2">
                        <CategoryIcon name={category.iconName} className="w-4 h-4" fallback={Globe} />
                        <span>{category.name}</span>
                      </span>
                      {typeof count === 'number' && (
                        <span className="text-xs text-muted-foreground">{count}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* 桌面端固定侧边导航 */}
      {!isHidden && (
        <nav
          className={cn(
            'hidden md:block fixed left-0 top-0 h-screen overflow-y-auto border-r border-border/50 glass-surface z-20 transition-[width] duration-200',
            isCollapsed ? 'w-[64px] p-2' : 'w-[280px] p-4',
          )}
        >
          {isCollapsed ? (
            /* 窄图标栏：仅图标 + 计数 badge，悬停显示分类名 */
            <>
              <div className="flex flex-col items-center gap-2 mb-6">
                <button
                  onClick={handleFoldToggle}
                  className="p-2 rounded-lg hover:bg-accent transition-colors"
                  title="展开侧栏"
                  aria-label="展开侧栏"
                >
                  <PanelLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                {config.SHOW_THEME_SWITCHER !== 'false' && <ThemeSwitcher />}
              </div>
              <ul className="space-y-1">
                {categories.map((category) => {
                  const activeCategory = activeSubCategoryId || '';
                  const isCategoryActive =
                    selectedCategoryId === category.id ||
                    (selectedCategoryId && activeCategory.startsWith(`${category.id}-`));

                  return (
                    <li key={category.id}>
                      <button
                        onClick={() => handleCategoryClick(category)}
                        title={category.name}
                        className={cn(
                          'w-full flex items-center justify-center p-3 rounded-lg transition-colors relative',
                          isCategoryActive
                            ? 'bg-primary/10 text-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        {isCategoryActive && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"
                          />
                        )}
                        <CategoryIcon name={category.iconName} className="w-5 h-5" fallback={Globe} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            /* 展开侧栏 */
            <>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-2">
                  <Rocket className="w-5 h-5 text-foreground" />
                  <span className="font-semibold">{config.SITE_TITLE}</span>
                </div>
                <div className="flex items-center space-x-1">
                  {config.SHOW_THEME_SWITCHER !== 'false' && <ThemeSwitcher />}
                  <button
                    onClick={handleFoldToggle}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors"
                    title="折叠侧栏"
                    aria-label="折叠侧栏"
                  >
                    <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              {onOpenSearch && (
                <button
                  onClick={onOpenSearch}
                  className="w-full mb-4 flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">搜索</span>
                  <kbd className="text-xs text-muted-foreground/70">⌘K</kbd>
                </button>
              )}
              <ul className="space-y-1 pb-24">
                {categories.map((category) => {
                  const activeCategory = activeSubCategoryId || '';
                  const isCategoryActive =
                    selectedCategoryId === category.id ||
                    (selectedCategoryId && activeCategory.startsWith(`${category.id}-`));
                  const isCategoryExpanded = expandedCategoryId === category.id;
                  const count = categoryLinkCounts[category.id];

                  return (
                    <li key={category.id}>
                      <div className="flex flex-col">
                        <button
                          onClick={() => handleCategoryClick(category)}
                          className={cn(
                            'nav-category-button w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors relative',
                            isCategoryActive
                              ? 'nav-category-active text-foreground bg-primary/10 font-medium'
                              : isCategoryExpanded
                                ? 'nav-category-expanded bg-accent'
                                : 'hover:bg-accent/50',
                          )}
                        >
                          {isCategoryActive && (
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"
                            />
                          )}
                          <div className="flex items-center space-x-2">
                            <CategoryIcon
                              name={category.iconName}
                              className="w-4 h-4"
                              fallback={Globe}
                            />
                            <span>{category.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {typeof count === 'number' && (
                              <span className="text-xs text-muted-foreground">{count}</span>
                            )}
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 transition-transform',
                                expandedCategoryId === category.id ? 'rotate-180' : '',
                              )}
                            />
                          </div>
                        </button>
                        {isCategoryExpanded && (
                          <ul className="mt-1 ml-4 space-y-1">
                            {category.subCategories.map((subCategory) => (
                              <li key={subCategory.id}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSubCategoryClick(category, subCategory);
                                  }}
                                  className={cn(
                                    'nav-subcategory-button w-full text-left px-4 py-2 rounded-lg transition-colors text-sm relative',
                                    activeSubCategoryId ===
                                      subCategoryAnchorId(category.id, subCategory.id)
                                      ? 'nav-subcategory-active text-foreground bg-primary/10 font-medium'
                                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                                  )}
                                >
                                  {activeSubCategoryId ===
                                    subCategoryAnchorId(category.id, subCategory.id) && (
                                    <span
                                      aria-hidden="true"
                                      className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"
                                    />
                                  )}
                                  {subCategory.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </nav>
      )}

      {/* 侧栏隐藏后，顶栏悬浮一个召回按钮 */}
      {isHidden && (
        <button
          onClick={handleFoldToggle}
          className="hidden md:flex fixed left-3 top-3 z-30 p-2.5 rounded-lg glass-surface hover:bg-accent transition-colors"
          title="展开侧栏"
          aria-label="展开侧栏"
        >
          <PanelLeft className="w-5 h-5 text-muted-foreground" />
        </button>
      )}
    </>
  );
});

export default Navigation;
