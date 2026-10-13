'use client';

import React, { useState, useEffect, memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { subCategoryAnchorId } from '@/lib/category';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { Rocket, ChevronDown, Search, PanelLeft, PanelLeftClose, Menu, X } from 'lucide-react';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { Category, SubCategory, WebsiteConfig } from '@/types';
import { searchShortcut, usePlatform } from '@/lib/platform';
import type { SidebarState } from './MainContent';

/**
 * 展开态内容宽度 = 侧栏宽 280 - 外侧 p-2(8*2) - 自身 mx-2(8*2)。
 * NOTE: 侧栏折叠是宽度渐变动画，动画期间容器窄于内容时文字会折行（高度 48→24 抖动）。
 *       给展开态各块钉死此宽度后，动画期间内容宽度恒定，只被容器裁切，不再重排。
 */
const EXPANDED_CONTENT = 'mx-2 w-[248px] shrink-0';

/**
 * 两态顶部区（标题行 + 搜索框 / 窄栏按钮组）的高度必须一致，
 * 否则折叠与展开之间切换时，下方分类列表会整体纵向跳动。
 * 122 = 标题行 36 + mb-8(32) + 搜索框 38 + mb-4(16)。
 * NOTE: 侧栏内边距两态取同一个值（p-2），不随状态切换 —— padding 若跟着变，
 *       内容会被连续推着上下平移，即使高度恒定也仍有位移。
 */
const HEADER_ZONE = 'h-[122px] shrink-0';

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
  const platform = usePlatform();

  const isCollapsed = sidebarState === 'icons';

  const shortcut = searchShortcut(platform);
  const shortcutHint = shortcut ? `${shortcut.modifier} + ${shortcut.key}` : '搜索';

  const handleFoldToggle = useCallback(() => {
    // 二态切换：只在「展开」与「窄图标栏」之间往返，不再进入隐藏态
    onSidebarStateChange(sidebarState === 'expanded' ? 'icons' : 'expanded');
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

  /*
   * 点击只上报意图：切换分类、写锚点、滚动都由 MainContent 统一处理 ——
   * 点击、深链、前进后退三条路径共用同一套落位逻辑，不在这里各写一份。
   */
  const handleCategoryClick = useCallback(
    (category: Category) => {
      onNavChange(category.id);
      handleCategoryToggle(category.id);
    },
    [onNavChange, handleCategoryToggle],
  );

  const handleSubCategoryClick = useCallback(
    (category: Category, subCategory: SubCategory) => {
      onNavChange(category.id, subCategoryAnchorId(category.id, subCategory.id));
    },
    [onNavChange],
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
      {/* 浮起胶囊条：四周留 12px，圆角靠 glass-surface 自带描边呈现 */}
      <nav className="md:hidden fixed top-3 left-3 right-3 z-20 rounded-2xl glass-surface">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center space-x-2">
            <Rocket className="w-5 h-5 text-foreground" />
            <span className="font-semibold">{config.SITE_TITLE}</span>
          </div>
          <div className="flex items-center space-x-1">
            {onOpenSearch && (
              <button
                onClick={onOpenSearch}
                className="p-2 rounded-nav hover:bg-accent transition-colors"
                title="搜索"
                aria-label="搜索"
              >
                <Search className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            {config.SHOW_THEME_SWITCHER !== 'false' && <ThemeSwitcher />}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 rounded-nav hover:bg-accent transition-colors"
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
                className="p-1.5 rounded-nav hover:bg-accent transition-colors"
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
                        'w-full flex items-center justify-between px-3 py-2.5 rounded-nav transition-colors relative overflow-hidden',
                        isCategoryActive
                          ? 'bg-primary/10 text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {isCategoryActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"
                        />
                      )}
                      <span className="flex items-center space-x-2">
                        <CategoryIcon icon={category.icon} className="w-4 h-4" />
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
      <nav
        className={cn(
          // overflow-x-hidden：折叠动画期间展开态内容宽于容器，靠裁切而不是重排
          'hidden md:block fixed left-3 top-3 bottom-3 p-2 overflow-y-auto overflow-x-hidden rounded-2xl glass-surface z-20 transition-[width] duration-200',
          isCollapsed ? 'w-[64px]' : 'w-[280px]',
        )}
      >
        {isCollapsed ? (
          /* 窄图标栏：仅图标 + 计数 badge，悬停显示分类名 */
          <>
            <div className={cn('flex flex-col items-center justify-center gap-1.5', HEADER_ZONE)}>
              <button
                onClick={handleFoldToggle}
                className="p-2 rounded-nav hover:bg-accent transition-colors"
                title="展开侧栏"
                aria-label="展开侧栏"
              >
                <PanelLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              {onOpenSearch && (
                <button
                  onClick={onOpenSearch}
                  className="p-2 rounded-nav hover:bg-accent transition-colors"
                  title={`搜索（${shortcutHint}）`}
                  aria-label="搜索"
                >
                  <Search className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
              {/* 折叠态侧栏只有 64px 宽，菜单向右展开才不会溢出屏幕 */}
              {config.SHOW_THEME_SWITCHER !== 'false' && <ThemeSwitcher align="left" />}
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
                        'w-full flex items-center justify-center p-3 rounded-nav transition-colors relative overflow-hidden',
                        isCategoryActive
                          ? 'bg-primary/10 text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {isCategoryActive && (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"
                        />
                      )}
                      <CategoryIcon icon={category.icon} className="w-5 h-5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          /* 展开侧栏 */
          <>
            <div className={cn('flex flex-col', HEADER_ZONE, EXPANDED_CONTENT)}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-2 min-w-0">
                  <Rocket className="w-5 h-5 text-foreground shrink-0" />
                  <span className="font-semibold truncate">{config.SITE_TITLE}</span>
                </div>
                <div className="flex items-center space-x-1 shrink-0">
                  {config.SHOW_THEME_SWITCHER !== 'false' && <ThemeSwitcher />}
                  <button
                    onClick={handleFoldToggle}
                    className="p-1.5 rounded-nav hover:bg-accent transition-colors"
                    title="收起为窄栏"
                    aria-label="收起为窄栏"
                  >
                    <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              {onOpenSearch && (
                <button
                  onClick={onOpenSearch}
                  className="w-full mb-4 flex items-center gap-2 px-3 py-2 rounded-nav border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">搜索</span>
                  {shortcut && (
                    <span className="flex items-center gap-1 shrink-0 text-muted-foreground/70">
                      {/* ⌘ 字形本身比字母矮一截，放大 1px 才和 K 视觉等高 */}
                      <kbd className={cn('kbd', shortcut.modifier === '⌘' && 'text-[12px]')}>
                        {shortcut.modifier}
                      </kbd>
                      <span className="text-[11px] leading-none">+</span>
                      <kbd className="kbd">{shortcut.key}</kbd>
                    </span>
                  )}
                </button>
              )}
            </div>
            <ul className={cn('space-y-1 pb-2', EXPANDED_CONTENT)}>
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
                          'nav-category-button w-full flex items-center justify-between px-3 py-2 rounded-nav transition-colors relative overflow-hidden',
                          isCategoryActive
                            ? 'nav-category-active text-foreground bg-primary/10 font-medium'
                            : isCategoryExpanded
                              ? 'nav-category-expanded bg-accent'
                              : 'hover:bg-accent/50',
                        )}
                      >
                        {/* 竖条通高，由容器圆角裁切；圆角 16px→10px，避免竖条被切得过短 */}
                        {isCategoryActive && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"
                          />
                        )}
                        <div className="flex items-center space-x-2">
                          <CategoryIcon icon={category.icon} className="w-4 h-4" />
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
                      {/* 引导线显式表达从属关系：二级归属其上方可展开的一级 */}
                      {isCategoryExpanded && (
                        <ul className="mt-1 ml-4 border-l border-border/40 pl-3 space-y-0.5">
                          {category.subCategories.map((subCategory) => (
                            <li key={subCategory.id}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSubCategoryClick(category, subCategory);
                                }}
                                className={cn(
                                  'nav-subcategory-button w-full text-left px-3 py-1.5 rounded-nav transition-colors text-sm',
                                  // 二级选中只加深文字：一级已有竖条+背景，二级再叠会夺走层级焦点
                                  activeSubCategoryId ===
                                    subCategoryAnchorId(category.id, subCategory.id)
                                    ? 'nav-subcategory-active text-foreground font-medium'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                                )}
                              >
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
    </>
  );
});

export default Navigation;
