// src/components/LinkContainer.tsx
"use client";

import React, { useMemo, memo } from "react";
import LinkCard from "@/components/ui/LinkCard";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Link, Category } from '@/types';

interface LinkContainerProps {
  initialLinks: Link[];
  enabledCategories: Set<string>;
  categories: Category[];
}

const LinkContainer = memo(function LinkContainer({
  initialLinks,
  enabledCategories,
  categories,
}: LinkContainerProps) {
  // 按一级和二级分类组织链接，只包含启用的分类
  const linksByCategory = useMemo(() => initialLinks.reduce((acc, link) => {
    const cat1 = link.category1;
    const cat2 = link.category2;

    if (enabledCategories.has(cat1)) {
      if (!acc[cat1]) {
        acc[cat1] = {};
      }
      if (!acc[cat1][cat2]) {
        acc[cat1][cat2] = [];
      }
      acc[cat1][cat2].push(link);
    }
    return acc;
  }, {} as Record<string, Record<string, Link[]>>), [initialLinks, enabledCategories]);

  return (
    <div className="space-y-16 pb-12 w-full min-w-0">
      {categories.map((category) => {
        const categoryLinks = linksByCategory[category.name];
        if (!categoryLinks) return null;

        return (
          <section key={category.id} id={category.id} className="space-y-8">
            <div className="section-heading flex items-center gap-3 pb-2 border-b">
              {category.iconName ? (
                <div className="section-heading-icon w-7 h-7 p-1 rounded-lg bg-primary/5 text-primary">
                  <CategoryIcon name={category.iconName} className="w-5 h-5" />
                </div>
              ) : null}
              <h2 className="section-heading-title text-2xl font-bold tracking-tight">{category.name}</h2>
            </div>

            <div className="space-y-12">
              {Object.entries(categoryLinks).map(([subCategory, links]) => (
                <div
                  key={`${category.id}-${subCategory
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                  id={`${category.id}-${subCategory
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                  className="space-y-4"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-1 h-1 rounded-full bg-primary"></div>
                    <h3 className="text-lg font-medium text-foreground/90">
                      {subCategory}
                    </h3>
                    <div className="text-sm text-muted-foreground">({links.length})</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 w-full">
                    {links.map((link) => (
                      <LinkCard key={link.id} link={link} className="w-full" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
});

export default LinkContainer;
