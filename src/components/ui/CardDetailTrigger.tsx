'use client';

import type { MouseEvent } from 'react';
import { cn } from '@/lib/utils';

interface CardDetailTriggerProps {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  /** 站点名。读屏器靠它区分手上这张卡是谁的详情 */
  label: string;
  className?: string;
}

/**
 * 卡片右下角的「详情」入口（首页与分享页共用）。
 *
 * 形态：静止一粒淡点，指针悬停 / 键盘聚焦时展开为「详情」胶囊 ——
 * 常驻才被发现，收起才不打扰卡面。触摸设备没有 hover，那粒淡点就是它的常驻态。
 *
 * NOTE: 它必须与「跳官网」的锚点是**兄弟节点**，不能嵌进锚点里 ——
 * `<a>` 的内容模型不允许交互元素后代。展开所依赖的 hover 由卡片容器承担。
 */
export default function CardDetailTrigger({ onClick, label, className }: CardDetailTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} 的详情`}
      className={cn(
        'card-detail-trigger absolute bottom-2 right-2 z-10 flex h-6 items-center rounded-full px-1.5',
        'text-muted-foreground transition-colors duration-200',
        'hover:bg-primary/10 hover:text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50 transition-colors duration-200 group-hover:bg-primary/70"
      />
      <span className="card-detail-label overflow-hidden text-[11px] font-medium whitespace-nowrap">
        详情
      </span>
    </button>
  );
}
