'use client';

import { memo } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CategoryIconData } from '@/types';

interface CategoryIconProps {
  /** 服务端解析好的图标形态；null 表示无图标或名字认不出 */
  icon?: CategoryIconData | null;
  className?: string;
}

/**
 * 分类图标的唯一渲染出口，侧栏三态（移动端抽屉 / 窄栏 / 展开）与内容区区块标题共用。
 *
 * 只把服务端解析好的形态画出来 —— 不查映射表、不认识 lucide，
 * 因此客户端不需要持有图标库。图标名的解析见 `src/lib/icon-svg.ts`。
 *
 * NOTE: `svg` 形态走 `dangerouslySetInnerHTML`，注入内容是 lucide 在服务端渲染出的**静态标记**；
 *       用户填的 `IconName` 只作查表 key，查不到即返回 null —— 不存在外部字符串拼入 HTML 的路径。
 *       `text` 形态走 React 文本节点，天然转义。二者都不要误判为注入风险。
 */
function CategoryIconBase({ icon, className = 'w-5 h-5' }: CategoryIconProps) {
  if (!icon) {
    return <Globe className={className} />;
  }

  if (icon.kind === 'text') {
    // emoji 的字形小于同尺寸线条图标，放大一档后在视觉上对齐
    return (
      <span
        className={cn(
          className,
          'inline-flex items-center justify-center text-[1.15em] leading-none',
        )}
        aria-hidden="true"
      >
        {icon.value}
      </span>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icon.inner }}
    />
  );
}

// 侧栏会随选中态、悬停态频繁重渲染，而图标只随 icon 变 —— 显式比较这两个字段，
// 避免父组件每次重渲染都跟着重建。
export const CategoryIcon = memo(
  CategoryIconBase,
  (prev, next) => prev.icon === next.icon && prev.className === next.className,
);

export default CategoryIcon;
