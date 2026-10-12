// src/components/layout/LinkContainer.tsx
'use client';

import React, { useMemo, memo } from 'react';
import LinkCard from '@/components/ui/LinkCard';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { subCategoryAnchorId } from '@/lib/category';
import { Link, Category } from '@/types';

interface LinkContainerProps {
  /** 当前展示的一级分类，其 subCategories 已按配置库 Order 排好 */
  category: Category;
  /** 该一级分类下的全部链接 */
  links: Link[];
  /** 透传给卡片右下角入口。请用 useCallback 传稳定引用，否则 memo 失效、整个列表重渲染 */
  onOpenDetail?: (link: Link) => void;
}

const CARD_GRID_CLASS =
  'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-3 w-full';

const LinkContainer = memo(function LinkContainer({
  category,
  links,
  onOpenDetail,
}: LinkContainerProps) {
  // 按二级分类分组。relation 只指到一级的条目没有二级，单独平铺在一级标题下，
  // 不塞进一个无名分组。
  const { ungrouped, grouped } = useMemo(() => {
    const bySubCategoryId = new Map<string, Link[]>();
    const ungroupedLinks: Link[] = [];

    for (const link of links) {
      if (!link.category2Id) {
        ungroupedLinks.push(link);
        continue;
      }
      const bucket = bySubCategoryId.get(link.category2Id) ?? [];
      bucket.push(link);
      bySubCategoryId.set(link.category2Id, bucket);
    }

    return {
      ungrouped: ungroupedLinks,
      // 顺序取自配置库，不由链接的出现先后决定
      grouped: category.subCategories
        .map((subCategory) => ({
          subCategory,
          links: bySubCategoryId.get(subCategory.id) ?? [],
        }))
        .filter((entry) => entry.links.length > 0),
    };
  }, [category.subCategories, links]);

  return (
    <section id={category.id} className="space-y-8">
      <div className="section-heading flex items-center gap-3 pb-2 border-b">
        {category.icon ? (
          <div className="section-heading-icon w-7 h-7 p-1 rounded-lg bg-primary/5 text-primary">
            <CategoryIcon icon={category.icon} className="w-5 h-5" />
          </div>
        ) : null}
        <h2 className="section-heading-title text-2xl font-bold tracking-tight">{category.name}</h2>
      </div>

      <div className="space-y-12">
        {ungrouped.length > 0 && (
          <div className={CARD_GRID_CLASS}>
            {ungrouped.map((link, i) => (
              <LinkCard
                key={link.id}
                link={link}
                className="w-full card-enter"
                style={{ '--i': i } as React.CSSProperties}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        )}

        {grouped.map(({ subCategory, links: subCategoryLinks }) => (
          <div
            key={subCategory.id}
            id={subCategoryAnchorId(category.id, subCategory.id)}
            className="space-y-4"
          >
            <div className="flex items-center space-x-2">
              <div className="w-1 h-1 rounded-full bg-primary"></div>
              <h3 className="text-lg font-medium text-foreground/90">{subCategory.name}</h3>
              <div className="text-sm text-muted-foreground">({subCategoryLinks.length})</div>
            </div>
            <div className={CARD_GRID_CLASS}>
              {subCategoryLinks.map((link, i) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  className="w-full card-enter"
                  style={{ '--i': i } as React.CSSProperties}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

export default LinkContainer;
