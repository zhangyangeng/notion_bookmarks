'use client';

import { Link } from '@/types';
import { IconExternalLink } from '@tabler/icons-react';
import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import LinkIcon from '@/components/ui/LinkIcon';

interface LinkCardProps {
  link: Link;
  className?: string;
  style?: React.CSSProperties;
}

const LinkCard = memo(
  function LinkCard({ link, className, style }: LinkCardProps) {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        style={style}
        className={cn(
          'group flex h-full min-h-[120px] items-start gap-4 p-4 rounded-lg glass-card',
          'transition-all duration-200 hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.98]',
          'hover:shadow-xl hover:shadow-primary/10',
          'w-full max-w-full',
          className,
        )}
      >
        {/* 图标（左）：不给容器铺底色，异形 logo 不再顶着方块 */}
        <LinkIcon link={link} className="w-14 h-14 rounded-lg" />

        {/* 内容（右） */}
        <div className="flex-1 min-w-0 flex flex-col h-full gap-1.5">
          {/* 标题行 */}
          <div className="flex items-center gap-2">
            <h3
              className="flex-1 min-w-0 text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2"
              title={link.name}
            >
              {link.name}
            </h3>
            <IconExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>

          {/* 描述：最多 3 行，头号痛点「描述看得见」 */}
          {link.desc && (
            <p
              className="text-sm text-foreground/80 group-hover:text-foreground line-clamp-3 transition-colors"
              title={link.desc}
            >
              {link.desc}
            </p>
          )}

          {/* 标签行：放在底部 */}
          {link.tags && link.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
              {link.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-muted/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary/90 transition-colors',
                    tag === '推荐' && 'link-tag-featured font-medium',
                  )}
                  title={tag}
                >
                  <span className="truncate max-w-[80px]">{tag}</span>
                </span>
              ))}
              {link.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-muted/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary/90 transition-colors shrink-0">
                  +{link.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </a>
    );
  },
  (prev, next) => {
    return (
      prev.link.id === next.link.id &&
      prev.link.name === next.link.name &&
      prev.link.desc === next.link.desc &&
      prev.link.url === next.link.url &&
      prev.link.iconfile === next.link.iconfile &&
      prev.link.iconlink === next.link.iconlink &&
      prev.className === next.className
    );
  },
);

export default LinkCard;
