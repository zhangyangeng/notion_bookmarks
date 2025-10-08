'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher'
import * as Icons from 'lucide-react'
import { Category, WebsiteConfig } from '@/types/notion'
import { useTheme } from 'next-themes'

interface NavigationProps {
  categories: Category[]
  config: WebsiteConfig
  selectedCategoryId: string | null
  activeSubCategoryId: string | null
  onNavChange: (categoryId: string, subCategoryId?: string | null) => void
}

const defaultConfig: WebsiteConfig = {
  SOCIAL_GITHUB: '',
  SOCIAL_BLOG: '',
  SOCIAL_X: '',
  SOCIAL_JIKE: '',
  SOCIAL_WEIBO: ''
}

export default function Navigation({
  categories,
  config = defaultConfig,
  selectedCategoryId,
  activeSubCategoryId,
  onNavChange
}: NavigationProps) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const { theme } = useTheme(); // Get current theme

  useEffect(() => {
    // 当选中的分类ID变化时，自动展开该分类
    if (selectedCategoryId) {
      setExpandedCategoryId(selectedCategoryId);
    } else if (categories.length > 0) {
      // Fallback to the first category if nothing is selected
      setExpandedCategoryId(categories[0].id);
    }
  }, [selectedCategoryId, categories]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategoryId(prevId => (prevId === categoryId ? null : categoryId));
  };

  // 处理导航点击（现在只负责滚动）
  const handleScrollTo = (categoryId: string, subCategoryId?: string) => {
    // 使用 setTimeout 确保在DOM更新后执行滚动
    setTimeout(() => {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      
      const elementId = subCategoryId ? `${categoryId}-${subCategoryId}` : categoryId;
      const element = document.getElementById(elementId);
      
      if (element) {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        window.scrollTo({
          top: rect.top + scrollTop - 100,
          behavior: 'smooth'
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 0);
  };

  const handleCategoryClick = (category: Category) => {
    onNavChange(category.id);
    toggleCategory(category.id);
    handleScrollTo(category.id);
  };

  const handleSubCategoryClick = (category: Category, subCategory: any) => {
    onNavChange(category.id, `${category.id}-${subCategory.id}`);
    handleScrollTo(category.id, subCategory.id);
  };

  return (
    <>
      {/* 移动端顶部导航 */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center space-x-2">
            <Icons.Rocket className="w-5 h-5 text-foreground" />
            <span className="neon-title">{config.SITE_TITLE}</span>
          </div>
          {config.SHOW_THEME_SWITCHER !== 'false' && <ThemeSwitcher />}
        </div>
        <div className="overflow-x-auto flex items-center h-12 border-t scrollbar-none">
          <div className="flex px-4 min-w-full">
            <div className="flex space-x-2 mx-auto">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => onNavChange(category.id)}
                  className={cn(
                    "whitespace-nowrap px-3 py-1.5 text-sm rounded-full transition-colors shrink-0",
                    selectedCategoryId === category.id
                      ? theme === 'simple-dark' 
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-primary text-white font-medium"
                      : theme === 'simple-dark'
                        ? "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* 桌面端边导航 */}
      <nav className="hidden lg:block w-[280px] flex-shrink-0 h-screen sticky top-0 p-4 overflow-y-auto border-r">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <Icons.Rocket className="w-5 h-5 text-foreground" />
            <span className="neon-title">{config.SITE_TITLE}</span>
          </div>
          {config.SHOW_THEME_SWITCHER !== 'false' && <ThemeSwitcher />}
        </div>
        <ul className="space-y-1 pb-24">
          {categories.map((category) => {
            const IconComponent = category.iconName && (category.iconName in Icons)
              ? (Icons[category.iconName as keyof typeof Icons] as React.ComponentType)
              : Icons.Globe;

            return (
              <li key={category.id}>
                <div className="flex flex-col">
                  <button
                    onClick={() => handleCategoryClick(category)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors",
                      selectedCategoryId === category.id ? "bg-accent font-bold" : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <IconComponent className="w-4 h-4" />
                      <span>{category.name}</span>
                    </div>
                    <Icons.ChevronDown
                      className={cn(
                        "w-4 h-4 transition-transform",
                        expandedCategoryId === category.id ? "rotate-180" : ""
                      )}
                    />
                  </button>
                  {expandedCategoryId === category.id && (
                    <ul className="mt-1 ml-4 space-y-1">
                      {(category.subCategories ?? []).map((subCategory) => (
                        <li key={subCategory.id}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSubCategoryClick(category, subCategory);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-2 rounded-lg transition-colors text-sm",
                              activeSubCategoryId === `${category.id}-${subCategory.id}`
                                ? "bg-primary text-primary-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
            )
          })}
        </ul>
      </nav>
    </>
  )
}